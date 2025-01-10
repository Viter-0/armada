import { api } from "@/api";
import { paths } from "@/api/schema";
import {
  Box,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  CardTopActions,
  CardTopActionsButton,
  ContentLoadingError,
  ContentLoadingOverlay,
  DeleteEntityButtonAPI,
  SearchBar,
  UpdateEntityButton,
} from "@/components";
import { Table, TableProps } from "@/components/table";
import { ReverseBool } from "@/components/table/formatters";
import { ipAddress, urlJoin } from "@/util/helpers";
import { useQuery } from "@tanstack/react-query";
import { Cell, createColumnHelper, FilterFn } from "@tanstack/react-table";
import { useMemo } from "react";
import { Link, useSearchParams } from "react-router";

export type HostsGetList = paths["/api/assets/hosts"]["get"]["responses"]["200"]["content"]["application/json"];

const stringAndIpFilterFn: FilterFn<HostsGetList[0]> = (rows, columnId, filterValue) => {
  if (columnId == "id") return false;
  if (columnId == "ip") {
    const filterIP = ipAddress(filterValue);
    const valueIP = ipAddress(rows.getValue(columnId));
    if (filterIP && valueIP) return filterIP?.isInSubnet(valueIP);
  }

  return String(rows.getValue(columnId)).toLowerCase().includes(filterValue.toLowerCase());
};

/**
 * Render table actions for a given cell.
 *
 * @param cell - The cell for which to render actions.
 */
function TableActions({ cell }: { cell: Cell<HostsGetList[0], string> }) {
  const entityID = cell.getValue();

  return (
    <Box className="flex gap-2">
      <Link to={urlJoin(entityID, "update")}>
        <UpdateEntityButton />
      </Link>
      <DeleteEntityButtonAPI apiRoute={urlJoin("/api/assets/hosts", entityID)} successMessage="The host was deleted" />
    </Box>
  );
}

/**
 * Page component to list all hosts.
 */
export default function AssetHosts() {
  const query = useQuery({
    queryKey: ["assets_hosts"],
    refetchOnWindowFocus: false,
    queryFn: () => api.get<HostsGetList>("/api/assets/hosts").then((response) => response.data),
  });

  const [globalFilter, setGlobalFilter] = useSearchParams();
  const globalFilterValue = globalFilter.get("filter") ?? "";

  const columns = useMemo(() => {
    const columnHelper = createColumnHelper<HostsGetList[0]>();
    return [
      columnHelper.accessor("name", {
        header: "Name",
      }),
      columnHelper.accessor("ip", {
        header: "IP",
      }),
      columnHelper.accessor("description", {
        header: "Description",
      }),
      columnHelper.accessor("mac_address", {
        header: "MAC Address",
      }),
      columnHelper.accessor("domain", {
        header: "Domain",
      }),
      columnHelper.accessor("vendor", {
        header: "Vendor",
      }),
      columnHelper.accessor("is_modified_by_user", {
        header: "Locked",
        cell: ({ cell }) => <ReverseBool value={cell.getValue()} />,
      }),
      columnHelper.accessor("id", {
        header: "Actions",
        cell: ({ cell }) => <TableActions cell={cell} />,
      }),
    ];
  }, []);

  const tableProps: TableProps<HostsGetList[0]> = useMemo(
    () => ({
      data: query.data ?? [],
      columns: columns,
      enablePagination: true,
      state: {
        globalFilter: globalFilterValue,
      },
      globalFilterFn: stringAndIpFilterFn,
    }),
    [query.data, columns, globalFilterValue]
  );

  return (
    <Box>
      <CardHeader className="mb-6">
        <CardTitle>Hosts</CardTitle>
        <CardTopActions>
          <Link to="create">
            <CardTopActionsButton className="btn-primary">Add New</CardTopActionsButton>
          </Link>
        </CardTopActions>
      </CardHeader>

      <SearchBar
        className="grow mb-4"
        value={globalFilterValue}
        onChange={(query) => setGlobalFilter({ filter: query })}
      />

      <Card className="grow">
        <CardBody>
          {query.isSuccess && <Table {...tableProps} />}
          {query.isPending && <ContentLoadingOverlay />}
          {query.isError && <ContentLoadingError error={query.error} />}
        </CardBody>
      </Card>
    </Box>
  );
}
