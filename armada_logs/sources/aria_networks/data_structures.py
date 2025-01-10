from enum import Enum
from typing import Final, Literal, TypedDict, Union

from pydantic import BaseModel, Field

# Max size supported by aria is 1000
MAX_ENTITY_SIZE: Final = 999


class Token(BaseModel):
    token: str
    expiry: int


class TimeRange(BaseModel):
    start_time: int
    end_time: int


class EntityType(Enum):
    VirtualMachine = "VirtualMachine"
    Flow = "Flow"
    PolicyManagerFirewallRule = "PolicyManagerFirewallRule"
    NSXTFirewallRule = "NSXTFirewallRule"
    NSXPolicyGroup = "NSXPolicyGroup"
    NSXTManager = "NSXTManager"
    NSXPolicyManager = "NSXPolicyManager"
    VCenterManager = "VCenterManager"
    VCDatacenter = "VCDatacenter"
    Host = "Host"
    PolicyManagerServiceEntryConfig = "PolicyManagerServiceEntryConfig"
    PolicyManagerServiceConfig = "PolicyManagerServiceConfig"


class Reference(BaseModel):
    entity_id: str
    entity_type: str | None = None
    entity_name: str | None = None


class ReferenceDict(TypedDict):
    entity_id: str
    entity_type: str | None
    entity_name: str | None


class IpAddress(BaseModel):
    ip_address: str
    netmask: str
    network_address: str


class EntityIdWithTime(BaseModel):
    entity_id: str
    entity_type: EntityType
    time: int | None = None


class EntitiesRequest(BaseModel):
    start_time: int | None = None
    end_time: int | None = None
    cursor: str | None = None
    size: int = MAX_ENTITY_SIZE  # Max size supported by aria is 1000


class PagedListResponseWithTime(BaseModel):
    results: list[EntityIdWithTime]
    total_count: int
    start_time: int
    end_time: int
    cursor: str | None = None


class BulkFetchRequest(BaseModel):
    entity_ids: list[EntityIdWithTime]


class BaseVirtualMachine(BaseModel):
    entity_id: str
    name: str
    entity_type: Literal["BaseVirtualMachine"]
    ip_addresses: list[IpAddress]
    default_gateway: str
    default_gateways: list[str]
    vnics: list[Reference]
    security_groups: list[Reference]
    source_firewall_rules: list
    destination_firewall_rules: list
    ip_sets: list[Reference]
    tag_keys: list[str]
    tag_key_values: list[str]
    tag_values: list
    vm_UUID: str
    manager_uuid: str | None = None


class VirtualMachine(BaseVirtualMachine):
    entity_type: Literal["VirtualMachine"]
    cluster: Reference
    resource_pool: Reference
    security_tags: list[Reference]
    layer2_networks: list[Reference]
    host: Reference
    vlans: list
    vendor_id: str
    vcenter_manager: Reference
    folders: list[Reference]
    datastores: list[Reference]
    datacenter: Reference
    nsx_manager: Reference | None = None
    source_inversion_rules: list = []
    destination_inversion_rule: list = []
    cpu_count: int
    memory: int
    os_full_name: str
    hcx_info: dict


class BaseFirewallRule(BaseModel):
    entity_id: str
    name: str
    entity_type: Literal["BaseFirewallRule"]
    rule_id: str
    section_id: str
    section_name: str
    sequence_number: int
    source_any: bool
    destination_any: bool
    service_any: bool
    anySrcInterface: bool
    anyDstInterface: bool
    sources: list[Reference]
    destinations: list[Reference]
    services: list[Reference]
    action: Literal["ALLOW", "ACCEPT", "DENY", "DROP", "REJECT", "REDIRECT", "DO_NOT_REDIRECT"]
    disabled: bool
    source_inversion: bool
    destination_inversion: bool
    port_ranges: list


class NSXTFirewallRule(BaseFirewallRule):
    entity_type: Literal["NSXTFirewallRule"]
    logging_enabled: bool
    direction: Literal["IN", "OUT", "INOUT"]
    nsx_managers: list
    applied_tos: list
    scope: Literal["UNIVERSAL", "GLOBAL", "LOCAL"] | None = None


class PolicyManagerFirewallRule(BaseFirewallRule):
    entity_type: Literal["PolicyManagerFirewallRule"]
    realized_entities: list
    sddc_type: Literal["ONPREM", "VMC"]
    nsx_managers: list = []


class NSXPolicyGroup(BaseModel):
    name: str
    entity_type: Literal["NSXPolicyGroup"]
    entity_id: str
    direct_members: list[Reference]
    excluded_members: list[Reference]


class PortRange(BaseModel):
    start: int
    end: int
    display: str
    iana_name: str | None = None
    iana_port_display: str | None = None


class PolicyManagerServiceEntryConfig(BaseModel):
    name: str
    entity_type: Literal["PolicyManagerServiceEntryConfig"]
    entity_id: str
    protocol: str
    port_ranges: list[PortRange]
    policy_managers: list[Reference]


class PolicyManagerServiceConfig(BaseModel):
    name: str
    entity_type: Literal["PolicyManagerServiceConfig"]
    entity_id: str
    members: list[Reference]
    policy_managers: list[Reference]
    services: list[PolicyManagerServiceEntryConfig] = []


class EntityWithTime(BaseModel):
    entity_id: str
    entity_type: EntityType
    time: int | None = None
    entity: Union[
        VirtualMachine,
        PolicyManagerFirewallRule,
        NSXTFirewallRule,
        NSXPolicyGroup,
        PolicyManagerServiceEntryConfig,
        PolicyManagerServiceConfig,
    ] = Field(..., discriminator="entity_type")


class BulkFetchResponse(BaseModel):
    results: list[EntityWithTime]


class SortByClause(BaseModel):
    """

    Args:
        order: ['ASC', 'DESC']
    """

    field: str
    order: str


class SearchRequest(BaseModel):
    entity_type: EntityType
    filter: str | None = None
    sort_by: dict | SortByClause | None = None
    size: int = MAX_ENTITY_SIZE
    cursor: str | None = None
    time_range: dict | TimeRange | None = None


class AriaSearchQueryRequest(BaseModel):
    query: str | None = None
    size: int = MAX_ENTITY_SIZE
    cursor: str | None = None
    time_range: TimeRange | None = None


class GroupbyResponse(BaseModel):
    results: list
    size: int | None = None
    total_bucket: dict | None = None
    total_count: int | None = None
    time_range: TimeRange | None = None
    cursor: str | None = None


class AriaSearchQueryResponse(BaseModel):
    search_response_total_hits: int
    entity_list_response: dict | None = None
    aggregation_response: dict | None = None
    groupby_response: GroupbyResponse | None = None
