from enum import StrEnum
from typing import Final

APP_NAME: Final = "Armada"
GITHUB: Final = "https://github.com/Viter-0/armada"
ENCODING: Final = "utf-8"

ENV_FILE: Final = ".env"


class RolesEnum(StrEnum):
    ADMIN = "ADMIN"
    USER = "USER"
    AUDIT = "AUDIT"
    DEMO = "DEMO"


class EnvironmentsEnum(StrEnum):
    PRODUCTION = "production"
    DEVELOPMENT = "development"
    DEMO = "demo"


class TagsEnum(StrEnum):
    AUTHENTICATION = "authentication"
    IDENTITY = "identity"
    SETTINGS = "settings"
    SETUP = "setup"
    LOGGING = "logging"
    DATA_SOURCES = "data_sources"
    LOGS = "logs"
    ASSETS = "assets"
    METRICS = "metrics"


class IdentityProviderTypesEnum(StrEnum):
    LOCAL = "LOCAL"
    LDAP = "LDAP"


class DataSourceTypesEnum(StrEnum):
    ARIA_LOGS = "aria_logs"
    ARIA_NETWORKS = "aria_networks"
    QRADAR = "qradar"
    IVANTI_ITSM = "ivanti_itsm"
    DEMO = "demo"
    VMWARE_NSX = "vmware_nsx"
    VMWARE_VCENTER = "vmware_vcenter"


class AssetTypesEnum(StrEnum):
    FIREWALL_RULE = "firewall_rule"
    HOST = "host"
    SERVICE = "service"
    NETWORK = "network"
    ASSET_USER = "asset_user"


class TaskActionsEnum(StrEnum):
    COLLECT_ASSETS = "collect_assets"


class ScopesEnum(StrEnum):
    ADMIN_READ = "admin:read"
    ADMIN_WRITE = "admin:write"
    USER_READ = "user:read"
    USER_WRITE = "user:write"
    TOKEN_REFRESH = "token:refresh"


# Placeholder used to indicate that the value currently stored in the backend should be utilized
USE_BACKEND_VALUE: Final = "****"

# Default lifespan for JSON Web Token (minutes)
DEFAULT_AUTH_JWT_LIFESPAN: Final = 15
DEFAULT_REFRESH_JWT_LIFESPAN: Final = 60

# Default asset collection interval (minutes)
DEFAULT_ASSET_COLLECT_INTERVAL: Final = 5

# Default time for search queries (seconds)
DEFAULT_SEARCH_QUERY_TIMEOUT: Final = 600

# Default retention period (in days) for stale assets before they are purged
DEFAULT_STALE_ASSET_RETENTION: Final = 30
