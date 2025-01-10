import { Box } from "@/components";
import { Action, SearchFilter } from "@/components/queryBar/types";
import {
  CellContextMenuFn,
  HeaderContextMenuFn,
  RowClickFn,
  RowDoubleClickFn,
  Table,
  TableProps,
} from "@/components/table";
import { useContextMenu } from "@/util/hooks";
import { twClassJoin } from "@/util/twMerge";
import { Row, VisibilityState } from "@tanstack/react-table";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useShallow } from "zustand/react/shallow";
import { useLogsStore } from "../store";
import {
  ColumnGroupsEnum,
  LogsCellContextMenuOption,
  LogsCellContextMenuOptionFn,
  LogsPanel,
  LogsPanelContextMenuOption,
  LogsPanelContextMenuOptionFn,
  PanelEntity,
  PanelRowContextMenuFn,
  PanelsEnum,
  QueryResultRecord,
  TableColumnFiltersState,
} from "../types";
import { defaultCellContextMenuOptionsFn, defaultLogFilterFn, defaultPanelContextMenuOptionsFn } from "./actions";
import { tableAllColumns } from "./columns";
import { CellContextMenu, HeaderContextMenu, PanelRowContextMenu } from "./contextMenu";
import { LogsDrawer } from "./panel";

function createInitialColumnVisibilityState(cols: typeof tableAllColumns) {
  return cols.reduce((accumulator, currentValue) => {
    if (!currentValue.id) return accumulator;
    return { ...accumulator, [currentValue.id]: currentValue.meta?.isVisibleByDefault ? true : false };
  }, {}) as VisibilityState;
}

/**
 * Hook that provides table column visibility state control and functions for users to update visibility state using the HeaderContextMenu component.
 */
function useColumnVisibility(
  cols: typeof tableAllColumns,
  columnVisibilityState: VisibilityState,
  setColumnVisibilityState: React.Dispatch<React.SetStateAction<VisibilityState>>
) {
  const contextMenuControls = useContextMenu();

  const initialColumnsExists = Object.keys(columnVisibilityState).length != 0;
  const columnState = initialColumnsExists ? columnVisibilityState : createInitialColumnVisibilityState(cols);

  useEffect(() => {
    if (!initialColumnsExists) {
      setColumnVisibilityState(columnState);
    }
  }, [initialColumnsExists, columnState, setColumnVisibilityState]);

  const onHeaderContextMenu: HeaderContextMenuFn<QueryResultRecord> = useCallback(
    (e) => {
      e.preventDefault();
      contextMenuControls.setPosition({
        x: e.clientX,
        y: e.clientY,
      });
      contextMenuControls.open();
    },
    [contextMenuControls]
  );

  // List of all table columns that user can interact with. list is compatible with 'HeaderContextMenu' component
  const columnList = useMemo(
    () =>
      cols
        .map((item) => ({
          title: item.header?.toString(),
          key: item.id ?? "",
          // Exclude columns with a proxy filter ID
          isHidden: item.meta?.filterId != undefined || !(item.meta?.isDisplayableAsColumn ?? true),
          isSelected: columnState[item.id ?? ""] ?? false,
        }))
        .filter((item) => item.isHidden !== true),
    [cols, columnState]
  );

  // update VisibilityState on selection change.
  const onColumnStateChange = useCallback(
    (values: string[]) => {
      if (values.length == 0) return;
      const newState: VisibilityState = {};
      for (const [key] of Object.entries(columnState)) {
        if (values.includes(key)) {
          newState[key] = true;
        } else {
          newState[key] = false;
        }
      }
      setColumnVisibilityState(newState);
    },
    [columnState, setColumnVisibilityState]
  );

  /**
   * Update the visibility state of a specific table column based on its ID.
   */
  const updateColumnVisibility = useCallback(
    (id: string, state: boolean) => {
      setColumnVisibilityState({
        ...columnState,
        [id]: state,
      });
    },
    [columnState, setColumnVisibilityState]
  );

  return {
    columnState,
    onHeaderContextMenu,
    contextMenuControls,
    onColumnStateChange,
    columnList,
    updateColumnVisibility,
  };
}

/**
 * Hook that provides table cell context menu (right click) state control and functions for users to change the state using the CellContextMenu component.
 */
