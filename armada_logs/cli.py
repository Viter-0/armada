import subprocess
import sys
from pathlib import Path
from typing import Annotated, Optional

import uvicorn
import uvicorn.config
from fastapi.staticfiles import StaticFiles
from starlette.exceptions import HTTPException as StarletteHTTPException
from typer import Argument, Option, Typer

from armada_logs.const import EnvironmentsEnum
from armada_logs.database import (
    check_pending_migrations,
    get_database_interface,
)
from armada_logs.logging import setup_logging
from armada_logs.models.util import create_demo_configuration
from armada_logs.registry import TasksRegistry
from armada_logs.util.helpers import async_to_sync, file_backup, get_project_root

from .app import app_prod
from .logging import logger
from .settings import app as app_settings

# Load logging config
setup_logging()

# Global exception logging
sys.excepthook = lambda exc_type, exc_value, exc_traceback: logger.error(
    "Uncaught exception", exc_info=(exc_type, exc_value, exc_traceback)
)

# Main CLI app
cli = Typer()

# Database sub CLI
database_cli = Typer(help="Commands for interacting with the database.")

# Run sub CLI
run_cli = Typer(help="Commands for running the application.")

cli.add_typer(database_cli, name="database")
cli.add_typer(run_cli, name="run")

db_interface = get_database_interface()


class SPAStaticFiles(StaticFiles):
    """
    Serve SPA Frontend from FastAPI. Backend and Frontend must be served from the same URL because authentication is based on samesite - strict cookies.
    """

    async def get_response(self, path: str, scope):
        try:
            return await super().get_response(path, scope)
        except (
            StarletteHTTPException
        ):  # Catches Starlette's HTTPException; this will not work with FastAPI's HTTPException.
            return await super().get_response("index.html", scope)


def get_frontend_directory() -> Path:
    """
    Determines the directory path for the frontend static files.

    If the `FRONTEND_UI_STATIC_DIR` setting is set to 'ui', it returns the path to the 'ui' folder located in the project root.
    Otherwise, it returns the path specified by `FRONTEND_UI_STATIC_DIR`.
    """
    if app_settings.FRONTEND_UI_STATIC_DIR == "ui":
        return get_project_root() / "ui"
    else:
        return Path(app_settings.FRONTEND_UI_STATIC_DIR)


def broker_disclaimer():
    if not app_settings.BROKER:
        return
    logger.info(
        "The application is configured to use a broker. "
        "For the application to function, worker processes must be started manually using the 'armada worker' command. "
        "Workers can run on the same machine or remotely. They must have the same configuration as the main application and access to the same resources."
    )


def run_migrations():
    """
    Run database migrations on server startup.
    """

    async def check_migration_status():
        async with db_interface.engine().connect() as conn:
            return await conn.run_sync(check_pending_migrations, db_interface.config)

    migration_state = async_to_sync(check_migration_status())

    if migration_state.is_up_to_date():
        logger.info("The database is up-to-date.")
        return

    if not app_settings.RUN_DATABASE_MIGRATIONS:
        raise Exception(
            "Automatic database upgrade is disabled. Please run the database migration manually using the CLI command - `armada database upgrade`"
        )

    logger.warning("The database is not up-to-date. Running migrations")
    if db_interface.dialect.name != "sqlite" and migration_state.current is None:
        upgrade_database(skip_backup=True)
    else:
        upgrade_database()


@run_cli.command(name="prod")
def prod_server():
    """
    Run the application in production mode.
    """
    # Create UI Directory
    get_frontend_directory().mkdir(parents=True, exist_ok=True)
    # Mount static frontend files
    app_prod.mount("/", SPAStaticFiles(directory=get_frontend_directory()), name="ui")

    @app_prod.middleware("http")
    async def add_security_headers(request, call_next):
        """
        Production server headers. For development headers, refer to the frontend implementation in vite.config.ts.
        """
        response = await call_next(request)
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Content-Security-Policy"] = (
            "default-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:"
        )
        return response

    logger.info("Running in production mode")
    broker_disclaimer()
    run_migrations()
    app_settings.update_config(update={"ENVIRONMENT": EnvironmentsEnum.PRODUCTION.value})
    uvicorn.run(app=app_prod, host=app_settings.HOST, port=app_settings.PORT)


