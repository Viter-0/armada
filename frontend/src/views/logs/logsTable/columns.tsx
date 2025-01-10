import { formatDateTime } from "@/util/helpers";
import { createColumnHelper } from "@tanstack/react-table";
import { ColumnGroupsEnum, PanelsEnum, QueryResultRecord } from "../types";
import { ipLogFilterFn } from "./actions";
import { FormatFirewallRuleResource, FormatHostEdit, FormatNetwork } from "./formatters";

const columnHelper = createColumnHelper<QueryResultRecord>();

export const tableAllColumns = [
  columnHelper.accessor((row) => (row.timestamp ? formatDateTime(new Date(row.timestamp * 1000)) : undefined), {
    // Display Name
    header: "Timestamp",
    // ID must be the same as query filter field
    id: "timestamp",
    meta: {
      isVisibleByDefault: true,
      panel: { name: PanelsEnum.RECORD, group: ColumnGroupsEnum.GENERAL },
      isLocal: true,
    },
  }),
  columnHelper.accessor("source_ip", {
    header: "Source IP",
    id: "source_ip",
    meta: {
      isVisibleByDefault: true,
      panel: { name: PanelsEnum.RECORD, group: ColumnGroupsEnum.SOURCE },
    },
    filterFn: ipLogFilterFn,
  }),
  columnHelper.accessor("destination_ip", {
    header: "Destination IP",
    id: "destination_ip",
    meta: {
      isVisibleByDefault: true,
      panel: { name: PanelsEnum.RECORD, group: ColumnGroupsEnum.DESTINATION },
    },
    filterFn: ipLogFilterFn,
  }),
  columnHelper.accessor("port", {
    header: "Port",
    id: "port",
    meta: {
      isVisibleByDefault: true,
      panel: { name: PanelsEnum.RECORD, group: ColumnGroupsEnum.SERVICE },
    },
  }),
  columnHelper.accessor("protocol", {
    header: "Protocol",
    id: "protocol",
    meta: {
      isVisibleByDefault: true,
      panel: { name: PanelsEnum.RECORD, group: ColumnGroupsEnum.GENERAL },
    },
  }),
  columnHelper.accessor("action", {
    header: "Firewall Action",
    id: "action",
    meta: {
      isVisibleByDefault: true,
      panel: { name: PanelsEnum.RECORD, group: ColumnGroupsEnum.SECURITY },
    },
  }),
  columnHelper.accessor("source_interface", {
    header: "Source Interface",
    id: "source_interface",
    meta: {
      isVisibleByDefault: false,
      panel: { name: PanelsEnum.RECORD, group: ColumnGroupsEnum.SOURCE },
    },
  }),
  columnHelper.accessor("source_zone", {
    header: "Source Zone",
    id: "source_zone",
    meta: {
      isVisibleByDefault: false,
      panel: { name: PanelsEnum.RECORD, group: ColumnGroupsEnum.SOURCE },
    },
  }),
  columnHelper.accessor("destination_interface", {
    header: "Destination Interface",
    id: "destination_interface",
    meta: {
      isVisibleByDefault: false,
      panel: { name: PanelsEnum.RECORD, group: ColumnGroupsEnum.DESTINATION },
    },
  }),
  columnHelper.accessor("destination_zone", {
    header: "Destination Zone",
    id: "destination_zone",
    meta: {
      isVisibleByDefault: false,
      panel: { name: PanelsEnum.RECORD, group: ColumnGroupsEnum.DESTINATION },
    },
  }),
  columnHelper.accessor("session_message", {
    header: "Session Message",
    id: "session_message",
    meta: {
      panel: { name: PanelsEnum.RECORD, group: ColumnGroupsEnum.SECURITY },
      isLocal: true,
    },
  }),
  columnHelper.accessor((row) => row.username, {
    header: "Username",
    id: "username",
    meta: {
      panel: { name: PanelsEnum.RECORD, group: ColumnGroupsEnum.SOURCE },
    },
  }),
  columnHelper.accessor((row) => row.source_device?.name, {
    header: "Source Device",
    id: "source_device_name",
    meta: {
      isVisibleByDefault: true,
      panel: { name: PanelsEnum.RECORD, group: ColumnGroupsEnum.SOURCE },
      isEmptyCellIncludedInSidePanel: true,
      panelFormatterFn: ({ name, value, cell }) => (
        <FormatHostEdit
          key={cell.id}
          value={value}
          cell={cell}
          name={name}
          assetKey="source_device"
          dataKey="name"
          hostId={cell.row.original.source_device?.id}
        />
      ),
    },
  }),
  columnHelper.accessor((row) => row.source_device?.name, {
    header: "Source Device Name",
    id: "source_device_name_alt",
    meta: {
      panel: { name: PanelsEnum.HOSTS, group: ColumnGroupsEnum.SOURCE_HOST },
      filterId: "source_device_name",
      panelAltHeader: "Name",
      isEmptyCellIncludedInSidePanel: true,
      panelFormatterFn: ({ name, value, cell }) => (
        <FormatHostEdit
          key={cell.id}
          value={value}
          cell={cell}
          name={name}
          assetKey="source_device"
          dataKey="name"
          hostId={cell.row.original.source_device?.id}
        />
      ),
    },
  }),
  columnHelper.accessor((row) => row.source_device?.ip, {
    header: "IP",
    id: "source_device_ip",
    meta: {
      panel: { name: PanelsEnum.HOSTS, group: ColumnGroupsEnum.SOURCE_HOST },
      filterId: "source_ip",
    },
  }),
  columnHelper.accessor((row) => row.source_device?.description, {
    header: "Description",
    id: "source_device_description",
    meta: {
      panel: { name: PanelsEnum.HOSTS, group: ColumnGroupsEnum.SOURCE_HOST },
      isDisplayableAsColumn: false,
      isFilterable: false,
      isEmptyCellIncludedInSidePanel: true,
      panelFormatterFn: ({ name, value, cell }) => (
        // key={cell.id} fully remount a component when its props change to reset internal state
        <FormatHostEdit
          key={cell.id}
          value={value}
          cell={cell}
          name={name}
          assetKey="source_device"
          dataKey="description"
          hostId={cell.row.original.source_device?.id}
        />
      ),
    },
  }),
  columnHelper.accessor((row) => row.source_device?.mac_address, {
    header: "Source MAC Address",
    id: "source_device_mac",
    meta: {
      isVisibleByDefault: false,
      panel: { name: PanelsEnum.HOSTS, group: ColumnGroupsEnum.SOURCE_HOST },
      panelAltHeader: "MAC Address",
    },
  }),
  columnHelper.accessor((row) => row.destination_device?.name, {
    header: "Destination Device",
    id: "destination_device_name",
    meta: {
      isVisibleByDefault: true,
      panel: { name: PanelsEnum.RECORD, group: ColumnGroupsEnum.DESTINATION },
      isEmptyCellIncludedInSidePanel: true,
      panelFormatterFn: ({ name, value, cell }) => (
        <FormatHostEdit
          key={cell.id}
          value={value}
          cell={cell}
          name={name}
          assetKey="destination_device"
          dataKey="name"
          hostId={cell.row.original.destination_device?.id}
        />
      ),
    },
  }),
  columnHelper.accessor((row) => row.destination_device?.name, {
    header: "Destination Device Name",
    id: "destination_device_name_alt",
    meta: {
      panel: { name: PanelsEnum.HOSTS, group: ColumnGroupsEnum.DESTINATION_HOST },
      filterId: "destination_device_name",
      panelAltHeader: "Name",
      isEmptyCellIncludedInSidePanel: true,
      panelFormatterFn: ({ name, value, cell }) => (
        <FormatHostEdit
          key={cell.id}
          value={value}
          cell={cell}
          name={name}
          assetKey="destination_device"
          dataKey="name"
          hostId={cell.row.original.destination_device?.id}
        />
      ),
    },
  }),
  columnHelper.accessor((row) => row.destination_device?.ip, {
    header: "IP",
    id: "destination_device_ip",
    meta: {
      panel: { name: PanelsEnum.HOSTS, group: ColumnGroupsEnum.DESTINATION_HOST },
      filterId: "destination_ip",
    },
  }),
  columnHelper.accessor((row) => row.destination_device?.description, {
    header: "Description",
    id: "destination_device_description",
    meta: {
      panel: { name: PanelsEnum.HOSTS, group: ColumnGroupsEnum.DESTINATION_HOST },
      isDisplayableAsColumn: false,
      isFilterable: false,
      isEmptyCellIncludedInSidePanel: true,
      panelFormatterFn: ({ name, value, cell }) => (
        // key={cell.id} fully remount a component when its props change to reset internal state
        <FormatHostEdit
          key={cell.id}
          value={value}
          cell={cell}
          name={name}
          assetKey="destination_device"
          dataKey="description"
          hostId={cell.row.original.destination_device?.id}
        />
      ),
    },
  }),
  columnHelper.accessor((row) => row.destination_device?.mac_address, {
    header: "Destination MAC Address",
    id: "destination_device_mac",
    meta: {
      panel: { name: PanelsEnum.HOSTS, group: ColumnGroupsEnum.DESTINATION_HOST },
      panelAltHeader: "MAC Address",
    },
  }),
  columnHelper.accessor("log_source", {
    header: "Log Source",
    id: "log_source",
    meta: {
      panel: { name: PanelsEnum.RECORD, group: ColumnGroupsEnum.GENERAL },
      isLocal: true,
    },
  }),
  columnHelper.accessor("data_source", {
    header: "Data Source",
    id: "data_source",
    meta: {
      panel: { name: PanelsEnum.RECORD, group: ColumnGroupsEnum.GENERAL },
      isLocal: true,
    },
  }),
  columnHelper.accessor("application", {
    header: "Application",
    id: "application",
    meta: {
      panel: { name: PanelsEnum.RECORD, group: ColumnGroupsEnum.SERVICE },
    },
  }),
  columnHelper.accessor("client_to_server_bytes", {
    header: "Client to Server Bytes",
    id: "client_to_server_bytes",
    meta: {
      panel: { name: PanelsEnum.RECORD, group: ColumnGroupsEnum.DATA },
      isLocal: true,
    },
  }),
  columnHelper.accessor("server_to_client_bytes", {
    header: "Server to Client Bytes",
    id: "server_to_client_bytes",
    meta: {
      panel: { name: PanelsEnum.RECORD, group: ColumnGroupsEnum.DATA },
      isLocal: true,
    },
  }),
  columnHelper.accessor((row) => row?.firewall_rule?.name, {
    header: "Firewall Rule Name",
    id: "firewall_rule_name",
    meta: {
      panel: { name: PanelsEnum.RECORD, group: ColumnGroupsEnum.SECURITY },
    },
  }),
  columnHelper.accessor((row) => row?.firewall_rule?.name, {
    header: "Firewall Rule Name",
    id: "firewall_rule_name_alt",
    meta: {
      panel: { name: PanelsEnum.FIREWALL_RULE, group: ColumnGroupsEnum.GENERAL },
      filterId: "firewall_rule_name",
      isLocal: true,
    },
  }),
  columnHelper.accessor("firewall_rule_id", {
    header: "Firewall Rule ID",
    id: "firewall_rule_id",
    meta: {
      panel: { name: PanelsEnum.RECORD, group: ColumnGroupsEnum.SECURITY },
    },
  }),
  columnHelper.accessor("firewall_rule_id", {
    header: "Firewall Rule ID",
    id: "firewall_rule_id_alt",
    meta: {
      panel: { name: PanelsEnum.FIREWALL_RULE, group: ColumnGroupsEnum.GENERAL },
      filterId: "firewall_rule_id",
    },
  }),
  columnHelper.accessor((row) => row?.firewall_rule?.source_interfaces, {
    header: "Source Interfaces",
    id: "fw_source_interfaces",
    meta: {
      panel: { name: PanelsEnum.FIREWALL_RULE, group: ColumnGroupsEnum.SOURCE_INTERFACES },
      isDisplayableAsColumn: false,
      isFilterable: false,
      panelFormatterFn: ({ value }) => <FormatFirewallRuleResource value={value} />,
    },
  }),
  columnHelper.accessor((row) => row?.firewall_rule?.source_zones, {
    header: "Source Zones",
    id: "fw_source_zones",
    meta: {
      panel: { name: PanelsEnum.FIREWALL_RULE, group: ColumnGroupsEnum.SOURCE_ZONES },
      isDisplayableAsColumn: false,
      isFilterable: false,
      panelFormatterFn: ({ value }) => <FormatFirewallRuleResource value={value} />,
    },
  }),
  columnHelper.accessor((row) => row?.firewall_rule?.sources, {
    header: "Sources",
    id: "fw_sources",
    meta: {
      panel: { name: PanelsEnum.FIREWALL_RULE, group: ColumnGroupsEnum.SOURCE },
      isDisplayableAsColumn: false,
      isFilterable: false,
      panelFormatterFn: ({ value, cell }) => (
        <FormatFirewallRuleResource value={value} is_inverted={cell.row.original.firewall_rule?.is_source_inverted} />
      ),
    },
  }),
  columnHelper.accessor((row) => row?.firewall_rule?.destination_interfaces, {
    header: "Destination Interfaces",
    id: "fw_destination_interfaces",
    meta: {
      panel: { name: PanelsEnum.FIREWALL_RULE, group: ColumnGroupsEnum.DESTINATION_INTERFACES },
      isDisplayableAsColumn: false,
      isFilterable: false,
      panelFormatterFn: ({ value }) => <FormatFirewallRuleResource value={value} />,
    },
  }),
  columnHelper.accessor((row) => row?.firewall_rule?.destination_zones, {
    header: "Destination Zones",
    id: "fw_destination_zones",
    meta: {
      panel: { name: PanelsEnum.FIREWALL_RULE, group: ColumnGroupsEnum.DESTINATION_ZONES },
      isDisplayableAsColumn: false,
      isFilterable: false,
      panelFormatterFn: ({ value }) => <FormatFirewallRuleResource value={value} />,
    },
  }),
  columnHelper.accessor((row) => row?.firewall_rule?.destinations, {
    header: "Destinations",
    id: "fw_destinations",
    meta: {
      panel: { name: PanelsEnum.FIREWALL_RULE, group: ColumnGroupsEnum.DESTINATION },
      isDisplayableAsColumn: false,
      isFilterable: false,
      panelFormatterFn: ({ value, cell }) => (
        <FormatFirewallRuleResource
          value={value}
          is_inverted={cell.row.original.firewall_rule?.is_destination_inverted}
        />
      ),
    },
  }),
  columnHelper.accessor((row) => row?.firewall_rule?.services, {
    header: "Services",
    id: "fw_services",
    meta: {
      panel: { name: PanelsEnum.FIREWALL_RULE, group: ColumnGroupsEnum.SERVICE },
      isDisplayableAsColumn: false,
      isFilterable: false,
      panelFormatterFn: ({ value }) => <FormatFirewallRuleResource value={value} />,
    },
  }),
  columnHelper.accessor((row) => row?.firewall_rule?.action, {
    header: "Action",
    id: "fw_action",
    meta: {
      panel: { name: PanelsEnum.FIREWALL_RULE, group: ColumnGroupsEnum.SECURITY },
      isDisplayableAsColumn: false,
      isFilterable: false,
    },
  }),
  columnHelper.accessor((row) => row.source_networks, {
    header: "Source Networks",
    id: "source_networks",
    meta: {
      panel: { name: PanelsEnum.HOSTS, group: ColumnGroupsEnum.SOURCE_NETWORKS },
      isDisplayableAsColumn: false,
      isFilterable: false,
      panelFormatterFn: ({ value }) => <FormatNetwork value={value} />,
    },
  }),
  columnHelper.accessor((row) => row.destination_networks, {
    header: "Destination Networks",
    id: "destination_networks",
    meta: {
      panel: { name: PanelsEnum.HOSTS, group: ColumnGroupsEnum.DESTINATION_NETWORKS },
      isDisplayableAsColumn: false,
      isFilterable: false,
      panelFormatterFn: ({ value }) => <FormatNetwork value={value} />,
    },
  }),
];
