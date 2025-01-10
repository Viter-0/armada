from importlib import metadata

import tomllib

try:
    __version__ = metadata.version(__package__ if __package__ else "")
except metadata.PackageNotFoundError:
    with open("pyproject.toml", "rb") as f:
        __version__ = tomllib.load(f)["tool"]["poetry"]["version"] + "dev"
