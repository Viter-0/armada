from dataclasses import dataclass
from typing import Any, TypeVar

from redis.asyncio import Redis
from sqlalchemy import insert
from taskiq import (
    InMemoryBroker,
    ScheduledTask,
    ScheduleSource,
    TaskiqMessage,
    TaskiqMiddleware,
    TaskiqResult,
    TaskiqScheduler,
)
from taskiq.abc import AsyncBroker
from taskiq.schedule_sources import LabelScheduleSource
from taskiq.scheduler.created_schedule import CreatedSchedule
from taskiq_redis import ListQueueBroker, RedisAsyncResultBackend
from taskiq_redis import RedisScheduleSource as TaskiqRedisScheduleSource

from armada_logs.database import get_db_session_context
from armada_logs.logging import get_logger
from armada_logs.schema.metrics import ORMMetricsTask
from armada_logs.settings import app as app_settings
from armada_logs.util.helpers import compare_dicts

_ReturnType = TypeVar("_ReturnType")

logger = get_logger("armada.tasks")


@dataclass
class ScheduledTaskWithSource:
    source: ScheduleSource
    task: ScheduledTask

    async def delete_schedule(self):
        if not callable(getattr(self.source, "delete_schedule", None)):
            raise ValueError("Schedule can't be deleted. Source does not support dynamic scheduling.")
        await self.source.delete_schedule(self.task.schedule_id)


class RedisBroker(ListQueueBroker):
    """
    Extends the capabilities of Taskiq's Redis ListQueueBroker.
    """

    async def get_queue_size(self) -> int:
        """
        Retrieves the current number of tasks in the queue.
        """
        queue_name = self.queue_name
        async with Redis(connection_pool=self.connection_pool) as redis_conn:
            return await redis_conn.llen(queue_name)  # type: ignore


class MemoryBroker(InMemoryBroker):
    """
    Extends the capabilities of Taskiq's InMemoryBroker.
    """

    async def get_queue_size(self) -> int:
        """
        Retrieves the current number of tasks in the queue.
        """
        return len(self._running_tasks)


