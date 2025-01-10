from uuid import UUID

from armada_logs.const import DataSourceTypesEnum, TaskActionsEnum
from armada_logs.core.tasks import tasks_broker
from armada_logs.database import get_db_session_context
from armada_logs.schema.assets import (
    AssetFirewallRuleCreate,
    AssetHostCreate,
    AssetHostReferenceCreate,
    FirewallRuleEntity,
)
from armada_logs.schema.util import NSXHostMappingCreate
from armada_logs.sources.resources import is_valid_ip

from .data_structures import (
    NSXPolicyGroup,
    PolicyManagerFirewallRule,
    PolicyManagerServiceConfig,
    Reference,
    VirtualMachine,
)
from .source import ApiClient, SourceAriaNetworks

ANY = FirewallRuleEntity(name="any", value="any")


def parse_host_entity(entity: VirtualMachine, confidence_score: float, data_source_id: UUID) -> list[AssetHostCreate]:
    result: list[AssetHostCreate] = []

    for ip in entity.ip_addresses:
        if not is_valid_ip(ip.ip_address):
            continue
        result.append(
            AssetHostCreate(
                ip=ip.ip_address,
                name=entity.name,
                is_vm=True,
                confidence_score=confidence_score,
                references=[
                    AssetHostReferenceCreate(data_source_id=data_source_id, source_identifier=entity.entity_id)
                ],
            )
        )
    return result


def parse_firewall_rule_entity(
    entity: PolicyManagerFirewallRule, data_source_id: UUID, manager: str | None, resource_mapping: dict[str, str]
) -> AssetFirewallRuleCreate:
    def parse_resource(refs: list[Reference]):
        if not refs:
            return [ANY]
        result = []
        for ref in refs:
            if ref.entity_id in resource_mapping:
                value = resource_mapping[ref.entity_id]
            else:
                value = ref.entity_name
            if not ref.entity_name or not value:
                continue
            result.append(FirewallRuleEntity(name=ref.entity_name, value=value))
        return result

    return AssetFirewallRuleCreate(
        name=f"{entity.section_name} > {entity.name}",
        rule_id=entity.rule_id,
        action=entity.action,
        source_identifier=entity.entity_id,
        data_source_id=data_source_id,
        is_source_inverted=entity.source_inversion,
        is_destination_inverted=entity.destination_inversion,
        sources=parse_resource(entity.sources),
        destinations=parse_resource(entity.destinations),
        services=parse_resource(entity.services),
        manager=manager,
        source_identifier_alt=f"{manager}__{entity.rule_id}" if manager else None,
    )


async def collect_hosts(source: SourceAriaNetworks, api_session: ApiClient):
    result = await api_session.get_vms()

    hosts: list[AssetHostCreate] = []
    for entity_with_id in result:
        if not isinstance(entity_with_id.entity, VirtualMachine):
            continue

        for host in parse_host_entity(
            entity=entity_with_id.entity,
            confidence_score=source.config.confidence_score,
            data_source_id=source.config.id,
        ):
            if not source.object_tracker.is_unique(host.ip):
                continue
            hosts.append(host)
    return hosts


def extract_resource_value(entity):
    if isinstance(entity, NSXPolicyGroup):
        return ", ".join([ref.entity_name for ref in entity.direct_members if ref.entity_name is not None])
    if isinstance(entity, PolicyManagerServiceConfig):
        return " ".join(
            [
                f"{service.protocol}/{','.join([range_.display for range_ in service.port_ranges])}"
                for service in entity.services
            ]
        )
    return "__PARSER_NOT_IMPLEMENTED__"


async def collect_firewall_rules(source: SourceAriaNetworks, api_session: ApiClient):
    result = await api_session.get_firewall_rules()
    security_groups = await api_session.get_security_groups()
    services = await api_session.get_services()
    resource_mapping = {}
    resource_mapping.update({group.entity_id: extract_resource_value(group.entity) for group in security_groups})
    resource_mapping.update({service.entity_id: extract_resource_value(service.entity) for service in services})
    mananger_mapping = await api_session.get_firewall_rule_managers()
    firewall_rules: list[AssetFirewallRuleCreate] = []
    for entity_with_id in result:
        if not isinstance(entity_with_id.entity, PolicyManagerFirewallRule):
            continue
        firewall_rules.append(
            parse_firewall_rule_entity(
                entity=entity_with_id.entity,
                data_source_id=source.config.id,
                manager=mananger_mapping.get(entity_with_id.entity_id, None),
                resource_mapping=resource_mapping,
            )
        )

    return firewall_rules


def collect_nsx_host_mapping(data: dict[str, str]) -> list[NSXHostMappingCreate]:
    return [NSXHostMappingCreate(host=host, nsx_manager=nsx_manager) for host, nsx_manager in data.items()]


@tasks_broker.task(action=TaskActionsEnum.COLLECT_ASSETS, source_type=DataSourceTypesEnum.ARIA_NETWORKS)
async def collect_assets(source_id: UUID):
    source = await SourceAriaNetworks.from_id(source_id=source_id)

    async with source.api_client as api_session:
        await api_session.authorize()
        hosts = await collect_hosts(source=source, api_session=api_session)
        firewall_rules = await collect_firewall_rules(source=source, api_session=api_session)
        nsx_host_mapping = collect_nsx_host_mapping(data=await api_session.get_host_to_nsx_mapping())

    async with get_db_session_context() as db_session:
        await SourceAriaNetworks.process_and_add_hosts(session=db_session, asset_data=hosts)
        await SourceAriaNetworks.process_and_add_firewall_rules(session=db_session, asset_data=firewall_rules)
        await SourceAriaNetworks.process_and_add_esxi_to_nsx_manager_mapping(session=db_session, data=nsx_host_mapping)
