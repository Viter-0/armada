import { Anchor, Box, ContextMenu, Menu, MenuItem, SearchBar, SelectDropdownList, Text } from "@/components";
import { ContextMenuProps } from "@/components/types";
import { useEffect, useState } from "react";
import { ColumnVisibilityOption, LogsCellContextMenuOption, LogsPanelContextMenuOption } from "../types";

export interface HeaderContextMenuProps<T> {
  /** Context menu controls */
  controls: ContextMenuProps;
  /** Visibility select options */
  options: ColumnVisibilityOption<T>[];
  /** Callback function that returns a list of selected option keys */
  onChange: (value: T[]) => void;
}

// Header context menu component to manage column visibility
export function HeaderContextMenu<T extends React.Key>({ controls, options, onChange }: HeaderContextMenuProps<T>) {
  const selectedValues = options.filter((item) => item.isSelected === true).map((item) => item.key);
  const [filter, setFilter] = useState("");

  // Clear filter on context menu close
  useEffect(() => {
    if (!controls.isOpen) setFilter("");
  }, [controls.isOpen]);

  const filteredValues = options.filter((item) => item.title?.toString().toLowerCase().includes(filter.toLowerCase()));

  if (!controls.isOpen) return null;

  return (
    <ContextMenu {...controls} className="border border-background min-w-48 pt-2 bg-base-100">
      <Text className="text-center">Column Visibility</Text>
      <SearchBar
        value={filter}
        className="px-3 pt-2 w-52"
        onChange={(value) => setFilter(value)}
        labelClassName="input-sm"
        isClearXMarkVisible={false}
      />
      <SelectDropdownList
        options={filteredValues}
        isClosedOnSelect={false}
        value={selectedValues}
        onChange={onChange}
        isMultiSelect
        dropdownClassName="h-96 overflow-auto"
      />
    </ContextMenu>
  );
}

export interface CellContextMenuProps {
  /** Context menu controls */
  controls: ContextMenuProps;
  /** Context menu options */
  options: LogsCellContextMenuOption[];
  /** Callback function that returns a selected option */
  onChange: (value: LogsCellContextMenuOption) => void;
}

// Cell context menu component
export function CellContextMenu({ controls, options, onChange }: CellContextMenuProps) {
  if (!controls.isOpen) return null;

  return (
    <ContextMenu {...controls} className="border border-background min-w-48">
      <Menu>
        {options.map((item) => (
          <MenuItem key={item.key} onClick={() => onChange(item)}>
            <Anchor className="px-1">{item.title}</Anchor>
          </MenuItem>
        ))}
        {options.length == 0 && <Text>No options available for this cell</Text>}
      </Menu>
    </ContextMenu>
  );
}

export interface PanelRowContextMenuProps {
  /** Context menu controls */
  controls: ContextMenuProps;
  /** Context menu options */
  options: LogsPanelContextMenuOption[];
}
// Panel row context menu component
export function PanelRowContextMenu({ controls, options }: PanelRowContextMenuProps) {
  if (!controls.isOpen) return null;

  return (
    <ContextMenu {...controls} className="border border-background min-w-48 z-20">
      <Menu>
        {options.map((item) =>
          item.type == "text" ? (
            <Box className={item.className} key={item.key} onClick={() => item.action()}>
              {item.title}
            </Box>
          ) : (
            <MenuItem key={item.key} className={item.className} onClick={() => item.action()}>
              <Anchor className="px-1">{item.title}</Anchor>
            </MenuItem>
          )
        )}
        {options.length == 0 && <Text>No options available</Text>}
      </Menu>
    </ContextMenu>
  );
}