class TasksScheduler(TaskiqScheduler):
    async def get_schedules(self, source: ScheduleSource | None = None) -> list[ScheduledTaskWithSource]:
        """
        Retrieves schedules from the given source or from all sources.

        Args:
            source: Optional source from which to get the schedules.
        """
        if source is not None:
            return [ScheduledTaskWithSource(task=tsk, source=source) for tsk in await source.get_schedules()]
        all_tasks: list[ScheduledTaskWithSource] = []
        for src in self.sources:
            all_tasks.extend([ScheduledTaskWithSource(task=tsk, source=src) for tsk in await src.get_schedules()])
        return all_tasks

    def _get_dynamic_schedule_source(self, source: ScheduleSource | None = None) -> ScheduleSource:
        """
        Determines the schedule source to use. If none is provided,
        finds a source that supports dynamic scheduling.

        Args:
            source: Optional source to use.

        Raises:
            ValueError: If no valid schedule source is found.
        """
        if source is not None:
            return source
        for src in self.sources:
            if callable(getattr(src, "add_schedule", None)):
                return src
        raise ValueError(
            "Unable to find schedule source that supports dynamic scheduling. Please specify source manually"
        )

    async def delete_unique_schedule(self, unique_name: str) -> None:
        """
        Deletes a unique schedule by its name. Only possible to delete schedules from dynamic sources.

        Args:
            unique_name: The unique name of the schedule.
        """

        schedule_with_source = await self.find_unique_schedule(unique_name=unique_name)
        if not schedule_with_source:
            return
        await schedule_with_source.delete_schedule()

    async def delete_schedule(self, id, source: ScheduleSource | None = None):
        """
        Deletes a schedule by its id. Only possible to delete schedules from dynamic sources.
        """
        if source:
            if not callable(getattr(source, "delete_schedule", None)):
                raise ValueError("Schedule can't be deleted. Source does not support dynamic scheduling.")
            await source.delete_schedule(id)
            return
        schedules_with_source = await self.get_schedules()
        for schedule in schedules_with_source:
            if schedule.task.schedule_id != id:
                continue
            await schedule.delete_schedule()

    async def find_unique_schedule(self, unique_name: str) -> ScheduledTaskWithSource | None:
        """
        Finds a unique schedule by its unique name.

        Args:
            unique_name: The unique name of the schedule to find.
        """
        current_scheduled_tasks = await self.get_schedules()
        for task_with_source in current_scheduled_tasks:
            un = task_with_source.task.labels.get("unique_name", None)
            if un == unique_name:
                return task_with_source

    async def find_schedules_by_labels(self, **kwargs) -> list[ScheduledTaskWithSource]:
        """
        Finds schedules by their labels.

        Args:
            kwargs: key-value labels to search for.
        """
        result: list[ScheduledTaskWithSource] = []
        current_scheduled_tasks = await self.get_schedules()
        for schedule in current_scheduled_tasks:
            if compare_dicts(kwargs, schedule.task.labels):
                result.append(schedule)
        return result

    async def schedule_unique_cron_task(
        self,
        task,
        unique_name: str,
        cron: str | int,
        labels: dict[str, str | int | bool] | None = None,
        source: ScheduleSource | None = None,
        args: list | None = None,
        kwargs: dict | None = None,
    ) -> CreatedSchedule | ScheduledTask:
        """
        Creates a unique scheduled task if it doesn't already exist.

        Args:
            task: The task to schedule.
            unique_name: The unique name of the task.
            cron: The cron expression or interval for scheduling.
            source: Optional source for scheduling the task.
            args: Optional positional arguments to pass to the task.
            kwargs: Optional keyword arguments to pass to the task.

        Returns:
            The created scheduled task or the existing unique task.

        Raises:
            ValueError: If the task cannot be scheduled or found.
        """
        if labels is None:
            labels = {}
        if kwargs is None:
            kwargs = {}
        if args is None:
            args = []
        schedule_source = self._get_dynamic_schedule_source(source=source)
        unique_task = await self.find_unique_schedule(unique_name=unique_name)
        cron_expression = cron
        if isinstance(cron_expression, int):
            cron_expression = self.interval_to_cron(cron_expression)
        if not unique_task:
            return (
                await task.kicker()
                .with_labels(unique_name=unique_name, **labels)
                .schedule_by_cron(schedule_source, cron_expression, *args, **kwargs)
            )
        return unique_task.task

    @staticmethod
    def interval_to_cron(interval: int) -> str:
        """
        Converts an interval in minutes to a cron expression.
        """
        if interval < 1:
            raise ValueError("Interval must be at least 1 minute.")

        minutes_in_hour = 60
        hours_in_day = 24
        minutes_in_day = minutes_in_hour * hours_in_day
        days_in_month = 30  # Approximation for simplicity

        # Interval less than an hour
        if interval < minutes_in_hour:
            return f"*/{interval} * * * *"

        # Interval less than a day
        if interval < minutes_in_day:
            minute = interval % minutes_in_hour
            hour = interval // minutes_in_hour
            return f"{minute} */{hour} * * *"

        # Interval less than a month
        if interval < (minutes_in_day * days_in_month):
            minute = interval % minutes_in_hour
            hour = (interval // minutes_in_hour) % hours_in_day
            day = (interval // minutes_in_day) % days_in_month
            return f"{minute} {hour} {day} * *"

        # Interval greater than or equal to a month
        minute = interval % minutes_in_hour
        hour = (interval // minutes_in_hour) % hours_in_day
        day = (interval // minutes_in_day) % days_in_month
        month = interval // (minutes_in_day * days_in_month)
        return f"{minute} {hour} {day} */{month} *"


class RedisScheduleSource(TaskiqRedisScheduleSource):
    async def purge_schedules(self):
        async with Redis(connection_pool=self.connection_pool) as redis:
            keys = []
            async for key in redis.scan_iter(f"{self.prefix}:*"):
                keys.append(key)
            await redis.delete(*keys)


class InMemoryScheduleSource(ScheduleSource):
    """
    InMemoryScheduleSource only works with InMemoryBroker. Scheduler must run in the current event loop.
    """

    def __init__(self, broker: AsyncBroker) -> None:
        super().__init__()
        self.tasks = {}
        self.broker = broker

    async def get_schedules(self) -> list[ScheduledTask]:
        return list(self.tasks.values())

    async def add_schedule(self, schedule: ScheduledTask) -> None:
        self.tasks[schedule.schedule_id] = schedule

    async def delete_schedule(self, schedule_id: str) -> None:
        self.tasks.pop(schedule_id)

    async def post_send(self, scheduled_task: ScheduledTask) -> None:
        """Delete a task after it's completed."""
        if scheduled_task.time is not None:
            await self.delete_schedule(scheduled_task.schedule_id)

    async def purge_schedules(self):
        self.tasks = {}


class TaskMetricsMiddleware(TaskiqMiddleware):
    """
    Middleware that adds metrics logging for workers.

    Use the label `unique_name` to give tasks a unique name. This allows scheduling the same task with different
    parameters and having separate metrics for each task. If a unique name is not provided, the task name will be used.
    Use the label 'no_metrics' to disable logging.
    """

    def __init__(self) -> None:
        super().__init__()
        logger.debug("Initializing tasks metrics logging")

    async def post_execute(
        self,
        message: TaskiqMessage,
        result: TaskiqResult[Any],
    ) -> None:
        """
        Tracks the number of errors and successful executions.

        Args:
            message: The received message containing task details.
            result: The result of the task execution.
        """

        if message.labels.get("no_metrics", None):
            return

        try:
            async with get_db_session_context() as db_session:
                await db_session.execute(
                    insert(ORMMetricsTask).values(
                        name=message.labels.get("unique_name", message.task_name),
                        task=message.task_name,
                        origin=message.labels.get("origin", None),
                        message=str(result.error),
                        status="error" if result.is_err else "success",
                        execution_time=result.execution_time,
                    )
                )
                await db_session.commit()

        except Exception:
            logger.exception("Failed to save metrics to the database.")


# WIP - Maybe in future
# class InMemoryBackend(AsyncResultBackend[_ReturnType]):
#     async def startup(self) -> None:
#         """Do something when starting broker."""

#     async def shutdown(self) -> None:
#         """Do something on shutdown."""

#     async def set_result(
#         self,
#         task_id: str,
#         result: TaskiqResult[_ReturnType],
#     ) -> None:
#         """
#         Set result in your backend.

#         :param task_id: current task id.
#         :param result: result of execution.
#         """

#     async def get_result(
#         self,
#         task_id: str,
#         with_logs: bool = False,
#     ) -> TaskiqResult[_ReturnType]:
#         """
#         Here you must retrieve result by id.

#         Logs is a part of a result.
#         Here we have a parameter whether you want to
#         fetch result with logs or not, because logs
#         can have a lot of info and sometimes it's critical
#         to get only needed information.

#         :param task_id: id of a task.
#         :param with_logs: whether to fetch logs.
#         :return: result.
#         """
#         return ...  # type: ignore

#     async def is_result_ready(
#         self,
#         task_id: str,
#     ) -> bool:
#         """
#         Check if result exists.

#         This function must check whether result
#         is available in your result backend
#         without fetching the result.

#         :param task_id: id of a task.
#         :return: True if result is ready.
#         """
#         return ...  # type: ignore


if app_settings.BROKER:
    result_backend = RedisAsyncResultBackend(
        keep_results=False,
        redis_url=app_settings.BROKER,
        result_ex_time=1000,
    )
    tasks_broker = RedisBroker(
        url=app_settings.BROKER,
    ).with_middlewares(TaskMetricsMiddleware())
    scheduler_source = RedisScheduleSource(app_settings.BROKER)
    scheduler = TasksScheduler(tasks_broker, sources=[scheduler_source, LabelScheduleSource(tasks_broker)])
else:
    tasks_broker = MemoryBroker().with_middlewares(TaskMetricsMiddleware())
    scheduler_source = InMemoryScheduleSource(broker=tasks_broker)
    scheduler = TasksScheduler(tasks_broker, sources=[scheduler_source, LabelScheduleSource(tasks_broker)])
