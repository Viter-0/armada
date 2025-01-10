from ipaddress import ip_network
from uuid import UUID

from armada_logs.const import DataSourceTypesEnum, TaskActionsEnum
from armada_logs.core.tasks import tasks_broker
from armada_logs.database.dependencies import get_db_session_context
from armada_logs.schema.assets import AssetHostCreate, AssetHostReferenceCreate, AssetNetworkCreate
from armada_logs.sources.resources import is_valid_ip

from .data_structures import QRadarAsset, QRadarNetwork
from .source import SourceQRadar


def parse_hostname(name: str):
    return name.split(".")[0]


def parse_host_entity(entity: QRadarAsset, source: SourceQRadar) -> list[AssetHostCreate]:
    result = []
    if not entity.interfaces:
        return result

    if entity.hostnames:
        hostname = parse_hostname(entity.hostnames[0].name)
    else:
        hostname = None

    for interface in entity.interfaces:
        mac_address = interface.mac_address

        for ip_address in interface.ip_addresses:
            if not is_valid_ip(ip_address.value):
                continue
            if not source.object_tracker.is_unique(ip_address.value):
                continue
            result.append(
                AssetHostCreate(
                    ip=ip_address.value,
                    name=hostname,
                    mac_address=mac_address,
                    confidence_score=source.config.confidence_score,
                    references=[
                        AssetHostReferenceCreate(data_source_id=source.config.id, source_identifier=str(ip_address.id))
                    ],
                )
            )
    return result


def parse_network_entity(entity: QRadarNetwork, source: SourceQRadar) -> AssetNetworkCreate:
    return AssetNetworkCreate(
        cidr=ip_network(entity.cidr),
        name=entity.name,
        description=entity.description,
        confidence_score=source.config.confidence_score,
    )


@tasks_broker.task(action=TaskActionsEnum.COLLECT_ASSETS, source_type=DataSourceTypesEnum.QRADAR)
async def collect_assets(source_id: UUID):
    source = await SourceQRadar.from_id(source_id=source_id)

    asset_hosts: list[AssetHostCreate] = []
    asset_networks: list[AssetNetworkCreate] = []
    async with source.api_client as api_session:
        assets = await api_session.get_assets()
        try:
            networks = await api_session.get_networks()
            asset_networks = [parse_network_entity(x, source) for x in networks]
        except Exception as e:
            source.logger.error(e)

        for res in assets:
            asset_hosts.extend(parse_host_entity(res, source))

    async with get_db_session_context() as db_session:
        await SourceQRadar.process_and_add_hosts(session=db_session, asset_data=asset_hosts)
        await SourceQRadar.process_and_add_networks(session=db_session, asset_data=asset_networks)
