import { api } from "@/api";
import { components, paths } from "@/api/schema";
import {
  Block,
  BlockTitle,
  Box,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  CardTopActions,
  CardTopActionsTabs,
  ContentLoadingError,
  ContentLoadingOverlay,
  SearchBar,
  Stat,
  StatDesc,
  StatFigure,
  StatTitle,
  StatValue,
} from "@/components";
import { Table, TableProps } from "@/components/table";
import { buildQueryParams, formatDateTime, formatDateTimeWithMilliseconds, urlJoin } from "@/util/helpers";
import { BoltIcon, QueueListIcon, SparklesIcon } from "@heroicons/react/24/outline";
import { useQuery } from "@tanstack/react-query";
import { createColumnHelper } from "@tanstack/react-table";
import { ApexOptions } from "apexcharts";
import React, { useMemo, useState } from "react";
import ReactApexChart from "react-apexcharts";
import { NavLink } from "react-router";

type DataSourcesGetList = paths["/api/data_sources"]["get"]["responses"]["200"]["content"]["application/json"];
type TasksMetricsGetList = paths["/api/metrics/tasks"]["get"]["responses"]["200"]["content"]["application/json"];
type ActivityMetricsGetList = paths["/api/metrics/activity"]["get"]["responses"]["200"]["content"]["application/json"];
type TasksQueueGet = paths["/api/metrics/tasks_queue"]["get"]["responses"]["200"]["content"]["application/json"];
type TimeInterval = components["schemas"]["TimeInterval"];
type TimeIntervalWithName = TimeInterval & { key: React.Key; name: string };

function StatCounts() {
  const querySources = useQuery({
    queryKey: ["datasources"],
    queryFn: () => api.get<DataSourcesGetList>("/api/data_sources").then((response) => response.data),
    meta: {
      showError: true,
      errorMessage: "Failed to load Data Sources",
    },
  });

  const queryTaskQueue = useQuery({
    queryKey: ["tasks_queue"],
    queryFn: () => api.get<TasksQueueGet>("/api/metrics/tasks_queue").then((response) => response.data),
    refetchInterval: 30000,
    meta: {
      showError: true,
      errorMessage: "Failed to load tasks queue state",
    },
  });

  const isPending = querySources.isPending || queryTaskQueue.isPending;
  const queueColor = (queryTaskQueue.data?.size ?? 0) < 20 ? "text-blue-400" : "text-red-600";
  if (isPending) return <ContentLoadingOverlay />;

  return (
    <Box className="flex flex-wrap gap-4">
      <Stat className="bg-base-100 w-96">
        <StatFigure className="text-secondary">
          <BoltIcon className="w-10" />
        </StatFigure>
        <StatTitle>Data Sources</StatTitle>
        <StatValue className="text-secondary">{querySources.data?.length ?? "N/A"}</StatValue>
        <StatDesc>Total number of Data Sources</StatDesc>
      </Stat>
      <Stat className="bg-base-100 w-96">
        <StatFigure className="text-success">
          <SparklesIcon className="w-10" />
        </StatFigure>
        <StatTitle>Active Data Sources</StatTitle>
        <StatValue className="text-success">
          {querySources.data?.filter((item) => item.is_enabled == true).length ?? "N/A"}
        </StatValue>
        <StatDesc>Data Sources that are functional</StatDesc>
      </Stat>
      <Stat className="bg-base-100 w-96">
        <StatFigure className={queueColor}>
          <QueueListIcon className="w-10" />
        </StatFigure>
        <StatTitle>Tasks Queue</StatTitle>
        <StatValue className={queueColor}>{queryTaskQueue.data?.size ?? "N/A"}</StatValue>
        <StatDesc>Total number of tasks in queue</StatDesc>
      </Stat>
    </Box>
  );
}

/**
 *  API Behavior
 *  If `end_time` is set to 0, it is updated to the current Unix timestamp.
 *  The `start_time` is then updated to be relative to the new `end_time`, calculated as
 *  end_time - original_start_time`.
 */
const taskExecutionTimeIntervals: TimeIntervalWithName[] = [
  { start_time: 86400, end_time: 0, name: "1 day", key: "1 day" },
  { start_time: 259200, end_time: 0, name: "3 days", key: "3 days" },
];

/**
 * Component to render a table link.
 *
 * @param cell - The cell for which to render the link.
 */
function ShowSourceLink({ source }: { source?: TasksMetricsGetList[0]["source"] }) {
  if (!source) return null;

  return (
    <NavLink className="link link-primary" to={urlJoin("datasources/devices", source.entity_type ?? "", source.id)}>
      {source.name}
    </NavLink>
  );
}

