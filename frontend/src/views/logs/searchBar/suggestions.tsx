import { FilterValue, SearchFilter } from "@/components/queryBar/types";
import { LogsAssetCache } from "../types";

function toLowerCase<T extends string | string[] | undefined | null>(value?: T): T {
  if (Array.isArray(value)) {
    return value.map((item) => item.toLowerCase()) as T;
  } else {
    return value?.toLowerCase() as T;
  }
}

/**
 * Extracts the last value from the search filter.
 *
 * @returns {[string | undefined, number, string[]]} - A tuple containing:
 *  - The last value in the filter or the filter value itself if it's not an array.
 *  - The index of the last value or -1 if not an array.
 *  - An array of previous values (empty if not an array).
 */
function getSearchFilterValue(searchFilter: SearchFilter): [string | undefined, number, string[]] {
  if (Array.isArray(searchFilter.value)) {
    return [
      toLowerCase(searchFilter.value[searchFilter.value.length - 1]),
      searchFilter.value.length - 1,
      toLowerCase(searchFilter.value.slice(0, searchFilter.value.length - 1)),
    ];
  }
  return [toLowerCase(searchFilter.value), -1, []];
}

/**
 * Determines whether a given value is a valid non-empty string.
 */
function isValidValue(value?: string | null): value is string {
  return value && !["-", ""].includes(value) ? true : false;
}

/**
 * Sorts an array of FilterValue objects based on whether their `value` starts with the provided string.
 * Values starting with the provided string appear first, followed by the rest in their original order.
 */
function sortFilterValues(filterValues: FilterValue[], value?: string): FilterValue[] {
  if (!value) return filterValues;
  value = value.toLowerCase();

  function sortFilter(a: FilterValue, b: FilterValue) {
    if (!value) return 0;
    const aStartsWith = a.value.toLowerCase().startsWith(value);
    const bStartsWith = b.value.toLowerCase().startsWith(value);

    if (aStartsWith && !bStartsWith) return -1; // `a` should come before `b`
    if (bStartsWith && !aStartsWith) return 1; // `b` should come before `a`
    return 0;
  }

  return filterValues.sort(sortFilter);
}

export function getProtocolValueSuggestions(searchFilter: SearchFilter): FilterValue[] {
  const suggestions = [
    { key: "tcp", value: "TCP" },
    { key: "udp", value: "UDP" },
    { key: "icmp", value: "ICMP" },
  ];

  const [value, arrayIndex, previousValues] = getSearchFilterValue(searchFilter);

  const isValidValue = suggestions.some((item) => toLowerCase(item.value) == value);

  const assets = suggestions.filter((item) => {
    const itemValue = toLowerCase(item.value);
    if (isValidValue) {
      return !previousValues.includes(itemValue);
    } else {
      return !previousValues.includes(itemValue) && itemValue?.includes(value ?? "");
    }
  });

  const filterValues = assets.map((item, idx) => ({
    key: idx,
    value: item.value,
    arrayIndex: arrayIndex,
  }));

  return filterValues;
}

export function getActionValueSuggestions(searchFilter: SearchFilter): FilterValue[] {
  const suggestions = [
    { key: "ALLOW", value: "ALLOW" },
    { key: "ACCEPT", value: "ACCEPT" },
    { key: "DENY", value: "DENY" },
    { key: "DROP", value: "DROP" },
    { key: "REJECT", value: "REJECT" },
    { key: "REDIRECT", value: "REDIRECT" },
    { key: "DO_NOT_REDIRECT", value: "DO_NOT_REDIRECT" },
  ];

  const [value, arrayIndex, previousValues] = getSearchFilterValue(searchFilter);

  const isValidValue = suggestions.some((item) => toLowerCase(item.value) == value);

  const assets = suggestions.filter((item) => {
    const itemValue = toLowerCase(item.value);
    if (isValidValue) {
      return !previousValues.includes(itemValue);
    } else {
      return !previousValues.includes(itemValue) && itemValue?.includes(value ?? "");
    }
  });

  const filterValues = assets.map((item, idx) => ({
    key: idx,
    value: item.value,
    arrayIndex: arrayIndex,
  }));

  return filterValues;
}

export function getPortValueSuggestions(searchFilter: SearchFilter, assetCache: LogsAssetCache): FilterValue[] {
  const [value, arrayIndex, previousValues] = getSearchFilterValue(searchFilter);

  const assets = (assetCache.services ?? []).filter((item) => {
    const name = toLowerCase(item.name);
    return !previousValues.includes(item.port) && name?.includes(value ?? "");
  });

  const filterValues = assets.map((item, idx) => ({
    key: idx,
    value: item.port ?? "",
    description: item.name ?? "",
    arrayIndex: arrayIndex,
  }));

  return sortFilterValues(filterValues, value);
}

export function getHostValueSuggestions(searchFilter: SearchFilter, assetCache: LogsAssetCache): FilterValue[] {
  const [value, arrayIndex, previousValues] = getSearchFilterValue(searchFilter);

  const assets = (assetCache.hosts ?? []).filter((item) => {
    const name = toLowerCase(item.name);
    return isValidValue(name) && !previousValues.includes(name) && name?.includes(value ?? "");
  });

  const filterValues = assets.map((item, idx) => ({
    key: idx,
    value: item.name ?? "",
    description: item.description ?? "",
    arrayIndex: arrayIndex,
  }));

  return sortFilterValues(filterValues, value);
}

export function getMACAddressValueSuggestions(searchFilter: SearchFilter, assetCache: LogsAssetCache): FilterValue[] {
  const [value, arrayIndex, previousValues] = getSearchFilterValue(searchFilter);

  const assets = (assetCache.hosts ?? []).filter((item) => {
    const mac_address = toLowerCase(item.mac_address);
    return isValidValue(mac_address) && !previousValues.includes(mac_address) && mac_address?.includes(value ?? "");
  });

  const filterValues = assets.map((item, idx) => ({
    key: idx,
    value: item.mac_address ?? "",
    description: item.name ?? "",
    arrayIndex: arrayIndex,
  }));

  return sortFilterValues(filterValues, value);
}

export function getIpValueSuggestions(searchFilter: SearchFilter, assetCache: LogsAssetCache): FilterValue[] {
  const [value, arrayIndex, previousValues] = getSearchFilterValue(searchFilter);

  const assets = (assetCache.hosts ?? []).filter((item) => {
    const name = toLowerCase(item.name);
    return (
      isValidValue(item.ip) &&
      !previousValues.includes(item.ip) &&
      (item.ip.includes(value ?? "") || name?.includes(value ?? ""))
    );
  });

  const filterValues = assets.map((item, idx) => ({
    key: idx,
    value: item.ip ?? "",
    description: item.name ?? "",
    arrayIndex: arrayIndex,
  }));

  return sortFilterValues(filterValues, value);
}

export function getFirewallRuleIdValueSuggestions(
  searchFilter: SearchFilter,
  assetCache: LogsAssetCache
): FilterValue[] {
  const [value, arrayIndex, previousValues] = getSearchFilterValue(searchFilter);

  const assets = (assetCache.firewallRules ?? []).filter((item) => {
    const name = toLowerCase(item.name);
    return (
      isValidValue(name) &&
      !previousValues.includes(name) &&
      (item.rule_id.includes(value ?? "") || name?.includes(value ?? ""))
    );
  });

  const filterValues = assets.map((item, idx) => ({
    key: idx,
    value: item.rule_id ?? "",
    description: item.name ?? "",
    arrayIndex: arrayIndex,
  }));

  return sortFilterValues(filterValues, value);
}
