from __future__ import annotations

from operator import itemgetter
from typing import TYPE_CHECKING

from fastapi.encoders import jsonable_encoder
from pydantic import BaseModel
from sqlalchemy import insert, select, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import InstrumentedAttribute

if TYPE_CHECKING:
    from armada_logs.schema.base import Base


def compare_model_with_orm(
    data: dict | BaseModel, orm: Base, ignore_keys: list[str] | None = None, ignore_values: list | None = None
) -> bool:
    """
    Compare the values in a dict or pydantic model with the corresponding attributes of an orm (object).
    The model (data) is not required to have keys for all attributes of the object (obj).

    Args:
        data: A dict or pydantic model where keys correspond to attribute names of the orm, and values are the expected values.
        orm: An object whose attributes are to be compared (e.g., a SQLAlchemy model instance).
        ignore_keys: A list of keys to ignore during comparison.
        ignore_values: A list of values to ignore during comparison.
    """
    if ignore_keys is None:
        ignore_keys = []
    if ignore_values is None:
        ignore_values = []

    if isinstance(data, BaseModel):
        data = data.model_dump()

    for key, value in data.items():
        if key in ignore_keys:
            continue
        if value in ignore_values:
            continue
        if not hasattr(orm, key) or getattr(orm, key) != value:
            return False
    return True


def get_model_and_orm_diff(
    data: dict | BaseModel, orm: Base, ignore_keys: list[str] | None = None, ignore_values: list | None = None
) -> dict:
    """
    Computes the difference between a dict or pydantic model and an ORM object.
    """

    diff = {}
    if ignore_keys is None:
        ignore_keys = []
    if ignore_values is None:
        ignore_values = []

    if isinstance(data, BaseModel):
        data = data.model_dump()

    for key, value in data.items():
        if value in ignore_keys:
            continue
        if value in ignore_values:
            continue
        if not hasattr(orm, key):
            diff[key] = [value]
            continue
        if getattr(orm, key) != value:
            diff[key] = [value, getattr(orm, key)]
    return diff


def update_database_entry(entry: Base, update: dict, exclude_none_value: bool = False):
    """
    Update the fields of a database entry with values from another dict.

    Args:
        entry: The existing database entry to be updated.
        update: The dict containing updated field values.
        exclude_none_value: Whether to exclude None values
    """
    db_object = jsonable_encoder(update)
    for field in db_object:
        val = update[field]
        if val is None and exclude_none_value:
            continue
        if field in update:
            setattr(entry, field, val)


async def update_or_insert_bulk(
    session: AsyncSession,
    orm_schema: type[Base],
    objects: list[dict],
    unique_attribute: InstrumentedAttribute,
    auto_commit: bool = True,
):
    """
    Update or insert multiple objects into the database asynchronously.

    If you provide a value for a field in the update dict (including None or empty values), it will update the database with that value.
    If a value is omitted from the dictionary used in update dict, that specific field in the database will not be changed.

    Args:
        session: The SQLAlchemy AsyncSession object.
        orm_schema: The SQLAlchemy schema class
        objects: A list of dictionaries representing the objects to be updated or inserted
        unique_attribute: The column attribute used as a unique identifier for updating objects.
                      This should be a unique field of the table.
                      The function checks if an entry exists using this field.
        auto_commit: Whether to automatically commit the changes to the database.
    """
    key = unique_attribute.key
    index_values = [item[key] for item in objects]
    items = await session.execute(select(orm_schema.id, unique_attribute).where(unique_attribute.in_(index_values)))

    update_items_ids = {item[1]: item[0] for item in items}

    update_values = []
    create_values = []

    for item in objects:
        if item[key] in update_items_ids:
            item["id"] = update_items_ids[item[key]]
            update_values.append(item)
        else:
            create_values.append(item)
    if update_values:
        await session.execute(update(orm_schema), update_values)

    if create_values:
        await session.execute(insert(orm_schema), create_values)
    if auto_commit:
        await session.commit()


def extract_values_as_tuples(data: list[dict], keys: list[str]) -> list[tuple]:
    """
    Extracts values from dictionaries based on specified keys and returns a list of tuples.
    """
    result = []
    for entity in data:
        value_tuple = itemgetter(*keys)(entity)
        if None in value_tuple:
            missing_keys = [keys[i] for i, value in enumerate(value_tuple) if value is None]
            raise ValueError(f"Missing value detected for keys: {missing_keys} in entity: {entity}")
        result.append(value_tuple)
    return result
