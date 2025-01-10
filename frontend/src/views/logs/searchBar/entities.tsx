import { Expressions } from "@/components/queryBar/expressions";
import { FilterField, Tag } from "@/components/queryBar/types";
import * as suggestions from "./suggestions";

// Define tags for categorizing fields
type TagType = "base" | "web" | "asset" | "host" | "user" | "fw_rule";
export const Tags: Record<TagType, Tag> = {
  base: {
    value: "base",
    key: "base",
    name: "Base",
  },
  web: {
    value: "web",
    key: "web",
    name: "Web",
  },
  asset: {
    value: "asset",
    key: "asset",
    name: "Asset",
    className: "text-amber-400",
  },
  host: {
    value: "host",
    key: "host",
    name: "Host",
    className: "text-rose-600",
  },
  user: {
    value: "user",
    key: "user",
    name: "User",
    className: "text-cyan-500",
  },
  fw_rule: {
    value: "firewall_rule",
    key: "fw_rule",
    name: "Firewall Rule",
    className: "text-indigo-400",
  },
};

// Define log count options for selection
export const logCountValues = [
  {
    key: 0,
    title: "All",
  },
  {
    key: 100,
    title: "100",
  },
  {
    key: 200,
    title: "200",
  },
  {
    key: 500,
    title: "500",
  },
  {
    key: 1000,
    title: "1k",
  },
  {
    key: 2000,
    title: "2k",
  },
];

// Define time interval options for selection
export const timeSelectValues = [
  {
    key: 300,
    title: "Last 5 minutes",
  },
  {
    key: 1800,
    title: "Last 30 minutes",
  },
  {
    key: 3600,
    title: "Last 1 hour",
  },
  {
    key: 21600,
    title: "Last 6 hours",
  },
  {
    key: 43200,
    title: "Last 12 hours",
  },
  {
    key: 86400,
    title: "Last 1 day",
  },
  {
    key: 259200,
    title: "Last 3 days",
  },
  {
    key: 604800,
    title: "Last 1 week",
  },
  {
    key: 1209600,
    title: "Last 2 weeks",
  },
  {
    key: 1814400,
    title: "Last 3 weeks",
  },
  {
    key: 2678400,
    title: "Last 1 month",
  },
];

// Define type options for selection
export const typeSelectValues = [
  {
    key: "ip",
    title: "IP",
  },
];

// Base server expressions used in log field suggestions
export const baseServerExpressions = [Expressions.eq, Expressions.neq];

// Server expressions used in asset field suggestions
export const assetExpressions = [Expressions.eq, Expressions.neq, Expressions.in, Expressions.nin];

// Expressions used to filter fields locally
export const localExpressions = [
  Expressions.eq,
  Expressions.neq,
  Expressions.in,
  Expressions.nin,
  Expressions.like,
  Expressions.nlike,
];

/**
 * Defines the available field suggestions for search filters.
 * This array contains the list of fields that a user can select from in the search bar.
 */
