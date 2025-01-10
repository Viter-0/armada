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

export type NetworksGetList = paths["/api/assets/networks"]["get"]["responses"]["200"]["content"]["application/json"];

const stringAndIpFilterFn: FilterFn<NetworksGetList[0]> = (rows, columnId, filterValue) => {
  if (columnId == "id") return false;
  if (columnId == "cidr") {
    const filterIP = ipAddress(filterValue);
    const valueIP = ipAddress(rows.getValue(columnId));
    if (filterIP && valueIP) return filterIP?.isInSubnet(valueIP);
  }

  return String(rows.getValue(columnId)).toLowerCase().includes(filterValue.toLowerCase());
};

/**
 * Component to render table actions for a given cell.
 *
 * @param cell - The cell for which to render actions.
 */
function TableActions({ cell }: { cell: Cell<NetworksGetList[0], string> }) {
  const entityID = cell.getValue();

  return (
    <Box className="flex gap-2">
      <Link to={urlJoin(entityID, "update")}>
        <UpdateEntityButton />
      </Link>
      <DeleteEntityButtonAPI
        apiRoute={urlJoin("/api/assets/networks", entityID)}
        successMessage="The network was deleted"
      />
    </Box>
  );
}

/**
 * Page component to list all Networks.
 */
export default function AssetNetworks() {
  const query = useQuery({
    queryKey: ["assets_networks"],
    refetchOnWindowFocus: false,
    queryFn: () => api.get<NetworksGetList>("/api/assets/networks").then((response) => response.data),
  });

  const [globalFilter, setGlobalFilter] = useSearchParams();
  const globalFilterValue = globalFilter.get("filter") ?? "";

  const columns = useMemo(() => {
    const columnHelper = createColumnHelper<NetworksGetList[0]>();
    return [
      columnHelper.accessor("name", {
        header: "Name",
      }),
      columnHelper.accessor("cidr", {
        header: "CIDR",
      }),
      columnHelper.accessor("description", {
        header: "Description",
      }),
      columnHelper.accessor("location", {
        header: "Location",
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

  const tableProps: TableProps<NetworksGetList[0]> = useMemo(
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
        <CardTitle>Networks</CardTitle>
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
