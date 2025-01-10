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
import { UserDelete, UserProviderTypeSelect } from "./actions";
import { User, UsersGetList } from "./types";

/**
 * Component to render table actions for a given cell.
 *
 * @param cell - The cell for which to render actions.
 */
function TableActions<TData, TValue>({ cell }: { cell: Cell<TData, TValue> }) {
  const entityType: string = cell.row.getValue("provider_type");
  const entityID = String(cell.getValue());

  return (
    <Box className="flex gap-2">
      <Link to={urlJoin(entityType, entityID, "update")}>
        <UpdateEntityButton />
      </Link>
      <UserDelete type={entityType} id={entityID} />
    </Box>
  );
}

export default function ApplicationUsers() {
  const query = useQuery({
    queryKey: ["users"],
    queryFn: () => api.get<UsersGetList>("/api/users").then((response) => response.data),
  });

  const columnHelper = createColumnHelper<User>();

  const columns = useMemo(
    () => [
      columnHelper.accessor("name", {
        header: "Name",
      }),
      columnHelper.accessor("email", {
        header: "Email",
      }),
      columnHelper.accessor("provider.name", {
        header: "Provider",
      }),
      // provider.type is used to select the appropriate user form
      // hidden
      columnHelper.accessor("provider.entity_type", {
        id: "provider_type",
        header: "Provider Type",
      }),
      columnHelper.accessor("role.name", {
        header: "Role",
      }),
      columnHelper.accessor("is_enabled", {
        header: "Enabled",
        cell: (cell) => <Bool value={cell.getValue()} />,
      }),
      columnHelper.accessor("id", {
        header: "Actions",
        cell: ({ cell }) => <TableActions cell={cell} />,
      }),
    ],
    [columnHelper]
  );

  const data = useMemo(() => query.data ?? [], [query.data]);

  const tableProps: TableProps<User> = useMemo(
    () => ({
      data: data,
      columns: columns,
      enablePagination: true,
      initialState: {
        columnVisibility: {
          provider_type: false,
        },
      },
    }),
    [data, columns]
  );

  return (
    <Block>
      <Card>
        <CardHeader divider={true}>
          <CardTitle description="Here you can create or modify the individual users of the system">Users</CardTitle>
          <CardTopActions>
            <UserProviderTypeSelect />
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
