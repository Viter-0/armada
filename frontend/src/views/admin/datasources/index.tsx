import { api } from "@/api";
import {
  Block,
  Box,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  CardTopActions,
  ContentLoadingError,
  ContentLoadingOverlay,
  UpdateEntityButton,
} from "@/components";
import { Table, TableProps } from "@/components/table";
import { Bool } from "@/components/table/formatters";
import { urlJoin } from "@/util/helpers";
import { useQuery } from "@tanstack/react-query";
import { Cell, ColumnFiltersState, createColumnHelper } from "@tanstack/react-table";
import { useMemo, useState } from "react";
import { Link, NavLink } from "react-router";
import { DataSourceDeleteTableAction, DataSourceTypeSelect } from "./actions";
import { DataSourceFilter } from "./dataSourceFilter";
import { DataSourcesGetList } from "./types";

/**
 * Component to render a table link.
 *
 * @param cell - The cell for which to render the link.
 */
function ShowData({ cell }: { cell: Cell<DataSourcesGetList[0], string> }) {
  return (
    <NavLink className="link link-primary" to={urlJoin(cell.row.getValue("entity_type"), cell.row.getValue("id"))}>
      {cell.getValue()}
    </NavLink>
  );
}

/**
 * Component to render table actions for a given cell.
 *
 * @param cell - The cell for which to render actions.
 */
function TableActions<TValue>({ cell }: { cell: Cell<DataSourcesGetList[0], TValue> }) {
  const entityID = cell.row.getValue<string>("id");
  const typeID = cell.row.getValue<string>("entity_type");

  return (
    <Box className="flex gap-2">
      <Link to={urlJoin(typeID, entityID, "update")}>
        <UpdateEntityButton />
      </Link>
      <DataSourceDeleteTableAction type={typeID} id={entityID} />
    </Box>
  );
}

/**
 * Page component to list all data sources.
 */
export default function DataSources() {
  const query = useQuery({
    queryKey: ["datasources"],
    queryFn: () => api.get<DataSourcesGetList>("/api/data_sources").then((response) => response.data),
  });

  const [globalFilter, setGlobalFilter] = useState<string>("");
  const [columnFilter, setColumnFilter] = useState<ColumnFiltersState>([]);

  const columns = useMemo(() => {
    const columnHelper = createColumnHelper<DataSourcesGetList[0]>();
    return [
      columnHelper.accessor("name", {
        header: "Name",
        cell: ({ cell }) => <ShowData cell={cell} />,
      }),
      columnHelper.accessor("host", {
        header: "Host",
      }),
      columnHelper.accessor("description", {
        header: "Description",
      }),
      columnHelper.accessor("entity_type", {
        header: "Type",
      }),
      columnHelper.accessor((row) => row.credential_profile?.name, {
        header: "Credential Profile",
      }),
      columnHelper.accessor("is_enabled", {
        header: "Enabled",
        filterFn: "weakEquals",
        cell: (cell) => <Bool value={cell.getValue()} />,
      }),
      columnHelper.accessor("id", {
        header: "Actions",
        enableGlobalFilter: false,
        cell: ({ cell }) => <TableActions cell={cell} />,
      }),
    ];
  }, []);

  const tableProps: TableProps<DataSourcesGetList[0]> = useMemo(
    () => ({
      data: query.data ?? [],
      columns: columns,
      globalFilterFn: "includesString",
      state: {
        globalFilter: globalFilter,
        columnFilters: columnFilter,
      },
      enablePagination: true,
    }),
    [columns, query.data, globalFilter, columnFilter]
  );

  return (
    <Block>
      <CardHeader className="mb-6">
        <CardTitle description="View and manage your connected data sources">Data Sources</CardTitle>
        <CardTopActions>
          <DataSourceTypeSelect />
        </CardTopActions>
      </CardHeader>

      <DataSourceFilter
        onGlobalFilterUpdate={(value) => setGlobalFilter(value)}
        onColumnFilterUpdate={(value) => setColumnFilter(value)}
      />

      <Card className="grow">
        <CardBody>
          {query.isSuccess && <Table {...tableProps} />}
          {query.isPending && <ContentLoadingOverlay />}
          {query.isError && <ContentLoadingError error={query.error} />}
        </CardBody>
      </Card>
    </Block>
  );
}
