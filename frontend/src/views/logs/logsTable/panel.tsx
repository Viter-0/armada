import { Box, TableBody, TableNative, TableTr } from "@/components";
import { TableDrawer } from "@/components/table/drawer";
import { LogsPanel, PanelEntity, PanelRowContextMenuFn } from "../types";
import { FormatAsTableRow } from "./formatters";

interface LogsDrawerProps {
  /** Whether the drawer is currently open */
  isOpen?: boolean;
  /** Additional CSS classes to apply to the drawer */
  className?: string;
  /** Function to toggle the drawer open/closed */
  toggle: () => void;
  // /** List of panels to render as tabs in the drawer */
  panels: LogsPanel[];
  /** Handler for the right-click context menu on panel rows */
  onRowContextMenu: PanelRowContextMenuFn;
}

/**
 * A slide-out drawer component that displays detailed log information in tabs
 */
export function LogsDrawer({ isOpen, toggle, panels, onRowContextMenu }: LogsDrawerProps) {
  return (
    <TableDrawer
      isOpen={isOpen}
      toggle={toggle}
      panels={panels.map((item) => ({
        ...item,
        element: (
          <>
            {item.groups.map((item) => (
              <Box key={item.key}>
                <Box className="bg-base-content/5 p-2 mt-2">{item.name}</Box>
                <TableNative className="ms-5 cursor-pointer">
                  <TableBody>
                    <PanelEntities entities={item.entities} onRowContextMenu={onRowContextMenu} />
                  </TableBody>
                </TableNative>
              </Box>
            ))}
          </>
        ),
      }))}
      drawerContainerClassName="pt-4"
      drawerBodyClassName="w-[40rem]"
      drawerContentClassName="max-h-[77vh] overflow-y-scroll"
    />
  );
}

interface PanelEntitiesProps {
  entities: PanelEntity[];
  onRowContextMenu: PanelRowContextMenuFn;
}

function PanelEntities({ onRowContextMenu, entities }: PanelEntitiesProps) {
  return entities.map((entity) => {
    const panelFormatterFn = entity.cell.column.columnDef.meta?.panelFormatterFn;
    const panelValueAccessFn = entity.cell.column.columnDef.meta?.panelValueAccessFn;

    if (Array.isArray(entity.value)) {
      return (
        <>
          {entity.value.map((item, idx) => {
            const value = panelValueAccessFn ? panelValueAccessFn(entity.value) : item;
            return (
              <TableTr key={entity.key + String(idx)} onContextMenu={(e) => onRowContextMenu(e, entity, String(value))}>
                {panelFormatterFn ? (
                  panelFormatterFn({ name: entity.name, value: item, cell: entity.cell })
                ) : (
                  <FormatAsTableRow name={entity.name} value={String(value)} />
                )}
              </TableTr>
            );
          })}
        </>
      );
    }

    const value = panelValueAccessFn ? panelValueAccessFn(entity.value) : String(entity.value);

    return (
      <TableTr key={entity.key} onContextMenu={(e) => onRowContextMenu(e, entity, value)}>
        {panelFormatterFn ? (
          panelFormatterFn({ name: entity.name, value: entity.value, cell: entity.cell })
        ) : (
          <FormatAsTableRow name={entity.name} value={value} />
        )}
      </TableTr>
    );
  });
}
