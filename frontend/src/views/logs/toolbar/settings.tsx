import { Block, BlockBody, Dropdown, DropdownContent, DropdownToggle, SettingsOption, ToolTip } from "@/components";
import { FormSelect } from "@/components/form";
import { Cog6ToothIcon } from "@heroicons/react/24/outline";
import { useShallow } from "zustand/react/shallow";
import { useLogsStore } from "../store";
import { TableSize } from "../types";

/** Toolbar settings */
export function Settings() {
  const store = useLogsStore(
    useShallow((state) => ({
      tableSize: state.tableSize,
      updateTableSize: state.updateTableSize,
    }))
  );

  return (
    <Dropdown className="dropdown-end">
      <DropdownToggle className="btn-ghost btn-circle btn-xs" isChevronVisible={false}>
        <ToolTip message="Settings" className="tooltip-left">
          <Cog6ToothIcon className="w-6 h-6 pb-1" />
        </ToolTip>
      </DropdownToggle>
      <DropdownContent className="w-96">
        <Block className="p-0">
          <BlockBody className="min-h-36 border border-background p-4">
            <SettingsOption title="Table size">
              <FormSelect
                onChange={(e) => store.updateTableSize(e.target.value as TableSize)}
                className="select-sm"
                value={store.tableSize}
                values={
                  {
                    "table-xs": "Extra small",
                    "table-sm": "Small",
                    "table-md": "Normal",
                    "table-lg": "Large",
                  } as Record<TableSize, string>
                }
                isEmptyOptionVisible={false}
              ></FormSelect>
            </SettingsOption>
          </BlockBody>
        </Block>
      </DropdownContent>
    </Dropdown>
  );
}
