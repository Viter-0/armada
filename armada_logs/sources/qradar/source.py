import asyncio
from pathlib import Path
from typing import Self
from urllib.parse import quote
from uuid import UUID

from httpx import AsyncClient, Response

from armada_logs import schema
from armada_logs.const import DEFAULT_SEARCH_QUERY_TIMEOUT
from armada_logs.database.dependencies import get_db_session_context
from armada_logs.logging.loggers import get_logger
from armada_logs.models.logs import ARRAY_EXPRESSIONS
from armada_logs.util.connections import HttpClientContextManager
from armada_logs.util.errors import FieldValidationError, SkipFieldError, ValidationException, ValueValidationError
from armada_logs.util.helpers import ObjectTracker

from ..resources import QueryMapper, SourceBase
from .data_structures import QRadarAsset, QRadarNetwork, QRadarSearchResults

logger = get_logger("armada.source.qradar")


class ApiClient(HttpClientContextManager):
    def __init__(self, config: schema.data_sources.DataSourceQRadar):
        super().__init__()
        self.config = config

    def create_client(self) -> AsyncClient:
        token = getattr(self.config.credential_profile, "token", None)
        name = self.config.credential_profile.name if self.config.credential_profile else "None"
        if not token:
            raise ValueError(f"The credential profile '{name}' does not contain a valid token.")

        return AsyncClient(
            base_url=self.config.host,
            headers={"Content-Type": "application/json", "SEC": token},
            verify=self.verify_ssl(self.config.is_certificate_validation_enabled),
            event_hooks={"response": [self.raise_on_4xx_5xx]},
        )

    @staticmethod
    async def raise_on_4xx_5xx(response: Response):
        if response.is_error:
            await response.aread()
            logger.error(f"HTTP request failed. Response text: {response.text}")
            response.raise_for_status()

    async def get_assets(self) -> list[QRadarAsset]:
        response = await self.get_client().get("/api/asset_model/assets")
        response = response.json()
        return [QRadarAsset(**asset) for asset in response]

    async def get_networks(self) -> list[QRadarNetwork]:
        response = await self.get_client().get("/api/config/network_hierarchy/networks")
        response = response.json()
        return [QRadarNetwork(**asset) for asset in response]

    async def _wait_for_search_response(self, search_id: str) -> dict:
        """
        Wait for the completion of a QRadar Ariel search and retrieve the search results.
        """
        while True:
            res = await self.get_client().get(f"/api/ariel/searches/{search_id}")
            res = res.json()
            search_status = res["status"]

            if search_status != "COMPLETED":
                await asyncio.sleep(3)
                continue
            res = await self.get_client().get(f"/api/ariel/searches/{search_id}/results")
            return res.json()

    async def query(self, query: str) -> QRadarSearchResults:
        """
        Query log data from the QRadar server based on the provided query.
        """
        encoded_query = quote(query)

        response = await self.get_client().post("/api/ariel/searches?query_expression=" + encoded_query)
        search_id = response.json()["search_id"]
        await asyncio.sleep(1)

        async with asyncio.timeout(DEFAULT_SEARCH_QUERY_TIMEOUT):
            res = await self._wait_for_search_response(search_id=search_id)
            return QRadarSearchResults(**res)


