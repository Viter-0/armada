import { Box, Button, Progress } from "@/components";
import { SearchQueryBuilder } from "@/components/queryBar";
import { Action, SearchBuilderBlurFn, SearchFilter, SearchFilterFocusFn } from "@/components/queryBar/types";
import { useCallback } from "react";
import { useShallow } from "zustand/react/shallow";
import { useLogsStore } from "../store";
import { QueryState, QueryWithoutFilters } from "../types";
import { properties } from "./entities";
import { LogCountSelect, TimeSelect } from "./select";

export interface LogsSearchBarProps {
  queryWithoutFilters: QueryWithoutFilters;
  searchFilters: SearchFilter[];
  setQueryWithoutFilters: React.Dispatch<React.SetStateAction<QueryWithoutFilters>>;
  dispatchSearchFilters: React.Dispatch<Action>;
  onSearchFilterFocus: SearchFilterFocusFn;
  onSearchBuilderBlur: SearchBuilderBlurFn;
}

export function LogsSearchBar({
  queryWithoutFilters,
  searchFilters,
  setQueryWithoutFilters,
  dispatchSearchFilters,
  onSearchFilterFocus,
  onSearchBuilderBlur,
}: LogsSearchBarProps) {
  const store = useLogsStore(
    useShallow((state) => ({
      assetCache: state.assetCache,
    }))
  );

  const onLogCountChange = useCallback(
    (value: QueryWithoutFilters["log_count"]) => {
      setQueryWithoutFilters((prevState) => ({
        ...prevState,
        log_count: value,
      }));
    },
    [setQueryWithoutFilters]
  );

  const onTimeIntervalChange = useCallback(
    (value: QueryWithoutFilters["time_interval"]) => {
      setQueryWithoutFilters((prevState) => ({
        ...prevState,
        time_interval: value,
      }));
    },
    [setQueryWithoutFilters]
  );
  return (
    <Box className="flex items-center grow">
      <Box className="join shrink-0">
        <LogCountSelect
          logCount={queryWithoutFilters.log_count}
          onValueChange={onLogCountChange}
          dropdownClassName="min-w-56"
          buttonClassName="join-item"
        />
        <TimeSelect
          timeInterval={queryWithoutFilters.time_interval}
          onValueChange={onTimeIntervalChange}
          buttonClassName="join-item"
        />
        {/* WIP: Will be enabled with UTM support */}
        {/* <LogTypeSelect dropdownClassName="min-w-36" buttonClassName="join-item" /> */}
      </Box>

      <SearchQueryBuilder
        assetCache={store.assetCache}
        properties={properties}
        searchFilters={searchFilters}
        dispatchSearchFilters={dispatchSearchFilters}
        onSearchFilterFocus={onSearchFilterFocus}
        onSearchBuilderBlur={onSearchBuilderBlur}
        className="ms-4 grow"
      />
    </Box>
  );
}

export interface ExecutionControlProps {
  queryState?: QueryState;
  onQueryRun: () => void;
  onQueryCancel: () => void;
}
export function ExecutionControl({ queryState, onQueryRun, onQueryCancel }: ExecutionControlProps) {
  return (
    <>
      <Button
        className="btn-primary ms-2 w-28 shrink-0"
        onClick={() => {
          if (queryState === "running") {
            onQueryCancel();
          } else {
            onQueryRun();
          }
        }}
      >
        {queryState == "running" ? (
          <Box className="flex flex-col">
            Cancel<Progress className="w-12 progress-warning h-1 mt-1"></Progress>
          </Box>
        ) : (
          "Run Query"
        )}
      </Button>
    </>
  );
}
