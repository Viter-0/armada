from typing import TYPE_CHECKING, Any

from sqlalchemy import ScalarResult

if TYPE_CHECKING:
    from armada_logs.schema.settings import ORMAppSettings


def convert_db_settings_rows_to_object(settings: ScalarResult["ORMAppSettings"]) -> dict[str, Any]:
    """
    Convert rows from the `ORMAppSettings` table to a dictionary where
    the key is the `key` field and the value is the `value` field.
    """
    return {setting.key: setting.value for setting in settings}
