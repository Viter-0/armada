from asyncio import sleep as async_sleep
from datetime import timedelta
from pathlib import Path
from time import time
from typing import Self, cast
from uuid import UUID

from httpx import AsyncClient, HTTPStatusError, Response

from armada_logs import schema
from armada_logs.const import DEFAULT_SEARCH_QUERY_TIMEOUT
from armada_logs.database import get_db_session_context
from armada_logs.logging import get_logger
from armada_logs.models.logs import ARRAY_EXPRESSIONS
from armada_logs.util.connections import HttpClientContextManager
from armada_logs.util.errors import (
    FieldValidationError,
    InputValidationError,
    SkipFieldError,
    ValueValidationError,
)
from armada_logs.util.helpers import Cache, ObjectTracker

from ..resources import QueryMapper, SourceBase
from .data_structures import (
    MAX_ENTITY_SIZE,
    AriaSearchQueryRequest,
    AriaSearchQueryResponse,
    BulkFetchRequest,
    BulkFetchResponse,
    EntitiesRequest,
    EntityIdWithTime,
    EntityType,
    EntityWithTime,
    PagedListResponseWithTime,
    PolicyManagerServiceConfig,
    PolicyManagerServiceEntryConfig,
    ReferenceDict,
    SearchRequest,
    TimeRange,
    Token,
)

logger = get_logger("armada.source.aria_networks")


def extract_hostname(fqdn: str | None):
    """
    Extracts the hostname from a fully qualified domain name (FQDN).
    """
    if not fqdn:
        return fqdn
    return fqdn.split(".")[0].upper()


