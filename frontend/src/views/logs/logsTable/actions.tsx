import { Box } from "@/components";
import { Expressions } from "@/components/queryBar/expressions";
import { EMPTY_VALUE } from "@/config/const";
import { ipAddress } from "@/util/helpers";
import { FilterFn } from "@tanstack/react-table";
import {
  LogsCellContextMenuOption,
  LogsCellContextMenuOptionFn,
  LogsPanelContextMenuOption,
  LogsPanelContextMenuOptionFn,
  QueryResultRecord,
  TableColumnFilterValue,
} from "../types";
import { createSearchFilter, getCellValue } from "../util";

// eslint-disable-next-line react-refresh/only-export-components
function QuickSearchFilterTitle({ field, expression, value }: { field: string; expression: string; value: string }) {
  return (
    <>
      <Box as="span" className="text-amber-600">
        Quick
      </Box>
      {`${field} ${expression} ${value}`}
    </>
  );
}

export const defaultCellContextMenuOptionsFn: LogsCellContextMenuOptionFn<QueryResultRecord> = (cell) => {
  const cellValue = getCellValue(cell);
  const isFilterable = cell.column.columnDef.meta?.isFilterable ?? true;
  const isLocal = cell.column.columnDef.meta?.isLocal ?? false;
  const field = cell.column.columnDef.id ?? cell.id;

  // Allow only local filtering if cellValue is empty
  if (!cellValue) {
    if (!isFilterable) return [];
    return [
      {
        key: "quick_eq",
        title: <QuickSearchFilterTitle field={field} expression={Expressions.eq.value} value={EMPTY_VALUE} />,
        item: createSearchFilter({
          field: field,
          expression: Expressions.eq.value,
          value: EMPTY_VALUE,
          isLocal: true,
        }),
        type: "set_filter",
      },
      {
        key: "quick_neq",
        title: <QuickSearchFilterTitle field={field} expression={Expressions.neq.value} value={EMPTY_VALUE} />,
        item: createSearchFilter({
          field: field,
          expression: Expressions.neq.value,
          value: EMPTY_VALUE,
          isLocal: true,
        }),
        type: "set_filter",
      },
    ];
  } else {
    if (!isFilterable) return [];
    const options: LogsCellContextMenuOption[] = [];
    options.push(
      ...[
        {
          key: "quick_eq",
          title: <QuickSearchFilterTitle field={field} expression={Expressions.eq.value} value={cellValue} />,
          item: createSearchFilter({
            field: field,
            expression: Expressions.eq.value,
            value: cellValue,
            isLocal: true,
          }),
          type: "set_filter",
        },
        {
          key: "quick_neq",
          title: <QuickSearchFilterTitle field={field} expression={Expressions.neq.value} value={cellValue} />,
          item: createSearchFilter({
            field: field,
            expression: Expressions.neq.value,
            value: cellValue,
            isLocal: true,
          }),
          type: "set_filter",
        },
      ]
    );
    if (!isLocal) {
      options.push(
        ...[
          {
            key: "filter_eq",
            title: `${field} ${Expressions.eq.value} ${cellValue}`,
            item: createSearchFilter({ field: field, expression: Expressions.eq.value, value: cellValue }),
            type: "set_filter",
          },
          {
            key: "filter_neq",
            title: `${field} ${Expressions.neq.value} ${cellValue}`,
            item: createSearchFilter({ field: field, expression: Expressions.neq.value, value: cellValue }),
            type: "set_filter",
          },
        ]
      );
    }
    return options;
  }
};

