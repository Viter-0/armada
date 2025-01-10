import { components, paths } from "@/api/schema";
import { AssetCache, SearchFilter } from "@/components/queryBar/types";
import { CellContextMenuOption, PanelContextMenuOption } from "@/components/table/types";
import { SelectDropdownOption } from "@/components/types";
import "@tanstack/react-table";
import { Cell as ReactCell } from "@tanstack/react-table";
import { Tab } from "./hooks";

export interface LogsTabs extends Tab {
  initialName?: string;
}

// API logs search query types
export type QueryState = "running" | "canceled" | "initial" | "complete" | "error";
export type Query = paths["/api/logs/search"]["post"]["requestBody"]["content"]["application/json"];
export type QueryWithoutFilters = Omit<Query, "filter">;
export type QueryFilter = Query["filter"][0];

export type QueryResult = paths["/api/logs/search"]["post"]["responses"]["200"]["content"]["application/json"];
export type QueryResultRecord = QueryResult["results"][0];

export type QueryDataSources = paths["/api/logs/sources"]["get"]["responses"]["200"]["content"]["application/json"];

export type Network = paths["/api/assets/networks"]["get"]["responses"]["200"]["content"]["application/json"][0];

export type FirewallRule =
  paths["/api/assets/firewall_rules"]["get"]["responses"]["200"]["content"]["application/json"][0];

export type FirewallRuleEntity = components["schemas"]["FirewallRuleEntity"];

export type Host = paths["/api/assets/hosts"]["get"]["responses"]["200"]["content"]["application/json"][0];

export interface LogsAssetCache extends AssetCache {
  hosts?: Host[];
  firewallRules?: FirewallRule[];
  services?: paths["/api/assets/services"]["get"]["responses"]["200"]["content"]["application/json"];
  networks?: Network[];
}

/** A function type used to generate context menu options for a specific panel row. */
export type LogsPanelContextMenuOptionFn = (
  entity: PanelEntity,
  value: string,
  helpers: {
    addSearchFilter: (value: SearchFilter) => void;
    updateColumnVisibility: (id: string, state: boolean) => void;
  }
) => LogsPanelContextMenuOption[];

/** A function type used to generate context menu options for a specific cell in a table. */
export type LogsCellContextMenuOptionFn<TData> = (cell: ReactCell<TData, unknown>) => LogsCellContextMenuOption[];

/** Interface for panel context menu options */
export interface LogsPanelContextMenuOption extends PanelContextMenuOption {
  /** Title of the context menu option */
  title: React.ReactNode;
  /** Action to execute on context option click */
  action: () => void;
  // The type of Element (container) that the option is rendered in. Defaults to `anchor`
  type?: "anchor" | "text";
  // Container className
  className?: string;
}

/** Interface for column visibility options */
export interface ColumnVisibilityOption<T> extends SelectDropdownOption<T> {
  /** Indicates whether the column is hidden */
  isHidden: boolean;
  /** This option is selected to be displayed in the table */
  isSelected: boolean;
}

// Table sizes
export type TableSize = "table-xs" | "table-sm" | "table-md" | "table-lg";

export interface LogsPanel {
  key: React.Key;
  name: string;
  groups: PanelEntityGroup[];
}

/** Interface for panel entity groups */
export interface PanelEntityGroup {
  key: React.Key;
  name: string;
  groupId: string;
  entities: PanelEntity[];
}

/** Interface for panel entities */
export interface PanelEntity {
  key: React.Key;
  filterId: string;
  value: unknown;
  /** Display name */
  name: React.ReactNode;
  /** Table cell */
  cell: ReactCell<QueryResultRecord, unknown>;
}

export interface TableColumnFilterValue {
  value: unknown;
  expression: string;
}

export interface TableColumnFilter {
  id: string;
  /**
   * Array of TableColumnFilterValue's solves the issue where multiple filters on the same column ID
   * would result in only the last filter being applied. To address this, filters that have same column ID
   * must be combined into a single filter object.
   * A custom table filter function is required to support filtering by multiple values.
   */
  value: TableColumnFilterValue[];
}

export type TableColumnFiltersState = TableColumnFilter[];

/** Filter state used by the log table */
export interface TableFilterState {
  activeSearchFilter?: SearchFilter;
  columnFilter: TableColumnFiltersState;
}

export enum ColumnGroupsEnum {
  GENERAL = "General",
  SOURCE = "Source",
  DESTINATION = "Destination",
  SOURCE_NETWORKS = "Source Networks",
  DESTINATION_NETWORKS = "Destination Networks",
  SOURCE_ZONES = "Source Zones",
  DESTINATION_ZONES = "Destination Zones",
  SOURCE_INTERFACES = "Source Interfaces",
  DESTINATION_INTERFACES = "Destination Interfaces",
  SOURCE_HOST = "Source Host",
  DESTINATION_HOST = "Destination Host",
  SERVICE = "Service",
  SECURITY = "Security",
  DATA = "Data",
}

export enum PanelsEnum {
  RECORD = "record",
  FIREWALL_RULE = "firewall_rule",
  HOSTS = "hosts",
}

export interface LogsCellContextMenuOption extends CellContextMenuOption {
  /** Title of the context menu option */
  title: React.ReactNode;
  /** Currently, only the option to append a new search filter exists. In the future, rework this attribute to support generic options */
  item: SearchFilter;
  type: string;
}

/**
 * Event handler function for showing a context menu when a table row in a side panel is right-clicked.
 */
export type PanelRowContextMenuFn = (e: React.MouseEvent, entity: PanelEntity, value: string) => void;
