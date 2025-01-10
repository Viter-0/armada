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
import { urlJoin } from "@/util/helpers";
import { useQuery } from "@tanstack/react-query";
import { Cell, createColumnHelper } from "@tanstack/react-table";
import { useMemo } from "react";
import { Link, useSearchParams } from "react-router";

export type ServicesGetList = paths["/api/assets/services"]["get"]["responses"]["200"]["content"]["application/json"];

/**
 * Component to render table actions for a given cell.
 *
 * @param cell - The cell for which to render actions.
 */
function TableActions({ cell }: { cell: Cell<ServicesGetList[0], string> }) {
  const entityID = cell.getValue();

  return (
    <Box className="flex gap-2">
      <Link to={urlJoin(entityID, "update")}>
        <UpdateEntityButton />
      </Link>
      <DeleteEntityButtonAPI
        apiRoute={urlJoin("/api/assets/services", entityID)}
        successMessage="The service was deleted"
      />
    </Box>
  );
}

/**
 * Page component to list all Services.
 */
export default function AssetServices() {
  const query = useQuery({
    queryKey: ["assets_services"],
    refetchOnWindowFocus: false,
    queryFn: () => api.get<ServicesGetList>("/api/assets/services").then((response) => response.data),
  });
  const [globalFilter, setGlobalFilter] = useSearchParams();
  const globalFilterValue = globalFilter.get("filter") ?? "";

  const columns = useMemo(() => {
    const columnHelper = createColumnHelper<ServicesGetList[0]>();
    return [
      columnHelper.accessor("name", {
        header: "Name",
      }),
      columnHelper.accessor("port", {
        header: "Port",
      }),
      columnHelper.accessor("protocol", {
        header: "Protocol",
      }),
      columnHelper.accessor("description", {
        header: "Description",
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

  const tableProps: TableProps<ServicesGetList[0]> = useMemo(
    () => ({
      data: query.data ?? [],
      columns: columns,
      enablePagination: true,
      state: {
        globalFilter: globalFilterValue,
      },
      globalFilterFn: "includesString",
    }),
    [query.data, columns, globalFilterValue]
  );

  return (
    <Box>
      <CardHeader className="mb-6">
        <CardTitle>Services</CardTitle>
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