function useCellContext(dispatchSearchFilters: LogsTableProps["dispatchSearchFilters"]) {
  const contextMenuControls = useContextMenu();
  const [options, setOptions] = useState<LogsCellContextMenuOption[]>([]);

  const onCellContextMenu: CellContextMenuFn<QueryResultRecord> = useCallback(
    (e, cell) => {
      e.preventDefault();
      const cellFunc = (cell.column.columnDef.meta?.cellContextMenuOptionFn ??
        defaultCellContextMenuOptionsFn) as LogsCellContextMenuOptionFn<QueryResultRecord>;
      setOptions(cellFunc(cell));

      contextMenuControls.setPosition({
        x: e.clientX,
        y: e.clientY,
      });
      contextMenuControls.open();
    },
    [contextMenuControls]
  );

  const onOptionChange = useCallback(
    (value: LogsCellContextMenuOption) => {
      contextMenuControls.close();
      switch (value.type) {
        case "set_filter":
          dispatchSearchFilters({
            type: "append",
            item: {
              ...value.item,
              isAutoFocusEnabled: false,
            },
          });
          break;
      }
    },
    [dispatchSearchFilters, contextMenuControls]
  );

  return { contextMenuControls, options, onCellContextMenu, onOptionChange };
}

/**
 * Hook that provides panel row context menu (right click) state control and functions for users to change the state using the PanelRowContextMenu component.
 */
function usePanelRowContext(
  updateColumnVisibility: (id: string, state: boolean) => void,
  dispatchSearchFilters: LogsTableProps["dispatchSearchFilters"]
) {
  const contextMenuControls = useContextMenu();
  const [options, setOptions] = useState<LogsPanelContextMenuOption[]>([]);

  /** Add SearchFilter to the query bar */
  const addFilter = useCallback(
    (value: SearchFilter) => {
      dispatchSearchFilters({
        type: "append",
        item: {
          ...value,
          isAutoFocusEnabled: false,
        },
      });
    },
    [dispatchSearchFilters]
  );

  const onPanelRowContextMenu: PanelRowContextMenuFn = useCallback(
    (e, entity, value) => {
      e.preventDefault();

      const cellFunc = (entity.cell.column.columnDef.meta?.panelContextMenuOptionFn ??
        defaultPanelContextMenuOptionsFn) as LogsPanelContextMenuOptionFn;
      setOptions(
        cellFunc(entity, value, {
          addSearchFilter: addFilter,
          updateColumnVisibility: updateColumnVisibility,
        })
      );

      contextMenuControls.setPosition({
        x: e.clientX,
        y: e.clientY,
      });
      contextMenuControls.open();
    },
    [contextMenuControls, updateColumnVisibility, addFilter]
  );

  return { contextMenuControls, onPanelRowContextMenu, options };
}

export interface LogsTableProps {
  dispatchSearchFilters: React.Dispatch<Action>;
  data: QueryResultRecord[];
  columnFilters: TableColumnFiltersState;
  setColumnVisibilityState: React.Dispatch<React.SetStateAction<VisibilityState>>;
  columnVisibilityState: VisibilityState;
}

/**
 * Hook that provides table drawer and functions to manage it.
 */
function useLogsDrawer() {
  const [isOpen, setIsOpen] = useState(false);
  const [panels, setPanels] = useState<LogsPanel[]>([]);

  const toggle = useCallback(() => setIsOpen(!isOpen), [isOpen]);
  const open = useCallback(() => (!isOpen ? setIsOpen(true) : undefined), [isOpen]);
  const close = useCallback(() => (isOpen ? setIsOpen(false) : undefined), [isOpen]);

  const onRowClick: RowClickFn<QueryResultRecord> = useCallback(
    (_e, row) => {
      if (!isOpen) return;
      setPanels(convertTableRowToPanel(row));
    },
    [isOpen]
  );

  const onRowDoubleClick: RowDoubleClickFn<QueryResultRecord> = useCallback(
    (_e, row) => {
      if (!isOpen) toggle();
      setPanels(convertTableRowToPanel(row));
    },
    [isOpen, toggle]
  );

  return {
    isOpen,
    toggle,
    setIsOpen,
    open,
    close,
    onRowClick,
    onRowDoubleClick,
    panels,
  };
}

function formatRenderName(name: string) {
  const newName = name.replace("_", " ");
  return newName.charAt(0).toUpperCase() + newName.slice(1);
}

function sortTablePanelGroups(panel: LogsPanel) {
  const groupPriorities: Record<string, number> = {
    [ColumnGroupsEnum.GENERAL]: 10,
    [ColumnGroupsEnum.SOURCE]: 20,
    [ColumnGroupsEnum.SOURCE_HOST]: 21,
    [ColumnGroupsEnum.SOURCE_NETWORKS]: 30,
    [ColumnGroupsEnum.SOURCE_ZONES]: 31,
    [ColumnGroupsEnum.SOURCE_INTERFACES]: 32,
    [ColumnGroupsEnum.DESTINATION]: 40,
    [ColumnGroupsEnum.DESTINATION_HOST]: 41,
    [ColumnGroupsEnum.DESTINATION_NETWORKS]: 50,
    [ColumnGroupsEnum.DESTINATION_ZONES]: 51,
    [ColumnGroupsEnum.DESTINATION_INTERFACES]: 52,
    [ColumnGroupsEnum.SERVICE]: 60,
    [ColumnGroupsEnum.SECURITY]: 70,
    [ColumnGroupsEnum.DATA]: 80,
  };

  panel.groups.sort((a, b) => {
    const priorityA = groupPriorities[a.groupId] ?? 99;
    const priorityB = groupPriorities[b.groupId] ?? 99;

    return priorityA - priorityB;
  });
  return panel;
}

