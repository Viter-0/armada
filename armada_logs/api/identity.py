from typing import Annotated
from uuid import UUID, uuid4

from fastapi import APIRouter, Body, Depends, HTTPException, Path, Security, status
from pydantic import SecretStr
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from armada_logs import models, schema
from armada_logs.const import USE_BACKEND_VALUE, IdentityProviderTypesEnum, ScopesEnum
from armada_logs.core.security import access_manager
from armada_logs.database import get_db_session, update_database_entry
from armada_logs.logging import logger

router = APIRouter()


@router.get(path="/users", response_model=list[schema.users.UserResponse])
async def list_users(
    user: Annotated[schema.users.User, Security(access_manager, scopes=[ScopesEnum.ADMIN_READ])],
    db_session: Annotated[AsyncSession, Depends(get_db_session)],
):
    """
    Get a list of all users.
    """
    return await db_session.scalars(select(schema.users.ORMUser))


@router.get(path="/users/me", response_model=schema.users.UserResponse)
async def get_current_user(
    user: Annotated[schema.users.User, Security(access_manager, scopes=[ScopesEnum.USER_READ])],
    db_session: Annotated[AsyncSession, Depends(get_db_session)],
):
    """
    Get information about the current user.
    """
    return await db_session.get_one(entity=schema.users.ORMUser, ident=user.id)


@router.get(path="/users/{id}", response_model=schema.users.UserResponse)
async def get_user(
    item_id: Annotated[UUID, Path(alias="id")],
    user: Annotated[schema.users.User, Security(access_manager, scopes=[ScopesEnum.ADMIN_READ])],
    db_session: Annotated[AsyncSession, Depends(get_db_session)],
):
    """
    Get a specific user by their UUID.
    """
    return await db_session.get_one(entity=schema.users.ORMUser, ident=item_id)


@router.put(path="/users/{id}")
async def update_user(
    user_update: schema.users.UserUpdate,
    item_id: Annotated[UUID, Path(alias="id")],
    user: Annotated[schema.users.User, Security(access_manager, scopes=[ScopesEnum.ADMIN_WRITE])],
    db_session: Annotated[AsyncSession, Depends(get_db_session)],
):
    """
    Update a specific user.

    Password attributes are required only for the local authentication provider.
    Users can't modify their own accounts.
    """
    if item_id == user.id:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="You cannot modify your own account"
        )

    db_user = await db_session.get_one(schema.users.ORMUser, item_id)

    # Generate new password hash for the local user
    if (
        user_update.password
        and user_update.password.get_secret_value() is not None
        and not user_update.password.get_secret_value().startswith(USE_BACKEND_VALUE)
    ):
        auth_server = await models.authentication.get_authentication_server(
            provider_id=db_user.provider_id, db_session=db_session
        )
        if isinstance(auth_server, models.authentication.AuthServerLocal):
            try:
                auth_server.validate_passwords(
                    password=user_update.password, password_confirm=user_update.password_confirm
                )
            except ValueError as e:
                raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(e)) from e
            db_user.password_hash = auth_server.hash_password(password=user_update.password.get_secret_value())

    # UserUpdate doesn't have password_hash attribute, so it's safe to use model_dump after password_hash change
    update_database_entry(db_user, user_update.model_dump())

    db_session.add(db_user)
    await db_session.commit()


@router.delete(path="/users/{id}")
async def delete_user(
    item_id: Annotated[UUID, Path(alias="id")],
    user: Annotated[schema.users.User, Security(access_manager, scopes=[ScopesEnum.ADMIN_WRITE])],
    db_session: Annotated[AsyncSession, Depends(get_db_session)],
):
    """
    Delete a specific user by their UUID.
    """
    if item_id == user.id:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="You cannot delete your own account"
        )

    db_user = await db_session.get_one(schema.users.ORMUser, item_id)

    await db_session.delete(db_user)
    await db_session.commit()


@router.post(path="/users")
async def add_user(
    user_create: schema.users.UserCreate,
    user: Annotated[schema.users.User, Security(access_manager, scopes=[ScopesEnum.ADMIN_WRITE])],
    db_session: Annotated[AsyncSession, Depends(get_db_session)],
):
    """
    Add a new user.

    Password attributes are required only for the local authentication provider.
    """
    db_user = await db_session.scalar(
        select(schema.users.ORMUser).where(schema.users.ORMUser.email == user_create.email)
    )
    if db_user:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="User with the same email already exists")

    try:
        auth_server = await models.authentication.get_authentication_server(
            provider_id=user_create.provider_id, db_session=db_session
        )
        new_user_db = await auth_server.register_user(new_user=user_create)
    except Exception as e:
        logger.exception(e)
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e)) from e

    db_session.add(new_user_db)

    await db_session.commit()


@router.get(path="/roles", response_model=list[schema.roles.RoleResponse])
async def list_roles(
    user: Annotated[schema.users.User, Security(access_manager, scopes=[ScopesEnum.ADMIN_READ])],
    db_session: Annotated[AsyncSession, Depends(get_db_session)],
):
    """
    Get a list of all roles.
    """
    return await db_session.scalars(select(schema.roles.ORMRole))


