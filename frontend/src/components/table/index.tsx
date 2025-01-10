import { twClassJoin } from "@/util/twMerge";
import {
  ColumnResizeMode,
  InitialTableState,
  Cell as ReactCell,
  Header as ReactHeader,
  Row as ReactRow,
  Table as ReactTable,
  RowData,
  TableOptions,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { Virtualizer, notUndefined, useVirtualizer } from "@tanstack/react-virtual";
import { merge } from "lodash-es";
import { forwardRef, memo, useRef } from "react";
import { Pagination } from "./pagination";
import * as resizing from "./resizing";
import * as sorting from "./sorting";
import { EmptyFilterResultMessage, EmptyTableMessage } from "./util";

export type HeaderContextMenuFn<TData extends RowData> = (
  e: React.MouseEvent<HTMLTableCellElement>,
  header: ReactHeader<TData, unknown>
) => void;
export type CellContextMenuFn<TData extends RowData> = (
  e: React.MouseEvent<HTMLTableCellElement>,
  cell: ReactCell<TData, unknown>
) => void;
export type RowDoubleClickFn<TData extends RowData> = (
  e: React.MouseEvent<HTMLTableRowElement>,
  row: ReactRow<TData>
) => void;
export type RowClickFn<TData extends RowData> = (
  e: React.MouseEvent<HTMLTableRowElement>,
  row: ReactRow<TData>
) => void;

type PropsTableOptionsOmitted =
  | "getCoreRowModel"
  | "getPaginationRowModel"
  | "getSortedRowModel"
  | "getFilteredRowModel";

// Interface for Table component props
export interface TableProps<TData extends RowData> extends Omit<TableOptions<TData>, PropsTableOptionsOmitted> {
  // Number of rows per page
  pageSize?: number;
  // Enable or disable pagination. When pagination is enabled, virtualization is disabled
  enablePagination?: boolean;
  // Enable or disable virtualization
  enableVirtualization?: boolean;
  // Initial state of the table
  initialState?: InitialTableState;
  // Show or hide empty table message
  isEmptyTableMessageVisible?: boolean;
  // Custom message to display when the table is empty
  emptyTableMessage?: string | React.ReactNode;
  // Show or hide empty filter result message
  isEmptyFilterResultMessageVisible?: boolean;
  // Custom message to display when no records match the filters
  emptyFilterResultMessage?: React.ReactNode;
  // Context menu handler for table headers
  onHeaderContextMenu?: HeaderContextMenuFn<TData>;
  // Context menu handler for table cells
  onCellContextMenu?: CellContextMenuFn<TData>;
  // Double click handler for table rows
  onRowDoubleClick?: RowDoubleClickFn<TData>;
  // Click handler for table rows
  onRowClick?: RowClickFn<TData>;
  // Additional class names for the table
  className?: string;
  // Height of the container. Container size determines the size of the table when virtualization is enabled.
  containerHeight?: string;
}

function Header<TData>({
  table,
  onContextMenu,
}: {
  table: ReactTable<TData>;
  onContextMenu?: HeaderContextMenuFn<TData>;
}) {
  return (
    <thead>
      {table.getHeaderGroups().map((headerGroup) => (
        <tr key={headerGroup.id} className="resizable z-0">
          {headerGroup.headers.map((header) => (
            <th
              key={header.id}
              className="relative"
              style={resizing.HeaderVars({ header })}
              onContextMenu={onContextMenu ? (e) => onContextMenu(e, header) : undefined}
            >
              {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
              {/* Column Sorter */}
              {sorting.Sorter({ header })}

              {/* Column Resizer */}
              {resizing.Resizer({ header })}
            </th>
          ))}
        </tr>
      ))}
    </thead>
  );
}

interface BodyProps<TData> {
  table: ReactTable<TData>;
  onContextMenu?: CellContextMenuFn<TData>;
  onRowDoubleClick?: RowDoubleClickFn<TData>;
  onRowClick?: RowClickFn<TData>;
  useVirtualization?: boolean;
  virtualizer?: Virtualizer<HTMLDivElement, Element>;
}
function Body<TData>({
  table,
  onContextMenu,
  useVirtualization,
  virtualizer,
  onRowDoubleClick,
  onRowClick,
}: BodyProps<TData>) {
  const { rows } = table.getRowModel();

  if (!useVirtualization || !virtualizer)
    return (
      <tbody>
        {rows.map((row) => (
          <tr
            key={row.id}
            className="hover"
            onClick={onRowClick && ((e) => onRowClick(e, row))}
            onDoubleClick={onRowDoubleClick && ((e) => onRowDoubleClick(e, row))}
          >
            {row.getVisibleCells().map((cell) => (
              <td key={cell.id} onContextMenu={onContextMenu && ((e) => onContextMenu(e, cell))}>
                {flexRender(cell.column.columnDef.cell, cell.getContext())}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    );

  const items = virtualizer.getVirtualItems();

  const [before, after] =
    items.length > 0
      ? [
          notUndefined(items[0]).start - virtualizer.options.scrollMargin,
          virtualizer.getTotalSize() - notUndefined(items[items.length - 1]).end,
        ]
      : [0, 0];

  return (
    <tbody>
      {before > 0 && (
        <tr>
          <td colSpan={1} style={{ height: before }} />
        </tr>
      )}
      {items.map((virtualRow) => {
        const row = rows[virtualRow.index];
        return (
          <tr
            key={row.id}
            className="hover"
            style={{
              height: `${virtualRow.size}px`,
            }}
            onClick={onRowClick && ((e) => onRowClick(e, row))}
            onDoubleClick={onRowDoubleClick && ((e) => onRowDoubleClick(e, row))}
          >
            {row.getVisibleCells().map((cell) => (
              <td key={cell.id} onContextMenu={onContextMenu && ((e) => onContextMenu(e, cell))}>
                {flexRender(cell.column.columnDef.cell, cell.getContext())}
              </td>
            ))}
          </tr>
        );
      })}
      {after > 0 && (
        <tr>
          <td colSpan={1} style={{ height: after }} />
        </tr>
      )}
    </tbody>
  );
}

// Special memoized wrapper for our table body that we will use during column resizing
const MemoizedBody = memo(Body, (prev, next) => prev.table.options.data === next.table.options.data) as typeof Body;

interface ContainerProps {
  useVirtualization?: boolean;
  children?: React.ReactNode;
  containerHeight?: string;
}

const Container = forwardRef(function Container(props: ContainerProps, outerRef: React.ForwardedRef<HTMLDivElement>) {
  if (!props.useVirtualization) return <div ref={outerRef}>{props.children}</div>;

  return (
    <div
      ref={outerRef}
      className="overflow-auto"
      style={{ height: props.containerHeight ?? "500px", overflowAnchor: "none" }}
    >
      {props.children}
    </div>
  );
});

/**
 * React managed Table
 */
export function Table<TData extends RowData>(props: TableProps<TData>) {
  const initialState = {
    pagination: {
      pageSize: props?.pageSize ?? 10,
    },
  };

  const tableOptions: TableOptions<TData> = {
    ...props,
    initialState: props.initialState ? merge({}, initialState, props.initialState) : initialState,
    getCoreRowModel: getCoreRowModel(),
    columnResizeMode: "onChange" as ColumnResizeMode,
    getPaginationRowModel: props.enablePagination ? getPaginationRowModel() : undefined,
    getSortedRowModel: props.enableSorting ? getSortedRowModel() : undefined,
    getFilteredRowModel: getFilteredRowModel(),
    enableColumnResizing: props.enableColumnResizing ?? false,
    enableSorting: props.enableSorting ?? false,
  };

  const table = useReactTable(tableOptions);

  const containerRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: table.getRowModel().rows.length,
    getScrollElement: () => containerRef.current,
    estimateSize: () => 34,
    overscan: 10,
  });

  const useVirtualization = (props.enableVirtualization ?? true) && !props.enablePagination ? true : false;

  return (
    <Container useVirtualization={useVirtualization} ref={containerRef} containerHeight={props.containerHeight}>
      <table
        className={twClassJoin("table table-pin-rows", props.className ?? "")}
        style={resizing.TableVars({ table })}
      >
        <Header table={table} onContextMenu={props.onHeaderContextMenu} />

        {/* When resizing any column render this special memoized version of our table body */}
        {table.getState().columnSizingInfo.isResizingColumn ? (
          <MemoizedBody
            table={table}
            virtualizer={virtualizer}
            useVirtualization={useVirtualization}
            onContextMenu={props.onCellContextMenu}
            onRowDoubleClick={props.onRowDoubleClick}
            onRowClick={props.onRowClick}
          />
        ) : (
          <Body
            table={table}
            virtualizer={virtualizer}
            useVirtualization={useVirtualization}
            onContextMenu={props.onCellContextMenu}
            onRowDoubleClick={props.onRowDoubleClick}
            onRowClick={props.onRowClick}
          />
        )}
      </table>
      {props.data.length == 0 && (props.isEmptyTableMessageVisible ?? true) && (
        <EmptyTableMessage>{props.emptyTableMessage ?? "There are no records to display"}</EmptyTableMessage>
      )}
      {props.data.length != 0 &&
        (props.isEmptyFilterResultMessageVisible ?? true) &&
        table.getFilteredRowModel().rows.length == 0 && (
          <EmptyFilterResultMessage
            message={props.emptyFilterResultMessage ?? "Sorry, no records match your filters"}
          />
        )}
      {props.enablePagination && <Pagination table={table} />}
    </Container>
  );
}
