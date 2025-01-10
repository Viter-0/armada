import { twClassJoin } from "@/util/twMerge";
import { Table as ReactTable } from "@tanstack/react-table";
import { Button } from "../actions";
import { Box } from "../layout";
import { Text } from "../typography";

interface PageButtonProps<T> {
  table: ReactTable<T>;
  position: number;
  totalButtons: number;
}
function PageButton<T>({ table, position, totalButtons }: PageButtonProps<T>) {
  const currentPage = table.getState().pagination.pageIndex + 1;
  const maxPages = table.getPageCount();

  const center = Math.ceil(totalButtons / 2);
  let isActivePage = false;
  let buttonPage = -90;
  let nextPage = 0;

  if (currentPage - position < 0) {
    buttonPage = nextPage = position;
  } else if (currentPage - position == 0 && position == 1) {
    buttonPage = nextPage = position;
    isActivePage = true;
  } else if (currentPage == maxPages) {
    buttonPage = nextPage = currentPage + position - totalButtons;
    if (nextPage == maxPages) isActivePage = true;
  } else {
    if (position == center) {
      buttonPage = nextPage = currentPage;
      isActivePage = true;
    } else {
      buttonPage = nextPage = currentPage + position - center;
    }
  }

  return (
    <Button
      className={twClassJoin("btn-sm py-1", isActivePage ? "btn-primary" : "")}
      onClick={() => table.setPageIndex(nextPage - 1)}
    >
      {buttonPage}
    </Button>
  );
}

export function Pagination<T>({ table }: { table: ReactTable<T> }) {
  let buttonCount = 1;
  if (table.getPageCount() <= 2) {
    buttonCount = table.getPageCount();
  } else {
    buttonCount = 3;
  }

  const minRow =
    table.getState().pagination.pageIndex * table.getState().pagination.pageSize + (table.getRowCount() == 0 ? 0 : 1);
  let maxRow = (table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize;
  if (maxRow > table.getRowCount()) maxRow = table.getRowCount();

  return (
    <Box className="flex items-center pt-2">
      <Text className="grow">
        Showing {minRow} to {maxRow} of {table.getRowCount()} entries
      </Text>
      <Box className="flex gap-2">
        <Button className="btn-sm py-1" onClick={() => table.setPageIndex(0)} disabled={!table.getCanPreviousPage()}>
          {"First"}
        </Button>
        {Array(buttonCount)
          .fill(0)
          .map((_, i) => (
            <PageButton key={i + 1} position={i + 1} totalButtons={buttonCount} table={table} />
          ))}

        <Button
          className="btn-sm py-1"
          onClick={() => table.setPageIndex(table.getPageCount() - 1)}
          disabled={!table.getCanNextPage()}
        >
          {"Last"}
        </Button>
      </Box>
    </Box>
  );
}
