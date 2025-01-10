import { Header, Table as reactTable } from "@tanstack/react-table";
import { useMemo } from "react";

export function TableVars<T>({ table }: { table: reactTable<T> }) {
  const columnSizeVars = useMemo(() => {
    const headers = table.getFlatHeaders();
    const colSizes: Record<string, number> = {};

    for (const header of headers) {
      colSizes[`--header-${header.id}-size`] = header.getSize();
      colSizes[`--col-${header.column.id}-size`] = header.column.getSize();
    }
    return colSizes;

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [table.getState().columnSizingInfo]);

  if (!table.options.enableColumnResizing) return {};

  return { ...columnSizeVars, width: table.getTotalSize() };
}

export function HeaderVars<TData, TValue>({ header }: { header: Header<TData, TValue> }) {
  if (!header.column.getCanResize()) return {};

  return { width: `calc(var(--header-${header?.id}-size) * 1px)` };
}

export function Resizer<TData, TValue>({ header }: { header: Header<TData, TValue> }) {
  if (!header.column.getCanResize()) return;

  return (
    <div
      {...{
        onDoubleClick: () => header.column.resetSize(),
        onMouseDown: header.getResizeHandler(),
        onTouchStart: header.getResizeHandler(),
        className: `absolute top-0 right-0 h-full w-0.5 cursor-col-resize resizer bg-base-content ${
          header.column.getIsResizing() ? "bg-info" : "bg-base-content"
        }`,
      }}
    />
  );
}
