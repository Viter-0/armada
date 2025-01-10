import json
from abc import ABC, abstractmethod
from collections.abc import Callable
from pathlib import Path
from typing import Self
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from armada_logs import models, schema
from armada_logs.logging.loggers import get_logger
from armada_logs.util.errors import (
    DefinitionValidationError,
    ExpressionValidationError,
    FieldValidationError,
    ValueValidationError,
)

logger = get_logger("armada.source")


def is_valid_ip(ip: str) -> bool:
    """
    Checks if the provided IP address is valid for use in networking operations.
    """
    if ip.startswith(("fe80:", "169.254.", "::1")):
        return False
    return True


class SourceBase(ABC):
    def __init__(self, config: schema.data_sources.DataSource) -> None:
        super().__init__()
        self.config = config

    async def fetch_logs(self, query: schema.logs.SearchQuery) -> list[schema.logs.Record]:
        """
        Fetch logs from the log source.

        This method is intended to be overridden by subclasses that support log fetching.
        If not implemented, it raises a NotImplementedError.
        """
        raise NotImplementedError("This log source does not support log fetching")

    @abstractmethod
    async def check_connectivity(self):
        """
        Abstract method to verify if the source is functional.
        Must be implemented by subclasses.
        """
        pass

    @classmethod
    @abstractmethod
    async def from_id(cls, source_id: UUID | str) -> Self:
        """
        Create an instance of the data source by its unique identifier.

        Must be implemented by subclasses.
        """
        pass

    @staticmethod
    async def process_and_add_hosts(session: AsyncSession, asset_data: list[schema.assets.AssetHostCreate]):
        """
        Process the hosts data and update or insert it into the database.

        Args:
            session: The database session for executing queries.
            asset_data: A list of host data dictionaries to process.
                       Each dictionary can contain nested structures that represent ORM relationship data.

        """
        await models.assets.process_and_add_hosts(session=session, asset_data=asset_data)

    @staticmethod
    async def process_and_add_networks(
        session: AsyncSession,
        asset_data: list["schema.assets.AssetNetworkCreate"],
    ):
        """
        Process networks and update or insert them into the database.

        Args:
            session: The database session for executing queries.
            asset_data: A list of networks to process.

        """
        await models.assets.process_and_add_networks(session=session, asset_data=asset_data)

    @staticmethod
    async def process_and_add_firewall_rules(
        session: AsyncSession, asset_data: list[schema.assets.AssetFirewallRuleCreate]
    ):
        """
        Process the firewall rule data and update or insert it into the database.

        Args:
            session: The database session for executing queries.
            asset_data: A list of firewall rule data dictionaries to process.
                       Each dictionary can contain nested structures that represent ORM relationship data.

        """
        await models.assets.process_and_add_firewall_rules(session=session, asset_data=asset_data)

    @staticmethod
    async def process_and_add_esxi_to_nsx_manager_mapping(
        session: AsyncSession, data: list[schema.util.NSXHostMappingCreate]
    ):
        """
        Process the ESXi to NSX mapping data and update or insert it into the database.

        Args:
            session: The database session for executing queries.
            data: A list of mapping data to process.
        """
        await models.util.process_and_add_esxi_to_nsx_manager_mapping(session=session, data=data)


def get_nested_value(obj, key: str, separator: str = "."):
    """
    Retrieve a nested value from a dictionary using a separator-delimited key path.
    """
    keys = key.split(separator)
    for _key in keys:
        if isinstance(obj, dict):
            obj = obj.get(_key)
        else:
            raise KeyError(f"nested key not found: {_key}")
    return obj


