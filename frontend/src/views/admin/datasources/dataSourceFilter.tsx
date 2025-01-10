import { Box } from "@/components";
import { SearchBar } from "@/components/searchBar";
import { SelectDropdown } from "@/components/select";
import { ColumnFiltersState } from "@tanstack/react-table";
import { useCallback, useState } from "react";

export interface DataSourceFilterProps {
  onGlobalFilterUpdate: (value: string) => void;
  onColumnFilterUpdate: (value: ColumnFiltersState) => void;
}

const statusValues = [
  {
    key: "all",
    title: "All",
  },
  {
    key: "disabled",
    title: "Disabled",
  },
  {
    key: "enabled",
    title: "Enabled",
  },
];

/**
 * Component to filter data sources.
 *
 * @param onGlobalFilterUpdate - Callback to update the global filter.
 * @param onColumnFilterUpdate - Callback to update the column filter.
 */
export function DataSourceFilter({ onGlobalFilterUpdate, onColumnFilterUpdate }: DataSourceFilterProps) {
  const [statusFilter, setStatusFilter] = useState<string[]>([statusValues[0].key]);

  const updateStatusFilter = useCallback(
    (value: string[]) => {
      setStatusFilter(value);

      if (value[0] === "enabled") {
        return onColumnFilterUpdate([
          {
            id: "is_enabled",
            value: true,
          },
        ]);
      } else if (value[0] === "disabled") {
        return onColumnFilterUpdate([
          {
            id: "is_enabled",
            value: false,
          },
        ]);
      }
      return onColumnFilterUpdate([]);
    },
    [setStatusFilter, onColumnFilterUpdate]
  );

  return (
    <Box className="flex gap-4 mb-4">
      <SelectDropdown
        value={statusFilter}
        options={statusValues}
        prefix="Status"
        onChange={updateStatusFilter}
        dropdownClassName="min-w-56"
      />
      <SearchBar className="grow" onSearch={(query) => onGlobalFilterUpdate(query)} />
    </Box>
  );
}
