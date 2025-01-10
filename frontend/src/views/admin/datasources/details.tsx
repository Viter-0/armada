import { api } from "@/api";
import {
  Block,
  BlockTitle,
  Box,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  CardTopActions,
  CardTopActionsButton,
  ContentLoadingOverlay,
  NotFoundError,
  TableBody,
  TableNative,
  TableTd,
  TableTr,
  TabLink,
  TabList,
} from "@/components";
import { Table, TableProps } from "@/components/table";
import { buildQueryParams, formatDateTime, formatDateTimeWithMilliseconds, urlJoin } from "@/util/helpers";
import { useQuery } from "@tanstack/react-query";
import { createColumnHelper } from "@tanstack/react-table";
import { ApexOptions } from "apexcharts";
import { useMemo } from "react";
import ReactApexChart from "react-apexcharts";
import toast from "react-hot-toast";
import { Link, useParams } from "react-router";
import { GenericDataSourceGet, TasksMetricsGetList, TimeIntervalWithName } from "./types";

interface TaskExecutionGraphProps {
  metrics?: TasksMetricsGetList;
  timeInterval: TimeIntervalWithName;
  className?: string;
}
function TaskExecutionGraph({ metrics, timeInterval, className = "" }: TaskExecutionGraphProps) {
  const series = useMemo(() => {
    if (!metrics) return [];

    const tasksGroupedByName: Record<string, TasksMetricsGetList> = {};

    for (const obj of metrics) {
      if (!tasksGroupedByName[obj.name]) {
        tasksGroupedByName[obj.name] = [];
      }
      tasksGroupedByName[obj.name].push(obj);
    }

    return Object.entries(tasksGroupedByName).map(([key, val]) => ({
      name: key.split("__")[0],
      data: val.map((item) => ({ x: formatDateTime(new Date(item.time)), y: item.execution_time })),
    }));
  }, [metrics]);

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
          text: "Duration (seconds)",
        },
      },
      xaxis: {
        type: "datetime",
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
        <CardTitle>Tasks execution duration</CardTitle>
        <CardTopActions>
          <TabList className="tabs-boxed tabs-sm">
            <TabLink className="[--fallback-p:dodgerblue] [--fallback-pc:white]" isActive>
              {timeInterval.name}
            </TabLink>
          </TabList>
        </CardTopActions>
      </CardHeader>
      <ReactApexChart type="line" series={series} options={options} />
    </Card>
  );
}

function Properties({ dataSource, className = "" }: { dataSource: GenericDataSourceGet; className?: string }) {
  const querySync = useQuery({
    queryKey: ["assets_sync", dataSource.id],
    queryFn: () =>
      api
        .get(urlJoin(`/api/data_sources/sync?${buildQueryParams({ source_id: dataSource.id })}`))
        .then(() => toast.success("Asset synchronization triggered successfully!")),
    meta: {
      showError: true,
    },
    enabled: false,
    retry: false,
  });

  return (
    <Card className={className}>
      <CardHeader divider={true}>
        <CardTitle>Properties</CardTitle>
        <CardTopActions>
          {dataSource.is_assets_supported && (
            <CardTopActionsButton className="btn-primary" onClick={() => querySync.refetch()}>
              Sync Assets
            </CardTopActionsButton>
          )}
          <Link to="update">
            <CardTopActionsButton className="btn-primary">Update</CardTopActionsButton>
          </Link>
        </CardTopActions>
      </CardHeader>
      <CardBody>
        <TableNative>
          <TableBody>
            {Object.entries(dataSource ?? {}).map(([key, val]) => {
              if (["id", "credential_profile_id"].includes(key)) return;
              if (typeof val == "object") val = val?.name ?? JSON.stringify(val);
              return (
                <TableTr key={key}>
                  <TableTd className="pe-4">{key}</TableTd>
                  <TableTd>{String(val)}</TableTd>
                </TableTr>
              );
            })}
          </TableBody>
        </TableNative>
      </CardBody>
    </Card>
  );
}

function TaskExecutionHistory({ metrics, className = "" }: { metrics?: TasksMetricsGetList; className?: string }) {
  const columnHelper = createColumnHelper<TasksMetricsGetList[0]>();

  const columns = useMemo(
    () => [
      columnHelper.accessor("time", {
        header: "Time",
      }),
      columnHelper.accessor("task", {
        header: "Task",
      }),
      // Data Source tasks name structure {action}__{unique_id}
      columnHelper.accessor((row) => row.name.split("__", 1)[0], {
        header: "Name",
      }),
      columnHelper.accessor("status", {
        header: "Status",
      }),
      columnHelper.accessor("message", {
        header: "Message",
      }),
    ],
    [columnHelper]
  );

  // Stable Data
  const data = useMemo(() => {
    const data = metrics ?? [];
    return data.map((item) => ({
      ...item,
      time: formatDateTimeWithMilliseconds(new Date(item.time)),
    }));
  }, [metrics]);

  const tableProps: TableProps<TasksMetricsGetList[0]> = {
    data: data,
    columns: columns,
    className: "min-w-full",
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Tasks execution history</CardTitle>
      </CardHeader>
      <CardBody>
        <Table {...tableProps} />
      </CardBody>
    </Card>
  );
}

const timeIntervals: TimeIntervalWithName[] = [{ start_time: 259200, end_time: 0, name: "3 days" }];

/**
 * Page component for Data Source detailed view.
 */
export default function DataSourceDetails() {
  const params = useParams();
  const activeInterval = timeIntervals[0];
  const dataSourceId = params?.dataSourceId ?? "";
  const dataSourceType = params?.type ?? "";

  const querySource = useQuery({
    queryKey: ["datasources", dataSourceType, dataSourceId],
    queryFn: () =>
      api
        .get<GenericDataSourceGet>(urlJoin("/api/data_sources", dataSourceType, dataSourceId))
        .then((response) => response.data),
    meta: {
      showError: true,
      errorMessage: "Failed to load Data Source data",
    },
  });

  const queryMetrics = useQuery({
    queryKey: ["tasks_metrics", activeInterval.start_time, activeInterval.end_time, dataSourceId],
    queryFn: () =>
      api
        .get<TasksMetricsGetList>(
          `/api/metrics/tasks?${buildQueryParams({
            start_time: activeInterval.start_time,
            end_time: activeInterval.end_time,
            origin: dataSourceId,
          })}`
        )
        .then((response) => response.data),
    meta: {
      showError: true,
      errorMessage: "Failed to load tasks metrics",
    },
  });

  const isPending = querySource.isPending || queryMetrics.isPending;

  if (isPending) return <ContentLoadingOverlay />;
  if (!dataSourceType || !dataSourceId || !querySource.data) return <NotFoundError />;

  return (
    <Block className="p-4">
      <BlockTitle>Details</BlockTitle>
      <Box className="flex flex-wrap gap-4">
        <Properties className="w-[36rem]" dataSource={querySource.data} />
        <TaskExecutionGraph
          metrics={queryMetrics.data}
          className="w-[52rem] bg-base-100"
          timeInterval={activeInterval}
        />
        <TaskExecutionHistory className="grow" metrics={queryMetrics.data} />
      </Box>
    </Block>
  );
}
