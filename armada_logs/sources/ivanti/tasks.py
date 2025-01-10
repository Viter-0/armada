from ipaddress import ip_address
from uuid import UUID

from armada_logs.const import DataSourceTypesEnum, TaskActionsEnum
from armada_logs.core.tasks import tasks_broker
from armada_logs.database.dependencies import get_db_session_context
from armada_logs.schema.assets import AssetHostCreate, AssetHostReferenceCreate
from armada_logs.sources.ivanti.source import SourceIvantiITSM


@tasks_broker.task(action=TaskActionsEnum.COLLECT_ASSETS, source_type=DataSourceTypesEnum.IVANTI_ITSM)
async def collect_assets(source_id: UUID):
    source = await SourceIvantiITSM.from_id(source_id=source_id)

    hosts = []
    async with source.api_client as api_session:
        result = await api_session.get_CIs()
    for ci in result:
        if not ci.IPAddress or not ci.Name or ci.Status == "Retired":
            continue

        for ip in ci.split_ips():
            try:
                ip_addr = ip_address(ip)
            except ValueError:
                continue
            if not source.object_tracker.is_unique(str(ip_addr)):
                continue
            hosts.append(
                AssetHostCreate(
                    ip=str(ip_addr),
                    name=ci.Name,
                    description=ci.Description,
                    vendor=ci.Manufacturer,
                    domain=ci.DomainName,
                    confidence_score=source.config.confidence_score,
                    references=[AssetHostReferenceCreate(data_source_id=source_id, source_identifier=ci.RecId)],
                )
            )

    async with get_db_session_context() as db_session:
        await SourceIvantiITSM.process_and_add_hosts(session=db_session, asset_data=hosts)