class QueryMapperAriaNetworks(QueryMapper):
    """
    Maps the given query filter to a string representation suitable for the API.
    """

    def __init__(self, mapping_file: Path, config: schema.data_sources.DataSourceAriaNetworks):
        super().__init__(mapping_file=mapping_file)
        self.config = config

    def _map_query_filter(self, query_filter: schema.logs.QueryFilter) -> str:
        try:
            mapped_filter_field = self.map_query_filter_field(query_filter)
            mapped_filter_expr = self.map_query_filter_expression(query_filter)
            mapped_filter_value = self.map_query_filter_value(query_filter)
        except FieldValidationError:
            if query_filter.expression == "!=":
                raise SkipFieldError() from None
            raise
        return f"{mapped_filter_field} {mapped_filter_expr} {mapped_filter_value}"

    def _map_query_filter_asset(self, query_filter: schema.logs.QueryFilterResolved) -> list[str]:
        if not query_filter.resolved:
            return []

        if not query_filter.assets:
            return [self._map_query_filter(query_filter.resolved)]

        if not isinstance(query_filter.assets, list):
            if not isinstance(query_filter.assets.root, schema.assets.AssetHost):
                raise InputValidationError("Invalid input: 'assets' must be an instance of 'schema.assets.AssetHost'.")
            if query_filter.assets.root.is_vm:
                # Use the original query. The API supports searching by VM name.
                return [self._map_query_filter(query_filter.original)]
            else:
                return [self._map_query_filter(query_filter.resolved)]
        else:
            result = []
            use_vm_field = []
            use_ip_field = []
            for entity in query_filter.assets:
                if not isinstance(entity.root, schema.assets.AssetHost):
                    raise InputValidationError()
                if entity.root.is_vm:
                    use_vm_field.append(entity.root.name)
                else:
                    use_ip_field.append(entity.root.ip)
            if use_vm_field:
                query_filter.original.value = use_vm_field
                result.append(self._map_query_filter(query_filter.original))
            if use_ip_field:
                query_filter.resolved.value = use_ip_field
                result.append(self._map_query_filter(query_filter.resolved))
            return result

    def _is_use_asset_filter(self, query_filter: schema.logs.QueryFilterResolved) -> bool:
        if not query_filter.resolved:
            return False
        if query_filter.original.field in ["destination_device_name", "source_device_name"]:
            return True
        return False

    def build_query_filter(self, query: schema.logs.SearchQuery) -> str:
        """
        Method to build a query filter for the API based on the mapped query properties.
        """
        _filter = []
        for query_filter in query.filter:
            try:
                if self._is_use_asset_filter(query_filter):
                    mapped_filter = self._map_query_filter_asset(query_filter)
                    _filter.extend(mapped_filter)
                else:
                    if query_filter.resolved:
                        mapped_filter = self._map_query_filter(query_filter.resolved)
                    else:
                        mapped_filter = self._map_query_filter(query_filter.original)
                    _filter.append(mapped_filter)
            except SkipFieldError:
                continue

        query_str = f"Flow where {' and '.join(_filter)} group by entity_id, firewall rule.entity_id"
        logger.debug(f"Search Query: {query_str}")
        return query_str

    def _query_parser_value(self, value, query_filter: schema.logs.QueryFilter):
        """
        This method is used by the AttributeMapper parser
        to transform standardized format into device-related data.
        """
        if isinstance(value, list):
            if query_filter.expression not in ARRAY_EXPRESSIONS:
                raise ValueValidationError(
                    f"The expression '{query_filter.expression}' does not support list values. "
                    f"Supported expressions for list values are: {', '.join(ARRAY_EXPRESSIONS)}. "
                    "Please verify the query filter and ensure the correct expression is used."
                )
            return f"( {', '.join(value)} )"
        return value

    def _result_parser_device(self, key: str, value: ReferenceDict | None, entity: dict):
        """
        This method is used by the AttributeMapper parser
        to transform device-related data into a standardized format.
        """
        if not value:
            return
        return schema.util.AssetReference(
            entity_type="host", source_identifier=value["entity_id"], data_source_id=self.config.id
        )

    def _result_parser_timestamp(self, key: str, value: None, entity: dict):
        """
        This method is used by the AttributeMapper parser
        to transform device-related data into a standardized format.
        """
        return int(time())

    def _result_parser_data_source(self, key: str, value: None, entity: dict):
        """
        This method is used by the AttributeMapper parser
        to transform device-related data into a standardized format.
        """
        return self.config.name

    def _result_parser_log_source(self, key: str, value: None, entity: dict):
        """
        This method is used by the AttributeMapper parser
        to transform device-related data into a standardized format.

        This method attempts to determine the ESXi host responsible for generating a flow.
        Since the API does not directly provide the ESXi hostname, we guess the ESXi hostname, which is accurate 99% of the time.
        """
        destination_host = entity.get("destination_host")
        source_host = entity.get("source_host")
        if destination_host:
            return extract_hostname(destination_host.get("entity_name"))
        if source_host:
            return extract_hostname(source_host.get("entity_name"))

    def _result_parser_firewall_rule(self, key: str, value: str | None, entity: dict):
        """
        This method is used by the AttributeMapper parser
        to transform device-related data into a standardized format.
        """
        if not value:
            return
        return schema.util.AssetReference(
            entity_type="firewall_rule", source_identifier=value, data_source_id=self.config.id
        )

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


