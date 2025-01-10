from asyncio import CancelledError, create_task
from contextlib import asynccontextmanager

from fastapi import FastAPI
from taskiq.api import run_scheduler_task

from armada_logs.database.dependencies import get_db_session_context
from armada_logs.models.assets import import_service_definitions
from armada_logs.sources import DataSourceRunner

from .core.tasks import scheduler, scheduler_source, tasks_broker
from .registry import TasksRegistry


async def on_server_init(app: FastAPI):
    TasksRegistry.import_app_task_modules()
    await DataSourceRunner.start()
    async with get_db_session_context() as db_session:
        await import_service_definitions(session=db_session)


async def on_server_shutdown(app: FastAPI):
    pass


@asynccontextmanager
async def api_server_lifespan(app: FastAPI):
    if not tasks_broker.is_worker_process:
        await tasks_broker.startup()

    # Purge all schedules on startup. This simplifies the schedule creation logic
    await scheduler_source.purge_schedules()
    scheduler_task = create_task(run_scheduler_task(scheduler))

    await on_server_init(app)

    yield

    if not tasks_broker.is_worker_process:
        await tasks_broker.shutdown()

    scheduler_task.cancel()
    try:
        await scheduler_task
    except CancelledError:
        pass

    await on_server_shutdown(app)
