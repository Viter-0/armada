from typing import Literal, Optional, Union
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, RootModel, SecretStr, field_serializer
from pydantic.json_schema import SkipJsonSchema
from sqlalchemy import JSON, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from armada_logs.const import DEFAULT_ASSET_COLLECT_INTERVAL
from armada_logs.database import get_encryption_secret

from .base import AuditMixin, Base, EncryptedStringType


class ORMCredentialProfile(Base, AuditMixin):
    """
    Database schema for Credential Profiles.

    All fields in this schema are optional except for the `name` field. Model
    should be used to validate and store credential profiles in the database.
    """

    __tablename__ = "credential_profiles"

    name: Mapped[str] = mapped_column(unique=True)
    description: Mapped[Optional[str]]
    entity_type: Mapped[Optional[str]]
    username: Mapped[Optional[str]]
    password: Mapped[Optional[str]] = mapped_column(
        nullable=True, type_=EncryptedStringType(key=get_encryption_secret())
    )
    token: Mapped[Optional[str]] = mapped_column(nullable=True, type_=EncryptedStringType(key=get_encryption_secret()))
    domain: Mapped[Optional[str]]


class ORMFeatureAssetCollectionMixin:
    asset_collection_interval: Mapped[int] = mapped_column(default=5, use_existing_column=True)
    is_asset_collection_enabled: Mapped[bool] = mapped_column(default=False, use_existing_column=True)
    priority: Mapped[int] = mapped_column(default=5, use_existing_column=True)


class ORMFeatureLogFetchingMixin:
    is_log_fetching_enabled: Mapped[bool] = mapped_column(default=False, use_existing_column=True)


class ORMFeatureCertificateMixin:
    is_certificate_validation_enabled: Mapped[bool] = mapped_column(default=True, use_existing_column=True)


class ORMDataSource(Base):
    """
    Base Database schema for Data Sources.

    This ORM uses SQLAlchemy's polymorphic identity, the return type will be a subclass of the ORMDataSource
    """

    __tablename__ = "data_sources"

    name: Mapped[str] = mapped_column(unique=True)
    description: Mapped[Optional[str]]
    host: Mapped[Optional[str]]
    entity_type: Mapped[str]
    is_enabled: Mapped[bool] = mapped_column(default=True)
    is_assets_supported: Mapped[bool] = mapped_column(default=False)
    is_logs_supported: Mapped[bool] = mapped_column(default=False)
    credential_profile_id: Mapped[Optional[UUID]] = mapped_column(ForeignKey("credential_profiles.id"))
    credential_profile: Mapped[Optional["ORMCredentialProfile"]] = relationship(lazy="joined")
    meta: Mapped[Optional[JSON]] = mapped_column(type_=JSON)

    __mapper_args__ = {
        "polymorphic_on": "entity_type",
        "polymorphic_identity": "Base",
    }


class ORMDataSourceAriaLogs(ORMDataSource, ORMFeatureLogFetchingMixin, ORMFeatureCertificateMixin):
    """
    Database schema for VMware Aria Operations for Logs.

    This ORM uses SQLAlchemy's polymorphic identity, the return type is a subclass of the ORMDataSource
    """

    __mapper_args__ = {
        "polymorphic_identity": "aria_logs",
        "polymorphic_load": "inline",
    }


class ORMDataSourceAriaNetworks(
    ORMDataSource, ORMFeatureLogFetchingMixin, ORMFeatureAssetCollectionMixin, ORMFeatureCertificateMixin
):
    """
    Database schema for VMware Aria Operations for Networks.

    This ORM uses SQLAlchemy's polymorphic identity, the return type is a subclass of the ORMDataSource
    """

    __mapper_args__ = {"polymorphic_identity": "aria_networks", "polymorphic_load": "inline"}


class ORMDataSourceVmwareNSX(ORMDataSource, ORMFeatureAssetCollectionMixin, ORMFeatureCertificateMixin):
    """
    Database schema for VMware NSX-T.

    This ORM uses SQLAlchemy's polymorphic identity, the return type is a subclass of the ORMDataSource
    """

    __mapper_args__ = {"polymorphic_identity": "vmware_nsx", "polymorphic_load": "inline"}


