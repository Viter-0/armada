from logging import Logger, getLogger
from logging.config import dictConfig
from pathlib import Path

import yaml

from armada_logs.settings import app as app_settings

LOGGING_SETTINGS = Path(__file__).parent / "logging.yaml"


def load_logging_config(path: Path) -> dict:
    """
    Loads logging configuration from a YAML file.
    """
    with open(path) as file:
        return yaml.safe_load(file.read())


def setup_logging():
    """
    Configures the logging system using settings loaded from a YAML file.
    """
    config = load_logging_config(LOGGING_SETTINGS)
    if app_settings.LOGGING_LEVEL != "DEFAULT":
        for name, logger_config in config["loggers"].items():
            if not name.startswith("armada"):
                continue
            logger_config["level"] = app_settings.LOGGING_LEVEL
    dictConfig(config)


def get_logger(name: str = "armada") -> Logger:
    """
    Retrieves a logger instance with the specified name.
    """
    return getLogger(name)


logger = get_logger()