class ApiClient(HttpClientContextManager):
    def __init__(self, config: schema.data_sources.DataSourceAriaNetworks):
        super().__init__()
        # Make sure we don't hit the vRNI throttle and start getting 429 errors.
        self.sleep_timer = 0.025
        self.config = config
        self.token: Token | None = None

    def create_client(self) -> AsyncClient:
        return AsyncClient(
            base_url=self.config.host,
            headers={"Content-Type": "application/json"},
            verify=self.verify_ssl(self.config.is_certificate_validation_enabled),
            event_hooks={"response": [self.raise_on_4xx_5xx]},
            timeout=DEFAULT_SEARCH_QUERY_TIMEOUT,
        )

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
        message = response.get("message", "")
        details = response.get("details")
        if details:
            details = details[0].get("message", "")
        else:
            details = error.response.text
        return f"{message} {details}"

    async def authorize(self):
        """
        Authenticate with the VMware Aria Operations for Networks API and set the authorization token.
        """
        username = getattr(self.config.credential_profile, "username", None)
        password = getattr(self.config.credential_profile, "password", None)
        domain_type: str | None = getattr(self.config.credential_profile, "domain", None)

        if not username or not password:
            raise ValueError("Credential profile has an empty username or password.")

        if domain_type not in ["LDAP", "LOCAL"]:
            raise ValueError(
                f"Invalid domain '{domain_type}' provided. Expected domains are 'LOCAL' or 'LDAP'. "
                "Ensure the credential profile includes the correct domain."
            )

        if "@" in username:
            domain_value = username.split("@")[1]
        else:
            raise ValueError("Invalid username format: '@' symbol not found.")

        request = {
            "username": username,
            "password": password,
            "domain": {"domain_type": domain_type, "value": domain_value},
        }
        response = await self.get_client().post("/api/ni/auth/token", json=request)
        self.token = Token(**response.json())
        self.get_client().headers.update({"Authorization": f"NetworkInsight {self.token.token}"})

    async def on_context_exit(self, exc_type, exc_value, traceback):
        if not self.token:
            return
        await self.logout()

    async def logout(self):
        """
        Deletes the auth token provided in the Authorization header.
        """
        await self.get_client().delete("/api/ni/auth/token")
        self.token = None

    async def _get_entityIds(self, path: str, query: EntitiesRequest | None = None) -> list[EntityIdWithTime]:
        """
        Retrieve a list of entity IDs from the API.
        """
        if query is None:
            query = EntitiesRequest()

        result = []
        response = await self.get_client().get(url=path, params=query.model_dump(exclude_none=True))
        data = response.json()
        result.extend(data["results"])
        while "cursor" in data and data["cursor"] is not None:
            query.cursor = data["cursor"]
            response = await self.get_client().get(url=path, params=query.model_dump(exclude_none=True))
            data = response.json()
            result.extend(data["results"])
            await async_sleep(self.sleep_timer)
        return [EntityIdWithTime(**entity) for entity in result]

    async def bulk_entities_fetch(self, path: str, query: EntitiesRequest | None = None) -> BulkFetchResponse:
        """
        Fetch bulk entities from the API.
        """
        entity_ids = await self._get_entityIds(path=path, query=query)
        return await self.bulk_fetch(request=BulkFetchRequest(entity_ids=entity_ids))

    async def bulk_fetch(self, request: BulkFetchRequest | None = None) -> BulkFetchResponse:
        """
        Fetch data for a list of entity IDs in bulk.
        """
        if not request or len(request.entity_ids) == 0:
            return BulkFetchResponse(results=[])

        # Splits a list into smaller lists.
        entity_chunks = [
            request.entity_ids[i : i + MAX_ENTITY_SIZE] for i in range(0, len(request.entity_ids), MAX_ENTITY_SIZE)
        ]

        results = []
        for chunk in entity_chunks:
            request.entity_ids = chunk
            response = await self.get_client().post("/api/ni/entities/fetch", content=request.model_dump_json())
            data = response.json()
            results.extend(data["results"])
            await async_sleep(self.sleep_timer)
        return BulkFetchResponse(results=results)

    async def get_firewall_rules(self, query: EntitiesRequest | None = None) -> list[EntityWithTime]:
        """
        Retrieve all firewall rules from the API.
        """
        result = await self.bulk_entities_fetch("/api/ni/entities/firewall-rules", query)
        return result.results

    async def get_vms(self, query: EntitiesRequest | None = None) -> list[EntityWithTime]:
        """
        Retrieve all virtual machines (VMs) from the API.
        """
        result = await self.bulk_entities_fetch("/api/ni/entities/vms", query)
        return result.results

    async def search(self, request: SearchRequest) -> PagedListResponseWithTime:
        """
        Perform a search operation on the API based on the provided request.
        """
        response = await self.get_client().post("/api/ni/search", content=request.model_dump_json())
        data = response.json()
        return PagedListResponseWithTime(**data)

    async def search_ql(self, request: AriaSearchQueryRequest) -> AriaSearchQueryResponse:
        """
        Perform a QL search operation.
        """
        response = await self.get_client().post("/api/ni/search/ql", content=request.model_dump_json())

        return AriaSearchQueryResponse(**response.json())

    async def get_security_groups(self, query: EntitiesRequest | None = None) -> list[EntityWithTime]:
        """
        Retrieve all security groups (NSXPolicyGroup) from the API.
        """

        result = await self.bulk_entities_fetch("/api/ni/entities/security-groups", query)
        return result.results

    async def get_services(self, query: EntitiesRequest | None = None) -> list[EntityWithTime]:
        """
        Retrieve all services from the API.
        """

        result = await self.bulk_entities_fetch("/api/ni/entities/services", query)

        service_map = {
            service.entity_id: service.entity
            for service in result.results
            if isinstance(service.entity, PolicyManagerServiceEntryConfig)
        }

        result = await self.bulk_entities_fetch("/api/ni/entities/service-groups", query)

        for group in result.results:
            if not isinstance(group.entity, PolicyManagerServiceConfig):
                continue
            for member in group.entity.members:
                service = service_map.get(member.entity_id)
                if service:
                    group.entity.services.append(service)

        return result.results

    async def get_firewall_rule_managers(self) -> dict[str, str]:
        """
        Retrieves NSX-T Firewall Rules IDs grouped by their associated NSX managers.

        Due to limitations in the Aria Networks API, firewall rules do not directly include the manager they belong to,
        and no other API endpoint provides this mapping. To resolve this, a workaround using the QL API is used.

        The QL API's cursor functionality does not work.
        """
        query = AriaSearchQueryRequest(query="NSX Policy Firewall Rule group by Manager, entity_id", size=1)

        result = await self.search_ql(query)
        query.size = result.search_response_total_hits

        result = await self.search_ql(query)
        if result.search_response_total_hits != (result.groupby_response.size if result.groupby_response else None):
            logger.error("Mismatch between requested size and response size.")

        mapping = {}
        if not result.groupby_response:
            return {}
        for entry in result.groupby_response.results:
            rule_id = entry["bucket"][1]["value"]
            manager = entry["bucket"][0]["value"]
            mapping[rule_id] = manager
        return mapping

    async def _get_host_to_nsx_mapping(self) -> dict[str, str]:
        """
        If Aria Operations for Networks collects logs for multiple NSX instances,
        there is currently no way to assign the correct firewall rule (firewall_rule_id is not unique) to the flows.
        This function provides a workaround to map hosts to their respective NSX managers and firewall rules.
        """

        nsx_to_vca_result = await self.search_ql(AriaSearchQueryRequest(query="NSX Manager group by VC Managers, Name"))
        host_to_vca_result = await self.search_ql(AriaSearchQueryRequest(query="Host group by Name, vCenter"))

        # Parse NSX to VCA Mapping
        vca_to_nsx_mapping = {}
        if not nsx_to_vca_result.groupby_response:
            logger.error("Failed to retrieve NSX to vCenter mapping. No groupby response.")
            return {}
        for entry in nsx_to_vca_result.groupby_response.results:
            nsx = entry["bucket"][1]["value"]
            vca = entry["bucket"][0]["value"]
            vca_to_nsx_mapping[vca] = nsx

        # Parse Host to VCA Mapping
        host_to_vca_mapping = {}
        if not host_to_vca_result.groupby_response:
            logger.error("Failed to retrieve Host to vCenter mapping. No groupby response.")
            return {}
        for entry in host_to_vca_result.groupby_response.results:
            vca = entry["bucket"][1]["value"]
            host = entry["bucket"][0]["value"]
            host_to_vca_mapping[host] = vca

        # Host to NSX Mapping
        host_to_nsx_mapping = {}
        for host, vca in host_to_vca_mapping.items():
            nsx = vca_to_nsx_mapping.get(vca, None)
            if not nsx:
                logger.error(f"NSX Manager name not found for vCenter: {vca}")
                continue
            host_to_nsx_mapping[extract_hostname(host)] = nsx

        return host_to_nsx_mapping

    async def get_host_to_nsx_mapping(self) -> dict[str, str]:
        """
        Retrieves a mapping of ESXi hosts to NSX Managers.
        """
        mapping = cast(dict[str, str], await Cache.get("host_nsx_mapping"))
        if mapping:
            return mapping
        mapping = await self._get_host_to_nsx_mapping()
        await Cache.set("host_nsx_mapping", mapping, expires_in=timedelta(hours=12))
        return mapping

    async def bulk_fetch_raw(self, request: BulkFetchRequest | None = None) -> list[dict]:
        """
        Fetch data for a list of entity IDs in bulk. Returns list[dict] instead of BulkFetchResponse.
        """
        if not request or len(request.entity_ids) == 0:
            return []

        # Splits a list into smaller lists.
        entity_chunks = [
            request.entity_ids[i : i + MAX_ENTITY_SIZE] for i in range(0, len(request.entity_ids), MAX_ENTITY_SIZE)
        ]

        results = []
        for chunk in entity_chunks:
            request.entity_ids = chunk
            response = await self.get_client().post("/api/ni/entities/fetch", content=request.model_dump_json())
            data = response.json()
            results.extend(data["results"])
            await async_sleep(self.sleep_timer)
        return results


