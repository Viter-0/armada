from datetime import datetime
from time import time
from typing import Literal, Self
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, SecretStr, StrictStr, model_validator
from sqlalchemy.orm import Mapped, mapped_column

from .base import Base


class ORMNSXHostMapping(Base):
    """
    Utility database schema for storing ESXi host to NSX Manager mapping.
    """

    __tablename__ = "util_esxi_nsx_mapping"

    host: Mapped[str] = mapped_column(unique=True)
    nsx_manager: Mapped[str]


class NSXHostMapping(BaseModel):
    """
    Model representing an ESXi host to NSX Manager mapping.
    """

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    host: str
    nsx_manager: str


class NSXHostMappingCreate(BaseModel):
    """
    Data model for creating a new ESXi host to NSX Manager mapping.
    """

    host: str
    nsx_manager: str


class Cookie(BaseModel):
    """
    An HTTP cookie
    """

    key: str
    value: str = ""
    max_age: int | None = None
    expires: datetime | str | int | None = None
    httponly: bool = False
    path: str | None = "/"
    samesite: Literal["lax", "strict", "none"] | None = "lax"


class TimeInterval(BaseModel):
    """
    Represents a time interval with start and end timestamps, in seconds.

    If `end_time` is set to 0, it is updated to the current Unix timestamp.
    The `start_time` is then updated to be relative to the new `end_time`, calculated as
    `end_time - original_start_time`.
    """

    start_time: int = Field(ge=0, description="Unix timestamp")
    end_time: int = Field(ge=0, description="Unix timestamp")

    @model_validator(mode="after")
    def convert_time(self) -> Self:
        if self.end_time == 0:
            current_time = int(time())
            self.end_time = current_time
            self.start_time = current_time - int(self.start_time)
        return self


class PaginationParams(BaseModel):
    limit: int | None = Field(default=None, ge=0, description="Limit the number of items per page")
    offset: int | None = Field(default=None, ge=0, description="Skip the first N items")


class Reference(BaseModel):
    """
    Data model representing a reference to an entity.
    """

    id: UUID
    entity_type: str
    name: str | None = None


class AccessToken(BaseModel):
    """
    Model representing an API access token.
    """

    access_token: str
    token_type: str


class Credentials(BaseModel):
    """
    Credentials API model.

    This model is used for validating user credentials.
    """

    model_config = ConfigDict(str_max_length=255, str_min_length=1)

    email: StrictStr
    password: SecretStr


class NewPassword(BaseModel):
    """
    New password API model.

    This model is used to change user credentials.
    """

    model_config = ConfigDict(str_max_length=255, str_min_length=1)

    current_password: SecretStr
    new_password: SecretStr
    repeat_password: SecretStr


class AssetReference(BaseModel):
    """
    Data model representing a reference to an asset in the database.
    """

    source_identifier: str
    entity_type: Literal["firewall_rule", "host", "network", "service"] | None = None
    data_source_id: UUID | None = None