export const properties: FilterField[] = [
  {
    key: "source_ip",
    value: "source_ip",
    description: "Source IP address or network",
    expressions: [...baseServerExpressions],
    localExpressions: [...localExpressions],
    getValueSuggestion: suggestions.getIpValueSuggestions,
    tags: [Tags.base],
  },
  {
    key: "source_interface",
    value: "source_interface",
    description: "Source Interface",
    expressions: [...baseServerExpressions],
    localExpressions: [...localExpressions],
    tags: [Tags.base],
  },
  {
    key: "destination_ip",
    value: "destination_ip",
    description: "Destination IP address or network",
    expressions: [...baseServerExpressions],
    getValueSuggestion: suggestions.getIpValueSuggestions,
    tags: [Tags.base],
    localExpressions: [...localExpressions],
  },
  {
    key: "destination_interface",
    value: "destination_interface",
    description: "Destination Interface",
    expressions: [...baseServerExpressions],
    tags: [Tags.base],
    localExpressions: [...localExpressions],
  },
  {
    key: "protocol",
    value: "protocol",
    description: "Network protocol",
    expressions: [...baseServerExpressions],
    tags: [Tags.base],
    localExpressions: [...localExpressions],
    getValueSuggestion: suggestions.getProtocolValueSuggestions,
  },
  {
    key: "port",
    value: "port",
    description: "Network port",
    expressions: [...baseServerExpressions],
    tags: [Tags.base],
    localExpressions: [...localExpressions],
    getValueSuggestion: suggestions.getPortValueSuggestions,
  },
  {
    key: "action",
    value: "action",
    description: "Action",
    expressions: [...baseServerExpressions],
    tags: [Tags.base],
    localExpressions: [...localExpressions],
    getValueSuggestion: suggestions.getActionValueSuggestions,
  },
  // {
  //   key: "vrf",
  //   value: "vrf",
  //   description: "Virtual Routing and Forwarding instance",
  //   expressions: [...baseServerExpressions],
  //   tags: [Tags.base],
  //   localExpressions: [...localExpressions],
  // },
  {
    key: "timestamp",
    value: "timestamp",
    description: "Timestamp",
    expressions: [],
    localExpressions: [Expressions.eq, Expressions.neq, Expressions.more, Expressions.less],
    tags: [Tags.base],
    isLocal: true,
  },
  {
    key: "client_to_server_bytes",
    value: "client_to_server_bytes",
    description: "Client to Server Bytes",
    expressions: [],
    localExpressions: [...localExpressions],
    tags: [Tags.base],
    isLocal: true,
  },
  {
    key: "server_to_client_bytes",
    value: "server_to_client_bytes",
    description: "Server to Client Bytes",
    expressions: [],
    localExpressions: [...localExpressions],
    tags: [Tags.base],
    isLocal: true,
  },
  {
    key: "session_message",
    value: "session_message",
    description: "Session Message",
    expressions: [],
    localExpressions: [...localExpressions],
    tags: [Tags.base],
    isLocal: true,
  },
  {
    key: "application",
    value: "application",
    description: "Application",
    expressions: [],
    localExpressions: [...localExpressions],
    tags: [Tags.base],
    isLocal: true,
  },
  {
    key: "firewall_rule_id",
    value: "firewall_rule_id",
    description: "Firewall Rule ID",
    expressions: [...baseServerExpressions],
    tags: [Tags.fw_rule, Tags.asset],
    localExpressions: [...localExpressions],
    getValueSuggestion: suggestions.getFirewallRuleIdValueSuggestions,
  },
  {
    key: "firewall_rule_name",
    value: "firewall_rule_name",
    description: "Firewall Rule Name",
    expressions: [...baseServerExpressions],
    tags: [Tags.fw_rule, Tags.asset],
    localExpressions: [...localExpressions],
    isLocal: true,
  },
  {
    key: "username",
    value: "username",
    description: "Source user",
    expressions: [...baseServerExpressions],
    tags: [Tags.user, Tags.asset],
    localExpressions: [...localExpressions],
    type: "asset_user",
  },
  {
    key: "source_device_name",
    value: "source_device_name",
    description: "Source Device Name",
    expressions: [...assetExpressions],
    tags: [Tags.host, Tags.asset],
    localExpressions: [...localExpressions],
    type: "host",
    getValueSuggestion: suggestions.getHostValueSuggestions,
  },
  {
    key: "source_device_mac",
    value: "source_device_mac",
    description: "Source Device MAC",
    expressions: [...assetExpressions],
    tags: [Tags.host, Tags.asset],
    localExpressions: [...localExpressions],
    type: "host",
    getValueSuggestion: suggestions.getMACAddressValueSuggestions,
  },
  {
    key: "destination_device_name",
    value: "destination_device_name",
    description: "Destination Device Name",
    expressions: [...assetExpressions],
    tags: [Tags.host, Tags.asset],
    localExpressions: [...localExpressions],
    type: "host",
    getValueSuggestion: suggestions.getHostValueSuggestions,
  },
  {
    key: "destination_device_mac",
    value: "destination_device_mac",
    description: "Destination Device MAC",
    expressions: [...assetExpressions],
    tags: [Tags.host, Tags.asset],
    localExpressions: [...localExpressions],
    type: "host",
    getValueSuggestion: suggestions.getMACAddressValueSuggestions,
  },
];
