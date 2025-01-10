from typing import Literal, Optional, Union
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, RootModel, SecretStr, field_serializer
from sqlalchemy.orm import Mapped, mapped_column

from armada_logs.database import get_encryption_secret

from .base import Base, EncryptedStringType


class ORMIdentityProvider(Base):
    """
    Base database schema for identity providers.

    This ORM uses SQLAlchemy's polymorphic identity. The return type will be a subclass of the ORMIdentityProvider.
    """

    __tablename__ = "providers"

    name: Mapped[str] = mapped_column(unique=True)
    description: Mapped[Optional[str]]
    entity_type: Mapped[str]
    is_enabled: Mapped[bool] = mapped_column(default=True)
    is_deletable: Mapped[bool] = mapped_column(default=True)

    __mapper_args__ = {
        "polymorphic_on": "entity_type",
        "polymorphic_identity": "Base",
    }


class ORMIdentityProviderLocal(ORMIdentityProvider):
    """
    Local identity provider database model.
    """

    __mapper_args__ = {"polymorphic_identity": "LOCAL", "polymorphic_load": "inline"}


class ORMIdentityProviderLdap(ORMIdentityProvider):
    """
    LDAP identity provider database model.
    """

    password: Mapped[str] = mapped_column(nullable=True, type_=EncryptedStringType(key=get_encryption_secret()))
    user: Mapped[str] = mapped_column(nullable=True, use_existing_column=True)
    cn: Mapped[str] = mapped_column(nullable=True, use_existing_column=True)
    search_filter: Mapped[str] = mapped_column(nullable=True, use_existing_column=True)
    base: Mapped[str] = mapped_column(nullable=True, use_existing_column=True)
    is_connection_secure: Mapped[bool] = mapped_column(default=True, nullable=True, use_existing_column=True)
    port: Mapped[int] = mapped_column(nullable=True, use_existing_column=True)
    server: Mapped[str] = mapped_column(nullable=True, use_existing_column=True)
    # is_asset_source: Mapped[bool] = mapped_column(
    #     default=False,
    #     use_existing_column=True,
    #     comment="Whether this LDAP provider should be used as a source for user assets",
    # )
    is_certificate_validation_enabled: Mapped[bool] = mapped_column(
        default=True, nullable=True, use_existing_column=True
    )

    __mapper_args__ = {"polymorphic_identity": "LDAP", "polymorphic_load": "inline"}


class IdentityProvider(BaseModel):
    """
    Model representing a generic ORM identity provider.
    """

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    description: str | None = None
    entity_type: str
    is_enabled: bool
    is_deletable: bool


class IdentityProviderResponse(IdentityProvider):
    """
    Generic API output model for identity providers.
    """

    pass


class IdentityProviderCreate(BaseModel):
    """
    Data model for creating a generic identity provider.
    """

    name: str
    description: str | None = None
    is_enabled: bool


class IdentityProviderUpdate(BaseModel):
    """
    Data model for updating a generic identity provider.
    """

    description: str | None = None
    is_enabled: bool


class IdentityProviderLocal(IdentityProvider):
    """
    Model representing an ORM Local identity provider.
    """

    entity_type: Literal["LOCAL"]  # discriminator field


class IdentityProviderLocalUpdate(BaseModel):
    """
    Data model for updating a Local identity provider.
    """

    is_enabled: bool = True


class IdentityProviderLocalResponse(IdentityProviderResponse):
    """
    API output model for a Local identity provider.
    """

    entity_type: Literal["LOCAL"]  # discriminator field


class IdentityProviderLdap(IdentityProvider):
    """
    Model representing an ORM LDAP identity provider.
    """

    entity_type: Literal["LDAP"]  # discriminator field
    password: str
    user: str
    cn: str
    search_filter: str
    base: str
    is_connection_secure: bool = True
    is_certificate_validation_enabled: bool = True
    port: int
    server: str


class IdentityProviderLdapCreate(IdentityProviderCreate):
    """
    Data model for creating an LDAP identity provider.
    """

    password: SecretStr
    user: str
    cn: str
    search_filter: str
    base: str
    is_connection_secure: bool
    is_certificate_validation_enabled: bool
    port: int
    server: str

    @field_serializer("password", when_used="always")
    def dump_secret(self, v):
        """
        Convert SecretStr to str on 'model_dump'
        """
        if v is None:
            return None
        return v.get_secret_value()


class IdentityProviderLdapUpdate(IdentityProviderUpdate):
    """
    Data model for updating an LDAP identity provider.
    """

    password: SecretStr
    user: str
    cn: str
    search_filter: str
    base: str
    is_connection_secure: bool
    is_certificate_validation_enabled: bool
    port: int
    server: str

    @field_serializer("password", when_used="always")
    def dump_secret(self, v):
        """
        Convert SecretStr to str on 'model_dump'
        """
        if v is None:
            return None
        return v.get_secret_value()


class IdentityProviderLdapResponse(IdentityProviderResponse):
    """
    API output model for an LDAP identity provider.
    """

    entity_type: Literal["LDAP"]  # discriminator field
    password: SecretStr
    user: str
    cn: str
    search_filter: str
    base: str
    is_connection_secure: bool
    is_certificate_validation_enabled: bool
    port: int
    server: str


class PolymorphicIdentityProviderResponse(RootModel):
    """
    Polymorphic API response model. Parses the correct model using the discriminator field.
    """

    root: Union[IdentityProviderLocalResponse, IdentityProviderLdapResponse] = Field(discriminator="entity_type")


class PolymorphicIdentityProvider(RootModel):
    """
    Polymorphic ORM model. Parses the correct model using the discriminator field.
    """

    root: Union[IdentityProviderLdap, IdentityProviderLocal] = Field(discriminator="entity_type")

    def __iter__(self):
        return iter(self.root)

    def __getattr__(self, name: str):
        return getattr(self.root, name)