function TaskExecutionFailures({ className = "" }: { className?: string }) {
  const [activeInterval, setActiveInterval] = useState<TimeIntervalWithName>(taskExecutionTimeIntervals[0]);
  const [globalFilter, setGlobalFilter] = useState("");

  const queryMetrics = useQuery({
    queryKey: ["tasks_metrics", activeInterval.start_time, activeInterval.end_time],
    queryFn: () =>
      api
        .get<TasksMetricsGetList>(
          `/api/metrics/tasks?${buildQueryParams({
            start_time: activeInterval.start_time,
            end_time: activeInterval.end_time,
            status: "error",
          })}`
        )
        .then((response) => response.data),
    meta: {
      showError: true,
      errorMessage: "Failed to load tasks execution metrics",
    },
  });

  const columns = useMemo(() => {
    const columnHelper = createColumnHelper<TasksMetricsGetList[0]>();
    return [
      columnHelper.accessor("time", {
        header: "Time",
      }),
      // Data Source tasks name structure {action}__{unique_id}
      columnHelper.accessor((row) => row.name.split("__", 1)[0], {
        header: "Name",
      }),
      columnHelper.accessor("source", {
        header: "Source",
        cell: (cell) => <ShowSourceLink source={cell.getValue()} />,
      }),
      columnHelper.accessor("task", {
        header: "Task",
      }),
      columnHelper.accessor("message", {
        header: "Message",
        cell: (cell) =>
          (cell.getValue() ?? "").length > 200 ? cell.getValue()?.slice(0, 200) + "..." : cell.getValue(),
      }),
    ];
  }, []);

  // Stable Data
  const data = useMemo(() => {
    const data = queryMetrics.data ?? [];
    return data.map((item) => ({
      ...item,
      time: formatDateTimeWithMilliseconds(new Date(item.time)),
    }));
  }, [queryMetrics.data]);

  const tableProps: TableProps<TasksMetricsGetList[0]> = useMemo(
    () => ({
      data: data,
      columns: columns,
      enablePagination: true,
      globalFilterFn: "includesString",
      state: {
        globalFilter: globalFilter,
      },
    }),
    [globalFilter, columns, data]
  );

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Task execution failures</CardTitle>
        <CardTopActions>
          <CardTopActionsTabs
            items={taskExecutionTimeIntervals}
            activeItem={activeInterval}
            onChange={setActiveInterval}
          />
        </CardTopActions>
      </CardHeader>
      <CardBody>
        {queryMetrics.isPending && <ContentLoadingOverlay />}
        {queryMetrics.isSuccess && (
          <Box className="mt-6">
            <SearchBar value={globalFilter} onChange={setGlobalFilter} />
            <Table {...tableProps} />
          </Box>
        )}
        {queryMetrics.isError && <ContentLoadingError error={queryMetrics.error} />}
      </CardBody>
    </Card>
  );
}

const activityTimeIntervals: (TimeIntervalWithName & { groupInterval: number })[] = [
  { start_time: 86400, end_time: 0, name: "1 day", groupInterval: 3600, key: "1 day" },
  { start_time: 604800, end_time: 0, name: "1 week", groupInterval: 86400, key: "1 week" },
];

interface GroupedActivityMetrics {
  intervalStart: Date;
  intervalEnd: Date;
  count: number;
}

function groupActivityMetricsByTime(
  data: ActivityMetricsGetList,
  startTime: number,
  endTime: number,
  groupInterval: number
) {
  const groups: GroupedActivityMetrics[] = [];

  // Create empty groups based on groupInterval
  for (let time = startTime; time < endTime; time += groupInterval * 1000) {
    groups.push({
      intervalStart: new Date(time),
      intervalEnd: new Date(time + groupInterval * 1000 - 1),
      count: 0,
    });
  }

  // Distribute data into groups

  data.forEach((item) => {
    const itemTime = new Date(item.time).getTime();

    // Find the appropriate group for this item based on its timestamp
    const group = groups.find((g) => itemTime >= g.intervalStart.getTime() && itemTime <= g.intervalEnd.getTime());

    if (group) {
      group.count += 1;
    }
  });

  return groups.map((item) => {
    const intervalStart = item.intervalStart;
    let x = "";

    // If groupInterval is greater than or equal to 24 hours
    if (groupInterval >= 86400) {
      x = formatDateTime(intervalStart, "MM-dd");
    }
    // If groupInterval is greater than or equal to 1 hour
    else if (groupInterval >= 3600) {
      x = formatDateTime(intervalStart, "MM-dd HH") + "h";
    }

    return { x: x, y: item.count };
  });
}

function UserActivityGraph({ className = "" }: { className?: string }) {
  const [activeInterval, setActiveInterval] = useState(activityTimeIntervals[0]);

  const queryMetrics = useQuery({
    queryKey: ["activity_metrics", activeInterval.start_time, activeInterval.end_time],
    queryFn: () =>
      api
        .get<ActivityMetricsGetList>(
          `/api/metrics/activity?${buildQueryParams({
            start_time: activeInterval.start_time,
            end_time: activeInterval.end_time,
          })}`
        )
        .then((response) => response.data),
    meta: {
      showError: true,
      errorMessage: "Failed to load activity metrics",
    },
  });

  const groupedSeries = useMemo(
    () =>
      groupActivityMetricsByTime(
        queryMetrics.data ?? [],
        new Date().getTime() - activeInterval.start_time * 1000,
        new Date().getTime(),
        activeInterval.groupInterval
      ),
    [activeInterval, queryMetrics.data]
  );

  const options: ApexOptions = useMemo(
    () => ({
      chart: {
        stacked: false,
        toolbar: {
          show: false,
        },
      },
      dataLabels: {
        enabled: false,
      },
      yaxis: {
        title: {
          text: "Event count",
        },
      },
      xaxis: {
        type: "category",
        tooltip: { enabled: false },
        labels: {
          datetimeUTC: false,
        },
      },
    }),
    []
  );

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>User activity</CardTitle>
        <CardTopActions>
          <CardTopActionsTabs items={activityTimeIntervals} activeItem={activeInterval} onChange={setActiveInterval} />
        </CardTopActions>
      </CardHeader>
      <ReactApexChart type="bar" series={[{ name: "Events", data: groupedSeries }]} options={options} height={450} />
    </Card>
  );
}

/**
 * Admin overview page component.
 */
export default function AdminDashboard() {
  return (
    <Block>
      <BlockTitle>Overview</BlockTitle>
      <StatCounts />
      <Box className="flex flex-wrap gap-4 mt-4">
        <UserActivityGraph className="w-full 2xl:w-1/2 h-[32rem]" />
        <TaskExecutionFailures className="grow" />
      </Box>
    </Block>
  );
}
