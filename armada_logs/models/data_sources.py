from typing import TYPE_CHECKING
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from armada_logs import schema
from armada_logs.logging import logger
from armada_logs.sources.runner import DataSourceRunner
from armada_logs.util.parsers import parse_exception_message

if TYPE_CHECKING:
    from armada_logs.sources.resources import SourceBase


async def check_datasource_uniqueness(
    session: AsyncSession, source: schema.data_sources.DataSource | schema.data_sources.DataSourceCreate
):
    """
    Validates that a data source with the same name does not already exist in the database.

    Raises:
        HTTPException: If a data source with the same name already exists, raises an HTTP 400 error.
    """
    db_data_source = await session.scalar(
        select(schema.data_sources.ORMDataSource).where(schema.data_sources.ORMDataSource.name == source.name)
    )

    if db_data_source:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Data Source with the same name already exists"
        )


async def create_datasource(session: AsyncSession, source: schema.data_sources.ORMDataSource):
    """
    This function adds a new data source object to the database.
    """
    session.add(source)
    await session.commit()
    await session.refresh(source, attribute_names=["credential_profile"])
    await DataSourceRunner.add_source(source=source)


async def update_datasource(session: AsyncSession, source: schema.data_sources.ORMDataSource):
    """
    This function updates a data source object in the database.
    """
    session.add(source)
    await session.commit()
    await DataSourceRunner.update_source(source=source)


async def delete_datasource(session: AsyncSession, source: schema.data_sources.ORMDataSource):
    """
    This function removes a data source object from the database.
    """
    await session.delete(source)
    await session.commit()
    await DataSourceRunner.delete_source(source=source)


async def update_credential_profile(session: AsyncSession, db_obj: schema.data_sources.ORMCredentialProfile):
    """
    This function updates a credential profile object in the database.
    """
    session.add(db_obj)
    await session.commit()
    result = await session.scalars(
        select(schema.data_sources.ORMDataSource).where(
            schema.data_sources.ORMDataSource.credential_profile_id == db_obj.id
        )
    )
    for entity in result:
        await DataSourceRunner.update_source(source=entity)


async def collect_assets_now(data_source):
    """
    Triggers an immediate asset synchronization for the given data source.
    """
    await DataSourceRunner.collect_assets_now(source=data_source)


async def check_connectivity(source: "SourceBase"):
    """
    This function attempts to check the connectivity of the given data source by calling its
    `check_connectivity` method.

    Args:
        source: The data source object whose connectivity is to be checked.
                This object must have a method `check_connectivity` that is async.

    Raises:
        HTTPException: If the connectivity check fails.
    """
    try:
        await source.check_connectivity()
    except Exception as e:
        logger.exception(e)
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=parse_exception_message(e)) from e


async def get_credential_profile_by_id(session: AsyncSession, credential_profile_id: UUID | None):
    """
    Retrieves a credential profile by its ID.
    """
    if not credential_profile_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Credential profile ID is missing")

    return await session.get_one(schema.data_sources.ORMCredentialProfile, credential_profile_id)
