from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Path, Security, status
from fastapi.exceptions import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from armada_logs import models, schema
from armada_logs.const import USE_BACKEND_VALUE, ScopesEnum
from armada_logs.core.security import access_manager
from armada_logs.database import get_db_session, update_database_entry

router = APIRouter(prefix="/credential_profiles")


@router.get(path="", response_model=list[schema.data_sources.CredentialProfileResponse])
async def list_credential_profiles(
    db_session: Annotated[AsyncSession, Depends(get_db_session)],
    user: Annotated[schema.users.User, Security(access_manager, scopes=[ScopesEnum.ADMIN_READ])],
):
    """
    Get a list of credential profiles.
    """
    pass
    return await db_session.scalars(select(schema.data_sources.ORMCredentialProfile))


@router.get(path="/{id}", response_model=schema.data_sources.CredentialProfileResponse)
async def get_credential_profile(
    item_id: Annotated[UUID, Path(alias="id")],
    db_session: Annotated[AsyncSession, Depends(get_db_session)],
    user: Annotated[schema.users.User, Security(access_manager, scopes=[ScopesEnum.ADMIN_READ])],
):
    """
    Get a specific credential profile by its UUID.
    """
    return await db_session.get_one(schema.data_sources.ORMCredentialProfile, item_id)


@router.post(path="", response_model=schema.data_sources.CredentialProfileResponse)
async def add_credential_profile(
    credential_profile: schema.data_sources.CredentialProfileCreate,
    db_session: Annotated[AsyncSession, Depends(get_db_session)],
    user: Annotated[schema.users.User, Security(access_manager, scopes=[ScopesEnum.ADMIN_WRITE])],
):
    """
    Add a new credential profile.
    """

    db_entry = await db_session.scalar(
        select(schema.data_sources.ORMCredentialProfile).where(
            schema.data_sources.ORMCredentialProfile.name == credential_profile.name
        )
    )

    if db_entry:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Credential Profile with the same name already exists"
        )

    new_profile = schema.data_sources.ORMCredentialProfile(**credential_profile.model_dump())
    db_session.add(new_profile)
    await db_session.commit()

    return new_profile


@router.put(path="/{id}")
async def update_credential_profile(
    credential_profile: schema.data_sources.CredentialProfileUpdate,
    item_id: Annotated[UUID, Path(alias="id")],
    db_session: Annotated[AsyncSession, Depends(get_db_session)],
    user: Annotated[schema.users.User, Security(access_manager, scopes=[ScopesEnum.ADMIN_WRITE])],
):
    """
    Update a specific credential profile.
    """

    db_entry = await db_session.get_one(schema.data_sources.ORMCredentialProfile, item_id)

    profile_object = credential_profile.model_dump()
    if credential_profile.password and credential_profile.password.get_secret_value().startswith(USE_BACKEND_VALUE):
        profile_object["password"] = db_entry.password
    if credential_profile.token and credential_profile.token.get_secret_value().startswith(USE_BACKEND_VALUE):
        profile_object["token"] = db_entry.token
    update_database_entry(db_entry, profile_object)
    await models.data_sources.update_credential_profile(session=db_session, db_obj=db_entry)


@router.delete(path="/{id}")
async def delete_credential_profile(
    item_id: Annotated[UUID, Path(alias="id")],
    db_session: Annotated[AsyncSession, Depends(get_db_session)],
    user: Annotated[schema.users.User, Security(access_manager, scopes=[ScopesEnum.ADMIN_WRITE])],
):
    """
    Delete a specific credential profile by its UUID.
    """

    db_entry = await db_session.get_one(schema.data_sources.ORMCredentialProfile, item_id)
    await db_session.delete(db_entry)
    await db_session.commit()
