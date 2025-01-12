from pathlib import Path
from typing import Literal

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

from armada_logs.util.helpers import file_backup

from .const import ENCODING, ENV_FILE, EnvironmentsEnum

VariableType = str | int | bool


class BaseEnvSettings(BaseSettings):
    """
    Base settings class for environment-specific settings.
    """

    model_config = SettingsConfigDict(env_file=ENV_FILE, env_file_encoding=ENCODING)


class ApplicationSettings(BaseEnvSettings):
    """
    Application settings class. An application restart is required for changes to take effect.
    """

    model_config = SettingsConfigDict(env_prefix="ARMADA_", env_nested_delimiter="__", extra="ignore")

    # Overwrite the logging level for all handlers in the application.
    LOGGING_LEVEL: Literal["DEBUG", "INFO", "ERROR", "DEFAULT"] = "DEFAULT"

    # Database engine connection string.
    # SQLite - sqlite+aiosqlite:///<db_file>
    # PostgreSQL - postgresql+asyncpg://<db_username>:<db_secret>@<db_host>:<db_port>/<db_name>
    DB_ENGINE: str = "sqlite+aiosqlite:///db.sqlite"

    # Path to the folder that contains temp files.
    TEMP_DIR: str = "temp"

    # Port number for the application.
    PORT: int = 8000

    # Host address for the application.
    HOST: str = "0.0.0.0"

    # Current environment (e.g., development, production).
    ENVIRONMENT: str = EnvironmentsEnum.DEVELOPMENT

    # Whether the application should automatically run database migrations at startup.
    RUN_DATABASE_MIGRATIONS: bool = True

    # Broker connection string: currently, only Redis is supported.
    # If the broker is absent, task execution will occur on the main application thread, which may sometimes cause the application to freeze.
    # Example - redis://localhost:6379
    BROKER: str = ""

    # Secret key used to encode and decode access JWT tokens.
    ACCESS_JWT_SECRET: str = Field(default="", exclude=True)

    # Secret key used to encode and decode refresh JWT tokens.
    REFRESH_JWT_SECRET: str = Field(default="", exclude=True)

    # Path to the folder that contains compiled frontend static files. If the folder name is 'ui', the bundled frontend in the package will be used.
    FRONTEND_UI_STATIC_DIR: str = "ui"

    # Secret key used for encrypting sensitive data in the database.
    DATABASE_ENCRYPTION_SECRET: str = Field(default="", exclude=True)

    # Whether to import a predefined list of service assets.
    IMPORT_SERVICE_DEFINITIONS: bool = True

    def update_config(self, update: dict):
        """
        Update current instance of config dict. Only updates the top-level keys.

        Args:
            update: dict to merge with the current config
        """
        self.__dict__.update(update)

    def create_env_file_entry(self, variable: str, env_value: VariableType) -> str:
        env_entry = f"{self.get_env_entry_name(variable)}={env_value}"
        if not env_entry.endswith("\n"):
            env_entry = env_entry + "\n"
        return env_entry

    def get_env_entry_name(self, variable: str) -> str:
        prefix = self.model_config.get("env_prefix") or ""
        return prefix + variable

    def append_env_variables(self, variables: dict[str, VariableType]):
        """
        Append environment variables to an env file.

        Args:
            variables: A dictionary where the keys are variable names (as strings, without prefix)
            and the values are the corresponding environment variable values.
        """

        with open(ENV_FILE, mode="a+", encoding=ENCODING) as file:
            file.seek(0)
            content = file.read()
            if not content.endswith("\n") and len(content) > 0:
                file.write("\n")
            for key, value in variables.items():
                file.write(self.create_env_file_entry(variable=key, env_value=value))

        self.update_config(update=variables)

    def upsert_env_variables(self, variables: dict[str, VariableType], insert_new: bool = True):
        """
        Replace or insert environment variables in the environment file.

        Args:
            variables: A dictionary where the keys are variable names (as strings, without prefix)
            and the values are the corresponding environment variable values.
            insert_new: If `True`, new variables that are not already
            present in the environment file will be added. Defaults to `True`.

        """
        modified_vars = {}

        def upsert(key: str, val: str, items: list[str], append_new: bool = True):
            var_key = self.get_env_entry_name(key)
            for idx, item in enumerate(items):
                if item.startswith(var_key):
                    items[idx] = self.create_env_file_entry(variable=key, env_value=val)
                    modified_vars[key] = val
                    return
            if append_new:
                items.append(self.create_env_file_entry(variable=key, env_value=val))
                modified_vars[key] = val

        if Path(ENV_FILE).exists():
            with open(ENV_FILE, encoding=ENCODING) as file:
                lines = file.readlines()
        else:
            # Create new file
            with open(ENV_FILE, "a", encoding=ENCODING):
                pass
            lines = []

        # Apply the modifications
        lines = [(line + "\n") if not line.endswith("\n") else line for line in lines]
        for key, value in variables.items():
            upsert(key=key, val=str(value), items=lines, append_new=insert_new)

        # Write the modified lines back to the file
        with file_backup(ENV_FILE):
            with open(ENV_FILE, "w", encoding=ENCODING) as file:
                file.writelines(lines)

        self.update_config(update=modified_vars)


app = ApplicationSettings()
app_settings = app
