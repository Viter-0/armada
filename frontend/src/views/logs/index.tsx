import { api } from "@/api";
import {
  Block,
  BlockBody,
  Box,
  ContentLoadingError,
  ContentLoadingOverlay,
  Heading,
  TabContent,
  TabList,
  Text,
} from "@/components";
import { searchParameterReducer } from "@/components/queryBar/reducer";
import { SearchBuilderBlurFn, SearchFilter, SearchFilterFocusFn, ValidSearchFilter } from "@/components/queryBar/types";
import { useMutation } from "@tanstack/react-query";
import { VisibilityState } from "@tanstack/react-table";
import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import { useShallow } from "zustand/react/shallow";
import { useTabs, UseTabsResult } from "./hooks";
import { LogsTable } from "./logsTable";
import { ExecutionControl, LogsSearchBar } from "./searchBar";
import { logCountValues, properties, timeSelectValues } from "./searchBar/entities";
import { QueryErrorList, SearchStatistics } from "./stats";
import { useLogsStore } from "./store";
import { ToolBar } from "./toolbar";
import { LogsTabs, Query, QueryFilter, QueryResult, QueryState, QueryWithoutFilters, TableFilterState } from "./types";

function isValidRemoteSearchFilter(searchFilter: SearchFilter): searchFilter is ValidSearchFilter {
  if (searchFilter.isLocal) return false;
  if (searchFilter.isPrimary) return false;
  if (!searchFilter.expression || !searchFilter.field || !searchFilter.value) return false;
  return true;
}

function isValidLocalSearchFilter(searchFilter: SearchFilter): searchFilter is ValidSearchFilter {
  if (!searchFilter.isLocal) return false;
  if (searchFilter.isPrimary) return false;
  if (!searchFilter.expression || !searchFilter.field || !searchFilter.value) return false;
  return true;
}

function getSearchFilterType(searchFilter: ValidSearchFilter) {
  return properties.find((item) => searchFilter.field == item.value)?.type as QueryFilter["entity_type"];
}
function getSearchFilterValue(searchFilter: ValidSearchFilter) {
  if (Array.isArray(searchFilter.value)) return searchFilter.value.filter((item) => item != "");
  return searchFilter.value;
}

// Function to convert search filters to query filters
function convertSearchFilterToQueryFilter({ searchFilters }: { searchFilters: SearchFilter[] }): Query["filter"] {
  const filter: Query["filter"] = [];
  for (const item of searchFilters) {
    if (!isValidRemoteSearchFilter(item)) continue;

    filter.push({
      expression: item.expression,
      field: item.field,
      value: getSearchFilterValue(item),
      entity_type: getSearchFilterType(item) ?? "log",
    });
  }

  return filter;
}

function getLocalSearchFilters(searchFilters: SearchFilter[]): ValidSearchFilter[] {
  return searchFilters.filter((item) => isValidLocalSearchFilter(item));
}

/**
 * Converts a list of search filters into table column filters for TanStack Table.
 *
 * This function solves part of the issue where multiple filters on the same column ID
 * would result in only the last filter being applied. To address this, it groups
 * filters by column ID and combines them into a single filter object. A custom
 * table filter function is required to support filtering by multiple values.
 */
function convertLocalSearchFiltersToTableColumnFilters(searchFilters: SearchFilter[]) {
  const localFilters = getLocalSearchFilters(searchFilters);

  const groupedFilters: Record<string, ValidSearchFilter[]> = {};
  for (const entity of localFilters) {
    groupedFilters[entity.field] = groupedFilters[entity.field] || [];
    groupedFilters[entity.field].push(entity);
  }

  // Transform the grouped filters into the expected format for TanStack Table
  return Object.entries(groupedFilters).map(([field, item]) => ({
    id: field,
    value: item.map((entity) => ({ value: entity.value, expression: entity.expression })),
  }));
}

function QueryErrorMessage({ errors }: { errors: QueryResult["errors"] }) {
  return (
    <Block className="p-0">
      <BlockBody className="min-h-48">
        <Text className="ps-4 pt-4">
          An error occurred while executing the query. Please check your input and try again.
        </Text>
        <QueryErrorList errors={errors} />
      </BlockBody>
    </Block>
  );
}

function RequestErrorMessage({ error }: { error: Error }) {
  return (
    <Block className="p-0">
      <BlockBody className="flex h-48 justify-center items-center p-4">
        <ContentLoadingError error={error} />
      </BlockBody>
    </Block>
  );
}

function EmptyInstanceMessage() {
  return (
    <Block className="p-0">
      <BlockBody className="flex h-48 items-center justify-center">
        <Heading as="h1" className="text-2xl">
          No data
        </Heading>
      </BlockBody>
    </Block>
  );
}

function CancelledErrorMessage() {
  return (
    <Block className="p-0">
      <BlockBody className="flex h-48 items-center justify-center">
        <Heading as="h1" className="text-lg">
          Query cancelled on user&apos;s request
        </Heading>
      </BlockBody>
    </Block>
  );
}

function LoadingIndicator() {
  return (
    <Block className="p-0">
      <BlockBody className="flex h-48 items-center justify-center">
        <ContentLoadingOverlay />
      </BlockBody>
    </Block>
  );
}

interface ExecutionControllerProps {
  children: React.ReactNode;
  queryState: QueryState;
  /** API request error */
  requestError?: Error | null;
  queryError?: QueryResult["errors"];
  isQuerySuccessful?: QueryResult["is_success"];
}
function QueryStateController({
  children,
  queryState,
  requestError,
  isQuerySuccessful,
  queryError,
}: ExecutionControllerProps) {
  if (queryState === "initial") return <EmptyInstanceMessage />;
  if (queryState === "running") return <LoadingIndicator />;
  if (queryState === "canceled") return <CancelledErrorMessage />;
  if (requestError) return <RequestErrorMessage error={requestError} />;
  if (isQuerySuccessful === false && queryError) return <QueryErrorMessage errors={queryError} />;

  return <>{children}</>;
}

