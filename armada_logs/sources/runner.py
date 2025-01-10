from __future__ import annotations

from typing import TYPE_CHECKING

from sqlalchemy import select
from taskiq import AsyncTaskiqDecoratedTask
from taskiq.abc.broker import AsyncBroker

from armada_logs.const import DEFAULT_ASSET_COLLECT_INTERVAL, TaskActionsEnum
from armada_logs.core.tasks import scheduler, tasks_broker
from armada_logs.database import get_db_session_context
from armada_logs.logging import get_logger
from armada_logs.schema.data_sources import ORMDataSource
from armada_logs.util.errors import DataValidationError, NotFoundError

logger = get_logger("armada.source")

if TYPE_CHECKING:
    from armada_logs.schema.data_sources import DataSource


class DataSourceRunner:
    """
    Scheduling and executing Data source related tasks
    """

    broker: AsyncBroker = tasks_broker
    tasks_registry: dict[str, dict[TaskActionsEnum, AsyncTaskiqDecoratedTask]] = {}

    @classmethod
    def _get_task(cls, entity_type: str, action: TaskActionsEnum):
        """
        Retrieve a specific task from the tasks registry.

        Raises:
            NotFoundError: If the task for the specified entity type and action does not exist.
        """
        task = cls.tasks_registry.get(entity_type, {}).get(action)
        if not task:
            raise NotFoundError(f'Task "{action}" does not exist for data source - {entity_type}')
        return task

    @classmethod
    def _validate_asset_collection_capability(cls, source: ORMDataSource | DataSource):
        if not source.is_enabled:
            raise DataValidationError("Data source is disabled")
        if not source.is_assets_supported:
            raise DataValidationError("Data source does not support asset synchronization")
        if not getattr(source, "is_asset_collection_enabled", False):
            raise DataValidationError("Asset collection is not enabled")

    @classmethod
    async def collect_assets_now(cls, source: ORMDataSource | DataSource):
        """
        Trigger an immediate asset synchronization for the given data source.

        Does not wait for the synchronization to complete.

        Raises:
            NotFoundError: If the task for asset collection does not exist.
            DataValidationError: If the data source does not support asset synchronization.

        """
        cls._validate_asset_collection_capability(source=source)
        task = cls._get_task(entity_type=source.entity_type, action=TaskActionsEnum.COLLECT_ASSETS)
        await task.kiq(source.id)

    @classmethod
    async def add_source(cls, source: ORMDataSource | DataSource):
        """
        Add a new data source to the scheduler
        """
        try:
            cls._validate_asset_collection_capability(source=source)
            await cls.create_task(
                source=source,
                action=TaskActionsEnum.COLLECT_ASSETS,
                interval=getattr(source, "asset_collection_interval", DEFAULT_ASSET_COLLECT_INTERVAL),
                args=[source.id],
            )
        except (DataValidationError, NotFoundError):
            return

    @classmethod
    async def update_source(cls, source: ORMDataSource | DataSource):
        """
        Update data source in the scheduler.
        """
        await cls.delete_source(source)
        await cls.add_source(source)

    @classmethod
    async def delete_source(cls, source: ORMDataSource | DataSource):
        """
        Delete a data source and unschedule its active tasks.
        """
        schedules = await scheduler.find_schedules_by_labels(origin=str(source.id))
        for schedule in schedules:
            logger.debug(f"Deleting schedule with name '{schedule.task.task_name}' for data source '{source.id}'.")
            await schedule.delete_schedule()

    @classmethod
    async def create_task(
        cls,
        source: ORMDataSource | DataSource,
        action: TaskActionsEnum,
        interval: int,
        args: list | None = None,
        kwargs: dict | None = None,
    ):
        """
        Create a scheduled task for a data source.

        Args:
            source: The data source for which the task is created.
            action: The action to be performed by the task.
            interval: The interval value.
            args: Optional arguments to pass to the task, must be JSON serializable.
            kwargs: Optional keyword arguments to pass to the task, must be JSON serializable.
        """
        if kwargs is None:
            kwargs = {}
        if args is None:
            args = []

        try:
            task = cls._get_task(entity_type=source.entity_type, action=action)
        except NotFoundError as e:
            logger.debug(e)
            return
        logger.debug(f"Scheduling task '{task.task_name}' with action '{action}' for data source '{source.id}'.")
        await scheduler.schedule_unique_cron_task(
            task=task,
            unique_name=(action + "__" + str(source.id)),
            cron=interval,
            labels={"origin": str(source.id)},
            args=args,
            kwargs=kwargs,
        )

    @classmethod
    async def get_database_datasources(cls) -> list:
        """
        Retrieve all data sources from the database.
        """
        async with get_db_session_context() as db_session:
            return list(await db_session.scalars(select(ORMDataSource)))

    @classmethod
    def load_tasks_registry(cls):
        """
        Load all data source task definitions (unscheduled) from the broker and register them in the tasks registry.
        """
        for task_name, task in cls.broker.get_all_tasks().items():
            if task.broker != cls.broker:
                continue
            source_type = task.labels.get("source_type", None)
            source_action = task.labels.get("action", None)
            if source_type is None or source_action is None:
                logger.debug(
                    f"Skipping task '{task_name}' - missing `source_type` or `action` labels required for data source tasks."
                )
                continue
            if source_type not in cls.tasks_registry:
                cls.tasks_registry[source_type] = {}
            cls.tasks_registry[source_type][source_action] = task
            logger.debug(
                f"Registered valid data source task '{task_name}' with action '{source_action}' under source type '{source_type}'."
            )

    @classmethod
    async def start(cls):
        """
        Load initial schedules.
        """
        cls.load_tasks_registry()
        db_sources = await cls.get_database_datasources()
        for source in db_sources:
            await cls.add_source(source=source)
