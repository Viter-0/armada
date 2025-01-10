import { ChevronDownIcon, ChevronUpDownIcon, ChevronUpIcon } from "@heroicons/react/24/outline";
import { Header } from "@tanstack/react-table";

export function Sorter<TData, TValue>({ header }: { header: Header<TData, TValue> }) {
  const iconClassName = "absolute top-1/2 -translate-y-1/2 right-2 h-5 w-5 cursor-pointer hover:stroke-info ";

  if (!header.column.getCanSort()) return;

  const SortIcon =
    {
      asc: ChevronUpIcon,
      desc: ChevronDownIcon,
    }[header.column.getIsSorted() as string] ?? ChevronUpDownIcon;

  return (
    <SortIcon
      {...{
        onClick: header.column.getToggleSortingHandler(),
        className: iconClassName + (header.column.getIsSorted() ? "stroke-info" : ""),
      }}
    />
  );
}
