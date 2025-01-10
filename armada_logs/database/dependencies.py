from __future__ import annotations

from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager
from typing import TypedDict

from sqlalchemy import make_url
from sqlalchemy.engine import Dialect
from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession

from armada_logs.schema.base import Base
from armada_logs.settings import app as app_settings

from . import alembic_commands
from .configurations import DatabaseConfigurationBase, PostgreSQLConfiguration, SQLiteConfiguration, get_dialect


class Dependencies(TypedDict):
    db_interface: DBInterface | None
    db_config: DatabaseConfigurationBase | None


DEPENDENCIES: Dependencies = {"db_interface": None, "db_config": None}


def get_database_config():
    db_config = DEPENDENCIES.get("db_config")
    connection_url = app_settings.DB_ENGINE
    if db_config:
        return db_config

    dialect = get_dialect(connection_url)

    match dialect.name:
        case "sqlite":
            db_config = SQLiteConfiguration(connection_url)
            DEPENDENCIES["db_config"] = db_config
            return db_config
        case "postgresql":
            db_config = PostgreSQLConfiguration(connection_url)
            DEPENDENCIES["db_config"] = db_config
            return db_config
        case _:
            raise ValueError(f"Configuration for dialect '{dialect.name}' not found")


class DBInterface:
    def __init__(self, config: DatabaseConfigurationBase) -> None:
        self.config = config
        self.sa_metadata = Base.metadata

    def engine(self) -> AsyncEngine:
        return self.config.engine()

    def session(self) -> AsyncSession:
        engine = self.engine()
        return self.config.session(engine=engine)

    def run_migrations_downgrade(self, revision: str):
        alembic_commands.downgrade(revision=revision)

    def run_migrations_upgrade(self, revision: str = "head", dry_run: bool = False):
        alembic_commands.upgrade(revision=revision, dry_run=dry_run)

    def run_migrations_revision(self, message: str | None = None, autogenerate: bool = True):
        alembic_commands.revision(message=message, autogenerate=autogenerate)

    @property
    def dialect(self) -> type[Dialect]:
        return get_dialect(self.config.connection_url)

    @property
    def url(self):
        return make_url(self.config.connection_url)


def get_database_interface() -> DBInterface:
    db_interface = DEPENDENCIES.get("db_interface")

    if db_interface:
        return db_interface

    db_interface = DBInterface(config=get_database_config())
    DEPENDENCIES["db_interface"] = db_interface
    return db_interface


async def get_db_session() -> AsyncGenerator[AsyncSession, None]:
    """
    Provides an asynchronous session generator for database operations.
    """
    session = get_database_interface().session()
    try:
        yield session
    except:
        await session.rollback()
        raise
    finally:
        await session.close()


@asynccontextmanager
async def get_db_session_context() -> AsyncGenerator[AsyncSession, None]:
    """
    Provides an asynchronous context manager for database operations.
    """
    session = get_database_interface().session()
    try:
        yield session
    except:
        await session.rollback()
        raise
    finally:
        await session.close()
