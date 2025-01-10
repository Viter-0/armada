from pathlib import Path
from typing import Self
from urllib.parse import quote_plus
from uuid import UUID

from httpx import AsyncClient, HTTPStatusError, Response
from pydantic import ValidationError

from armada_logs import schema
from armada_logs.const import DEFAULT_SEARCH_QUERY_TIMEOUT
from armada_logs.database.dependencies import get_db_session_context
from armada_logs.logging.loggers import get_logger
from armada_logs.models.util import get_nsx_host_mapping
from armada_logs.util.connections import HttpClientContextManager
from armada_logs.util.errors import FieldValidationError, SkipFieldError

from ..resources import QueryMapper, SourceBase
from .data_structures import MAX_LOG_COUNT, EventsResponse

logger = get_logger("armada.source.aria_logs")


def extract_hostname(fqdn: str | None):
    """
    Extracts the hostname from a fully qualified domain name (FQDN).
    """
    if not fqdn:
        return fqdn
    return fqdn.split(".")[0].upper()


class QueryMapperAriaLogs(QueryMapper):
    """
    Maps the given query filter to a string representation suitable for the API.
    """

    def __init__(self, mapping_file: Path, config: schema.data_sources.DataSourceAriaLogs):
        super().__init__(mapping_file=mapping_file, nested_value_separator="#")
        self.config = config
        """
        If Aria Operations for Logs collects logs for multiple NSX instances,
        there is currently no way to assign the correct firewall rule (firewall_rule_id is not unique) to the flows.
        This mapping provides a workaround to map hosts to their respective NSX managers and firewall rules.
        """
        self._esxi_to_nsx_mapping = {}

    def _map_query_filter(self, query_filter: schema.logs.QueryFilter) -> str:
        try:
            mapped_filter_field = self.map_query_filter_field(query_filter)
            mapped_filter_expr = self.map_query_filter_expression(query_filter)
            mapped_filter_value = self.map_query_filter_value(query_filter)
        except FieldValidationError:
            if query_filter.expression == "!=":
                raise SkipFieldError() from None
            raise
        return f"/{mapped_filter_field}/{quote_plus(mapped_filter_expr)}{mapped_filter_value}"

    def build_query_filter(self, query: schema.logs.SearchQuery) -> str:
        """
        Method to build a query filter for the API based on the mapped query properties.
        """
        _filter = []
        for query_filter in query.filter:
            try:
                if query_filter.resolved:
                    mapped_filter = self._map_query_filter(query_filter.resolved)
                else:
                    mapped_filter = self._map_query_filter(query_filter.original)
                _filter.append(mapped_filter)
            except SkipFieldError:
                continue

        # Timestamp constraint
        _filter.append(f"/timestamp/{quote_plus('<')}{query.time_interval.end_time *1000}")
        _filter.append(f"/timestamp/{quote_plus('>')}{query.time_interval.start_time *1000}")

        if query.log_count == 0:
            log_count = MAX_LOG_COUNT
        elif query.log_count > MAX_LOG_COUNT:
            raise ValueError(f"Maximum number of events supported per query is {MAX_LOG_COUNT}")
        else:
            log_count = query.log_count

        query_str = (
            f"/api/v2/events{''.join(_filter)}?view=SIMPLE&LIMIT={log_count}&content-pack-fields=com.vmware.nsxt"
        )
        logger.debug(f"Search Query: {query_str}")
        return query_str

    def _result_parser_timestamp(self, key: str, value: int, entity: dict):
        """
        This method is used by the AttributeMapper parser
        to transform device-related data into a standardized format.
        """
        return int(value / 1000)

    def _result_parser_datasource(self, key: str, value: None, entity: dict):
        """
        This method is used by the AttributeMapper parser
        to transform device-related data into a standardized format.
        """
        return self.config.name

    def _result_parser_port(self, key: str, value: str | None, entity: dict):
        """
        This method is used by the AttributeMapper parser
        to transform device-related data into a standardized format.
        """
        if value is None:
            return ""
        return value

    def _result_parser_action(self, key: str, value: str | None, entity: dict):
        """
        This method is used by the AttributeMapper parser
        to transform device-related data into a standardized format.
        """
        if value is None:
            return ""
        return value

    def _result_parser_firewall_rule(self, key: str, value: None, entity: dict):
        """
        This method is used by the AttributeMapper parser
        to transform device-related data into a standardized format.

        If Aria Operations for Logs collects logs for multiple NSX instances,
        there is currently no way to assign the correct firewall rule (firewall_rule_id is not unique) to the flows.
        This mapping provides a workaround to map hosts to their respective NSX managers and firewall rules.
        """

        hostname = extract_hostname(entity.get("hostname"))
        rule_id = entity.get("com.vmware.nsxt:vmw_nsxt_firewall_ruleid")

        if not rule_id or not hostname:
            return

        nsx_mapping = self._esxi_to_nsx_mapping.get(hostname)
        if not nsx_mapping:
            return

        # Reference uses firewall_rule.source_identifier_alt
        return schema.util.AssetReference(
            entity_type="firewall_rule", source_identifier=f"{nsx_mapping.nsx_manager}__{rule_id}"
        )

    def _result_parser_log_source(self, key: str, value: str, entity: dict):
        """
        This method is used by the AttributeMapper parser
        to transform device-related data into a standardized format.
        """
        return extract_hostname(value)

    async def _load_nsx_host_mapping(self):
        async with get_db_session_context() as session:
            self._esxi_to_nsx_mapping = await get_nsx_host_mapping(session)

    async def map_result(self, results) -> list[schema.logs.Record]:
        """
        Map logs returned by the API into a standardized format.
        """
        await self._load_nsx_host_mapping()

        response = []
        for entity in results:
            mapped_entity = self.map_result_entity(entity)
            try:
                record = schema.logs.Record(**mapped_entity)
            except ValidationError:
                pass
            response.append(record)
        return response