function convertTableRowToPanel(row: Row<QueryResultRecord>): LogsPanel[] {
  const panelMap: Record<string, LogsPanel> = {};
  function addEntryToPanelMap(panelId: string, groupId: string, entity: PanelEntity) {
    if (!(panelId in panelMap))
      panelMap[panelId] = {
        key: panelId,
        name: formatRenderName(panelId),
        groups: [],
      };
    const panel = panelMap[panelId];
    let group = panel.groups.find((g) => g.key === groupId);
    if (!group) {
      group = {
        key: groupId,
        groupId: groupId,
        name: formatRenderName(groupId),
        entities: [],
      };
      panel.groups.push(group);
    }
    group.entities.push(entity);
  }

  for (const cell of row.getAllCells()) {
    const value = cell.getValue();

    const columnDef = cell.column.columnDef;
    const panel = columnDef.meta?.panel ?? { name: PanelsEnum.RECORD, group: ColumnGroupsEnum.GENERAL };
    const isEmptyCellIncludedInSidePanel = columnDef.meta?.isEmptyCellIncludedInSidePanel ?? false;

    // Skip empty values
    if ((!value && !isEmptyCellIncludedInSidePanel) || (Array.isArray(value) && value.length == 0)) continue;

    addEntryToPanelMap(panel.name, panel.group, {
      key: columnDef.id ?? cell.id,
      value: value,
      filterId: columnDef.meta?.filterId ?? columnDef.id ?? cell.id,
      name: columnDef.meta?.panelAltHeader ?? cell.column.columnDef.header?.toString(),
      cell: cell,
    });
  }

  return Object.values(panelMap).map((item) => sortTablePanelGroups(item));
}

export function LogsTable({
  data,
  dispatchSearchFilters,
  columnFilters,
  columnVisibilityState,
  setColumnVisibilityState,
}: LogsTableProps) {
  const store = useLogsStore(
    useShallow((state) => ({
      tableSize: state.tableSize,
    }))
  );

  const tableColumns = tableAllColumns;
  const columnVisibility = useColumnVisibility(tableColumns, columnVisibilityState, setColumnVisibilityState);
  const cellContext = useCellContext(dispatchSearchFilters);
  const panelRowContext = usePanelRowContext(columnVisibility.updateColumnVisibility, dispatchSearchFilters);
  const sideDrawer = useLogsDrawer();
  const [tableData, setTableData] = useState<QueryResultRecord[]>(data);

  const tableProps: TableProps<QueryResultRecord> = useMemo(
    () => ({
      columns: tableColumns,
      data: [],
      state: {
        columnVisibility: columnVisibility.columnState,
        columnFilters: columnFilters,
      },
      enableColumnResizing: true,
      className: twClassJoin("min-w-full", store.tableSize ?? "table-md"),
      enableSorting: true,
      onHeaderContextMenu: columnVisibility.onHeaderContextMenu,
      onCellContextMenu: cellContext.onCellContextMenu,
      onRowDoubleClick: sideDrawer.onRowDoubleClick,
      onRowClick: sideDrawer.onRowClick,
      containerHeight: "calc(100vh - 13.5rem)",
      defaultColumn: {
        filterFn: defaultLogFilterFn,
      },
      meta: {
        /**
         * Updates the table data using a custom update function.
         */
        updateData(updateFn: (data: QueryResultRecord[]) => QueryResultRecord[]) {
          setTableData((old) => updateFn(old));
        },
      },
    }),
    [
      tableColumns,
      store.tableSize,
      columnVisibility.columnState,
      columnVisibility.onHeaderContextMenu,
      cellContext.onCellContextMenu,
      sideDrawer.onRowDoubleClick,
      sideDrawer.onRowClick,
      columnFilters,
    ]
  );

  return (
    <Box>
      <Box className="bg-base-100">{data && <Table {...tableProps} data={tableData}></Table>}</Box>
      <HeaderContextMenu
        controls={columnVisibility.contextMenuControls}
        options={columnVisibility.columnList}
        onChange={columnVisibility.onColumnStateChange}
      />
      <CellContextMenu
        controls={cellContext.contextMenuControls}
        options={cellContext.options}
        onChange={cellContext.onOptionChange}
      />

      <PanelRowContextMenu controls={panelRowContext.contextMenuControls} options={panelRowContext.options} />
      <LogsDrawer {...sideDrawer} onRowContextMenu={panelRowContext.onPanelRowContextMenu} />
    </Box>
  );
}
