import asyncio
import os
import re
import shutil
from collections.abc import Coroutine, Hashable
from contextlib import contextmanager
from datetime import UTC, datetime, timedelta
from functools import wraps
from pathlib import Path
from typing import Any, TypeAlias, TypeVar
from uuid import UUID

from pydantic import BaseModel

T = TypeVar("T")
SERIALIZABLE: TypeAlias = dict | list | str | int | float | bool | None


def get_project_root() -> Path:
    """
    Returns the root directory of the project.
    """
    return Path(__file__).parent.parent


def async_to_sync(awaitable: Coroutine[Any, Any, T]) -> T:
    """
    Runs an async function in a synchronous context, ensuring the correct handling of event loops.

    This function cannot be used if an event loop is already running in the current context.

    Args:
        awaitable (coroutine): The async function or coroutine to run.

    Returns:
        The result of the async function.
    """
    try:
        asyncio.get_running_loop()
    except RuntimeError:
        return asyncio.run(awaitable)
    raise RuntimeError(
        "You can't run an async function from a sync function if an event loop is already running. "
        "Restructure your code or use threads."
    )


def coro(f):
    """
    Decorator to convert an asynchronous function into a synchronous one.

    This allows you to call async functions as if they were synchronous functions.

    Args:
        f (function): The asynchronous function to be wrapped.

    Returns:
        function: A synchronous wrapper around the async function.
    """

    @wraps(f)
    def wrapper(*args, **kwargs):
        return async_to_sync(f(*args, **kwargs))

    return wrapper


@contextmanager
def file_backup(file_path: str | Path, delete_on_success: bool = True, suffix: str = ".bak"):
    """
    Context manager to create a backup of a file before modification.
    If an exception occurs during modification, the original file is restored.

    Args:
        file_path: Path to the file to be backed up and modified.
        delete_on_success: Whether to delete the backup file after a successful operation.
        suffix: Suffix to add to the backup file name
    """
    backup_path = f"{file_path}{suffix}"

    # Copy also replaces
    shutil.copy(file_path, backup_path)
    try:
        yield
    except Exception as e:
        shutil.move(backup_path, file_path)
        raise e
    else:
        if delete_on_success:
            os.remove(backup_path)


def is_valid_uuid(val: str) -> bool:
    """
    Check if a given value is a valid UUID.
    """
    try:
        UUID(val)
        return True
    except ValueError:
        return False


def get_uuid(uuid_: str | UUID) -> UUID:
    """
    Converts the given input to a UUID object if it is not already one.
    """
    if isinstance(uuid_, UUID):
        return uuid_
    return UUID(uuid_)


def compare_dicts(dict1: dict, dict2: dict) -> bool:
    """
    Compare the values in a dictionary with the corresponding values of another dictionary.
    The dictionary (dict1) is not required to have keys for all attributes of dict2.
    """
    for key, value in dict1.items():
        if key not in dict2 or dict2.get(key) != value:
            return False
    return True


MAC = TypeVar("MAC", str, None)


def validate_mac_address(v: MAC) -> MAC:
    """
    Validate and standardize MAC address.

    Supports multiple input formats:
    - AA:BB:CC:DD:EE:FF (default canonical form)
    - AA-BB-CC-DD-EE-FF
    - AABBCCDDEEFF
    - aa:bb:cc:dd:ee:ff (case-insensitive)

    Always normalizes to uppercase, colon-separated format.
    """

    if not isinstance(v, str):
        return v

    value = v.strip()

    # Remove any existing separators
    cleaned = re.sub(r"[\:\-\.]", "", value.upper())

    # Validate MAC address length (12 hex characters)
    if not re.match(r"^[0-9A-F]{12}$", cleaned):
        raise ValueError(f"Invalid MAC address format: {value}")

    # Format with colons
    return ":".join(cleaned[i : i + 2] for i in range(0, 12, 2))


class StorageObject(BaseModel):
    data: SERIALIZABLE
    expires_at: datetime | None = None

    @property
    def expires_in(self) -> int:
        if self.expires_at:
            return int(self.expires_at.timestamp() - datetime.now(tz=UTC).timestamp())
        return -1

    @property
    def expired(self) -> bool:
        return self.expires_at is not None and datetime.now(tz=UTC) >= self.expires_at


class MemoryStore:
    """
    An in-memory key-value store.
    """

    def __init__(self) -> None:
        self._store: dict[str, StorageObject] = {}
        self._lock = asyncio.Lock()

    def _new_storage_instance(self, data: SERIALIZABLE, expires_in: int | timedelta | None = None):
        if isinstance(expires_in, int):
            expires_in = timedelta(seconds=expires_in)

        expires_at = (datetime.now(tz=UTC) + expires_in) if expires_in is not None else None

        return StorageObject(data=data, expires_at=expires_at)

    async def set(self, key: str, value: SERIALIZABLE, expires_in: int | timedelta | None = None) -> None:
        async with self._lock:
            self._store[key] = self._new_storage_instance(data=value, expires_in=expires_in)

    async def get(self, key: str, renew_for: int | timedelta | None = None) -> SERIALIZABLE:
        async with self._lock:
            storage_obj = self._store.get(key)

            if not storage_obj:
                return None

            if storage_obj.expired:
                self._store.pop(key)
                return None

            if renew_for and storage_obj.expires_at:
                self._store[key] = self._new_storage_instance(data=storage_obj.data, expires_in=renew_for)

            return storage_obj.data

    async def delete(self, key: str) -> None:
        async with self._lock:
            self._store.pop(key, None)

    async def delete_all(self) -> None:
        async with self._lock:
            self._store = {}

    async def exists(self, key: str) -> bool:
        storage_obj = self._store.get(key)
        if not storage_obj or storage_obj.expired:
            return False
        return True


class Cache:
    """
    A class-based wrapper around the Store to provide a simple caching interface.
    """

    _storage = MemoryStore()

    @classmethod
    async def get(cls, key: str, renew_for: int | timedelta | None = None) -> SERIALIZABLE:
        return await cls._storage.get(key=key, renew_for=renew_for)

    @classmethod
    async def set(cls, key: str, value: SERIALIZABLE, expires_in: int | timedelta | None = None) -> None:
        return await cls._storage.set(key=key, value=value, expires_in=expires_in)

    @classmethod
    async def exists(cls, key: str) -> bool:
        return await cls._storage.exists(key)

    @classmethod
    async def delete(cls, key: str) -> None:
        return await cls._storage.delete(key)


class ObjectTracker:
    """
    Tracks objects.
    """

    def __init__(self):
        self.unique_values: set[Hashable] = set()

    def is_unique(self, obj: Hashable) -> bool:
        """
        Checks if an object is unique (previously untracked). If it is, adds it to the tracked values.
        """
        if obj in self.unique_values:
            return False
        self.unique_values.add(obj)
        return True

    def add_unique(self, obj: Hashable):
        """
        Adds an object to the collection of unique values.
        """
        self.unique_values.add(obj)

    def purge_unique(self):
        """
        Deletes all objects in the collection of unique values.
        """
        self.unique_values = set()
