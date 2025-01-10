import { useOutsideAction } from "@/util/hooks";
import { twClassMerge } from "@/util/twMerge";
import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Alert } from "./feedback";
import { Box } from "./layout";
import { Anchor, TabContent, TabLink, TabList } from "./navigation";
import { SearchBar } from "./searchBar";
import { Heading, Text } from "./typography";

/**
 * A basic Menu component that renders a list of menu items.
 */
export function Menu({ className = "", children, ...props }: React.ComponentPropsWithoutRef<"ul">) {
  return (
    <ul {...props} className={twClassMerge("menu p-4 bg-base-100", className)}>
      {children}
    </ul>
  );
}

/**
 * An individual menu item.
 */
export function MenuItem({ children, ...props }: React.ComponentPropsWithoutRef<"li">) {
  return <li {...props}>{children}</li>;
}

export function MenuTitle({ children, className = "", ...props }: React.ComponentPropsWithoutRef<"h2">) {
  return (
    <h2 {...props} className={"menu-title " + className}>
      {children}
    </h2>
  );
}

export interface ContextMenuPosition {
  x: number;
  y: number;
}

export interface ContextMenuProps {
  isOpen?: boolean;
  close: () => void;
  position: ContextMenuPosition;
  className?: string;
}

/**
 * A context menu, displayed upon right-click.
 */
export function ContextMenu({
  isOpen,
  close,
  children,
  position,
  className = "",
}: React.PropsWithChildren<ContextMenuProps>) {
  const menuRef = useRef<HTMLDivElement>(null);

  const dismissMenu = useCallback(
    (_: Event) => {
      if (isOpen) close();
    },
    [isOpen, close]
  );

  useOutsideAction("click", menuRef, dismissMenu);
  useOutsideAction("contextmenu", menuRef, dismissMenu);

  useEffect(() => {
    document.addEventListener("scroll", dismissMenu);

    return () => {
      document.removeEventListener("scroll", dismissMenu);
    };
  }, [dismissMenu]);

  useEffect(() => {
    if (!menuRef.current) return;

    if (!isOpen) {
      menuRef.current.style.visibility = "hidden";
      menuRef.current.style.top = `0px`;
      menuRef.current.style.left = `0px`;
      return;
    }

    const menuDimension = {
      x: menuRef.current.offsetWidth,
      y: menuRef.current.offsetHeight,
    };

    const screenDimension = {
      x: window.innerWidth,
      y: window.innerHeight,
    };

    const right = screenDimension.x - position.x > menuDimension.x;
    const left = !right;
    const top = screenDimension.y - position.y > menuDimension.y;
    const bottom = !top;

    if (right) menuRef.current.style.left = `${window.scrollX + position.x + 5}px`;
    if (left) menuRef.current.style.left = `${window.scrollX + position.x - menuDimension.x - 5}px`;
    if (top) menuRef.current.style.top = `${window.scrollY + position.y + 5}px`;
    if (bottom) menuRef.current.style.top = `${window.scrollY + position.y - menuDimension.y - 5}px`;

    menuRef.current.style.visibility = "visible";
  }, [isOpen, position, children]);

  return (
    <>
      {createPortal(
        <div ref={menuRef} className={"absolute " + className}>
          {children}
        </div>,
        document.body
      )}
    </>
  );
}

export interface SelectItem {
  name: string;
  description?: string | undefined;
  icon?: React.ReactNode;
}

export interface ActiveFilter {
  itemValue?: string | number;
  itemKey?: string | number | symbol;
}

export interface FilterOption<T> {
  name: string;
  value: keyof T;
}

export interface SelectListProps<T extends SelectItem> {
  items: T[];
  onSelected: (item: T) => void;
  filter?: FilterOption<T>[];
  isSearchBarVisible?: boolean;
  isSingleItemAutoSelected?: boolean;
  itemContainerClassName?: string;
}

/**
 * SelectList component renders a list of selectable items with optional filters.
 *
 * @param items - Array of items to display in the list.
 * @param onSelected - Function to call when an item is selected.
 * @param filter - Optional array of filter options to filter the items.
 * @param isSingleItemAutoSelected - If the array consists of a single item, auto-select it.
 * @param isSearchBarVisible - Show search bar.
 *
 */
