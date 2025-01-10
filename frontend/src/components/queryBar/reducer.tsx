import { Action, SearchFilter } from "./types";

function compareSearchFilters(filterA: SearchFilter, filterB: SearchFilter): boolean {
  return (
    filterA.field === filterB.field &&
    filterA.expression === filterB.expression &&
    JSON.stringify(filterA.value) === JSON.stringify(filterB.value) &&
    filterA.isLocal === filterB.isLocal
  );
}

/** Reducer function to handle search filter actions */
export function searchParameterReducer(items: SearchFilter[], action: Action) {
  switch (action.type) {
    // Creates an empty filter and sets it as primary. There can be only one primary filter.
    case "create": {
      return [
        ...items.map((item) => {
          if (item.isPrimary) {
            return {
              ...item,
              isPrimary: false,
            };
          } else {
            return item;
          }
        }),
        { key: new Date().getTime(), isPrimary: true },
      ];
    }
    // Appends a filter and prevents duplicate entries.
    case "append": {
      const exists = items.some((item) => compareSearchFilters(item, action.item));
      const primaryFilterIndex = items.findIndex((item) => item.isPrimary);
      if (!exists) {
        return [...items.slice(0, primaryFilterIndex), action.item, ...items.slice(primaryFilterIndex)];
      }
      return items;
    }
    case "update": {
      return items.map((item) => {
        if (item.key === action.item.key) {
          return {
            ...item,
            ...action.item,
          };
        } else {
          return item;
        }
      });
    }
    case "delete": {
      return items.filter((item) => item.key !== action.key);
    }
    default:
      return items;
  }
}