class ORMDataSourceVmwareVCenter(ORMDataSource, ORMFeatureAssetCollectionMixin, ORMFeatureCertificateMixin):
    """
    Database schema for VMware vCenter.

    This ORM uses SQLAlchemy's polymorphic identity, the return type is a subclass of the ORMDataSource
    """

    __mapper_args__ = {"polymorphic_identity": "vmware_vcenter", "polymorphic_load": "inline"}


class ORMDataSourceDemo(
    ORMDataSource,
    ORMFeatureLogFetchingMixin,
    ORMFeatureAssetCollectionMixin,
):
    """
    Database schema for Demo Data Source.

    This ORM uses SQLAlchemy's polymorphic identity, the return type is a subclass of the ORMDataSource
    """

    __mapper_args__ = {"polymorphic_identity": "demo", "polymorphic_load": "inline"}


class ORMDataSourceIvantiITSM(ORMDataSource, ORMFeatureAssetCollectionMixin, ORMFeatureCertificateMixin):
    """
    Database schema for Ivanti ITSM.

    This ORM uses SQLAlchemy's polymorphic identity, the return type is a subclass of the ORMDataSource
    """

    __mapper_args__ = {"polymorphic_identity": "ivanti_itsm", "polymorphic_load": "inline"}


class ORMDataSourceQRadar(
    ORMDataSource, ORMFeatureLogFetchingMixin, ORMFeatureAssetCollectionMixin, ORMFeatureCertificateMixin
):
    """
    Database schema for IBM QRadar.

    This ORM uses SQLAlchemy's polymorphic identity, the return type is a subclass of the ORMDataSource
    """

    __mapper_args__ = {"polymorphic_identity": "qradar", "polymorphic_load": "inline"}


class CredentialProfile(BaseModel):
    """
    Data model representing an ORM credential profile.
    """

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str = Field(min_length=1)
    username: str | None = None
    description: str | None = None
    password: str | None = None
    entity_type: str | None = None
    token: str | None = None
    domain: str | None = None


class CredentialProfileResponse(CredentialProfile):
    """
    API output model for Credential Profile.
    """

    password: SecretStr | None = None
    token: SecretStr | None = None


class CredentialProfileCreate(BaseModel):
    """
    Data model for creating Credential Profile.
    """

    name: str
    username: str | None = None
    description: str | None = None
    password: SecretStr | None = None
    entity_type: str | None = None
    token: SecretStr | None = None
    domain: str | None = None

    @field_serializer("password", "token", when_used="always")
    def dump_secret(self, v):
        if v is None:
            return None
        return v.get_secret_value()


class CredentialProfileUpdate(BaseModel):
    """
    Data model for updating Credential Profile.
    """

    name: str
    username: str | None = None
    description: str | None = None
    password: SecretStr | None = None
    entity_type: str | None = None
    token: SecretStr | None = None
    domain: str | None = None

    @field_serializer("password", "token", when_used="always")
    def dump_secret(self, v):
        if v is None:
            return None
        return v.get_secret_value()


class FeatureLogFetchingMixin(BaseModel):
    is_log_fetching_enabled: bool = True


class FeatureAssetCollectionMixin(BaseModel):
    is_asset_collection_enabled: bool = True
    asset_collection_interval: int = Field(DEFAULT_ASSET_COLLECT_INTERVAL, ge=1, le=1440)
    priority: int = Field(5, ge=1, le=10)

    @property
    def confidence_score(self) -> float:
        return self.priority / 10


class FeatureCertificateMixin(BaseModel):
    is_certificate_validation_enabled: bool = True


class DataSource(BaseModel):
    """
    Data model representing ORM Generic Data Source.
    """

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    host: str
    description: str | None = None
    entity_type: str
    is_enabled: bool

    is_assets_supported: bool = Field(default=False, description="Whether this data source supports asset collecting")
    is_logs_supported: bool = Field(default=False, description="Whether this data source supports log fetching")

    credential_profile_id: UUID | None = None
    credential_profile: CredentialProfile | None = None


class DataSourceResponse(DataSource):
    """
    API output model for Generic Data Source.
    """

    credential_profile: CredentialProfileResponse | None = None


class DataSourceCreate(BaseModel):
    """
    Data model for creating Generic Data Source.
    """

    name: str
    host: str
    description: str | None = None
    is_enabled: bool = True
    credential_profile_id: UUID | None = None


