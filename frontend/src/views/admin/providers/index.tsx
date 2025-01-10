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
import { Cell, createColumnHelper } from "@tanstack/react-table";
import { useMemo } from "react";
import { Link } from "react-router";
import { AuthenticationProviderDelete, AuthenticationProviderTypeSelect } from "./actions";
import { ProvidersGetList } from "./types";

/**
 * Component to render table actions for a given cell.
 *
 * @param cell - The cell for which to render actions.
 */
function TableActions<TValue>({ cell }: { cell: Cell<ProvidersGetList[0], TValue> }) {
  const entityType = cell.row.getValue<string>("entity_type");
  const entityID = cell.row.getValue<string>("id");

  return (
    <Box className="flex gap-2">
      <Link to={urlJoin(entityType, entityID, "update")}>
        <UpdateEntityButton />
      </Link>
      <AuthenticationProviderDelete type={entityType} id={entityID} />
    </Box>
  );
}

/**
 * Page component to list all authentication providers.
 */
export default function AuthenticationProviders() {
  const query = useQuery({
    queryKey: ["providers"],
    queryFn: () => api.get<ProvidersGetList>("/api/providers").then((response) => response.data),
  });

  const columns = useMemo(() => {
    const columnHelper = createColumnHelper<ProvidersGetList[0]>();
    return [
      columnHelper.accessor("name", {
        header: "Name",
      }),
      columnHelper.accessor("description", {
        header: "Description",
      }),
      columnHelper.accessor("entity_type", {
        header: "Type",
      }),
      columnHelper.accessor("is_enabled", {
        header: "Enabled",
        cell: (cell) => <Bool value={cell.getValue()} />,
      }),
      columnHelper.accessor("is_deletable", {
        header: "Deletable",
        cell: (cell) => <Bool value={cell.getValue()} />,
      }),
      columnHelper.accessor("id", {
        header: "Actions",
        cell: ({ cell }) => <TableActions cell={cell} />,
      }),
    ];
  }, []);

  const data = useMemo(() => query.data ?? [], [query.data]);

  const tableProps: TableProps<ProvidersGetList[0]> = {
    data: data,
    columns: columns,
    enablePagination: true,
  };

  return (
    <Block>
      <Card>
        <CardHeader divider={true}>
          <CardTitle description="Here you can create or modify authentication sources">
            Authentication Providers
          </CardTitle>
          <CardTopActions>
            <AuthenticationProviderTypeSelect />
          </CardTopActions>
        </CardHeader>
        <CardBody>
          {query.isSuccess && <Table {...tableProps} />}
          {query.isPending && <ContentLoadingOverlay />}
          {query.isError && <ContentLoadingError error={query.error} />}
        </CardBody>
      </Card>
    </Block>
  );
}
