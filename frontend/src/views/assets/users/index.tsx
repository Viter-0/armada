import { api } from "@/api";
import { paths } from "@/api/schema";
import {
  Box,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  ContentLoadingError,
  ContentLoadingOverlay,
  SearchBar,
} from "@/components";
import { Table, TableProps } from "@/components/table";
import { useQuery } from "@tanstack/react-query";
import { createColumnHelper } from "@tanstack/react-table";
import { useMemo } from "react";
import { useSearchParams } from "react-router";

export type UsersGetList = paths["/api/assets/users"]["get"]["responses"]["200"]["content"]["application/json"];

/**
 * Page component to list all asset users.
 */
export default function AssetUsers() {
  const query = useQuery({
    queryKey: ["assets_users"],
    refetchOnWindowFocus: false,
    queryFn: () => api.get<UsersGetList>("/api/assets/users").then((response) => response.data),
  });

  const [globalFilter, setGlobalFilter] = useSearchParams();
  const globalFilterValue = globalFilter.get("filter") ?? "";

  const columns = useMemo(() => {
    const columnHelper = createColumnHelper<UsersGetList[0]>();
    return [
      columnHelper.accessor("name", {
        header: "Name",
      }),
      columnHelper.accessor("email", {
        header: "Email",
      }),
      columnHelper.accessor("upn", {
        header: "User Principal Name",
      }),
      columnHelper.accessor("samaccountname", {
        header: "SAM Account Name",
      }),
      columnHelper.accessor("job_title", {
        header: "Job title",
      }),
      columnHelper.accessor("department", {
        header: "Department",
      }),
      columnHelper.accessor("manager", {
        header: "Manager",
      }),
      columnHelper.accessor("telephone_number", {
        header: "Number",
      }),
    ];
  }, []);

  const tableProps: TableProps<UsersGetList[0]> = useMemo(
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
        <CardTitle>Users</CardTitle>
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