@router.get(path="/roles/{id}", response_model=schema.roles.RoleResponse)
async def get_role(
    item_id: Annotated[UUID, Path(alias="id")],
    user: Annotated[schema.users.User, Security(access_manager, scopes=[ScopesEnum.ADMIN_READ])],
    db_session: Annotated[AsyncSession, Depends(get_db_session)],
):
    """
    Get a specific role by its UUID.
    """
    return await db_session.get_one(schema.roles.ORMRole, item_id)


@router.get(path="/providers", response_model=list[schema.identity_providers.PolymorphicIdentityProviderResponse])
async def list_providers(
    user: Annotated[schema.users.User, Security(access_manager, scopes=[ScopesEnum.ADMIN_READ])],
    db_session: Annotated[AsyncSession, Depends(get_db_session)],
):
    """
    Get a list of all identity providers.
    """
    return await db_session.scalars(select(schema.identity_providers.ORMIdentityProvider))


@router.get(path="/providers/local", response_model=list[schema.identity_providers.IdentityProviderLocalResponse])
async def list_providers_local(
    user: Annotated[schema.users.User, Security(access_manager, scopes=[ScopesEnum.ADMIN_READ])],
    db_session: Annotated[AsyncSession, Depends(get_db_session)],
):
    """
    Get a list of all LOCAL identity providers.
    """
    return await db_session.scalars(select(schema.identity_providers.ORMIdentityProviderLocal))


@router.get(path="/providers/local/{id}", response_model=schema.identity_providers.IdentityProviderLocalResponse)
async def get_provider_local(
    item_id: Annotated[UUID, Path(alias="id")],
    user: Annotated[schema.users.User, Security(access_manager, scopes=[ScopesEnum.ADMIN_READ])],
    db_session: Annotated[AsyncSession, Depends(get_db_session)],
):
    """
    Get a specific LOCAL identity provider by its UUID.
    """
    return await db_session.get_one(schema.identity_providers.ORMIdentityProviderLocal, item_id)


@router.put(path="/providers/local/{id}")
async def update_provider_local(
    provider: schema.identity_providers.IdentityProviderLocalUpdate,
    item_id: Annotated[UUID, Path(alias="id")],
    user: Annotated[schema.users.User, Security(access_manager, scopes=[ScopesEnum.ADMIN_WRITE])],
    db_session: Annotated[AsyncSession, Depends(get_db_session)],
):
    """
    Update a specific LOCAL identity provider.
    """

    if not provider.is_enabled:
        active_provider_count = await db_session.scalar(
            select(func.count())
            .select_from(schema.identity_providers.ORMIdentityProvider)
            .where(schema.identity_providers.ORMIdentityProvider.is_enabled)
        )
        if active_provider_count == 1:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Unable to disable the last active identity provider",
            )
        if user.provider_id == item_id:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Unable to disable the identity provider to which your user belongs",
            )

    db_provider = await db_session.get_one(schema.identity_providers.ORMIdentityProviderLocal, item_id)
    db_provider.is_enabled = provider.is_enabled
    db_session.add(db_provider)
    await db_session.commit()


@router.delete(path="/providers/local/{id}")
async def delete_provider_local(
    item_id: Annotated[UUID, Path(alias="id")],
    user: Annotated[schema.users.User, Security(access_manager, scopes=[ScopesEnum.ADMIN_WRITE])],
    db_session: Annotated[AsyncSession, Depends(get_db_session)],
):
    """
    Delete a specific LOCAL identity provider by its UUID.
    """
    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Action is not allowed")


@router.post(path="/providers/ldap/validate", operation_id="IdentityProviderLdapValidate")
async def validate_provider_ldap(
    user: Annotated[schema.users.User, Security(access_manager, scopes=[ScopesEnum.ADMIN_WRITE])],
    db_session: Annotated[AsyncSession, Depends(get_db_session)],
    item_id: Annotated[UUID | None, Body()] = None,
    config: Annotated[schema.identity_providers.IdentityProviderLdapCreate | None, Body()] = None,
) -> None:
    """
    Check if identity provider is functional.

    There are three options to validate a provider:
    1. Only ID - Check if the provider in the database is valid.
    2. Only config - Check if the provider you are trying to create is valid.
    3. ID and config - Check if the provider existing in the database that you are trying to update is valid.

    The third method will use the password in the database (if a new password is not provided) to validate the identity provider.
    """

    async def validate_server_status(srv: models.authentication.AuthServerLdap) -> None:
        try:
            await srv.check_connectivity()
        except Exception as e:
            raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(e)) from e

    if not item_id and not config:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="id or config is required")

    # ID Only
    if item_id and not config:
        try:
            server = await models.authentication.get_authentication_server(
                provider_id=item_id, db_session=db_session, only_enabled=False
            )
            if not isinstance(server, models.authentication.AuthServerLdap):
                raise ValueError("Invalid identity provider type. This route only supports LDAP provider validation")
        except ValueError as e:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e)) from e
        return await validate_server_status(server)

    # Config Only
    if config and not item_id:
        config_model = schema.identity_providers.IdentityProviderLdap(
            **config.model_dump(), is_deletable=True, id=uuid4(), entity_type=IdentityProviderTypesEnum.LDAP.value
        )
        return await validate_server_status(models.authentication.AuthServerLdap(config=config_model))

    # ID and Config
    if config and item_id:
        db_provider = await db_session.get_one(schema.identity_providers.ORMIdentityProviderLdap, item_id)

        if config.password.get_secret_value().startswith(USE_BACKEND_VALUE):
            config.password = SecretStr(db_provider.password)

        config_model = schema.identity_providers.IdentityProviderLdap(
            **config.model_dump(), is_deletable=True, id=uuid4(), entity_type=IdentityProviderTypesEnum.LDAP.value
        )
        return await validate_server_status(models.authentication.AuthServerLdap(config=config_model))