class AttributeMapper:
    def __init__(
        self, mapping_file: Path, selected_mapping_key: str | None = None, nested_value_separator: str = "."
    ) -> None:
        """
        Initializes the AttributeMapper with a mapping configuration.

        Args:
            mapping_file: The path to the JSON file containing the mapping configuration.
            selected_mapping_key: Only the nested dictionary associated with this key will be used for
                mapping. Defaults to None, which uses the top-level dictionary for mapping.
        """
        self.mapping_file = mapping_file
        self.mapping: dict = self._load_mapper_file(mapping_file)
        self.selected_mapping_key = selected_mapping_key
        self.nested_value_separator = nested_value_separator

    def _parse_mapping_object(self, data, root=None):
        """
        This function processes a JSON-like Python dictionary or list, resolving any
        `$ref` references it encounters. The `$ref` references are paths within the
        JSON data, pointing to other parts of the data structure. The function
        replaces each `$ref` with the actual data it points to.
        """
        if root is None:
            root = data

        if isinstance(data, dict):
            if "$ref" in data:
                ref_path = data["$ref"]
                # Resolve the path (strip the initial #/ and split by '/')
                ref_keys = ref_path.lstrip("#/").split("/")
                ref_data = root
                for key in ref_keys:
                    ref_data = ref_data[key]
                return self._parse_mapping_object(
                    ref_data, root
                )  # Recursively resolve references in the referenced data
            else:
                return {k: self._parse_mapping_object(v, root) for k, v in data.items()}  # Resolve nested dictionaries
        elif isinstance(data, list):
            return [self._parse_mapping_object(item, root) for item in data]  # Resolve lists
        else:
            return data  # Return the value as is if it's not a dict or list

    def _load_mapper_file(self, mapping_file: Path | str) -> dict:
        """
        Loads and parses the JSON mapping file.
        """
        with open(mapping_file) as file:
            obj = self._parse_mapping_object(json.load(file))
            if not isinstance(obj, dict):
                raise TypeError(f"Mapper config must be of type 'dict'. Current type: {type(obj).__name__}.")
            return obj

    def _get_parser_func(self, name: str) -> Callable:
        parser_func = getattr(self, name, None)
        if not callable(parser_func):
            raise DefinitionValidationError(
                f"The parser function '{name}' either does not exist or is not callable. "
                "Ensure the function is defined and correctly named."
            )
        return parser_func

    def _get_mapping_dict(self, selected_mapping_key: str | None) -> dict:
        """
        Retrieves the appropriate mapping dictionary.
        """
        if selected_mapping_key is None:
            return self.mapping
        else:
            try:
                mapping = get_nested_value(self.mapping, selected_mapping_key, separator=self.nested_value_separator)
                if not isinstance(mapping, dict):
                    raise DefinitionValidationError(
                        f"The mapping for the selected key '{selected_mapping_key}' is not a dictionary. "
                        f"Found type: {type(mapping)}. Ensure the mapping configuration is structured correctly."
                    )
                return mapping
            except KeyError as e:
                raise DefinitionValidationError(
                    f"The selected mapping key '{selected_mapping_key}' does not exist in the mapping file. "
                    f"Ensure the key is correct and exists in the mapping configuration."
                ) from e

    def _map_entity(self, entity: dict, mapping: dict) -> dict:
        result = {}
        keys = mapping.keys()
        for key in keys:
            try:
                item = mapping[key]
                field = item.get("field")
                if not field:
                    logger.debug(f"Skipping mapping entry: Missing 'field' attribute. Entry details: {item}")
                    continue

                parser_name = item.get("parser", None)
                if parser_name:
                    parser_func = self._get_parser_func(parser_name)
                    result[field] = parser_func(
                        key=key,
                        value=get_nested_value(entity, key, separator=self.nested_value_separator),
                        entity=entity,
                    )
                else:
                    result[field] = get_nested_value(entity, key, separator=self.nested_value_separator)
            except DefinitionValidationError as e:
                logger.debug(e)
        return result

    def map_entity(self, entity: dict) -> dict:
        """
        Maps values to a standardized format based on the defined mapping.

        Args:
            entity: The entity from which to extract values.
        """
        return self._map_entity(entity=entity, mapping=self._get_mapping_dict(self.selected_mapping_key))


class QueryMapper(ABC, AttributeMapper):
    """
    Abstract base class for mapping query and results to API-specific attributes.

    This class provides a mechanism for loading a mapping configuration file, parsing it, and mapping
    properties based on the provided mapping.
    """

    def __init__(self, mapping_file: Path, nested_value_separator: str = ".") -> None:
        super().__init__(mapping_file, nested_value_separator=nested_value_separator)

    def _get_query_param_def(self, param: str) -> dict:
        """
        Retrieve the mapping definition for a given query parameter.
        """
        try:
            return self.mapping["query"][param]
        except KeyError:
            raise DefinitionValidationError(
                f"The mapping definition for the query parameter '{param}' was not found. "
                "Ensure the parameter is correctly defined in the mapping file."
            ) from None

    def map_query_filter_field(self, query_filter: schema.logs.QueryFilter) -> str:
        """
        Maps a given query filter to its corresponding API-specific field.

        Raises:
            FieldValidationError: If the filter field contains errors.
        """
        try:
            param_def = self._get_query_param_def(query_filter.field)
            return param_def["field"]
        except DefinitionValidationError as e:
            logger.debug(e)
            raise FieldValidationError(
                f"The field '{query_filter.field}' is not supported by this log source."
            ) from None

    def map_query_filter_expression(self, query_filter: schema.logs.QueryFilter) -> str:
        """
        Maps a given query filter to its corresponding API-specific expression.

        Raises:
            ExpressionValidationError: If the filter expression contains errors.
        """

        try:
            param_def = self._get_query_param_def(query_filter.field)
            return param_def["expressions"][query_filter.expression]
        except (KeyError, DefinitionValidationError) as e:
            logger.debug(e)
            raise ExpressionValidationError(
                f"The expression '{query_filter.expression}' is not supported for field '{query_filter.field}'."
            ) from None

    def map_query_filter_value(self, query_filter: schema.logs.QueryFilter) -> str | list[str]:
        """
        Maps a given query filter to its corresponding API-specific value.

        Raises:
            ValueValidationError: If a value contains errors.
        """
        try:
            param_def = self._get_query_param_def(query_filter.field)
            value_def = param_def.get("value")
            if not value_def:
                return query_filter.value

            parser_name = value_def.get("parser", None)
            if parser_name:
                parser_func = self._get_parser_func(parser_name)
                value = parser_func(value=query_filter.value, query_filter=query_filter)
            else:
                value = query_filter.value
            return value
        except DefinitionValidationError as e:
            logger.debug(e)
            raise ValueValidationError(
                f"The value '{query_filter.value}' is not supported for field '{query_filter.field}'."
            ) from None

    def map_result_entity(self, entity: dict) -> dict:
        """
        Maps an entity to a standardized result format using the configured mapping.
        """
        return self._map_entity(entity=entity, mapping=self._get_mapping_dict("result"))

    @abstractmethod
    def build_query_filter(self, query: schema.logs.SearchQueryRequest):
        """
        Abstract method to build a query filter for the API based on the mapped query properties.

        Subclasses must implement this method to return a filter string or structure compatible
        with the target API.
        """
        pass

    @abstractmethod
    async def map_result(self, results):
        """
        Abstract method to map results returned by the API.

        Subclasses must implement this method to handle the specific structure of API results.
        """
        pass
