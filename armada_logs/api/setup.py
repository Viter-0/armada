from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from armada_logs import models, schema
from armada_logs.const import IdentityProviderTypesEnum, RolesEnum
from armada_logs.database import get_db_session

router = APIRouter(prefix="/setup")


@router.get(path="/state")
async def state(db_session: AsyncSession = Depends(get_db_session)) -> schema.settings.SetupSettingsResponse:
    """
    Get current setup state
    """

    state = await db_session.scalars(
        select(schema.settings.ORMAppSettings).where(schema.settings.ORMAppSettings.group == "setup")
    )
    state_dict: dict = {entity.key: entity.value for entity in state}

    return schema.settings.SetupSettingsResponse(
        is_initial_user_created=state_dict.get("is_initial_user_created", False)
    )


@router.post(path="/user", response_model=schema.users.UserResponse)
async def setup_user(data: schema.users.SetupUser, db_session: AsyncSession = Depends(get_db_session)):
    """
    Create initial app admin user
    """

    initial_user_created = await models.util.get_database_settings_value(
        session=db_session, key="is_initial_user_created", value_type=bool
    )

    if initial_user_created:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Initial user already created")

    role = await db_session.scalar(select(schema.roles.ORMRole).where(schema.roles.ORMRole.name == RolesEnum.ADMIN))
    provider = await db_session.scalar(select(schema.identity_providers.ORMIdentityProviderLocal))

    if role is None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f'Role "{RolesEnum.ADMIN}" not found'
        )

    if provider is None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f'Identity Provider "{IdentityProviderTypesEnum.LOCAL}" not found',
        )

    try:
        auth_server = await models.authentication.get_authentication_server(
            provider_id=provider.id, db_session=db_session
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Authentication server not found"
        ) from e

    user = await auth_server.register_user(
        new_user=schema.users.UserCreate(
            name=data.name,
            email=data.email,
            provider_id=provider.id,
            role_id=role.id,
            is_enabled=True,
            password=data.password,
            password_confirm=data.password,
        )
    )

    db_session.add_all([user, schema.settings.ORMAppSettings(key="is_initial_user_created", value=True, group="setup")])
    await db_session.commit()
    await db_session.refresh(user, attribute_names=["role", "provider"])

    return user
