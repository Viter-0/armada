import { SearchFilter } from "@/components/queryBar/types";
import { Cell as ReactCell } from "@tanstack/react-table";
import { FirewallRuleEntity, Network } from "./types";

type CreateSearchFilter = Omit<SearchFilter, "key">;

/** Create a search filter object based on the provided field, expression, and value. */
export function createSearchFilter({ field, expression, value, ...rest }: CreateSearchFilter): SearchFilter {
  return {
    key: new Date().getTime(),
    field: field,
    expression: expression,
    value: value,
    ...rest,
  };
}

/** Retrieve the string representation of a cell's value in a table. */
export function getCellValue<TData, TValue>(cell: ReactCell<TData, TValue>): string | undefined {
  const value = cell.getValue();
  if (typeof value === "string") {
    return value;
  } else if (!value) {
    return undefined;
  } else {
    return String(value);
  }
}

/** Type guard to check if a given object is a Network. */
export function isNetwork(data: unknown): data is Network {
  if (data != null && typeof data == "object" && "cidr" in data) return true;
  return false;
}

/** Type guard to check if a given object is a Firewall Rule Entity. */
export function isFirewallRuleEntity(data: unknown): data is FirewallRuleEntity {
  if (data != null && typeof data == "object" && "value" in data) return true;
  return false;
}
