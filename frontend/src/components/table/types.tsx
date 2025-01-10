import { Cell as ReactCell, RowData } from "@tanstack/react-table";

declare module "@tanstack/react-table" {
  interface ColumnMeta<TData extends RowData, TValue> {
    /** Custom function to generate menu options for a given cell */
    cellContextMenuOptionFn?: CellContextMenuOptionFn<TData>;

    /** Whether to show the column on the initial table render */
    isVisibleByDefault?: boolean;

    /** Column will be invisible in the column visibility context menu */
    isDisplayableAsColumn?: boolean;

    /** Column can be used as a SearchFilter */
    isFilterable?: boolean;

    /** This column exists only in the frontend and is unavailable for server-side filtering. */
    isLocal?: boolean;

    /** Panel to which the column belongs */
    panel?: {
      name: string;
      group: string;
    };

    /**
     * Allows using an alternative header title for a panel,
     * overriding the default column header text when needed
     */
    panelAltHeader?: string;

    /** Whether a cell with an empty value should be included in the side panel. */
    isEmptyCellIncludedInSidePanel?: boolean;

    /** Custom function to generate context menu options for a specific panel row */
    panelContextMenuOptionFn?: PanelContextMenuOptionFn;

    /**
     * Custom formatter function to transform panel cell values
     * Useful for formatting complex data types like arrays or objects
     * Returns a React renderable node
     */
    panelFormatterFn?: (props: {
      name: React.ReactNode;
      value: unknown;
      cell: ReactCell<TData, TValue>;
    }) => React.ReactNode;

    /**
     * Accessor function for panel values, especially critical when:
     * - The value is an array
     * - Individual array elements need to be treated as separate items
     * - Filtering or individual element access is required
     */
    panelValueAccessFn?: (value: unknown) => string;

    /**
     * Override the default filter field key for a column
     *
     * Notes:
     * - Use this if you want to filter based on a different field.
     * - This field acts like a proxy for another field.
     * - Only used by the panel.
     *
     * Default behavior: Uses the cell's ID if not specified
     */
    filterId?: string;
  }

  interface TableMeta<TData extends RowData> {
    updateData: (updateFn: (data: TData[]) => TData[]) => void;
  }
}

/** A function type used to generate context menu options for a specific cell in a table. */
export type CellContextMenuOptionFn<TData> = (cell: ReactCell<TData, unknown>) => CellContextMenuOption[];

/** Interface for cell context menu options */
export interface CellContextMenuOption {
  key: React.Key;
}

/** Interface for panels */
export interface Panel {
  key: React.Key;
  name: React.ReactNode;
  element: React.ReactNode;
}

/** A function type used to generate context menu options for a specific panel */
export type PanelContextMenuOptionFn = () => PanelContextMenuOption[];

/** Interface for panel context menu options */
export interface PanelContextMenuOption {
  key: React.Key;
}
