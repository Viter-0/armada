from typing import Optional

from pydantic import BaseModel, Field, ValidationInfo, computed_field, field_validator
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.types import JSON

from armada_logs.const import DEFAULT_AUTH_JWT_LIFESPAN, DEFAULT_REFRESH_JWT_LIFESPAN, DEFAULT_STALE_ASSET_RETENTION

from .base import Base


class ORMAppSettings(Base):
    """
    Database schema for storing application settings.
    """

    __tablename__ = "app_settings"

    key: Mapped[str] = mapped_column(unique=True)
    value: Mapped[dict | int | bool | str | list] = mapped_column(JSON)
    group: Mapped[str] = mapped_column(comment="Category or grouping for the setting")
    description: Mapped[Optional[str]]


class SetupSettingsResponse(BaseModel):
    """
    API output model for setup settings.
    """

    is_initial_user_created: bool = Field(default=False)

    @computed_field
    @property
    def is_setup_complete(self) -> bool:
        """Check if the setup is complete."""
        if any(value is False for value in self.__dict__.values()):
            return False
        return True


class StateSettingsResponse(BaseModel):
    """
    API output model for the state of the app.
    """

    version: str
    broker: bool = Field(..., description="Indicates whether the task queue broker is used")
    environment: str = Field(..., description="The current application environment (e.g., dev, test, prod)")


class GeneralSettingsBase(BaseModel):
    """
    Base model for general settings.
    """

    check_for_updates: bool = Field(
        default=True, description="Indicates whether the application should automatically check for updates"
    )

    stale_asset_retention: int = Field(
        default=DEFAULT_STALE_ASSET_RETENTION,
        ge=1,
        description="The retention period (in days) for stale assets before they are purged",
    )


class GeneralSettingsResponse(GeneralSettingsBase):
    """
    API output model for general settings.
    """

    pass


class GeneralSettingsUpdate(GeneralSettingsBase):
    """
    Data model for updating general settings.
    """

    pass


class SecuritySettingsBase(BaseModel):
    """
    Base model for security settings.
    """

    auth_jwt_lifespan: int = Field(default=DEFAULT_AUTH_JWT_LIFESPAN, ge=1)
    refresh_jwt_lifespan: int = DEFAULT_REFRESH_JWT_LIFESPAN

    @field_validator("refresh_jwt_lifespan")
    @classmethod
    def refresh_lifespan_gt_auth(cls, v: int, info: ValidationInfo) -> int:
        if v <= info.data["auth_jwt_lifespan"]:
            raise ValueError("Refresh lifespan must be greater than auth lifespan")
        return v


class SecuritySettingsResponse(SecuritySettingsBase):
    """
    API output model for security settings.
    """

    pass


class SecuritySettingsUpdate(SecuritySettingsBase):
    """
    Data model for updating security settings.
    """

    pass
