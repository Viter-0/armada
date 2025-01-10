from datetime import UTC as date_time_utc
from datetime import datetime
from ipaddress import IPv4Address, IPv6Address
from typing import Literal, NamedTuple, Optional, Union
from uuid import UUID

from pydantic import (
    BaseModel,
    ConfigDict,
    Field,
    IPvAnyNetwork,
    RootModel,
    field_serializer,
    field_validator,
)
from sqlalchemy import ForeignKey, Index, UniqueConstraint
from sqlalchemy.ext.hybrid import hybrid_method
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.types import JSON

from armada_logs.util.helpers import validate_mac_address

from .base import AuditMixin, Base

# class ORMAssetSecurityGroup(Base, AuditMixin):
#     __tablename__ = "asset_security_groups"

#     __table_args__ = (UniqueConstraint("data_source_id", "source_identifier", name="unique_security_group_entry"),)

#     name: Mapped[str]
#     value: Mapped[str]

#     # Asset classification
#     source_identifier: Mapped[str]
#     data_source_id: Mapped[UUID] = mapped_column(ForeignKey("data_sources.id", ondelete="CASCADE"))
#     entity_type: Mapped[Literal["security_group"]] = mapped_column(default="security_group")


class FirewallRuleEntityDict(NamedTuple):
    """
    Represents an entity in firewall rule configurations.
    """

    name: str
    value: str


class ORMAssetFirewallRule(Base, AuditMixin):
    """
    Database schema for firewall rules.
    """

    __tablename__ = "asset_firewall_rules"

    # Asset information
    name: Mapped[str]
    rule_id: Mapped[str]
    sources: Mapped[list[FirewallRuleEntityDict]] = mapped_column(JSON, default=[])
    destinations: Mapped[list[FirewallRuleEntityDict]] = mapped_column(JSON, default=[])
    source_zones: Mapped[list[FirewallRuleEntityDict]] = mapped_column(JSON, default=[])
    destination_zones: Mapped[list[FirewallRuleEntityDict]] = mapped_column(JSON, default=[])
    source_interfaces: Mapped[list[FirewallRuleEntityDict]] = mapped_column(JSON, default=[])
    destination_interfaces: Mapped[list[FirewallRuleEntityDict]] = mapped_column(JSON, default=[])
    services: Mapped[list[FirewallRuleEntityDict]] = mapped_column(JSON, default=[])
    # Recommended actions - "ALLOW", "ACCEPT", "DENY", "DROP", "REJECT", "REDIRECT", "DO_NOT_REDIRECT"
    action: Mapped[str]
    is_source_inverted: Mapped[bool] = mapped_column(default=False)
    is_destination_inverted: Mapped[bool] = mapped_column(default=False)
    direction: Mapped[Optional[str]] = mapped_column(default=None)

    # Asset classification
    entity_type: Mapped[Literal["firewall_rule"]] = mapped_column(default="firewall_rule")
    source_identifier: Mapped[str] = mapped_column(unique=True)
    source_identifier_alt: Mapped[Optional[str]] = mapped_column(unique=True)
    data_source_id: Mapped[UUID] = mapped_column(ForeignKey("data_sources.id", ondelete="CASCADE"))
    manager: Mapped[Optional[str]]


class FirewallRuleEntity(BaseModel):
    """
    Represents an entity in firewall rule configurations.
    """

    name: str
    value: str


class AssetFirewallRule(BaseModel):
    """
    Data model representing an ORM Firewall Rule entity.
    """

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    rule_id: str
    source_zones: list[FirewallRuleEntity] = []
    destination_zones: list[FirewallRuleEntity] = []
    source_interfaces: list[FirewallRuleEntity] = []
    destination_interfaces: list[FirewallRuleEntity] = []
    sources: list[FirewallRuleEntity] = []
    destinations: list[FirewallRuleEntity] = []
    services: list[FirewallRuleEntity] = []
    action: str
    is_source_inverted: bool = False
    is_destination_inverted: bool = False
    direction: str | None = None

    # Asset classification
    entity_type: Literal["firewall_rule"] = "firewall_rule"
    source_identifier: str
    source_identifier_alt: str | None = None
    data_source_id: UUID
    manager: str | None = None