class QueryMapperQRadar(QueryMapper):
    """
    Maps the given query filter to a string representation suitable for the API.
    """

    def __init__(self, mapping_file: Path, config: schema.data_sources.DataSourceQRadar):
        super().__init__(mapping_file=mapping_file)
        self.config = config

    def map_query_filter_prefix(self, query_filter: schema.logs.QueryFilter, is_function_field: bool = False):
        """
        QRadar AQL handles negation using the "NOT" prefix. This method determines whether
        the "NOT" prefix should be applied based on the query filter's expression and
        whether the field is a function field.
        """
        if query_filter.expression == "nin":
            return "NOT"
        if is_function_field and query_filter.expression == "neq":
            return "NOT"
        return ""

    def _is_function_field(self, query_filter: schema.logs.QueryFilter) -> bool:
        """
        Determines whether a field in the query filter is a function field.

        Function fields in QRadar AQL require specialized handling due to their unique
        behavior in query logic.
        """
        param_def = self._get_query_param_def(query_filter.field)
        return param_def.get("is_function", False)

    def _map_query_filter_generic(self, query_filter: schema.logs.QueryFilter) -> str:
        """
        Maps a query filter to a generic filter string.
        """
        try:
            mapped_filter_field = self.map_query_filter_field(query_filter)
            mapped_filter_expr = self.map_query_filter_expression(query_filter)
            mapped_filter_value = self.map_query_filter_value(query_filter)
            mapped_filter_prefix = self.map_query_filter_prefix(query_filter)
        except FieldValidationError:
            if query_filter.expression == "!=":
                raise SkipFieldError() from None
            raise
        return f"{mapped_filter_prefix} {mapped_filter_field} {mapped_filter_expr} {mapped_filter_value}"

    def _map_query_filter_function(self, query_filter: schema.logs.QueryFilter) -> str:
        """
        Maps a query filter containing QRadar AQL functions to its corresponding filter logic.

        Note:
            QRadar fields that contain AQL functions must implement all query filter logic
            within the custom `map_query_filter_value` function. This ensures that the
            logic for handling function-specific filtering, transformations, and validations
            is encapsulated in one place.
        """
        mapped_filter = self.map_query_filter_value(query_filter)
        if not isinstance(mapped_filter, str):
            raise ValueValidationError("The mapped filter value is invalid or not of the expected type (string).")
        return mapped_filter

    def _get_sql_select_fields(self) -> list[str]:
        return self.mapping["select_fields"]

    def build_query_filter(self, query: schema.logs.SearchQuery) -> str:
        """
        Method to build a query filter for the API based on the mapped query properties.
        """

        def _get_mapping_func(query_filter):
            if self._is_function_field(query_filter):
                return self._map_query_filter_function
            else:
                return self._map_query_filter_generic

        _filter = []
        for query_filter in query.filter:
            try:
                mapping_func = _get_mapping_func(query_filter.original)
                mapped_filter = mapping_func(query_filter.original)
                _filter.append(mapped_filter)
            except SkipFieldError:
                continue
            except ValidationException:
                if not query_filter.resolved:
                    raise
                mapping_func = _get_mapping_func(query_filter.resolved)
                mapped_filter = mapping_func(query_filter.resolved)
                _filter.append(mapped_filter)

        _filter.append("sourceip != destinationip")

        query_str = f"""
        SELECT {", ".join(self._get_sql_select_fields())}
        FROM
            events
        WHERE {' AND '.join(_filter)}
        {f"LIMIT {query.log_count}" if query.log_count > 0 else "" }
        START {query.time_interval.start_time * 1000}
        STOP {query.time_interval.end_time * 1000}
        """
        logger.debug(f"Search Query: {query_str}")
        return query_str

    def _query_parser_ip(self, value, query_filter: schema.logs.QueryFilter):
        """
        This method is used by the AttributeMapper parser
        to transform standardized format into device-related data.
        """
        mapped_filter_field = self.map_query_filter_field(query_filter)
        mapped_filter_expr = self.map_query_filter_expression(query_filter)

        if isinstance(value, list):
            mapped_filter_prefix = self.map_query_filter_prefix(query_filter)
            mapped_filter_value = self._convert_to_array_value(value=query_filter.value, query_filter=query_filter)
            return f"{mapped_filter_prefix} {mapped_filter_field} {mapped_filter_expr} {mapped_filter_value}"
        else:
            mapped_filter_prefix = self.map_query_filter_prefix(query_filter, is_function_field=True)
            return f"{mapped_filter_prefix} INCIDR('{value}',{mapped_filter_field})"

    def _query_parser_generic(self, value, query_filter: schema.logs.QueryFilter):
        """
        This method is used by the AttributeMapper parser
        to transform standardized format into device-related data.
        """
        if isinstance(value, list):
            return self._convert_to_array_value(value, query_filter)
        return f"'{value}'"

    def _convert_to_array_value(self, value, query_filter: schema.logs.QueryFilter):
        """
        Converts a value to an array representation for use in QRadar AQL queries.
        """
        if not isinstance(value, list):
            raise ValueValidationError(f"Expected a list, but received a value of type '{type(value)}'.")

        if query_filter.expression not in ARRAY_EXPRESSIONS:
            raise ValueValidationError(
                f"The expression '{query_filter.expression}' does not support list values. "
                f"Supported expressions for list values are: {', '.join(ARRAY_EXPRESSIONS)}. "
                "Please verify the query filter and ensure the correct expression is used."
            )

        if len(value) == 0:
            raise ValueValidationError(
                "The provided list is empty. A non-empty list is required for array conversion. "
                "Please ensure the list contains at least one element."
            )

        values = []
        for v in value:
            values.append(f"'{v}'")

        return f"( {', '.join(values)} )"

    def _result_parser_port(self, key: str, value: str | None, entity: dict):
        """
        This method is used by the AttributeMapper parser
        to transform device-related data into a standardized format.
        """
        if not value:
            return ""
        return str(value)

    def _result_parser_protocol(self, key: str, value: str | None, entity: dict):
        """
        This method is used by the AttributeMapper parser
        to transform device-related data into a standardized format.
        """
        if not value:
            return ""
        return str(value)

    def _result_parser_action(self, key: str, value: str | None, entity: dict):
        """
        This method is used by the AttributeMapper parser
        to transform device-related data into a standardized format.
        """
        match value:
            case "Firewall Permit":
                return "ALLOW"
            case "Firewall Deny":
                return "DENY"
            case "Firewall Session Closed":
                return "ALLOW"
            case _:
                return ""

    def _result_parser_timestamp(self, key: str, value, entity: dict):
        """
        This method is used by the AttributeMapper parser
        to transform device-related data into a standardized format.
        """
        return int(value / 1000)

    def _result_parser_session_message(self, key: str, value, entity: dict):
        """
        This method is used by the AttributeMapper parser
        to transform device-related data into a standardized format.
        """
        return entity.get("Action")

    def _result_parser_data_source(self, key: str, value: None, entity: dict):
        """
        This method is used by the AttributeMapper parser
        to transform device-related data into a standardized format.
        """
        return self.config.name

    async def map_result(self, results) -> list[schema.logs.Record]:
        """
        Map flows returned by the API into a standardized format.
        """
        response = []
        for entity in results:
            mapped_entity = self.map_result_entity(entity)
            record = schema.logs.Record(**mapped_entity)
            response.append(record)
        return response