@router.get(path="/providers/ldap", response_model=list[schema.identity_providers.IdentityProviderLdapResponse])
async def list_providers_ldap(
    user: Annotated[schema.users.User, Security(access_manager, scopes=[ScopesEnum.ADMIN_READ])],
    db_session: Annotated[AsyncSession, Depends(get_db_session)],
):
    """
    Get a list of all LDAP identity providers.
    """
    return await db_session.scalars(select(schema.identity_providers.ORMIdentityProviderLdap))


@router.get(path="/providers/ldap/{id}", response_model=schema.identity_providers.IdentityProviderLdapResponse)
async def get_provider_ldap(
    item_id: Annotated[UUID, Path(alias="id")],
    user: Annotated[schema.users.User, Security(access_manager, scopes=[ScopesEnum.ADMIN_READ])],
    db_session: Annotated[AsyncSession, Depends(get_db_session)],
):
    """
    Get a specific LDAP identity provider by its UUID.
    """
    return await db_session.get_one(schema.identity_providers.ORMIdentityProviderLdap, item_id)


@router.post(path="/providers/ldap")
async def add_providers_ldap(
    provider: schema.identity_providers.IdentityProviderLdapCreate,
    user: Annotated[schema.users.User, Security(access_manager, scopes=[ScopesEnum.ADMIN_WRITE])],
    db_session: Annotated[AsyncSession, Depends(get_db_session)],
):
    """
    Add a new LDAP identity provider.
    """
    db_provider = await db_session.scalar(
        select(schema.identity_providers.ORMIdentityProvider).where(
            schema.identity_providers.ORMIdentityProvider.name == provider.name
        )
    )

    if db_provider:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Provider with the same name already exists"
        )

    new_provider = schema.identity_providers.ORMIdentityProviderLdap(**provider.model_dump())
    db_session.add(new_provider)
    await db_session.commit()


@router.delete(path="/providers/ldap/{id}")
async def delete_provider_ldap(
    item_id: Annotated[UUID, Path(alias="id")],
    user: Annotated[schema.users.User, Security(access_manager, scopes=[ScopesEnum.ADMIN_WRITE])],
    db_session: Annotated[AsyncSession, Depends(get_db_session)],
):
    """
    Delete a specific LDAP identity provider by its UUID.
    """

    db_provider = await db_session.get_one(schema.identity_providers.ORMIdentityProviderLdap, item_id)

    if db_provider.is_enabled:
        active_provider_count = await db_session.scalar(
            select(func.count())
            .select_from(schema.identity_providers.ORMIdentityProvider)
            .where(schema.identity_providers.ORMIdentityProvider.is_enabled)
        )
        if active_provider_count == 1:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Unable to delete the last active identity provider",
            )

    await db_session.delete(db_provider)
    await db_session.commit()


@router.put(path="/providers/ldap/{id}")
async def update_provider_ldap(
    provider: schema.identity_providers.IdentityProviderLdapUpdate,
    item_id: Annotated[UUID, Path(alias="id")],
    user: Annotated[schema.users.User, Security(access_manager, scopes=[ScopesEnum.ADMIN_WRITE])],
    db_session: Annotated[AsyncSession, Depends(get_db_session)],
):
    """
    Update a specific LDAP Identity Provider.
    """

    if not provider.is_enabled:
        active_provider_count = await db_session.scalar(
            select(func.count())
            .select_from(schema.identity_providers.ORMIdentityProvider)
            .where(schema.identity_providers.ORMIdentityProvider.is_enabled)
        )
        if active_provider_count == 1:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Unable to disable the last active identity provider",
            )
        if user.provider_id == item_id:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Unable to disable the identity provider to which your user belongs",
            )

    db_provider = await db_session.get_one(schema.identity_providers.ORMIdentityProviderLdap, item_id)

    new_provider = provider.model_dump()

    if provider.password.get_secret_value().startswith(USE_BACKEND_VALUE):
        new_provider["password"] = db_provider.password

    update_database_entry(db_provider, new_provider)
    db_session.add(db_provider)
    await db_session.commit()
