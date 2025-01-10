import ssl
from abc import ABC, abstractmethod
from typing import Literal
from uuid import UUID

import bcrypt
from ldap3 import ASYNC, Connection, Server, Tls
from ldap3.utils.conv import escape_filter_chars
from pydantic import SecretStr
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import noload

from armada_logs import schema
from armada_logs.const import (
    DEFAULT_AUTH_JWT_LIFESPAN,
    DEFAULT_REFRESH_JWT_LIFESPAN,
    ENCODING,
    IdentityProviderTypesEnum,
)
from armada_logs.core.security import access_manager, refresh_manager
from armada_logs.database import get_db_session_context
from armada_logs.util.connections import wait_for_ldap_response
from armada_logs.util.errors import AuthenticationError, DataValidationError, NotFoundError


async def get_token_lifespan(
    db_session: AsyncSession, name: Literal["refresh_jwt_lifespan", "auth_jwt_lifespan"]
) -> int:
    """
    Retrieve the lifespan of a token from the database settings.
    """
    lifespan = await db_session.scalar(
        select(schema.settings.ORMAppSettings).where(schema.settings.ORMAppSettings.key == name)
    )
    if lifespan is not None and isinstance(lifespan.value, int):
        return lifespan.value
    if name == "auth_jwt_lifespan":
        return DEFAULT_AUTH_JWT_LIFESPAN
    return DEFAULT_REFRESH_JWT_LIFESPAN


@access_manager.user_loader()
async def access_manager_query_user(user_id: str, db_session: AsyncSession | None = None) -> schema.users.User | None:
    """
    Query a user by their user ID. Used by the access manager to load the user.

    Args:
        user_id: The ID of the user to query.
        db_session: The database session to use.

    Returns:
        User | None: The user object if found and enabled, otherwise None.
    """

    if db_session is None:
        async with get_db_session_context() as db_session:
            user = await db_session.get(
                schema.users.ORMUser,
                UUID(user_id),
                options=[noload(schema.users.ORMUser.role), noload(schema.users.ORMUser.provider)],
            )
    else:
        user = await db_session.get(
            schema.users.ORMUser,
            UUID(user_id),
            options=[noload(schema.users.ORMUser.role), noload(schema.users.ORMUser.provider)],
        )

    if not user or not user.is_enabled:
        return None

    return schema.users.User.model_validate(user)


@refresh_manager.user_loader()
async def refresh_manager_query_user(user_id: str, db_session: AsyncSession | None = None) -> schema.users.User | None:
    """
    Query a user by their user ID. Used by the refresh manager to load the user.

    Args:
        user_id: The ID of the user to query.
        db_session: The database session to use.

    Returns:
        User | None: The user object if found and enabled, otherwise None.
    """

    if db_session is None:
        async with get_db_session_context() as db_session:
            user = await db_session.get(
                schema.users.ORMUser,
                UUID(user_id),
                options=[noload(schema.users.ORMUser.role), noload(schema.users.ORMUser.provider)],
            )
    else:
        user = await db_session.get(
            schema.users.ORMUser,
            UUID(user_id),
            options=[noload(schema.users.ORMUser.role), noload(schema.users.ORMUser.provider)],
        )

    if not user or not user.is_enabled:
        return None
    return schema.users.User.model_validate(user)


class AuthServerBase(ABC):
    """
    Base class for authentication servers.
    """

    def __init__(self, config: schema.identity_providers.IdentityProvider) -> None:
        self.config = config

    @abstractmethod
    async def check_connectivity(self) -> None:
        """
        Check the connectivity of the authentication server.

        Raises:
            Exception: If the validation is unsuccessful.
        """
        pass

    @abstractmethod
    async def register_user(self, new_user: schema.users.UserCreate) -> schema.users.ORMUser:
        """
        Register a user with the authentication server.

        Raises:
            Exception: If an error occurs while creating the user.
        """
        pass

    @abstractmethod
    async def authenticate_user(self, user: schema.users.User, credentials: schema.util.Credentials) -> bool:
        """
        Authenticate a user with the authentication server.

        Raises:
            Exception: If an error occurs.
        """
        pass


class AuthServerLocal(AuthServerBase):
    """
    Local authentication server implementation.
    """

    def __init__(self, config: schema.identity_providers.IdentityProviderLocal) -> None:
        super().__init__(config=config)

    async def check_connectivity(self) -> None:
        """
        Check the connectivity of the local authentication server.

        Raises:
            Exception: If the validation is unsuccessful.
        """
        return

    def hash_password(self, password: str) -> bytes:
        """
        Create a password hash.
        """
        return bcrypt.hashpw(password.encode(ENCODING), bcrypt.gensalt())

    def validate_passwords(self, password: str | SecretStr | None, password_confirm: str | SecretStr | None):
        """
        Validates the provided passwords to ensure they are not empty and that they match.

        Raises:
            ValueError: If either password is empty or if the passwords do not match.
        """
        if isinstance(password, SecretStr):
            password = password.get_secret_value()
        if isinstance(password_confirm, SecretStr):
            password_confirm = password_confirm.get_secret_value()
        if not password or not password_confirm:
            raise ValueError("Password cannot be empty")

        if password != password_confirm:
            raise ValueError("Passwords do not match")

    async def register_user(self, new_user: schema.users.UserCreate) -> schema.users.ORMUser:
        """
        Register a user with the local authentication server.

        Raises:
            Exception: If an error occurs while creating the user.
        """
        self.validate_passwords(password=new_user.password, password_confirm=new_user.password_confirm)
        user = schema.users.ORMUser(
            email=new_user.email,
            name=new_user.name,
            password_hash=self.hash_password(new_user.password.get_secret_value()),  # type: ignore
            role_id=new_user.role_id,
            provider_id=new_user.provider_id,
            is_enabled=new_user.is_enabled,
        )

        return user

    async def authenticate_user(self, user: schema.users.User, credentials: schema.util.Credentials) -> bool:
        """
        Authenticate a user with the local authentication server.

        Raises:
            Exception: If an error occurs.
        """
        if user.email != credentials.email or user.password_hash is None:
            return False
        return bcrypt.checkpw(credentials.password.get_secret_value().encode(ENCODING), user.password_hash)


