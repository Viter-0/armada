from base64 import urlsafe_b64encode
from collections.abc import Callable
from datetime import UTC, datetime
from typing import Any
from uuid import UUID, uuid4

from cryptography.fernet import Fernet
from cryptography.hazmat.backends import default_backend
from cryptography.hazmat.primitives import hashes
from pydantic import SecretStr
from sqlalchemy.orm import (
    DeclarativeBase,
    Mapped,
    declared_attr,
    mapped_column,
    orm_insert_sentinel,
)
from sqlalchemy.types import TEXT, DateTime, TypeDecorator

from armada_logs.const import ENCODING


class EncryptedStringType(TypeDecorator):
    impl = TEXT

    cache_ok = False

    def __init__(self, key: str | Callable[[], str], *args: Any, **kwargs: Any):
        super().__init__(*args, **kwargs)
        self.key = key

    def create_key(self, key: str | bytes) -> bytes:
        """
        Convert key to Fernet compatible - A URL-safe base64-encoded 32-byte key.

        Args:
            key: encryption key
        """
        if isinstance(key, str):
            key = key.encode(encoding=ENCODING)
        digest = hashes.Hash(hashes.SHA256(), backend=default_backend())
        digest.update(key)
        key = digest.finalize()
        return urlsafe_b64encode(key)

    def create_engine(self, key: str | bytes | Callable[[], str]):
        """
        Create Fernet Engine.

        Args:
            key: encryption key
        """
        k = key() if callable(key) else key
        self.engine = Fernet(self.create_key(key=k))

    def process_bind_param(self, value: str | None | SecretStr, dialect):
        if value is None:
            return value
        if isinstance(value, SecretStr):
            value = value.get_secret_value()

        self.create_engine(key=self.key)

        val = value.encode(ENCODING)
        encrypted = self.engine.encrypt(val)
        return encrypted.decode(ENCODING)

    def process_result_value(self, value: None | str, dialect):
        if value is None:
            return value

        self.create_engine(key=self.key)
        decrypted: bytes = self.engine.decrypt(value.encode(ENCODING))
        return decrypted.decode(ENCODING)


class DateTimeUTC(TypeDecorator[datetime]):
    """Timezone Aware DateTime.

    Ensure UTC is stored in the database and that TZ aware dates are returned for all dialects.
    """

    impl = DateTime(timezone=True)
    cache_ok = True

    @property
    def python_type(self) -> type[datetime]:
        return datetime

    def process_bind_param(self, value: datetime | None, dialect) -> datetime | None:
        if value is None:
            return value
        if not value.tzinfo:
            msg = "tzinfo is required"
            raise TypeError(msg)
        return value.astimezone(UTC)

    def process_result_value(self, value: datetime | None, dialect) -> datetime | None:
        if value is None:
            return value
        if value.tzinfo is None:
            return value.replace(tzinfo=UTC)
        return value


class Base(DeclarativeBase):
    id: Mapped[UUID] = mapped_column(default=uuid4, primary_key=True)

    @declared_attr
    def _sentinel(cls) -> Mapped[int]:
        return orm_insert_sentinel()


class AuditMixin:
    created_at: Mapped[datetime] = mapped_column(
        DateTimeUTC(timezone=True),
        default=lambda: datetime.now(UTC),
    )

    updated_at: Mapped[datetime] = mapped_column(
        DateTimeUTC(timezone=True),
        default=lambda: datetime.now(UTC),
        onupdate=lambda: datetime.now(UTC),
    )