export function SelectList<T extends SelectItem>({
  items,
  onSelected,
  filter = [],
  isSearchBarVisible,
  isSingleItemAutoSelected,
  itemContainerClassName,
}: SelectListProps<T>) {
  const [activeFilter, setActiveFilter] = useState<ActiveFilter | string>({});
  const [searchValue, setSearchValue] = useState<string>("");

  useEffect(() => {
    if (items.length == 1 && isSingleItemAutoSelected == true) {
      return onSelected(items[0]);
    }
  }, [isSingleItemAutoSelected, items, onSelected]);

  const onSearchValueChange = useCallback((query: string) => {
    if (!query) {
      setActiveFilter({});
    } else {
      setActiveFilter(query);
    }
    setSearchValue(query);
  }, []);

  const onFilterChange = useCallback((value: ActiveFilter) => {
    setActiveFilter(value);
    setSearchValue("");
  }, []);

  if (items.length == 0) return <Text>No Items Available</Text>;

  let itemsToRender = items;

  if (typeof activeFilter == "string") {
    itemsToRender = items.filter((item) =>
      Object.values(item).some(
        (i) => (typeof i == "string" && i.toLowerCase().includes(activeFilter.toLowerCase())) || i == activeFilter
      )
    );
  } else if (activeFilter.itemKey) {
    itemsToRender = items.filter(
      (item) => activeFilter.itemKey && item[activeFilter.itemKey as keyof SelectItem] == activeFilter.itemValue
    );
  }

  return (
    <Box className="flex w-full items-start">
      {/* Filter */}
      <SelectListFilter items={items} filter={filter} onFilterChange={onFilterChange} />
      {/* List of items */}
      <Box className="flex-grow place-items-center">
        {isSearchBarVisible && <SearchBar className="w-full" onChange={onSearchValueChange} value={searchValue} />}
        <Box className={itemContainerClassName}>
          {itemsToRender.map((item) => {
            return (
              <Alert
                key={item.name}
                className="cursor-pointer hover:bg-base-hover mt-4 shadow-lg"
                onClick={() => onSelected(item)}
              >
                {item.icon}
                <Box>
                  <Heading as="h3" className="font-bold">
                    {item.name}
                  </Heading>
                  <Text className="text-xs">{item.description}</Text>
                </Box>
              </Alert>
            );
          })}
        </Box>
      </Box>
    </Box>
  );
}

interface SelectListFilterProps<T extends SelectItem> {
  filter: SelectListProps<T>["filter"];
  items: SelectListProps<T>["items"];
  onFilterChange: (value: ActiveFilter) => void;
}

function SelectListFilter<T extends SelectItem>({ items, onFilterChange, filter = [] }: SelectListFilterProps<T>) {
  const filterTabs = [];
  for (const filterEntry of filter) {
    const uniqueFilterSet = new Set(items.map((item) => item[filterEntry.value]));

    const menuItems: { name: string | number; value: ActiveFilter }[] = [];

    uniqueFilterSet.forEach((itemKey) => {
      if (typeof itemKey != "string" && typeof itemKey != "number") return;
      menuItems.push({
        name: itemKey,
        value: { itemKey: filterEntry.value, itemValue: itemKey },
      });
    });

    filterTabs.push({
      name: filterEntry.name,
      content: menuItems,
    });
  }

  const [activeTab, setActiveTab] = useState(filterTabs[0]);

  if (!activeTab) return null;

  return (
    <TabList className="tabs-bordered">
      {filterTabs.map((tab) => {
        const isActive = activeTab.name == tab.name;
        return (
          <Fragment key={tab.name}>
            <TabLink isActive={isActive} onClick={() => setActiveTab(tab)}>
              {tab.name}
            </TabLink>
            <TabContent isActive={isActive}>
              <Menu className="rounded-box w-52">
                <MenuItem onClick={() => onFilterChange({})}>
                  <Anchor>All</Anchor>
                </MenuItem>
                {tab.content.map((menuItem) => (
                  <MenuItem key={menuItem.name} onClick={() => onFilterChange(menuItem.value)}>
                    <Anchor>{menuItem.name}</Anchor>
                  </MenuItem>
                ))}
              </Menu>
            </TabContent>
          </Fragment>
        );
      })}
    </TabList>
  );
}