class AssetFirewallRuleCreate(BaseModel):
    """
    Data model for creating a new firewall rule entity.
    """

    name: str
    rule_id: str
    source_zones: list[FirewallRuleEntity] = []
    destination_zones: list[FirewallRuleEntity] = []
    source_interfaces: list[FirewallRuleEntity] = []
    destination_interfaces: list[FirewallRuleEntity] = []
    sources: list[FirewallRuleEntity] = []
    destinations: list[FirewallRuleEntity] = []
    services: list[FirewallRuleEntity] = []
    action: str = Field(
        ...,
        description='Recommended actions - "ALLOW", "ACCEPT", "DENY", "DROP", "REJECT", "REDIRECT", "DO_NOT_REDIRECT"',
    )
    is_source_inverted: bool = False
    is_destination_inverted: bool = False
    direction: str | None = None

    # Asset classification
    source_identifier: str
    source_identifier_alt: str | None = None
    data_source_id: UUID
    manager: str | None = None


class AssetFirewallRuleResponse(AssetFirewallRule):
    """
    API response model for firewall rule.
    """

    pass


class ORMAssetNetwork(Base, AuditMixin):
    """
    Database schema for network.
    """

    __tablename__ = "asset_networks"

    # Asset information
    cidr: Mapped[str]
    name: Mapped[str]
    location: Mapped[Optional[str]]
    description: Mapped[Optional[str]]

    # Asset classification
    entity_type: Mapped[Literal["network"]] = mapped_column(default="network")
    confidence_score: Mapped[float] = mapped_column(default=0.5)
    is_modified_by_user: Mapped[bool] = mapped_column(default=False)

    def __repr__(self):
        return (
            f"ORMAssetNetwork(id={self.id}, cidr='{self.cidr}', name='{self.name}', location='{self.location}',"
            f"description='{self.description}', confidence_score={self.confidence_score} )"
        )

    @hybrid_method
    def current_confidence_score(self) -> float:
        """
        Calculate the current confidence score.
        """

        base_confidence = self.confidence_score

        # Reduce confidence for old data
        age = datetime.now(date_time_utc) - self.updated_at
        base_confidence -= age.days / 10

        return round(base_confidence, 2)


class AssetNetwork(BaseModel):
    """
    Data model representing an ORM network entity.
    """

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    cidr: IPvAnyNetwork
    name: str
    description: str | None = None
    location: str | None = None
    entity_type: Literal["network"] = "network"
    confidence_score: float = 0.5
    is_modified_by_user: bool = False

    @field_serializer("cidr")
    def serialize_dt(self, cidr: IPvAnyNetwork, _info):
        return str(cidr)

    def contains(self, ip: IPv4Address | IPv6Address) -> bool:
        if ip.version != self.cidr.version:
            return False
        return ip in self.cidr


class AssetNetworkCreate(BaseModel):
    """
    Data model for creating an asset network.
    """

    cidr: IPvAnyNetwork
    name: str
    description: str | None = None
    location: str | None = None
    confidence_score: float = 0.5

    @field_serializer("cidr")
    def serialize_dt(self, cidr: IPvAnyNetwork, _info):
        return str(cidr)

    def current_confidence_score(self) -> float:
        """
        Calculate the current confidence score.
        """
        return self.confidence_score


class AssetNetworkUpdate(BaseModel):
    """
    Data model for updating asset network information.
    """

    cidr: IPvAnyNetwork
    name: str
    description: str | None = None
    location: str | None = None
    confidence_score: float = 0.5

    @field_serializer("cidr")
    def serialize_dt(self, cidr: IPvAnyNetwork, _info):
        return str(cidr)


class AssetNetworkResponse(AssetNetwork):
    """
    API response model for asset network.
    """

    pass


class ORMAssetService(Base, AuditMixin):
    """
    Database schema for network service.
    """

    __tablename__ = "asset_services"

    # Asset information
    port: Mapped[str] = mapped_column(unique=True)
    name: Mapped[str]
    protocol: Mapped[Optional[str]]
    description: Mapped[Optional[str]]

    # Asset classification
    entity_type: Mapped[Literal["service"]] = mapped_column(default="service")
    confidence_score: Mapped[float] = mapped_column(default=0.5)
    is_modified_by_user: Mapped[bool] = mapped_column(default=False)

    def __repr__(self):
        return (
            f"ORMAssetService(id={self.id}, port='{self.port}', name='{self.name}', protocol='{self.protocol}',"
            f"description='{self.description}', confidence_score={self.confidence_score} )"
        )


