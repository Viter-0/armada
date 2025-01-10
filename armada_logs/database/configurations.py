from __future__ import annotations

from abc import ABC, abstractmethod
from pathlib import Path
from secrets import token_hex

from sqlalchemy import event as sa_event
from sqlalchemy import pool
from sqlalchemy.engine import Dialect, Engine
from sqlalchemy.engine.url import make_url
from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession, create_async_engine
from sqlalchemy.orm import Session

from armada_logs.settings import app as app_settings

ENGINES: dict[str, AsyncEngine | None] = {}


def get_encryption_secret() -> str:
    """
    Retrieves the database encryption secret.
    """
    if app_settings.DATABASE_ENCRYPTION_SECRET != "":
        return app_settings.DATABASE_ENCRYPTION_SECRET
    app_settings.upsert_env_variables(variables={"DATABASE_ENCRYPTION_SECRET": token_hex(64)})
    return app_settings.DATABASE_ENCRYPTION_SECRET


def get_dialect(
    obj: str | Session | Engine,
) -> type[Dialect]:
    """
    Gets the dialect of a session, engine, or connection URL.
    """
    if isinstance(obj, Session):
        if not obj.bind:
            raise ValueError("Session bind not found")
        url = obj.bind.engine.url
    elif isinstance(obj, Engine):
        url = obj.url
    else:
        url = make_url(obj)
    return url.get_dialect()


class DatabaseConfigurationBase(ABC):
    def __init__(self, connection_url: str):
        self.connection_url = connection_url

    @abstractmethod
    def engine(self) -> AsyncEngine:
        """Returns a SQLAlchemy engine"""
        pass

    @abstractmethod
    def session(self, engine: AsyncEngine) -> AsyncSession:
        """
        Returns a SQLAlchemy session for an engine.
        """
        pass

    @property
    @abstractmethod
    def versions_folder(self) -> str:
        """
        Returns an alembic migrations directory.
        """
        pass


class SQLiteConfiguration(DatabaseConfigurationBase):
    def engine(self) -> AsyncEngine:
        """Returns a SQLAlchemy engine"""
        engine = ENGINES.get(self.connection_url)
        if engine:
            return engine

        engine = create_async_engine(self.connection_url, future=True)
        sa_event.listen(engine.sync_engine, "connect", self.setup_sqlite)
        ENGINES[self.connection_url] = engine
        return engine

    def session(self, engine: AsyncEngine) -> AsyncSession:
        """
        Returns a SQLAlchemy session for an engine.
        """
        return AsyncSession(engine, expire_on_commit=False)

    @property
    def versions_folder(self) -> str:
        """
        Returns an alembic migrations directory.
        """
        return str(Path(__file__).parent / "alembic" / "versions" / "sqlite")

    def setup_sqlite(self, dbapi_connection, connection_record):
        """
        Sets SQLite settings when a new database connection is created.
        """
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.execute("PRAGMA legacy_alter_table=OFF")
        cursor.close()


class PostgreSQLConfiguration(DatabaseConfigurationBase):
    def engine(self) -> AsyncEngine:
        """Returns a SQLAlchemy engine"""
        engine = ENGINES.get(self.connection_url)
        if engine:
            return engine
        # Alembic migrations only work with NullPool
        engine = create_async_engine(self.connection_url, future=True, poolclass=pool.NullPool)
        ENGINES[self.connection_url] = engine
        return engine

    def session(self, engine: AsyncEngine) -> AsyncSession:
        """
        Returns a SQLAlchemy session for an engine.
        """
        return AsyncSession(engine, expire_on_commit=False)

    @property
    def versions_folder(self) -> str:
        """
        Returns an alembic migrations directory.
        """
        return str(Path(__file__).parent / "alembic" / "versions" / "postgres")
