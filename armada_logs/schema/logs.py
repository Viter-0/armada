from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, IPvAnyAddress

from .assets import (
    AssetFirewallRuleResponse,
    AssetHostResponse,
    AssetNetworkResponse,
    AssetUserResponse,
    PolymorphicAsset,
)
from .util import AssetReference, TimeInterval


class Record(BaseModel):
    timestamp: int | None = None
    source_ip: IPvAnyAddress
    destination_ip: IPvAnyAddress
    port: str
    protocol: str
    action: str
    log_source: str | None = None
    data_source: str | None = Field(default=None, description="Name of data source")
    source_device: AssetHostResponse | AssetReference | None = None
    destination_device: AssetHostResponse | AssetReference | None = None
    firewall_rule: AssetFirewallRuleResponse | AssetReference | None = None
    firewall_rule_id: str | None = None
    user: AssetUserResponse | AssetReference | None = None
    username: str | None = None
    vrf: str | None = None
    session_message: str | None = None
    source_security_groups: list = []
    destination_security_groups: list = []
    source_networks: list[AssetNetworkResponse] = []
    destination_networks: list[AssetNetworkResponse] = []
    application: str | None = None
    client_to_server_bytes: int | None = None
    server_to_client_bytes: int | None = None
    source_interface: str | None = None
    destination_interface: str | None = None
    source_zone: str | None = None
    destination_zone: str | None = None
    manager: str | None = None


class RecordResponse(Record):
    """
    Returned by the API with resolved asset references.
    """

    source_device: AssetHostResponse | None = None
    destination_device: AssetHostResponse | None = None
    firewall_rule: AssetFirewallRuleResponse | None = None
    user: AssetUserResponse | None = None


class QueryFilter(BaseModel):
    """
    Version of the filter that the user submits.
    """

    model_config = ConfigDict(str_strip_whitespace=True, str_min_length=1)

    value: str | list[str]
    expression: str
    field: str
    entity_type: Literal["host", "log", "firewall_rule", "security_group", "asset_user"] = "log"


class QueryFilterResolved(BaseModel):
    """
    A query filter where all assets have been resolved into log-compatible fields.
    """

    assets: PolymorphicAsset | list[PolymorphicAsset] | None = None
    original: QueryFilter
    resolved: QueryFilter | None = None


class SearchQueryRequest(BaseModel):
    """
    A logs search query request (API request).
    """

    model_config = ConfigDict(str_strip_whitespace=True)
    time_interval: TimeInterval
    log_count: int
    sources: list[UUID] = Field(description="Empty list means search in all active sources.")
    filter: list[QueryFilter]

    def is_empty(self) -> bool:
        return len(self.filter) == 0


class SearchQuery(BaseModel):
    """
    A logs query used to fetch flows (internal).

    This model is passed to data sources to retrieve logs.
    """

    time_interval: TimeInterval
    log_count: int
    filter: list[QueryFilterResolved]


class SearchCapableDataSource(BaseModel):
    """
    Represents a data source that supports search capabilities.
    """

    model_config = ConfigDict(from_attributes=True)
    id: UUID
    name: str


class ExecutionTime(BaseModel):
    """
    The execution time metrics for a query operation.
    """

    name: str
    target: str
    duration: float


class QueryMetadata(BaseModel):
    """
    Contains metadata about query execution.
    """

    model_config = ConfigDict(str_strip_whitespace=True)

    execution_durations: list[ExecutionTime] = []


class QueryError(BaseModel):
    """
    Error that occurred during query execution.
    """

    message: str
    name: str


class SearchQueryResponse(BaseModel):
    """
    Data model returned by the API to the user.
    """

    meta: QueryMetadata
    results: list[RecordResponse] = []
    errors: list[QueryError] = []
    is_success: bool = Field(
        default=True,
        description="Whether at least one data source successfully returned results. "
        "Useful for displaying error messages to the user.",
    )


class FetchResult(BaseModel):
    """
    The result returned by a data source.
    """

    records: list = []
    execution_time: ExecutionTime
    errors: list = []
    is_success: bool = True