class AssetService(BaseModel):
    """
    Model representing an ORM network Service.
    """

    model_config = ConfigDict(from_attributes=True)

    # Asset information
    id: UUID
    port: str
    name: str
    description: str | None = None
    protocol: str | None = None

    # Asset classification
    entity_type: Literal["service"] = "service"
    confidence_score: float = 0.5
    is_modified_by_user: bool = False


class AssetServiceCreate(BaseModel):
    """
    Data model for creating an asset service.
    """

    port: str
    name: str
    description: str | None = None
    protocol: str | None = None
    confidence_score: float = 0.5


class AssetServiceUpdate(BaseModel):
    """
    Data model for updating asset service information.
    """

    port: str
    name: str
    description: str | None = None
    protocol: str | None = None
    confidence_score: float = 0.5


class AssetServiceResponse(AssetService):
    """
    API response model for asset service.
    """

    pass


class ORMAssetHost(Base, AuditMixin):
    __tablename__ = "asset_hosts"

    # Asset information
    ip: Mapped[str] = mapped_column(unique=True)
    vrf: Mapped[Optional[str]]
    name: Mapped[Optional[str]]
    description: Mapped[Optional[str]]
    domain: Mapped[Optional[str]]
    mac_address: Mapped[Optional[str]]
    vendor: Mapped[Optional[str]]
    owner: Mapped[Optional[str]]
    is_vm: Mapped[bool] = mapped_column(default=False)

    # Asset classification
    entity_type: Mapped[Literal["host"]] = mapped_column(default="host")
    confidence_score: Mapped[float] = mapped_column(default=0.5)
    is_modified_by_user: Mapped[bool] = mapped_column(default=False)
    references: Mapped[list["ORMAssetHostReference"]] = relationship(
        back_populates="host", cascade="all, delete-orphan", lazy="noload"
    )

    @hybrid_method
    def current_confidence_score(self) -> float:
        """
        Calculate the current confidence score.
        """
        base_confidence = self.confidence_score
        # Reduce confidence based on missing critical fields
        if not self.name:
            base_confidence *= 0.9

        # Reduce confidence for old data
        age = datetime.now(date_time_utc) - self.updated_at
        base_confidence -= age.days / 10

        return round(base_confidence, 2)


class ORMAssetHostReference(Base, AuditMixin):
    """Cross-referencing table, various data sources can reference and identify the
    same host using their own identifiers.
    """

    __tablename__ = "asset_hosts_references"
    __table_args__ = (UniqueConstraint("data_source_id", "host_id", name="unique_host_reference"),)

    data_source_id: Mapped[UUID] = mapped_column(ForeignKey("data_sources.id", ondelete="CASCADE"))
    source_identifier: Mapped[str]
    host_id: Mapped[UUID] = mapped_column(ForeignKey("asset_hosts.id", ondelete="CASCADE"))
    host: Mapped["ORMAssetHost"] = relationship(back_populates="references", lazy="noload")

    def __repr__(self):
        return f"ORMAssetHostReference(id={self.id}, data_source_id={self.data_source_id}, source_identifier='{self.source_identifier}', host_id='{self.host_id}')"