export const defaultPanelContextMenuOptionsFn: LogsPanelContextMenuOptionFn = (entity, value, helpers) => {
  const opt: LogsPanelContextMenuOption[] = [];
  const isDisplayableAsColumn = entity.cell.column.columnDef.meta?.isDisplayableAsColumn ?? true;
  const isFilterable = entity.cell.column.columnDef.meta?.isFilterable ?? true;
  const isLocal = entity.cell.column.columnDef.meta?.isLocal ?? false;

  function quickFilterOptions(val: string) {
    return [
      {
        key: "quick_eq",
        title: <QuickSearchFilterTitle field={entity.filterId} expression={Expressions.eq.value} value={val} />,
        action: () =>
          helpers.addSearchFilter(
            createSearchFilter({
              field: entity.filterId,
              expression: Expressions.eq.value,
              value: val,
              isLocal: true,
            })
          ),
      },
      {
        key: "quick_neq",
        title: <QuickSearchFilterTitle field={entity.filterId} expression={Expressions.neq.value} value={val} />,
        action: () =>
          helpers.addSearchFilter(
            createSearchFilter({
              field: entity.filterId,
              expression: Expressions.neq.value,
              value: val,
              isLocal: true,
            })
          ),
      },
    ];
  }

  function serverFilterOptions(val: string) {
    return [
      {
        key: "filter_eq",
        title: `${entity.filterId} ${Expressions.eq.value} ${val}`,
        action: () =>
          helpers.addSearchFilter(
            createSearchFilter({
              field: entity.filterId,
              expression: Expressions.eq.value,
              value: val,
            })
          ),
      },
      {
        key: "filter_neq",
        title: `${entity.filterId} ${Expressions.neq.value} ${val}`,
        action: () =>
          helpers.addSearchFilter(
            createSearchFilter({
              field: entity.filterId,
              expression: Expressions.neq.value,
              value: val,
            })
          ),
      },
    ];
  }

  if (isFilterable) {
    opt.push(...quickFilterOptions(value));
    if (!isLocal) opt.push(...serverFilterOptions(value));
  }

  if (isDisplayableAsColumn ?? true) {
    // entity.filterId can point other columns other than self
    const header = entity.cell.getContext().table.getColumn(entity.filterId)?.columnDef.header ?? entity.name;
    opt.push({
      key: "add_entity_to_table_columns",
      title: `Add '${header}' to table columns`,
      action: () => helpers.updateColumnVisibility(entity.filterId, true),
    });
  }

  return opt;
};

export const defaultLogFilterFn: FilterFn<QueryResultRecord> = (
  row,
  columnId,
  filterValue: TableColumnFilterValue[]
) => {
  function evaluateFilter(filter: TableColumnFilterValue) {
    const value = filter.value == EMPTY_VALUE ? undefined : filter.value;

    switch (filter.expression) {
      case "eq":
        return row.getValue(columnId) == value;
      case "neq":
        return row.getValue(columnId) != value;
      case "in":
        return Array.isArray(filter.value) && filter.value.includes(row.getValue(columnId));
      case "nin":
        return Array.isArray(filter.value) && !filter.value.includes(row.getValue(columnId));
      case "like":
        return String(row.getValue(columnId)).includes(String(filter.value));
      case "nlike":
        return !String(row.getValue(columnId)).includes(String(filter.value));
      default:
        console.error(
          `Unrecognized filter expression '${filter.expression}' for column '${columnId}'. Ensure the expression type is supported.`
        );
        return true;
    }
  }

  for (const filter of filterValue) {
    const result = evaluateFilter(filter);
    if (!result) return false;
  }

  return true;
};

/**
 * Table filter function - Supports IPv4 and IPv6 CIDR
 */
export const ipLogFilterFn: FilterFn<QueryResultRecord> = (
  row,
  columnId,
  filterValue: TableColumnFilterValue[],
  addMeta
) => {
  function evaluateFilter(filter: TableColumnFilterValue) {
    const value = filter.value == EMPTY_VALUE ? undefined : filter.value;

    const cell_ip = ipAddress(row.getValue(columnId));
    let filter_ip;

    if (typeof value == "string") filter_ip = ipAddress(value);
    if (Array.isArray(value)) filter_ip = value.map((item) => ipAddress(item)).filter((item) => item != undefined);
    if (!filter_ip || !cell_ip) return defaultLogFilterFn(row, columnId, [filter], addMeta);

    switch (filter.expression) {
      case "eq":
        return !Array.isArray(filter_ip) && cell_ip.isInSubnet(filter_ip);
      case "neq":
        return !Array.isArray(filter_ip) && !cell_ip.isInSubnet(filter_ip);
      case "in":
        return (
          Array.isArray(filter_ip) && filter_ip.map((item) => cell_ip.isInSubnet(item)).some((item) => item == true)
        );
      case "nin":
        return (
          Array.isArray(filter_ip) && !filter_ip.map((item) => cell_ip.isInSubnet(item)).some((item) => item == true)
        );
      case "like":
        return defaultLogFilterFn(row, columnId, [filter], addMeta);
      case "nlike":
        return defaultLogFilterFn(row, columnId, [filter], addMeta);
      default:
        console.error(
          `Unrecognized filter expression '${filter.expression}' for column '${columnId}'. Ensure the expression type is supported.`
        );
        return true;
    }
  }

  for (const filter of filterValue) {
    const result = evaluateFilter(filter);
    if (!result) return false;
  }
  return true;
};
