from uuid import UUID

from armada_logs.const import DataSourceTypesEnum, TaskActionsEnum
from armada_logs.core.tasks import tasks_broker
from armada_logs.database import get_db_session_context

from .assets import get_firewall_rules, get_hosts, get_networks
from .source import SourceDemo


@tasks_broker.task(action=TaskActionsEnum.COLLECT_ASSETS, source_type=DataSourceTypesEnum.DEMO)
async def collect_assets(source_id: UUID):
    async with get_db_session_context() as db_session:
        await SourceDemo.process_and_add_hosts(session=db_session, asset_data=get_hosts(source_id))
        await SourceDemo.process_and_add_firewall_rules(session=db_session, asset_data=get_firewall_rules(source_id))
        await SourceDemo.process_and_add_networks(session=db_session, asset_data=get_networks())