class SourceQRadar(SourceBase):
    """
    Data source implementation for IBM QRadar.
    """

    def __init__(self, config: schema.data_sources.DataSourceQRadar) -> None:
        super().__init__(config=config)
        self.config = config
        self.mapper = QueryMapperQRadar(mapping_file=Path(__file__).parent / "mapping.json", config=config)
        self.api_client = ApiClient(config=config)
        self.object_tracker = ObjectTracker()
        self.logger = logger

    async def check_connectivity(self):
        """
        Check the connectivity to the IBM QRadar API.

        This method sends a simple request to verify that the API is reachable and functioning correctly.
        """
        async with self.api_client as connection:
            await connection.get_client().get("/api/help/versions")

    async def fetch_logs(self, query: schema.logs.SearchQuery) -> list[schema.logs.Record]:
        """
        Search for logs.
        """
        search_query = self.mapper.build_query_filter(query=query)

        async with self.api_client as connection:
            res = await connection.query(search_query)
            return await self.mapper.map_result(res.events)

    @classmethod
    async def from_id(cls, source_id: UUID | str) -> Self:
        """
        Create an instance of the data source by using ORM UUID.
        """
        if isinstance(source_id, str):
            source_id = UUID(source_id)
        async with get_db_session_context() as session:
            config = await session.get_one(schema.data_sources.ORMDataSourceQRadar, source_id)
            return cls(config=schema.data_sources.DataSourceQRadar.model_validate(config))