class DataSourceUpdate(BaseModel):
    """
    Data model for updating Generic Data Source.
    """

    name: str
    host: str
    description: str | None = None
    is_enabled: bool = False
    credential_profile_id: UUID | None = None


class DataSourceAriaLogs(DataSource, FeatureLogFetchingMixin, FeatureCertificateMixin):
    """
    Data model representing ORM VMware Aria Operations for Logs.
    """

    entity_type: Literal["aria_logs"]


class DataSourceAriaLogsResponse(DataSourceResponse, FeatureLogFetchingMixin, FeatureCertificateMixin):
    """
    API output model for VMware Aria Operations for Logs.
    """

    entity_type: Literal["aria_logs"]


class DataSourceAriaLogsCreate(DataSourceCreate, FeatureLogFetchingMixin, FeatureCertificateMixin):
    """
    Data model for creating VMware Aria Operations for Logs.
    """

    is_logs_supported: SkipJsonSchema[Literal[True]] = Field(
        default=True,
        description="Hidden field to avoid defining available features during new entry addition to the database.",
    )


class DataSourceAriaLogsUpdate(DataSourceUpdate, FeatureLogFetchingMixin, FeatureCertificateMixin):
    """
    Data model for updating VMware Aria Operations for Logs.
    """

    pass


class DataSourceAriaNetworks(DataSource, FeatureLogFetchingMixin, FeatureAssetCollectionMixin, FeatureCertificateMixin):
    """
    Data model representing ORM VMware Aria Operations for Networks.
    """

    entity_type: Literal["aria_networks"]


class DataSourceAriaNetworksResponse(
    DataSourceResponse, FeatureLogFetchingMixin, FeatureAssetCollectionMixin, FeatureCertificateMixin
):
    """
    API output model for VMware Aria Operations for Networks.
    """

    entity_type: Literal["aria_networks"]


class DataSourceAriaNetworksCreate(
    DataSourceCreate, FeatureLogFetchingMixin, FeatureAssetCollectionMixin, FeatureCertificateMixin
):
    """
    Data model for creating VMware Aria Operations for Networks.
    """

    is_logs_supported: SkipJsonSchema[Literal[True]] = Field(
        default=True,
        description="Hidden field to avoid defining available features during new entry addition to the database.",
    )
    is_assets_supported: SkipJsonSchema[Literal[True]] = Field(
        default=True,
        description="Hidden field to avoid defining available features during new entry addition to the database.",
    )


class DataSourceAriaNetworksUpdate(
    DataSourceUpdate, FeatureLogFetchingMixin, FeatureAssetCollectionMixin, FeatureCertificateMixin
):
    """
    Data model for updating VMware Aria Operations for Networks.
    """

    pass


class DataSourceVmwareNSX(DataSource, FeatureAssetCollectionMixin, FeatureCertificateMixin):
    """
    Data model representing ORM VMware NSX-T.
    """

    entity_type: Literal["vmware_nsx"]


class DataSourceVmwareNSXResponse(DataSourceResponse, FeatureAssetCollectionMixin, FeatureCertificateMixin):
    """
    API output model for VMware NSX-T.
    """

    entity_type: Literal["vmware_nsx"]


class DataSourceVmwareNSXCreate(DataSourceCreate, FeatureAssetCollectionMixin, FeatureCertificateMixin):
    """
    Data model for creating VMware NSX-T.
    """

    is_assets_supported: SkipJsonSchema[Literal[True]] = Field(
        default=True,
        description="Hidden field to avoid defining available features during new entry addition to the database.",
    )


class DataSourceVmwareNSXUpdate(DataSourceUpdate, FeatureAssetCollectionMixin, FeatureCertificateMixin):
    """
    Data model for updating VMware NSX-T.
    """

    pass


class DataSourceVmwareVCenter(DataSource, FeatureAssetCollectionMixin, FeatureCertificateMixin):
    """
    Data model representing ORM VMware vCenter.
    """

    entity_type: Literal["vmware_vcenter"]


class DataSourceVmwareVCenterResponse(DataSourceResponse, FeatureAssetCollectionMixin, FeatureCertificateMixin):
    """
    API output model for VMware vCenter.
    """

    entity_type: Literal["vmware_vcenter"]


