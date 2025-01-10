from typing import Annotated

from fastapi import APIRouter, Depends, Security
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from armada_logs import __version__, models, schema
from armada_logs.const import ScopesEnum
from armada_logs.core.security import access_manager
from armada_logs.database import get_db_session, update_or_insert_bulk
from armada_logs.settings import app_settings

router = APIRouter(prefix="/settings")


@router.get(path="/state", response_model=schema.settings.StateSettingsResponse)
async def get_state(
    user: Annotated[schema.users.User, Security(access_manager, scopes=[ScopesEnum.USER_READ])],
):
    """
    Describe the general state of the app.
    """
    return schema.settings.StateSettingsResponse(
        version=__version__,
        broker=True if app_settings.BROKER else False,
        environment=app_settings.ENVIRONMENT,
    )


@router.get(path="/general", response_model=schema.settings.GeneralSettingsResponse)
async def get_general_settings(
    db_session: Annotated[AsyncSession, Depends(get_db_session)],
    user: Annotated[schema.users.User, Security(access_manager, scopes=[ScopesEnum.ADMIN_READ])],
):
    """
    Retrieve general settings.
    """
    settings_db = await db_session.scalars(
        select(schema.settings.ORMAppSettings).where(schema.settings.ORMAppSettings.group == "general")
    )
    return schema.settings.GeneralSettingsResponse(
        **models.app_settings.convert_db_settings_rows_to_object(settings_db)
    )


@router.put(path="/general")
async def update_general_settings(
    general_settings: schema.settings.GeneralSettingsUpdate,
    db_session: Annotated[AsyncSession, Depends(get_db_session)],
    user: Annotated[schema.users.User, Security(access_manager, scopes=[ScopesEnum.ADMIN_WRITE])],
):
    """
    Update general settings.
    """
    settings_entries = [
        {"key": key, "value": value, "group": "general"} for key, value in general_settings.model_dump().items()
    ]
    await update_or_insert_bulk(
        session=db_session,
        orm_schema=schema.settings.ORMAppSettings,
        objects=settings_entries,
        unique_attribute=schema.settings.ORMAppSettings.key,
    )


@router.get(path="/security", response_model=schema.settings.SecuritySettingsResponse)
async def get_security_settings(
    db_session: Annotated[AsyncSession, Depends(get_db_session)],
    user: Annotated[schema.users.User, Security(access_manager, scopes=[ScopesEnum.ADMIN_READ])],
):
    """
    Retrieve security settings.
    """
    settings_db = await db_session.scalars(
        select(schema.settings.ORMAppSettings).where(schema.settings.ORMAppSettings.group == "security")
    )
    return schema.settings.SecuritySettingsResponse(
        **models.app_settings.convert_db_settings_rows_to_object(settings_db)
    )


@router.put(path="/security")
async def update_security_settings(
    security_settings: schema.settings.SecuritySettingsUpdate,
    db_session: Annotated[AsyncSession, Depends(get_db_session)],
    user: Annotated[schema.users.User, Security(access_manager, scopes=[ScopesEnum.ADMIN_WRITE])],
):
    """
    Update security settings.
    """
    settings_entries = [
        {"key": key, "value": value, "group": "security"} for key, value in security_settings.model_dump().items()
    ]
    await update_or_insert_bulk(
        session=db_session,
        orm_schema=schema.settings.ORMAppSettings,
        objects=settings_entries,
        unique_attribute=schema.settings.ORMAppSettings.key,
    )