class AssetHostReference(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    host_id: UUID
    source_identifier: str
    data_source_id: UUID


class AssetHostReferenceCreate(BaseModel):
    host_id: UUID | None = None
    source_identifier: str
    data_source_id: UUID


class AssetHost(BaseModel):
    """
    Model representing an ORM host entity.
    """

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    ip: str
    vrf: str | None = None
    domain: str | None = None
    name: str | None = None
    description: str | None = None
    mac_address: str | None = None
    vendor: str | None = None
    owner: str | None = None
    entity_type: Literal["host"] = "host"
    is_vm: bool = False
    confidence_score: float = 0.5
    is_modified_by_user: bool = False
    references: list[AssetHostReference] = []


class AssetHostCreate(BaseModel):
    """
    Data model for creating a new host entity.
    """

    ip: str
    vrf: str | None = None
    domain: str | None = None
    name: str | None = None
    description: str | None = None
    mac_address: str | None = None
    vendor: str | None = None
    owner: str | None = None
    entity_type: Literal["host"] = "host"
    is_vm: bool = False
    references: list[AssetHostReferenceCreate] = []
    confidence_score: float = 0.5

    @field_validator("mac_address")
    @classmethod
    def mac_address_validator(cls, v: str | None) -> str | None:
        """
        Validate and standardize MAC address
        """
        if not v:
            return
        return validate_mac_address(v)

    def current_confidence_score(self) -> float:
        """
        Calculate the current confidence score.
        """
        base_confidence = self.confidence_score

        # Reduce confidence based on missing critical fields
        if self.name is None:
            base_confidence *= 0.9

        return round(base_confidence, 2)


class AssetHostUpdate(BaseModel):
    """
    Data model for updating asset host information.
    """

    ip: str | None = None
    vrf: str | None = None
    domain: str | None = None
    name: str | None = None
    description: str | None = None
    mac_address: str | None = None
    vendor: str | None = None
    owner: str | None = None
    entity_type: Literal["host"] = "host"
    is_vm: bool = False
    references: list[AssetHostReferenceCreate] = []
    confidence_score: float = 0.5

    @field_validator("mac_address")
    @classmethod
    def mac_address_validator(cls, v: str | None) -> str | None:
        """
        Validate and standardize MAC address
        """
        if not v:
            return
        return validate_mac_address(v)


class AssetHostResponse(AssetHost):
    """
    API response model for asset Host.
    """

    pass


class ORMAssetUser(Base, AuditMixin):
    """
    Database schema for network service.
    """

    __tablename__ = "asset_users"

    # Composite index for efficient search across identity attributes
    __table_args__ = (Index("ix_asset_users_identity_search", "email", "upn", "samaccountname", unique=False),)

    # Asset information
    name: Mapped[str]
    department: Mapped[Optional[str]]
    address: Mapped[Optional[str]]
    telephone_number: Mapped[Optional[str]]
    manager: Mapped[Optional[str]]
    job_title: Mapped[Optional[str]]

    # Identity attributes
    email: Mapped[Optional[str]] = mapped_column(index=True)
    upn: Mapped[Optional[str]] = mapped_column(index=True, comment="User Principal Name")
    samaccountname: Mapped[Optional[str]] = mapped_column(index=True, comment="SAM Account Name")

    # Asset classification
    entity_type: Mapped[Literal["asset_user"]] = mapped_column(default="asset_user")


class AssetUser(BaseModel):
    """
    Data model representing an ORM asset user.
    """

    id: UUID

    # Asset information
    name: str
    department: str | None = None
    address: str | None = None
    telephone_number: str | None = None
    manager: str | None = None
    job_title: str | None = None

    # Identity attributes
    email: str | None = None
    upn: str | None = Field(default=None, description="User Principal Name")
    samaccountname: str | None = Field(default=None, description="SAM Account Name")

    # Asset classification
    entity_type: Literal["asset_user"] = "asset_user"


class AssetUserCreate(BaseModel):
    """
    Data model for creating a new user asset.
    """

    # Asset information
    name: str
    department: str | None = None
    address: str | None = None
    telephone_number: str | None = None
    manager: str | None = None
    job_title: str | None = None

    # Identity attributes
    email: str | None = None
    upn: str | None = Field(default=None, description="User Principal Name")
    samaccountname: str | None = Field(default=None, description="SAM Account Name")

    # Asset classification
    entity_type: Literal["asset_user"] = "asset_user"


class AssetUserResponse(AssetUser):
    """
    API response model for asset user.
    """

    pass


class PolymorphicAssetResponse(RootModel):
    """
    Polymorphic API Response model. Parses the correct model using the discriminator field.
    """

    root: Union[
        AssetHostResponse, AssetFirewallRuleResponse, AssetNetworkResponse, AssetServiceResponse, AssetUserResponse
    ] = Field(discriminator="entity_type")


class PolymorphicAsset(RootModel):
    """
    Polymorphic ORM model. Parses the correct model using the discriminator field.
    """

    root: Union[AssetHost, AssetFirewallRule, AssetNetwork, AssetService, AssetUser] = Field(
        discriminator="entity_type"
    )

    def __iter__(self):
        return iter(self.root)

    def __getattr__(self, name: str):
        return getattr(self.root, name)
