from ipaddress import ip_network
from typing import Final
from uuid import UUID

from armada_logs.schema.assets import (
    AssetFirewallRuleCreate,
    AssetHostCreate,
    AssetHostReferenceCreate,
    AssetNetworkCreate,
    FirewallRuleEntity,
)

try:
    import faker
    from faker.providers import BaseProvider, ElementsType
except ImportError:
    faker = None

# Seed to produce the same faker result
SEED: Final = 554884
SEED_ALT: Final = 554474

FAKER_NOT_FOUND = ModuleNotFoundError("The 'Faker' package is not installed. Please install it.")


def get_firewall_rules(data_source_id: UUID) -> list[AssetFirewallRuleCreate]:
    if faker is None:
        raise FAKER_NOT_FOUND

    result = []
    gen_src_ip = faker.Faker()
    gen_src_ip.seed_instance(SEED)
    gen_dst_ip = faker.Faker()
    gen_dst_ip.seed_instance(SEED_ALT)
    gen_rule_id = faker.Faker()
    gen_rule_id.seed_instance(SEED)
    gen_port = faker.Faker()
    gen_port.seed_instance(SEED)
    gen_zone = faker.Faker()
    gen_zone.seed_instance(SEED)

    for _ in range(300):
        src_ip = gen_src_ip.ipv4_private()
        dst_ip = gen_dst_ip.ipv4_private()
        port = str(gen_port.port_number())
        rule_id = str(gen_rule_id.random_number(digits=3))
        zone = gen_zone.random_uppercase_letter()
        result.append(
            AssetFirewallRuleCreate(
                name=f"Firewall Rule {rule_id}",
                rule_id=rule_id,
                action="ALLOW",
                source_identifier=f"id_{src_ip}_{dst_ip}",
                data_source_id=data_source_id,
                sources=[FirewallRuleEntity(name=f"Host_{src_ip}", value=src_ip)],
                services=[FirewallRuleEntity(name=f"TCP_{port}", value=port)],
                destinations=[FirewallRuleEntity(name=f"Host_{dst_ip}", value=dst_ip)],
                source_zones=[FirewallRuleEntity(name="ZONE", value=f"ZONE-{zone}")],
            )
        )

    return result


def get_hosts(data_source_id: UUID) -> list[AssetHostCreate]:
    """
    Generate a list of random host information.
    """
    if faker is None:
        raise FAKER_NOT_FOUND

    class DeviceNameProvider(BaseProvider):
        """
        Custom Faker provider using parser.
        """

        suffix_elements: ElementsType[int] = [i for i in range(1, 9)]  # type: ignore

        def device_name(self) -> str:
            return self.generator.parse(
                "SRV-{{random_uppercase_letter}}{{random_uppercase_letter}}{{random_uppercase_letter}}00{{suffix}}"
            )

        def suffix(self) -> int:
            return self.random_element(self.suffix_elements)

    class DeviceDescriptionProvider(BaseProvider):
        suffix_elements = [
            "Primary web server for hosting public-facing applications.",
            "Database node responsible for storing customer information.",
            "Load balancer for distributing traffic across backend servers.",
            "Development server for testing new application features.",
            "Backup server for disaster recovery and archiving.",
            "High-performance compute node for AI model training.",
            "VPN gateway for secure remote access to the internal network.",
            "Internal API gateway for microservices communication.",
            "Email server for corporate messaging and notifications.",
            "Logging server for aggregating system and application logs.",
            "File server for storing and sharing project documents.",
            "Monitoring server for tracking system health and performance.",
            "DNS server managing internal and external domain lookups.",
            "Proxy server for caching and accelerating web traffic.",
            "Container orchestration node for managing Docker services.",
            "Firewall appliance for securing network perimeters.",
            "IoT gateway server for managing smart device communication.",
            "Primary controller for virtualization and VMs.",
            "Edge server for content delivery in low-latency scenarios.",
            "Data analytics node for processing real-time telemetry.",
            "Redundant storage server for critical file backups.",
            "API testing server for staging new features before deployment.",
            "Server hosting internal company portals and HR tools.",
            "Cold storage server for archiving historical data.",
            "CI/CD build server for automated deployment pipelines.",
            "Media streaming server for internal video sharing.",
        ]

        def random_description(self) -> str:
            return self.random_element(self.suffix_elements)

    gen_ip = faker.Faker()
    gen_ip.seed_instance(SEED)
    gen_ip_alt = faker.Faker()
    gen_ip_alt.seed_instance(SEED_ALT)
    gen_name = faker.Faker()
    gen_name.seed_instance(SEED)
    gen_name.add_provider(DeviceNameProvider)
    gen_description = faker.Faker()
    gen_description.add_provider(DeviceDescriptionProvider)
    gen_description.seed_instance(SEED)
    gen_mac = faker.Faker()
    gen_mac.seed_instance(SEED)

    def generate_chunk(ip_gen, size: int = 50) -> list[AssetHostCreate]:
        result = []
        for _ in range(size):
            ip = ip_gen.ipv4_private()
            result.append(
                AssetHostCreate(
                    ip=ip,
                    name=gen_name.device_name(),
                    description=gen_description.random_description(),
                    domain="demo.lan",
                    mac_address=gen_mac.mac_address(),
                    references=[AssetHostReferenceCreate(source_identifier="id_" + ip, data_source_id=data_source_id)],
                )
            )
        return result

    return [*generate_chunk(gen_ip), *generate_chunk(gen_ip_alt)]


def get_networks() -> list[AssetNetworkCreate]:
    """
    Generate a list of random network information.
    """
    if faker is None:
        raise FAKER_NOT_FOUND

    class NetworkNameProvider(BaseProvider):
        name_elements = [
            "Production Web Servers",
            "Production Databases",
            "Load Balancers",
            "Development Servers",
            "Backup Servers",
            "Network Infrastructure",
            "DMZ Servers",
            "IoT Servers",
            "DevOps Servers",
            "Test Web Servers",
        ]

        def random_name(self) -> str:
            return self.random_element(self.name_elements)

    gen_network = faker.Faker()
    gen_network.seed_instance(SEED)
    gen_name = faker.Faker()
    gen_name.add_provider(NetworkNameProvider)
    gen_name.seed_instance(SEED)

    return [
        AssetNetworkCreate(
            cidr=ip_network(gen_network.ipv4_private(network=True)),
            name=gen_name.random_name(),
        )
        for _ in range(20)
    ]