class AuthServerLdap(AuthServerBase):
    """
    LDAP authentication server implementation.
    """

    def __init__(self, config: schema.identity_providers.IdentityProviderLdap) -> None:
        super().__init__(config=config)
        self.config = config
        tls = Tls(validate=ssl.CERT_REQUIRED if self.config.is_certificate_validation_enabled else ssl.CERT_NONE)
        self.server = Server(
            self.config.server,
            port=int(self.config.port),
            use_ssl=self.config.is_connection_secure,
            tls=tls,
            get_info="ALL",
        )

    async def check_connectivity(self) -> None:
        """
        Check the connectivity of the LDAP authentication server.

        Raises:
            Exception: If the validation is unsuccessful.
        """
        with Connection(
            server=self.server,
            client_strategy=ASYNC,
            authentication="SIMPLE",
            user=self.config.user,
            auto_bind=True,
            password=self.config.password,
        ) as connection:
            msg_id = connection.search(
                search_base=self.config.base,
                search_filter=self._create_filter(attribute=self.config.cn, value="*"),
                size_limit=1,
            )
            response = await wait_for_ldap_response(conn=connection, msg_id=msg_id)
            if not response:
                raise DataValidationError(
                    "0 LDAP entries were found with the current LDAP filter. Please verify the LDAP configuration."
                )

    def _create_filter(self, attribute: str, value: str) -> str:
        return self.config.search_filter.replace("%a", attribute).replace("%u", value)

    async def _find_user(self, connection: "Connection", email: str) -> dict:
        msg_id = connection.search(
            search_base=self.config.base,
            search_filter=self._create_filter(attribute=self.config.cn, value=escape_filter_chars(email)),
            attributes=[self.config.cn],
        )

        response = await wait_for_ldap_response(conn=connection, msg_id=msg_id)
        # Currently, ldap3 does not follow reference in the result
        # https://github.com/cannatag/ldap3/issues/936
        response = [entry for entry in response if entry["type"] == "searchResEntry"]
        if len(response) == 0:
            raise AuthenticationError("No user found with the provided login name.")
        if len(response) > 1:
            raise AuthenticationError("More than one user found with the same login name.")
        return response[0]

    async def register_user(self, new_user: schema.users.UserCreate) -> schema.users.ORMUser:
        """
        Register a user with the LDAP authentication server.

        Raises:
            Exception: If an error occurs while creating the user.
        """
        with Connection(
            server=self.server,
            client_strategy=ASYNC,
            authentication="SIMPLE",
            user=self.config.user,
            auto_bind=True,
            password=self.config.password,
        ) as connection:
            user = await self._find_user(connection=connection, email=new_user.email)

        user = schema.users.ORMUser(
            email=new_user.email,
            name=new_user.name,
            role_id=new_user.role_id,
            provider_id=new_user.provider_id,
            is_enabled=new_user.is_enabled,
        )
        return user

    async def _test_user_credentials(self, dn: str, password: str):
        with Connection(
            server=self.server,
            client_strategy=ASYNC,
            authentication="SIMPLE",
            user=dn,
            auto_bind=True,
            password=password,
        ) as _connection:
            pass

    async def authenticate_user(self, user: schema.users.User, credentials: schema.util.Credentials) -> bool:
        """
        Authenticate a user with the LDAP authentication server.

        Raises:
            Exception: If an error occurs.
        """
        if user.email != credentials.email:
            return False

        with Connection(
            server=self.server,
            client_strategy=ASYNC,
            authentication="SIMPLE",
            user=self.config.user,
            auto_bind=True,
            password=self.config.password,
        ) as connection:
            ldap_user = await self._find_user(connection=connection, email=user.email)
            await self._test_user_credentials(dn=ldap_user["dn"], password=credentials.password.get_secret_value())
            return True


async def get_authentication_server(
    provider_id: UUID, db_session: AsyncSession, only_enabled: bool = True
) -> AuthServerBase:
    """
    Get the authentication server based on the provider ID.

    Args:
        only_enabled: If True, only return enabled providers. Defaults to True.

    Raises:
        ValidationException: If there is an issue with the provided arguments or if the authentication server cannot be retrieved.
    """

    provider = await db_session.get(schema.identity_providers.ORMIdentityProvider, provider_id)

    if provider is None:
        raise DataValidationError("Authentication provider with this ID does not exist")

    if only_enabled and not provider.is_enabled:
        raise DataValidationError("Authentication provider is disabled")

    match provider.entity_type:
        case IdentityProviderTypesEnum.LOCAL:
            return AuthServerLocal(config=schema.identity_providers.IdentityProviderLocal.model_validate(provider))
        case IdentityProviderTypesEnum.LDAP:
            return AuthServerLdap(config=schema.identity_providers.IdentityProviderLdap.model_validate(provider))
        case _:
            raise NotFoundError("Authentication server not found")