class SourceAriaNetworks(SourceBase):
    """
    Data source implementation for VMware Aria Operations for Networks (Network Insight).
    """

    def __init__(self, config: schema.data_sources.DataSourceAriaNetworks) -> None:
        super().__init__(config=config)
        self.config = config
        self.mapper = QueryMapperAriaNetworks(mapping_file=Path(__file__).parent / "mapping.json", config=config)
        self.api_client = ApiClient(config=config)
        self.object_tracker = ObjectTracker()
        self.logger = logger

    async def check_connectivity(self):
        """
        Check the connectivity to the VMware Aria Operations for Networks API.

        This method sends a simple request to verify that the API is reachable and functioning correctly.
        """
        async with self.api_client as connection:
            await connection.authorize()
            await connection.get_client().get("/api/ni/info/version")

    async def fetch_logs(self, query: schema.logs.SearchQuery) -> list[schema.logs.Record]:
        """
        Search for flows.
        """
        time_range = TimeRange(start_time=query.time_interval.start_time, end_time=query.time_interval.end_time)
        query_filter = self.mapper.build_query_filter(query)

        result = []
        async with self.api_client as connection:
            await connection.authorize()

            # Get Flow ID to FW Rule Mapping
            search_request = AriaSearchQueryRequest(query=query_filter, size=1, time_range=time_range)
            search_result = await connection.search_ql(search_request)

            search_request.size = search_result.search_response_total_hits
            search_result = await connection.search_ql(search_request)

            # Parse Flow ID to FW Rule Mapping
            flow_to_fw_rule_mapping = {}
            if not search_result.groupby_response:
                raise ConnectionError("Flow Records. No groupby response.")

            for entry in search_result.groupby_response.results:
                fw_rule = entry["bucket"][1]["value"]
                flow_id = entry["bucket"][0]["value"]
                flow_to_fw_rule_mapping[flow_id] = fw_rule

            # Splits a list into smaller lists.
            flow_ids = list(flow_to_fw_rule_mapping.keys())
            entity_chunks = [flow_ids[i : i + MAX_ENTITY_SIZE] for i in range(0, len(flow_ids), MAX_ENTITY_SIZE)]

            for chunk in entity_chunks:
                response = await connection.bulk_fetch_raw(
                    request=BulkFetchRequest(
                        entity_ids=[
                            EntityIdWithTime(entity_id=entity_id, entity_type=EntityType.Flow) for entity_id in chunk
                        ]
                    )
                )

                for entity_with_time in response:
                    entity_with_time["entity"]["firewall_rule"] = flow_to_fw_rule_mapping.get(
                        entity_with_time["entity_id"], None
                    )
                    result.append(entity_with_time["entity"])
                await async_sleep(self.api_client.sleep_timer)

            return await self.mapper.map_result(result)

    @classmethod
    async def from_id(cls, source_id: UUID | str) -> Self:
        """
        Create an instance of the data source by using ORM UUID.
        """
        if isinstance(source_id, str):
            source_id = UUID(source_id)
        async with get_db_session_context() as session:
            config = await session.get_one(schema.data_sources.ORMDataSourceAriaNetworks, source_id)
            return cls(config=schema.data_sources.DataSourceAriaNetworks.model_validate(config))
