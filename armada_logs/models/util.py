from typing import TypeVar, cast

from pydantic import SecretStr
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from armada_logs import schema
from armada_logs.const import RolesEnum, ScopesEnum
from armada_logs.database.dependencies import get_db_session_context
from armada_logs.database.query import update_or_insert_bulk
from armada_logs.logging import logger
from armada_logs.models.authentication import get_authentication_server

T = TypeVar("T")


async def create_demo_configuration():
    """
    Create a demo configuration if it does not already exist.
    """
    async with get_db_session_context() as session:
        # Add demo role
        result = await session.scalar(select(schema.roles.ORMRole).where(schema.roles.ORMRole.name == RolesEnum.DEMO))
        if not result:
            session.add(
                schema.roles.ORMRole(
                    name=RolesEnum.DEMO,
                    description="Demo access",
                    scopes=" ".join([ScopesEnum.USER_READ, ScopesEnum.ADMIN_READ]),
                )
            )

        # Add demo data source
        result = await session.scalar(select(schema.data_sources.ORMDataSourceDemo))
        if not result:
            session.add(
                schema.data_sources.ORMDataSourceDemo(
                    name="Demo",
                    description="Demo data source with sample data",
                    host="https://localhost",
                    is_assets_supported=True,
                    is_logs_supported=True,
                    asset_collection_interval=1,
                    is_asset_collection_enabled=True,
                    is_log_fetching_enabled=True,
                )
            )

        # Add demo user
        result = await session.scalar(select(schema.users.ORMUser).where(schema.users.ORMUser.email == "demo@demo.lan"))
        if not result:
            local_identity_provider = await session.scalar(select(schema.identity_providers.ORMIdentityProviderLocal))
            if not local_identity_provider:
                logger.error("Local identity provider not found. Cannot create a demo user.")
                return

            demo_role = await session.scalar(
                select(schema.roles.ORMRole).where(schema.roles.ORMRole.name == RolesEnum.DEMO)
            )
            if not demo_role:
                logger.error("Demo role not found. Cannot create a demo user.")
                return

            auth_server = await get_authentication_server(provider_id=local_identity_provider.id, db_session=session)

            new_user_db = await auth_server.register_user(
                new_user=schema.users.UserCreate(
                    name="Demo",
                    email="demo@demo.lan",
                    provider_id=local_identity_provider.id,
                    password=SecretStr("demo"),
                    password_confirm=SecretStr("demo"),
                    is_enabled=True,
                    role_id=demo_role.id,
                )
            )

            session.add(new_user_db)
        await session.commit()


async def get_database_settings_value(session: AsyncSession, key: str, value_type: type[T]) -> T | None:
    """
    Retrieve a settings value from the database by its key.
    """

    item = await session.scalar(select(schema.settings.ORMAppSettings).where(schema.settings.ORMAppSettings.key == key))

    return cast(T, item.value) if item else None


async def update_database_settings_value(session: AsyncSession, key: str, value, group: str, autocommit: bool = True):
    """
    Updates or inserts a setting into the database.
    """

    item = await session.scalar(select(schema.settings.ORMAppSettings).where(schema.settings.ORMAppSettings.key == key))

    if item:
        item.value = value
        item.group = group
    else:
        item = schema.settings.ORMAppSettings(key=key, value=value, group=group)
    session.add(item)
    if autocommit:
        await session.commit()


async def get_nsx_host_mapping(session: AsyncSession) -> dict[str, schema.util.NSXHostMapping]:
    """
    Retrieve an ESXi Host to NSX Manager mapping.
    """

    mapping = await session.scalars(select(schema.util.ORMNSXHostMapping))
    return {x.host: schema.util.NSXHostMapping.model_validate(x) for x in mapping}


async def process_and_add_esxi_to_nsx_manager_mapping(
    session: AsyncSession, data: list[schema.util.NSXHostMappingCreate]
):
    """
    Process the ESXi to NSX mapping data and update or insert it into the database.

    Args:
        session: The database session for executing queries.
        data: A list of mapping data to process.
    """
    await update_or_insert_bulk(
        session=session,
        orm_schema=schema.util.ORMNSXHostMapping,
        objects=[x.model_dump() for x in data],
        unique_attribute=schema.util.ORMNSXHostMapping.host,
    )