class ApiClient(HttpClientContextManager):
    def __init__(self, config: schema.data_sources.DataSourceAriaLogs):
        super().__init__()
        self.config = config

    def create_client(self) -> AsyncClient:
        return AsyncClient(
            base_url=self.config.host,
            headers={"Content-Type": "application/json"},
            verify=self.verify_ssl(self.config.is_certificate_validation_enabled),
            event_hooks={"response": [self.raise_on_4xx_5xx]},
            timeout=DEFAULT_SEARCH_QUERY_TIMEOUT,
        )

    async def authorize(self):
        """
        Authenticate with the VMware Aria Operations for Logs API and set the authorization token.
        """
        username = getattr(self.config.credential_profile, "username", None)
        password = getattr(self.config.credential_profile, "password", None)
        domain: str | None = getattr(self.config.credential_profile, "domain", None)

        if not username or not password:
            raise ValueError("Credential profile has an empty username or password.")

        if domain not in ["ActiveDirectory", "Local", "vIDM"]:
            raise ValueError(
                f"Invalid domain '{domain}' provided. Expected domains are 'Local', "
                "'ActiveDirectory', or 'vIDM'. Ensure the credential profile includes the correct domain."
            )

        request = {
            "username": username,
            "password": password,
            "provider": domain,
        }

        response = await self.get_client().post("/api/v2/sessions", json=request)
        token = response.json()["sessionId"]
        self.get_client().headers.update({"Authorization": f"Bearer {token}"})

    @staticmethod
    async def raise_on_4xx_5xx(response: Response):
        if response.is_error:
            await response.aread()
            logger.error(f"HTTP request failed. Response text: {response.text}")
            try:
                response.raise_for_status()
            except HTTPStatusError as e:
                raise HTTPStatusError(
                    message=ApiClient.parse_error_message(e),
                    request=e.request,
                    response=e.response,
                ) from None

    @staticmethod
    def parse_error_message(error: HTTPStatusError):
        response = error.response.json()
        message = response.get("errorMessage", error.response.text)
        return f"{ApiClient.get_status_reason_phrase(error.response.status_code)}. {message}"

    async def query(self, query: str) -> EventsResponse:
        """
        Query log data from the Aria Logs server based on the provided query.
        """
        response = await self.get_client().get(query)
        return EventsResponse(**response.json())


class SourceAriaLogs(SourceBase):
    """
    Data source implementation for VMware Aria Operations for Logs (Logs Insight).
    """

    def __init__(self, config: schema.data_sources.DataSourceAriaLogs) -> None:
        super().__init__(config=config)
        self.config = config
        self.mapper = QueryMapperAriaLogs(mapping_file=Path(__file__).parent / "mapping.json", config=config)
        self.api_client = ApiClient(config=config)
        self.logger = logger

    async def check_connectivity(self):
        """
        Check the connectivity to the VMware Aria Operations for Logs API.

        This method sends a simple request to verify that the API is reachable and functioning correctly.
        """
        async with self.api_client as connection:
            await connection.authorize()
            await connection.get_client().get("/api/v2/version")

    async def fetch_logs(self, query: schema.logs.SearchQuery) -> list[schema.logs.Record]:
        """
        Search logs.
        """
        search_query = self.mapper.build_query_filter(query=query)

        async with self.api_client as connection:
            await connection.authorize()
            response = await connection.query(search_query)
            return await self.mapper.map_result(response.results)

    @classmethod
    async def from_id(cls, source_id: UUID | str) -> Self:
        """
        Create an instance of the data source by using ORM UUID.
        """
        if isinstance(source_id, str):
            source_id = UUID(source_id)
        async with get_db_session_context() as session:
            config = await session.get_one(schema.data_sources.ORMDataSourceAriaLogs, source_id)
            return cls(config=schema.data_sources.DataSourceAriaLogs.model_validate(config))
