from datetime import timedelta
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, SecretStr, StrictStr
from sqlalchemy import ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from armada_logs.const import ScopesEnum
from armada_logs.core.security import access_manager, refresh_manager

from .base import AuditMixin, Base
from .identity_providers import IdentityProvider, IdentityProviderResponse, ORMIdentityProvider
from .roles import ORMRole, Role, RoleResponse
from .util import Cookie


class ORMUser(Base, AuditMixin):
    """
    Database schema for an application user.
    """

    __tablename__ = "users"

    email: Mapped[str] = mapped_column(unique=True)
    name: Mapped[str]

    # Password hash (nullable for non-local users)
    password_hash: Mapped[Optional[bytes]]
    role_id: Mapped[UUID] = mapped_column(ForeignKey("roles.id"))
    role: Mapped["ORMRole"] = relationship(lazy="joined")
    provider_id: Mapped[UUID] = mapped_column(ForeignKey("providers.id"))
    provider: Mapped["ORMIdentityProvider"] = relationship(lazy="joined")
    is_enabled: Mapped[bool] = mapped_column(default=True)


class User(BaseModel):
    """
    Model representing an ORM application user.
    """

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    email: StrictStr
    provider_id: UUID
    is_enabled: bool
    role_id: UUID
    role: Role | None = None
    provider: IdentityProvider | None = None
    password_hash: bytes | None = None

    def create_access_token(self, expires: timedelta = timedelta(minutes=15)) -> str:
        """
        Create an access token for the user.
        Lazy loading is unsupported. The user object must also include a role.
        """
        if self.role is None:
            raise ValueError("Role not found. Lazy loading is unsupported. The user object must also include a role.")

        return access_manager.create_access_token(
            data=dict(sub=str(self.id)), expires=expires, scopes=self.role.scope_list
        )

    def create_refresh_token(self, expires: timedelta = timedelta(minutes=60)) -> str:
        """
        Create a refresh token for the user.
        """
        return refresh_manager.create_access_token(
            data=dict(sub=str(self.id)), expires=expires, scopes=[ScopesEnum.TOKEN_REFRESH]
        )

    def create_refresh_cookie(self, expires: timedelta = timedelta(minutes=60)) -> Cookie:
        """
        Create a refresh cookie for the user.
        """
        token = self.create_refresh_token(expires=expires)
        return Cookie(
            key=refresh_manager.cookie_name,
            value=token,
            httponly=True,
            samesite="strict",
            path="/api/auth",
            expires=expires.seconds,
        )


class UserResponse(BaseModel):
    """
    API output model for a user.
    """

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    email: StrictStr
    provider_id: UUID
    is_enabled: bool
    role_id: UUID
    role: RoleResponse | None = None
    provider: IdentityProviderResponse | None = None


class UserCreate(BaseModel):
    """
    Data model for creating a new application user.
    """

    model_config = ConfigDict(str_max_length=255, str_min_length=1)

    name: str
    email: StrictStr
    provider_id: UUID
    password: SecretStr | None = None
    password_confirm: SecretStr | None = None
    is_enabled: bool
    role_id: UUID


class UserUpdate(BaseModel):
    """
    Data model for updating application user information.
    """

    model_config = ConfigDict(str_max_length=255, str_min_length=1)

    name: str
    password: SecretStr | None = None
    password_confirm: SecretStr | None = None
    is_enabled: bool
    role_id: UUID


class SetupUser(BaseModel):
    """
    Represents an initial application user.
    """

    model_config = ConfigDict(str_max_length=255, str_min_length=1)

    email: StrictStr
    password: SecretStr
    name: str
