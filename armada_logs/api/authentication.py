from datetime import timedelta
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Response, Security, status
from fastapi.security import OAuth2PasswordRequestForm
from fastapi_login.exceptions import InvalidCredentialsException
from pydantic import SecretStr
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import noload

from armada_logs import models, schema
from armada_logs.const import RolesEnum, ScopesEnum
from armada_logs.core.security import access_manager, refresh_manager
from armada_logs.database import get_db_session

router = APIRouter(prefix="/auth")


@router.post(path="/token", response_model=schema.util.AccessToken, operation_id="AccessTokenCreate")
async def create_auth_token(
    response: Response,
    data: Annotated[OAuth2PasswordRequestForm, Depends()],
    db_session: Annotated[AsyncSession, Depends(get_db_session)],
) -> schema.util.AccessToken:
    """
    Create auth and refresh tokens.
    All API requests must provide the Bearer auth token in the Authorization header
    """
    credentials = schema.util.Credentials(email=data.username, password=SecretStr(data.password))

    user_orm = await db_session.scalar(
        select(schema.users.ORMUser)
        .where(schema.users.ORMUser.email == credentials.email)
        .options(noload(schema.users.ORMUser.provider))
    )

    if user_orm is None:
        raise InvalidCredentialsException

    user = schema.users.User.model_validate(user_orm)

    try:
        auth_server = await models.authentication.get_authentication_server(
            provider_id=user.provider_id, db_session=db_session
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e)) from e

    try:
        auth_state = await auth_server.authenticate_user(user=user, credentials=credentials)
    except Exception:
        raise InvalidCredentialsException from None

    if auth_state is False:
        raise InvalidCredentialsException

    refresh_cookie = user.create_refresh_cookie(
        expires=timedelta(
            minutes=await models.authentication.get_token_lifespan(db_session=db_session, name="refresh_jwt_lifespan")
        )
    )

    await models.metrics.log_activity(session=db_session, user_id=user.id, category="auth", action="login")

    response.set_cookie(**refresh_cookie.model_dump())
    return schema.util.AccessToken(
        access_token=user.create_access_token(
            expires=timedelta(
                minutes=await models.authentication.get_token_lifespan(db_session=db_session, name="auth_jwt_lifespan")
            )
        ),
        token_type="bearer",
    )


@router.delete(path="/token")
async def delete_auth_token(response: Response):
    """
    Delete the authentication token cookie.
    """
    response.delete_cookie(refresh_manager.cookie_name, samesite="strict")


@router.post(path="/refresh", response_model=schema.util.AccessToken)
async def refresh_auth_token(
    response: Response,
    db_session: Annotated[AsyncSession, Depends(get_db_session)],
    user: Annotated[schema.users.User, Security(refresh_manager, scopes=[ScopesEnum.TOKEN_REFRESH])],
) -> schema.util.AccessToken:
    """
    Receive a new authentication token using the refresh token.
    """
    current_user_orm = await db_session.get_one(
        schema.users.ORMUser, user.id, options=[noload(schema.users.ORMUser.provider)]
    )
    current_user = schema.users.User.model_validate(current_user_orm)
    refresh_cookie = current_user.create_refresh_cookie(
        expires=timedelta(
            minutes=await models.authentication.get_token_lifespan(db_session=db_session, name="refresh_jwt_lifespan")
        )
    )
    await models.metrics.log_activity(session=db_session, user_id=user.id, category="auth", action="refresh")
    response.set_cookie(**refresh_cookie.model_dump())
    return schema.util.AccessToken(
        access_token=current_user.create_access_token(
            expires=timedelta(
                minutes=await models.authentication.get_token_lifespan(db_session=db_session, name="auth_jwt_lifespan")
            )
        ),
        token_type="bearer",
    )


@router.post(path="/password")
async def change_password(
    password: schema.util.NewPassword,
    db_session: Annotated[AsyncSession, Depends(get_db_session)],
    user: Annotated[schema.users.User, Security(access_manager, scopes=[ScopesEnum.USER_READ])],
):
    """
    Change the current user's password.
    Applicable only for local users.
    """

    try:
        auth_server = await models.authentication.get_authentication_server(
            provider_id=user.provider_id, db_session=db_session
        )
        if not isinstance(auth_server, models.authentication.AuthServerLocal):
            raise ValueError("Password change is only available for local accounts")
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e)) from e

    auth_status = await auth_server.authenticate_user(
        user=user, credentials=schema.util.Credentials(email=user.email, password=password.current_password)
    )
    if not auth_status:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Current password is invalid")

    if password.new_password != password.repeat_password:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="New passwords do not match")

    if password.new_password == password.current_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="New password cannot be the same as the old one"
        )

    orm_user = await db_session.get_one(schema.users.ORMUser, user.id)

    if orm_user.role.name == RolesEnum.DEMO:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Password change is not available for demo accounts"
        )

    orm_user.password_hash = auth_server.hash_password(password=password.new_password.get_secret_value())

    db_session.add(orm_user)
    await db_session.commit()