/** Main component for logs instance (single tab) */
function LogsInstance({ tabs }: { tabs: UseTabsResult<LogsTabs> }) {
  const [queryWithoutFilters, setQueryWithoutFilters] = useState<QueryWithoutFilters>({
    time_interval: {
      start_time: timeSelectValues[0].key,
      end_time: 0,
    },
    log_count: logCountValues[0].key,
    /** An empty sources list means - fetch logs from all sources. */
    sources: [],
  });

  const [searchFilters, dispatchSearchFilter] = useReducer(searchParameterReducer, [
    { key: new Date().getTime(), isPrimary: true },
  ]);

  const [tableFilter, setTableFilter] = useState<TableFilterState>({ columnFilter: [] });

  /**
   * Maintains the column visibility state at a higher level.
   * This is necessary because the table is destroyed during queries,
   * and the state needs to persist across re-renders to preserve visible column.
   */
  const [columnVisibilityState, setColumnVisibilityState] = useState<VisibilityState>({});

  const [queryState, setQueryState] = useState<QueryState>("initial");
  const queryFilter = convertSearchFilterToQueryFilter({ searchFilters });

  /** The idea behind local filtering is to apply filters automatically without requiring the user to commit changes manually.
   * To improve performance, local filters are temporarily disabled while the user is actively typing (i.e., the search builder is active).
   * The only exception to this rule occurs when the user selects a different search filter; in that case, the filter updates immediately.
   */
  useEffect(() => {
    if (tableFilter.activeSearchFilter) return;
    setTableFilter((prevState) => ({
      ...prevState,
      columnFilter: convertLocalSearchFiltersToTableColumnFilters(searchFilters),
    }));
  }, [tableFilter.activeSearchFilter, searchFilters]);

  const abortControllerRef = useRef(new AbortController());

  const { mutate, data, error } = useMutation({
    mutationFn: (data: Query) =>
      api
        .post<QueryResult>("/api/logs/search", data, {
          signal: abortControllerRef.current.signal,
        })
        .then((response) => response.data),
    onSuccess: () => setQueryState("complete"),
    onError: () => {
      if (queryState != "canceled") setQueryState("error");
    },
    // Do not refetch background queries
    meta: {
      invalidateQueries: false,
    },
  });

  const onSearchFilterFocus: SearchFilterFocusFn = useCallback(
    (filter) => {
      if (filter.key != tableFilter.activeSearchFilter?.key) {
        setTableFilter((prevState) => ({
          ...prevState,
          activeSearchFilter: filter,
          columnFilter: convertLocalSearchFiltersToTableColumnFilters(searchFilters),
        }));
        return;
      }

      setTableFilter((prevState) => ({
        ...prevState,
        activeSearchFilter: filter,
      }));
    },
    [tableFilter.activeSearchFilter, searchFilters]
  );

  const onSearchBuilderBlur: SearchBuilderBlurFn = useCallback(() => {
    setTableFilter((prevState) => ({
      ...prevState,
      activeSearchFilter: undefined,
    }));
  }, []);

  const onQueryRun = useCallback(() => {
    mutate({ ...queryWithoutFilters, filter: queryFilter });
    setQueryState("running");
  }, [queryFilter, queryWithoutFilters, mutate]);
  const onQueryCancel = useCallback(() => {
    abortControllerRef.current.abort();
    abortControllerRef.current = new AbortController();
    setQueryState("canceled");
  }, []);

  return (
    <>
      <ToolBar tabs={tabs} queryWithoutFilters={queryWithoutFilters} setQueryWithoutFilters={setQueryWithoutFilters} />
      <Box className="flex items-center mb-4 mt-2">
        <LogsSearchBar
          searchFilters={searchFilters}
          queryWithoutFilters={queryWithoutFilters}
          setQueryWithoutFilters={setQueryWithoutFilters}
          dispatchSearchFilters={dispatchSearchFilter}
          onSearchBuilderBlur={onSearchBuilderBlur}
          onSearchFilterFocus={onSearchFilterFocus}
        />
        <SearchStatistics errors={data?.errors} meta={data?.meta} isSuccess={data?.is_success} />
        <ExecutionControl onQueryRun={onQueryRun} queryState={queryState} onQueryCancel={onQueryCancel} />
      </Box>

      <QueryStateController
        queryState={queryState}
        requestError={error}
        queryError={data?.errors}
        isQuerySuccessful={data?.is_success}
      >
        {data && (
          <LogsTable
            data={data.results}
            dispatchSearchFilters={dispatchSearchFilter}
            columnFilters={tableFilter.columnFilter}
            columnVisibilityState={columnVisibilityState}
            setColumnVisibilityState={setColumnVisibilityState}
          />
        )}
      </QueryStateController>
    </>
  );
}

/**
 * Page component for displaying logs.
 */
export function Logs() {
  const tabs = useTabs<LogsTabs>();

  const store = useLogsStore(
    useShallow((state) => ({
      fetchAssets: state.fetchAssets,
    }))
  );

  useEffect(() => {
    store.fetchAssets();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (tabs.items.length == 0) tabs.createItem({ key: new Date().getTime() }, true);
  }, [tabs]);

  return (
    // class 'relative' is required to bind LogsEntrySideView to the logs viewport
    <Block className="relative grow">
      <TabList>
        {tabs.items.map((item) => {
          return (
            <TabContent key={item.key} isActive={item.key == tabs.active}>
              <LogsInstance tabs={tabs} />
            </TabContent>
          );
        })}
      </TabList>
    </Block>
  );
}