@run_cli.command(name="demo")
def demo_server(
    confirm: Annotated[bool, Option(help="Confirmation is required to run demo mode")] = True,
):
    """
    Run the application in Demo mode.
    """

    try:
        import faker  # noqa: F401
    except ImportError:
        logger.error("The 'Faker' package is not installed. Please install it using 'pip install armada_logs[all]'.")
        return

    if confirm:
        print(
            "Starting the server in Demo mode will create a demo data source and populate the database with sample data.\n"
            "Are you sure you want to continue?"
        )
        user_confirmation = input("yes/no: ")
        if user_confirmation.lower() != "yes":
            print("Operation cancelled.")
            return

    # Create UI Directory
    get_frontend_directory().mkdir(parents=True, exist_ok=True)
    # Mount static frontend files
    app_prod.mount("/", SPAStaticFiles(directory=get_frontend_directory()), name="ui")

    logger.info("Running in demo mode")
    broker_disclaimer()
    run_migrations()
    app_settings.update_config(update={"ENVIRONMENT": EnvironmentsEnum.DEMO.value})
    async_to_sync(create_demo_configuration())
    uvicorn.run(app=app_prod, host=app_settings.HOST, port=app_settings.PORT)


@run_cli.command(name="dev")
def dev_server():
    """
    Run the application in development mode.
    """
    logger.info("Running in development mode")
    logger.info(
        "In development mode, only the backend server starts automatically. "
        "The frontend must be started manually using a Node.js environment. For more details, please refer to the developer guide."
    )
    broker_disclaimer()
    run_migrations()
    app_settings.update_config(update={"ENVIRONMENT": EnvironmentsEnum.DEVELOPMENT.value})
    uvicorn.run(
        app="armada_logs.app:app_dev",
        host=app_settings.HOST,
        reload=True,
        port=app_settings.PORT,
    )


@run_cli.command()
def worker(
    workers: Annotated[Optional[int], Option("--workers", help="Number of worker processes")] = 2,  # noqa: UP007
):
    """
    Start the tasks worker process.

    This allows executing tasks in separate processes from the main program, enabling distributed execution.
    It is essential for large-scale deployments or scenarios with many blocking data sources.
    For this to work, a Redis broker is required.
    """
    if not app_settings.BROKER:
        raise ValueError("Redis broker is required for this feature to work.")

    subprocess.run(
        [
            "taskiq",
            "worker",
            "--workers",
            f"{workers}",
            "armada_logs.core.tasks:tasks_broker",
            *TasksRegistry.get_app_task_modules(),
        ]
    )


@cli.command("upgrade")
def upgrade_application():
    """
    Upgrade the application to the latest revision.
    """
    raise NotImplementedError("This feature is still under development and is not yet available.")


@database_cli.command("upgrade")
def upgrade_database(
    skip_backup: Annotated[bool, Option(help="Skip the manual backup check before upgrade")] = False,
):
    """
    Upgrade the database to the latest revision.
    """

    def run_upgrade():
        logger.info("Running database upgrade")
        db_interface.run_migrations_upgrade()
        logger.info("Database upgrade succeeded")

    dialect = db_interface.dialect
    db_name = db_interface.url.database
    logger.info(f"Initiating {dialect.name} database upgrade")
    match dialect.name:
        case "sqlite":
            if skip_backup or db_name == ":memory:":
                run_upgrade()
                return

            if not db_name:
                logger.error(
                    f"Database name is missing, but it is required to proceed with the operation. Value: `{db_name}`"
                )
                return
            db_file_path = Path(db_name).resolve()
            logger.info(f"Creating database backup: `{db_file_path}.bck`")
            with file_backup(file_path=db_file_path, delete_on_success=False, suffix=".bak"):
                try:
                    run_upgrade()
                except Exception:
                    logger.error("Upgrade failed, the database has been restored to its previous state.")
                    raise
        case _:
            if skip_backup:
                logger.warning("Proceeding without manual backup check.")
                run_upgrade()
            else:
                logger.error(f"Non-SQLite database detected: {dialect.name}")
                logger.error(
                    "In order to upgrade the database, you must manually back it up first. "
                    "Run the upgrade command with the argument `armada database upgrade --skip_backup` "
                    "to proceed with the upgrade after creating a backup."
                )
                quit()


@database_cli.command()
def downgrade(
    revision: Annotated[str, Argument(help="The target revision number to downgrade to")] = "-1",
):
    """
    Downgrade the database to the specified revision.
    """
    logger.info("Starting database downgrade")
    db_interface.run_migrations_downgrade(revision=revision)
    logger.info(f"Database downgrade to revision {revision} succeeded!")


@database_cli.command()
def revision(
    message: Annotated[Optional[str], Option("--message", "-m", help="Migration comment")] = None,  # noqa: UP007
    autogenerate: Annotated[bool, Option(help="Use alembic autogenerate script")] = True,
):
    """
    Create a new migration.
    """
    logger.info("Creating migration file")
    db_interface.run_migrations_revision(message=message, autogenerate=autogenerate)
    logger.info("Creating new migration file succeeded!")
