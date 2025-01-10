from datetime import UTC, datetime
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Security
from sqlalchemy import and_, select
from sqlalchemy.ext.asyncio import AsyncSession

from armada_logs import schema
from armada_logs.const import ScopesEnum
from armada_logs.core.security import access_manager
from armada_logs.core.tasks import tasks_broker
from armada_logs.database import get_db_session
from armada_logs.util.helpers import is_valid_uuid

router = APIRouter(prefix="/metrics")


@router.get(path="/tasks", response_model=list[schema.metrics.MetricsTaskResponse])
async def get_task_metrics(
    query: Annotated[schema.metrics.TasksQueryParams, Depends()],
    db_session: Annotated[AsyncSession, Depends(get_db_session)],
    user: Annotated[schema.users.User, Security(access_manager, scopes=[ScopesEnum.ADMIN_READ])],
):
    """
    Retrieve task metrics.
    """

    async def populate_references(
        metrics: list[schema.metrics.ORMMetricsTask],
    ) -> list[schema.metrics.MetricsTaskResponse]:
        """
        Populates the 'source' field in TaskMetricsResponse with corresponding
        data source references if available.
        """
        origins = set(UUID(entry.origin) for entry in metrics if entry.origin and is_valid_uuid(entry.origin))
        data_sources = await db_session.scalars(
            select(schema.data_sources.ORMDataSource).where(schema.data_sources.ORMDataSource.id.in_(origins))
        )
        data_source_map = {str(entry.id): entry for entry in data_sources}
        result = []
        for entry in metrics:
            if entry.origin not in data_source_map:
                result.append(schema.metrics.MetricsTaskResponse.model_validate(entry))
                continue
            source = data_source_map[str(entry.origin)]
            entry_model = schema.metrics.MetricsTaskResponse.model_validate(entry)
            entry_model.source = schema.util.Reference(id=source.id, name=source.name, entity_type=source.entity_type)
            result.append(entry_model)
        return result

    conditions = [
        schema.metrics.ORMMetricsTask.time > datetime.fromtimestamp(query.interval.start_time, tz=UTC),
        schema.metrics.ORMMetricsTask.time < datetime.fromtimestamp(query.interval.end_time, tz=UTC),
    ]
    if query.status is not None:
        conditions.append(schema.metrics.ORMMetricsTask.status == query.status)
    if query.origin is not None:
        conditions.append(schema.metrics.ORMMetricsTask.origin == query.origin)

    metrics = await db_session.scalars(select(schema.metrics.ORMMetricsTask).where(and_(*conditions)))
    metrics = await populate_references(metrics=list(metrics))
    return sorted(metrics, key=lambda d: d.time, reverse=True)


@router.get(path="/tasks_queue", response_model=schema.metrics.TaskQueueResponse)
async def get_task_queue(
    user: Annotated[schema.users.User, Security(access_manager, scopes=[ScopesEnum.ADMIN_READ])],
):
    """
    Retrieve the task queue metrics.
    """
    return schema.metrics.TaskQueueResponse(size=await tasks_broker.get_queue_size())


@router.get(path="/activity", response_model=list[schema.metrics.MetricsActivityResponse])
async def get_activity_metrics(
    query: Annotated[schema.metrics.ActivityQueryParams, Depends()],
    db_session: Annotated[AsyncSession, Depends(get_db_session)],
    user: Annotated[schema.users.User, Security(access_manager, scopes=[ScopesEnum.ADMIN_READ])],
):
    """
    Retrieve the activity metrics. Activity patterns of the application users.
    """

    async def populate_references(
        metrics: list[schema.metrics.ORMMetricsActivity],
    ) -> list[schema.metrics.MetricsActivityResponse]:
        """
        Populates the 'user' field in MetricsActivityResponse with corresponding
        user references if available.
        """
        unique_user_ids = set(entry.user_id for entry in metrics)
        users = await db_session.scalars(
            select(schema.users.ORMUser).where(schema.users.ORMUser.id.in_(unique_user_ids))
        )
        user_map = {str(entry.id): entry for entry in users}
        result = []
        for entry in metrics:
            user_id = str(entry.user_id)
            if user_id not in user_map:
                result.append(schema.metrics.MetricsActivityResponse.model_validate(entry))
                continue
            usr = user_map[user_id]
            entry_model = schema.metrics.MetricsActivityResponse.model_validate(entry)
            entry_model.user = schema.util.Reference(id=usr.id, name=usr.name, entity_type="application_user")
            result.append(entry_model)
        return result

    conditions = [
        schema.metrics.ORMMetricsActivity.time > datetime.fromtimestamp(query.interval.start_time, tz=UTC),
        schema.metrics.ORMMetricsActivity.time < datetime.fromtimestamp(query.interval.end_time, tz=UTC),
    ]
    if query.category is not None:
        conditions.append(schema.metrics.ORMMetricsActivity.category == query.category)
    if query.user_id is not None:
        conditions.append(schema.metrics.ORMMetricsActivity.user_id == query.user_id)

    metrics = await db_session.scalars(select(schema.metrics.ORMMetricsActivity).where(and_(*conditions)))
    metrics = await populate_references(metrics=list(metrics))
    return sorted(metrics, key=lambda d: d.time, reverse=True)
