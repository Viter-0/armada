from datetime import datetime
from ipaddress import IPv4Address
from typing import Self
from uuid import UUID

from armada_logs import schema
from armada_logs.database.dependencies import get_db_session_context
from armada_logs.sources.demo.assets import FAKER_NOT_FOUND, SEED, SEED_ALT
from armada_logs.sources.resources import SourceBase

try:
    import faker
except ImportError:
    faker = None


class SourceDemo(SourceBase):
    """
    Data source implementation for Demo.
    """

    def __init__(self, config: schema.data_sources.DataSourceDemo) -> None:
        super().__init__(config=config)
        self.config = config

    async def check_connectivity(self):
        """
        Check the connectivity to Demo.
        """
        pass

    async def fetch_logs(self, query: schema.logs.SearchQueryRequest) -> list[schema.logs.Record]:
        """
        Search for flows.
        """
        if faker is None:
            raise FAKER_NOT_FOUND

        source_id = self.config.id
        gen_src_ip = faker.Faker()
        gen_src_ip.seed_instance(SEED)
        gen_dst_ip = faker.Faker()
        gen_dst_ip.seed_instance(SEED_ALT)
        gen_port = faker.Faker()
        gen_port.seed_instance(SEED)
        gen_rule_id = faker.Faker()
        gen_rule_id.seed_instance(SEED)
        records = []
        for _ in range(200):
            src_ip = gen_src_ip.ipv4_private()
            dst_ip = gen_dst_ip.ipv4_private()
            record = schema.logs.Record(
                timestamp=int(datetime.now().timestamp()),
                source_ip=IPv4Address(src_ip),
                destination_ip=IPv4Address(dst_ip),
                port=str(gen_port.port_number()),
                protocol="TCP",
                action="ALLOW",
                source_device=schema.util.AssetReference(
                    data_source_id=source_id, source_identifier="id_" + src_ip, entity_type="host"
                ),
                destination_device=schema.util.AssetReference(
                    data_source_id=source_id, source_identifier="id_" + dst_ip, entity_type="host"
                ),
                firewall_rule=schema.util.AssetReference(
                    data_source_id=source_id, source_identifier=f"id_{src_ip}_{dst_ip}", entity_type="firewall_rule"
                ),
                firewall_rule_id=str(gen_rule_id.random_number(digits=3)),
            )
            records.append(record)
        return records

    @classmethod
    async def from_id(cls, source_id: UUID | str) -> Self:
        """
        Create an instance of the data source by using ORM UUID
        """
        if isinstance(source_id, str):
            source_id = UUID(source_id)
        async with get_db_session_context() as session:
            config = await session.get_one(schema.data_sources.ORMDataSourceDemo, source_id)
            return cls(config=schema.data_sources.DataSourceDemo.model_validate(config))
