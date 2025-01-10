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
  ViewEntityButton,
} from "@/components";
import { Table, TableProps } from "@/components/table";
import { useQuery } from "@tanstack/react-query";
import { createColumnHelper } from "@tanstack/react-table";
import { useMemo } from "react";
import { useSearchParams } from "react-router";

export type FirewallRulesGetList =
  paths["/api/assets/firewall_rules"]["get"]["responses"]["200"]["content"]["application/json"];

/**
 * Component to render table actions for a given cell.
 *
 * @param cell - The cell for which to render actions.
 */
function TableActions() {
  return (
    <Box className="flex gap-2">
      <ViewEntityButton />
    </Box>
  );
}

/**
 * Page component to list all Firewall Rules.
 */
export default function AssetFirewallRules() {
  const query = useQuery({
    queryKey: ["assets_firewall_rules"],
    refetchOnWindowFocus: false,
    queryFn: () => api.get<FirewallRulesGetList>("/api/assets/firewall_rules").then((response) => response.data),
  });

  const [globalFilter, setGlobalFilter] = useSearchParams();
  const globalFilterValue = globalFilter.get("filter") ?? "";

  const columns = useMemo(() => {
    const columnHelper = createColumnHelper<FirewallRulesGetList[0]>();
    return [
      columnHelper.accessor("name", {
        header: "Name",
      }),
      columnHelper.accessor("rule_id", {
        header: "Rule ID",
      }),
      columnHelper.accessor("action", {
        header: "Action",
      }),
      columnHelper.accessor("name", {
        header: "Actions",
        cell: () => <TableActions />,
      }),
    ];
  }, []);

  const tableProps: TableProps<FirewallRulesGetList[0]> = useMemo(
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
        <CardTitle>Firewall Rules</CardTitle>
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