class DataSourceVmwareVCenterCreate(DataSourceCreate, FeatureAssetCollectionMixin, FeatureCertificateMixin):
    """
    Data model for creating VMware vCenter.
    """

    is_assets_supported: SkipJsonSchema[Literal[True]] = Field(
        default=True,
        description="Hidden field to avoid defining available features during new entry addition to the database.",
    )


class DataSourceVmwareVCenterUpdate(DataSourceUpdate, FeatureAssetCollectionMixin, FeatureCertificateMixin):
    """
    Data model for updating VMware vCenter.
    """

    pass


class DataSourceDemo(DataSource, FeatureLogFetchingMixin, FeatureAssetCollectionMixin):
    """
    Data model representing ORM Demo Data Source.
    """

    entity_type: Literal["demo"]


class DataSourceDemoResponse(DataSourceResponse, FeatureLogFetchingMixin, FeatureAssetCollectionMixin):
    """
    API output model for Demo Data Source.
    """

    entity_type: Literal["demo"]


class DataSourceIvantiITSM(DataSource, FeatureAssetCollectionMixin, FeatureCertificateMixin):
    """
    Data model representing ORM Ivanti ITSM.
    """

    entity_type: Literal["ivanti_itsm"]


class DataSourceIvantiITSMResponse(DataSourceResponse, FeatureAssetCollectionMixin, FeatureCertificateMixin):
    """
    API output model for Ivanti ITSM.
    """

    entity_type: Literal["ivanti_itsm"]


class DataSourceIvantiITSMCreate(DataSourceCreate, FeatureAssetCollectionMixin, FeatureCertificateMixin):
    """
    Data model for creating Ivanti ITSM.
    """

    is_assets_supported: SkipJsonSchema[Literal[True]] = Field(
        default=True,
        description="Hidden field to avoid defining available features during new entry addition to the database.",
    )


class DataSourceIvantiITSMUpdate(DataSourceUpdate, FeatureAssetCollectionMixin, FeatureCertificateMixin):
    """
    Data model for updating Ivanti ITSM.
    """

    pass


class DataSourceQRadar(DataSource, FeatureLogFetchingMixin, FeatureAssetCollectionMixin, FeatureCertificateMixin):
    """
    Data model representing ORM IBM QRadar.
    """

    entity_type: Literal["qradar"]


class DataSourceQRadarResponse(
    DataSourceResponse, FeatureLogFetchingMixin, FeatureAssetCollectionMixin, FeatureCertificateMixin
):
    """
    API output model for IBM QRadar.
    """

    entity_type: Literal["qradar"]


class DataSourceQRadarCreate(
    DataSourceCreate, FeatureLogFetchingMixin, FeatureAssetCollectionMixin, FeatureCertificateMixin
):
    """
    Data model for creating IBM QRadar.
    """

    is_logs_supported: SkipJsonSchema[Literal[True]] = Field(
        default=True,
        description="Hidden field to avoid defining available features during new entry addition to the database.",
    )
    is_assets_supported: SkipJsonSchema[Literal[True]] = Field(
        default=True,
        description="Hidden field to avoid defining available features during new entry addition to the database.",
    )


class DataSourceQRadarUpdate(
    DataSourceUpdate, FeatureLogFetchingMixin, FeatureAssetCollectionMixin, FeatureCertificateMixin
):
    """
    Data model for updating IBM QRadar.
    """

    pass


class PolymorphicDataSourceResponse(RootModel):
    """
    Polymorphic API Response model. Parses the correct model using the discriminator field.
    """

    root: Union[
        DataSourceAriaLogsResponse,
        DataSourceAriaNetworksResponse,
        DataSourceDemoResponse,
        DataSourceIvantiITSMResponse,
        DataSourceQRadarResponse,
        DataSourceVmwareVCenterResponse,
        DataSourceVmwareNSXResponse,
    ] = Field(discriminator="entity_type")


class PolymorphicDataSource(RootModel):
    """
    Polymorphic ORM model. Parses the correct model using the discriminator field.
    """

    root: Union[
        DataSourceAriaLogs,
        DataSourceAriaNetworks,
        DataSourceDemo,
        DataSourceIvantiITSM,
        DataSourceQRadar,
        DataSourceVmwareNSX,
        DataSourceVmwareVCenter,
    ] = Field(discriminator="entity_type")

    def __iter__(self):
        return iter(self.root)

    def __getattr__(self, name: str):
        return getattr(self.root, name)
