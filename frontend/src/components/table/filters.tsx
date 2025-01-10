// import { EMPTY_VALUE } from "@/config/const";
// import { ipAddress } from "@/util/helpers";
// import { FilterFn } from "@tanstack/react-table";

// export const defaultLogFilterFn: FilterFn<unknown> = (row, columnId, filterValue: TableColumnFilterValue) => {
//   const value = filterValue.value == EMPTY_VALUE ? undefined : filterValue.value;

//   switch (filterValue.expression) {
//     case "eq":
//       return row.getValue(columnId) == value;
//     case "neq":
//       return row.getValue(columnId) != value;
//     case "in":
//       return Array.isArray(filterValue.value) && filterValue.value.includes(row.getValue(columnId));
//     case "nin":
//       return Array.isArray(filterValue.value) && !filterValue.value.includes(row.getValue(columnId));
//     case "like":
//       return String(row.getValue(columnId)).includes(String(filterValue.value));
//     case "nlike":
//       return !String(row.getValue(columnId)).includes(String(filterValue.value));
//     default:
//       console.error(
//         `Unrecognized filter expression '${filterValue.expression}' for column '${columnId}'. Ensure the expression type is supported.`
//       );
//       return true;
//   }
// };

// /**
//  * Table filter function - Supports IPv4 and IPv6 CIDR
//  */
// export const ipLogFilterFn: FilterFn<unknown> = (row, columnId, filterValue: TableColumnFilterValue, addMeta) => {
//   const value = filterValue.value == EMPTY_VALUE ? undefined : filterValue.value;

//   const cell_ip = ipAddress(row.getValue(columnId));
//   let filter_ip;

//   if (typeof value == "string") filter_ip = ipAddress(value);
//   if (Array.isArray(value)) filter_ip = value.map((item) => ipAddress(item)).filter((item) => item != undefined);
//   if (!filter_ip || !cell_ip) return defaultLogFilterFn(row, columnId, filterValue, addMeta);

//   switch (filterValue.expression) {
//     case "eq":
//       return !Array.isArray(filter_ip) && cell_ip.isInSubnet(filter_ip);
//     case "neq":
//       return !Array.isArray(filter_ip) && !cell_ip.isInSubnet(filter_ip);
//     case "in":
//       return Array.isArray(filter_ip) && filter_ip.map((item) => cell_ip.isInSubnet(item)).some((item) => item == true);
//     case "nin":
//       return (
//         Array.isArray(filter_ip) && !filter_ip.map((item) => cell_ip.isInSubnet(item)).some((item) => item == true)
//       );
//     case "like":
//       return defaultLogFilterFn(row, columnId, filterValue, addMeta);
//     case "nlike":
//       return defaultLogFilterFn(row, columnId, filterValue, addMeta);
//     default:
//       console.error(
//         `Unrecognized filter expression '${filterValue.expression}' for column '${columnId}'. Ensure the expression type is supported.`
//       );
//       return true;
//   }
// };
