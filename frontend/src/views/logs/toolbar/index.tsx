import { api } from "@/api";
import { Box, Button, SelectDropdown, TabLink, TabList, Text, ToolTip } from "@/components";
import { PlusIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { useQuery } from "@tanstack/react-query";
import { useCallback, useMemo, useState } from "react";
import { UseTabsResult } from "../hooks";
import { LogsTabs, QueryDataSources, QueryWithoutFilters } from "../types";
import { Settings } from "./settings";

interface ToolBarProps {
  tabs: UseTabsResult<LogsTabs>;
  queryWithoutFilters: QueryWithoutFilters;
  setQueryWithoutFilters: (value: QueryWithoutFilters) => void;
}

interface SourceSelectDropdownProps {
  queryWithoutFilters: ToolBarProps["queryWithoutFilters"];
  setQueryWithoutFilters: ToolBarProps["setQueryWithoutFilters"];
}

/**
 * Display the name of a tab
 */
function TabName({
  initialName,
  ...props
}: React.DetailedHTMLProps<React.HTMLAttributes<HTMLSpanElement>, HTMLSpanElement> & { initialName?: string }) {
  return <Text {...props}>{initialName ?? "Logs Query Tab"}</Text>;
}

/**
 * Close button for a tab
 */
function TabCloseButton({ onClick }: { onClick: (e: React.MouseEvent<SVGSVGElement, MouseEvent>) => void }) {
  return <XMarkIcon className="ms-2 w-5 h-5 hover:stroke-red-600" onClick={onClick} />;
}

function SourceSelectDropdown({ queryWithoutFilters, setQueryWithoutFilters }: SourceSelectDropdownProps) {
  const query = useQuery({
    queryKey: ["log_data_sources"],
    refetchOnWindowFocus: false,
    queryFn: () => api.get<QueryDataSources>("/api/logs/sources").then((response) => response.data),
    meta: {
      showError: true,
      errorMessage: "Failed to load log sources",
    },
  });

  const dataSourceSelectValues = useMemo(
    () => [
      {
        key: "all",
        title: "All",
      },
      ...(query.data ?? []).map((item) => ({ key: item.id, title: item.name })),
    ],
    [query.data]
  );
  const optionSelectAllDataSources = dataSourceSelectValues[0].key;

  const [selectedDataSource, setSelectedDataSource] = useState<string[]>([optionSelectAllDataSources]);

  // Update the data source select filter
  const updateDataSourceSelectFilter = useCallback(
    (query: string[]) => {
      // An empty sources list means - fetch logs from all sources.
      if (
        query.length == 0 ||
        (!selectedDataSource.includes(optionSelectAllDataSources) && query.includes(optionSelectAllDataSources))
      ) {
        setSelectedDataSource([optionSelectAllDataSources]);
        setQueryWithoutFilters({ ...queryWithoutFilters, sources: [] });
        return;
      }
      if (selectedDataSource.includes(optionSelectAllDataSources) && query.length > 1) {
        const src = query.filter((item) => item != optionSelectAllDataSources);
        setSelectedDataSource(src);
        setQueryWithoutFilters({ ...queryWithoutFilters, sources: src });
        return;
      }
      setSelectedDataSource(query);
      setQueryWithoutFilters({ ...queryWithoutFilters, sources: query });
    },
    [optionSelectAllDataSources, selectedDataSource, queryWithoutFilters, setQueryWithoutFilters]
  );

  return (
    <SelectDropdown
      prefix="Data Source"
      value={selectedDataSource}
      options={dataSourceSelectValues}
      onChange={updateDataSourceSelectFilter}
      dropdownClassName="min-w-56"
      buttonClassName="btn-sm min-w-72 me-10 join-item rounded-none"
      isMultiSelect
      isClosedOnSelect={false}
    />
  );
}

function QueryTabsControl({ tabs }: { tabs: ToolBarProps["tabs"] }) {
  const createNewTab = useCallback(
    (initialName?: string) => {
      tabs.createItem(
        {
          key: new Date().getTime(),
          initialName: initialName,
        },
        true
      );
    },
    [tabs]
  );

  return (
    <>
      <TabList className="tabs-bordered mx-4 ">
        {tabs.items.map((item) => {
          return (
            <TabLink
              key={item.key}
              isActive={item.key === tabs.active}
              className={"hover:bg-base-hover " + (item.key === tabs.active ? "!border-secondary" : "")}
            >
              <Box className="flex items-center">
                <TabName initialName={item.initialName} onClick={() => tabs.setActive(item.key)} />
                <TabCloseButton
                  onClick={() => {
                    tabs.removeItem(item.key);
                  }}
                />
              </Box>
            </TabLink>
          );
        })}
      </TabList>
      <Button className="btn-ghost btn-circle btn-xs" onClick={() => createNewTab()}>
        <ToolTip message="Add Search Tab">
          <PlusIcon className="w-6 h-6 stroke-secondary" />
        </ToolTip>
      </Button>
    </>
  );
}

export function ToolBar({ tabs, queryWithoutFilters, setQueryWithoutFilters }: ToolBarProps) {
  return (
    <Box className="flex mb-4 place-content-between items-center">
      <Box className="flex items-center">
        <SourceSelectDropdown
          queryWithoutFilters={queryWithoutFilters}
          setQueryWithoutFilters={setQueryWithoutFilters}
        />
        <QueryTabsControl tabs={tabs} />
      </Box>
      <Box>
        <Settings />
      </Box>
    </Box>
  );
}
