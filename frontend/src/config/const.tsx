export const APP_NAME = "Armada";

export const GITHUB = "https://github.com/Viter-0/armada";

// Scopes for different access levels
export enum ScopesEnum {
  ADMIN_READ = "admin:read",
  ADMIN_WRITE = "admin:write",
  USER_READ = "user:read",
  USER_WRITE = "user:write",
}

// User roles
export enum RolesEnum {
  ADMIN = "ADMIN",
  USER = "USER",
}

// Types of authentication providers
export enum ProviderTypesEnum {
  LOCAL = "LOCAL",
  LDAP = "LDAP",
}

// Types of data sources
export enum DataSourceTypesEnum {
  ARIA_LOGS = "aria_logs",
  ARIA_NETWORKS = "aria_networks",
  DEMO = "demo",
  QRADAR = "qradar",
  IVANTI_ITSM = "ivanti_itsm",
  VMWARE_NSX = "vmware_nsx",
  VMWARE_VCENTER = "vmware_vcenter",
}

// Custom event types
export enum EventsEnum {
  SESSION_EXPIRED = "session_expired",
}

// Placeholder used to indicate that the value currently stored in the backend should be utilized.
export const USE_BACKEND_VALUE = "****";

// Default themes
export const THEME_DARK = "dim";
export const THEME_LIGHT = "light";

// Default date-time formats
export const DATETIME_FORMAT = "yyyy-MM-dd HH:mm:ss";
export const DATETIME_WITH_MILLISECONDS_FORMAT = "yyyy-MM-dd HH:mm:ss.SSS";

// Represents an empty filter value
export const EMPTY_VALUE = "EMPTY";
