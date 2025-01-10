import { api } from "@/api";
import { paths } from "@/api/schema";
import { Block, Card, CardBody, CardHeader, CardTitle, ContentLoadingError, ContentLoadingOverlay } from "@/components";
import { Table, TableProps } from "@/components/table";
import { Bool, Tags } from "@/components/table/formatters";
import { useQuery } from "@tanstack/react-query";
import { createColumnHelper } from "@tanstack/react-table";
import { useMemo } from "react";

type Roles = paths["/api/roles"]["get"]["responses"]["200"]["content"]["application/json"];

/**
 * Page component to list all user roles.
 */
export default function Roles() {
  const query = useQuery({
    queryKey: ["roles"],
    refetchOnWindowFocus: false,
    queryFn: () => api.get<Roles>("/api/roles").then((response) => response.data),
  });

  const columnHelper = createColumnHelper<Roles[0]>();

  const columns = useMemo(
    () => [
      columnHelper.accessor("name", {
        header: "Name",
      }),
      columnHelper.accessor("description", {
        header: "Description",
      }),
      columnHelper.accessor("is_deletable", {
        header: "Deletable",
        cell: (cell) => <Bool value={cell.getValue()} />,
      }),
      columnHelper.accessor("scope_list", {
        header: "Scopes",
        cell: ({ cell }) => <Tags tags={[...cell.getValue()]} />,
      }),
    ],
    [columnHelper]
  );

  const data = useMemo(() => query.data ?? [], [query.data]);

  const tableProps: TableProps<Roles[0]> = {
    data: data,
    columns: columns,
    enablePagination: true,
  };

  return (
    <Block>
      <Card className="grow">
        <CardHeader className="mb-6">
          <CardTitle>User Roles</CardTitle>
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
