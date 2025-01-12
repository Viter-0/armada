import { Badge, Box, Menu, MenuItem, Strong, Text } from "@/components";
import { useOutsideAction } from "@/util/hooks";
import { twClassJoin } from "@/util/twMerge";
import { MagnifyingGlassIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { useVirtualizer } from "@tanstack/react-virtual";
import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import { availableExpressions } from "./expressions";
import {
  Action,
  AssetCache,
  FilterError,
  FilterExpression,
  FilterField,
  FilterValue,
  SearchBuilderBlurFn,
  SearchBuilderFocusFn,
  SearchFilter,
  SearchFilterFocusFn,
  SearchSuggestion,
  Tag,
  WithRequired,
} from "./types";

type QueryConstructFields = keyof Pick<SearchFilter, "field" | "value" | "expression">;
type CursorPosition = QueryConstructFields;

interface State {
  /** A boolean indicating whether the dropdown is currently displayed. */
  showDropdown: boolean;
  /** The key of the active (currently selected) item in the search bar. */
  activeItem?: SearchFilter["key"];
  /** The cursor position (active query parameter) within the active search item. */
  activeCursorPosition?: CursorPosition;
  /** The key of the active suggestion in the search entity. */
  activeSuggestion?: SearchSuggestion["key"];
}

/** The separator used between different query fields */
const QUERY_FIELD_SEPARATOR = " ";

/** This separator is used when handling fields that store multiple values in an array format */
const ARRAY_VALUE_SEPARATOR = ", ";

/** The ordered list of fields used to construct a query */
const fieldProcessingOrder: QueryConstructFields[] = ["field", "expression", "value"];

interface SearchConditionProps {
  className?: string;
  searchFilter: SearchFilter;
  activeSuggestion?: SearchSuggestion;
  cursorPosition?: CursorPosition;
  /** List of available filter fields that the user can choose from for filtering search results */
  properties: FilterField[];
  /** Cache of assets used for suggestions or pre-fetching relevant data to enhance the search filter functionality */
  assetCache: AssetCache;
  /** Auto focus on initial render */
  autoFocus?: boolean;
  /** Called when an item is updated. The updated item is passed as an argument. */
  onChange: (searchFilter: SearchFilter) => void;
  /** Called when an item is deleted. */
  onDelete: (key: SearchFilter["key"] | "last") => void;
  /** Called when the input element gains focus. The focus event is passed as an argument. */
  onFocus: (e: React.FocusEvent<HTMLInputElement>) => void;
  /** Called when the cursor position changes. The new position is passed as an argument. */
  onCursorPositionChange: () => void;
  /** Called to update the active suggestion in the dropdown by a specified offset. */
  updateActiveSuggestion: (offset: number) => void;
  /** Called to apply the selected suggestion. The selected suggestion is passed as an argument. */
  applySuggestion: (searchFilter: SearchFilter, suggestion?: SearchSuggestion) => void;
  /** Called to create a new search entry in the list. */
  createNewSearchEntry: () => void;
  /** Focuses the search condition input element. */
  focusSearchCondition: (key: SearchFilter["key"] | "primary") => void;
}

const isSearchFilterFieldValid = (
  properties: FilterField[],
  searchFilter: SearchFilter
): searchFilter is WithRequired<SearchFilter, "field"> => {
  if (!searchFilter.field) return false;
  return properties.some((item) => item.value == searchFilter.field);
};

const isSearchFilterExpressionValid = (
  properties: FilterField[],
  searchFilter: SearchFilter
): searchFilter is WithRequired<SearchFilter, "expression"> => {
  if (!searchFilter.field) return false;
  const field = getFieldByValue(properties, searchFilter.field);
  if (!field) return false;
  const allowedExpressions = searchFilter.isLocal ? field.localExpressions : field.expressions;
  return allowedExpressions.some((item) => item.value == searchFilter.expression);
};

const isArrayExpression = (expression: SearchFilter["expression"]): expression is string => {
  return availableExpressions.some((item) => item.value == expression && item.isMultipleValuesSupported == true);
};

const isArrayValue = (value: SearchFilter["value"]): value is string[] => {
  return Array.isArray(value);
};

const isSearchFilterValueEmpty = (value: SearchFilter["value"]) => {
  if (isArrayValue(value)) {
    if (value.length == 0) return true;
    if (value.some((item) => item != "")) return false;
    return true;
  } else {
    return value ? false : true;
  }
};

const validateSearchFilterValue = (
  properties: FilterField[],
  searchFilter: SearchFilter,
  assetCache: AssetCache
): FilterError | undefined => {
  if (!searchFilter.field) return;
  const field = getFieldByValue(properties, searchFilter.field);
  if (!field) return;
  if (field.validateValue !== undefined) return field.validateValue(searchFilter, assetCache);
  return;
};

const getFieldByValue = (properties: FilterField[], value: FilterField["value"]): FilterField | undefined => {
  return properties.find((item) => item.value == value);
};

const getFieldsByValueInclude = (properties: FilterField[], value: string) => {
  // WIP - Matching item.value should be displayed first
  return properties.filter((item) => {
    return item.value.includes(value) || item.description?.includes(value);
  });
};

const getAvailableProperties = (properties: FilterField[], searchFilter: SearchFilter) => {
  return searchFilter.isLocal != true ? properties.filter((item) => item.isLocal != true) : properties;
};

const getExpressionsByValueInclude = (expressions: FilterExpression[], value: string) => {
  // WIP - Matching item.value should be displayed first
  return expressions.filter((item) => {
    return item.value.includes(value) || item.description?.includes(value);
  });
};

const getAllowedExpressions = (searchFilter: SearchFilter, property: FilterField): FilterExpression[] => {
  return searchFilter.isLocal ? property.localExpressions : property.expressions;
};

/** Checks if any field contains a value */
const isSearchFilterEmpty = (item: SearchFilter): boolean => {
  for (const field of fieldProcessingOrder.values()) {
    if (item[field]) return false;
  }
  return true;
};

const validateSearchFilter = (
  properties: FilterField[],
  searchFilter: SearchFilter,
  assetCache: AssetCache
): FilterError | undefined => {
  if (!isSearchFilterFieldValid(properties, searchFilter)) {
    return {
      field: "field",
      message: "Invalid attribute",
    };
  }

  if (!isSearchFilterExpressionValid(properties, searchFilter)) {
    return {
      field: "expression",
      message: "Invalid attribute",
    };
  }
  if (isSearchFilterValueEmpty(searchFilter.value)) {
    return {
      field: "value",
      message: "Empty attribute",
    };
  }
  return validateSearchFilterValue(properties, searchFilter, assetCache);
};

function getTextSizeInPx(text?: string): number {
  if (!text) return 0;
  const el = document.createElement("span");
  el.style.visibility = "hidden";
  el.style.position = "absolute";
  el.innerText = text;
  document.body.appendChild(el);
  const size = el.offsetWidth;
  el.remove();
  return size;
}

const castValueAsAllowedType = (searchFilter: SearchFilter) => {
  if (isArrayExpression(searchFilter.expression)) {
    if (!searchFilter.value || Array.isArray(searchFilter.value)) return searchFilter.value;
    return searchFilter.value.split(ARRAY_VALUE_SEPARATOR);
  } else {
    if (!isArrayValue(searchFilter.value)) return searchFilter.value;
    return searchFilter.value.join(ARRAY_VALUE_SEPARATOR);
  }
};

/**
 * Joins array elements with a separator, inserting the separator between each item.
 */
function joinElements<T>(items: T[], joinSeparator: (idx: number) => T): T[] {
  const joinedItems: T[] = [];
  for (const [idx, item] of items.entries()) {
    joinedItems.push(item);
    if (idx >= items.length - 1) continue;
    joinedItems.push(joinSeparator(idx));
  }
  return joinedItems;
}

interface RenderableField {
  key: React.Key;
  prefix?: {
    value?: string;
    className?: string;
  };
  value: string;
  suffix?: {
    value?: string;
    className?: string;
  };
  className?: string;
}

const fieldColors: Record<QueryConstructFields, string> = {
  field: "text-orange",
  value: "text-blue",
  expression: "",
};

/** Used to add a suffix to the rendered field for autocomplete purposes. */
interface AutocompleteSuggestion {
  field: QueryConstructFields;
  /** The partial string to be added as a suffix during autocomplete */
  value: string;
  /**
   * If the field consists of an array of values, specifying this parameter will apply suggestion
   * only the specified value, rather than applying to all values in the array.
   */
  arrayIndex?: number;
}

function RenderSearchFilterItem({ item }: { item: RenderableField }) {
  return (
    <Box as="span" className="whitespace-pre-wrap">
      {item.prefix && (
        <Box as="span" className={item.prefix.className}>
          {item.prefix.value}
        </Box>
      )}
      {item.value && (
        <Box as="span" className={item.className}>
          {item.value}
        </Box>
      )}
      {item.suffix && (
        <Box as="span" className={item.suffix.className}>
          {item.suffix.value}
        </Box>
      )}
    </Box>
  );
}

interface RenderSearchFilterProps {
  searchFilter: SearchFilter;
  suggestion?: AutocompleteSuggestion;
  currentField?: QueryConstructFields;
  validationError?: FilterError;
}
function RenderSearchFilter({ searchFilter, suggestion, validationError }: RenderSearchFilterProps) {
  const fieldsToRender: (RenderableField[] | RenderableField)[] = [];

  for (const field of fieldProcessingOrder) {
    const currentFieldValue = searchFilter[field] ?? "";

    const hasError = validationError?.field == field;
    const hasSuggestion = suggestion?.field == field;

    if (typeof currentFieldValue == "string") {
      fieldsToRender.push({
        key: field,
        value: currentFieldValue,
        suffix: {
          value: hasSuggestion ? suggestion.value : undefined,
          className: hasSuggestion ? "opacity-60" : undefined,
        },
        className: hasError ? "underline decoration-red-600 decoration-wavy " : fieldColors[field],
      });
    } else if (isArrayValue(currentFieldValue)) {
      let renderArrayValues = [];
      for (const [idx, value] of currentFieldValue.entries()) {
        renderArrayValues.push({
          key: field + idx,
          value: value,
          suffix: {
            value: hasSuggestion && suggestion.arrayIndex == idx ? suggestion.value : undefined,
          },
          className:
            hasError && validationError.arrayIndex == idx
              ? "underline decoration-red-600 decoration-wavy "
              : fieldColors[field],
        });
      }
      renderArrayValues = joinElements(renderArrayValues, (idx) => ({
        key: "sep_array_" + idx,
        value: ARRAY_VALUE_SEPARATOR,
      }));
      fieldsToRender.push(renderArrayValues);
    } else {
      fieldsToRender.push({
        key: field,
        value: `unsupported value type ${typeof currentFieldValue}`,
      });
    }
  }

  const itemsToRender: (RenderableField[] | RenderableField)[] = joinElements(fieldsToRender, (idx) => ({
    key: "sep_" + idx,
    value: QUERY_FIELD_SEPARATOR,
  }));

  return (
    <>
      {itemsToRender.map((item) =>
        Array.isArray(item) ? (
          item.map((arrItem) => <RenderSearchFilterItem key={arrItem.key} item={arrItem} />)
        ) : (
          <RenderSearchFilterItem key={item.key} item={item} />
        )
      )}
    </>
  );
}

/**
 * Renders the search item as a string.
 */
function renderSearchFilterAsString(searchFilter: SearchFilter) {
  const itemsToString: string[] = [];
  for (const field of fieldProcessingOrder) {
    const currentFieldValue = searchFilter[field];
    if (currentFieldValue == undefined) continue;
    if (typeof currentFieldValue == "string") {
      itemsToString.push(currentFieldValue);
      continue;
    }
    if (Array.isArray(currentFieldValue)) {
      const arrayValueAsString = currentFieldValue.join(ARRAY_VALUE_SEPARATOR);
      itemsToString.push(arrayValueAsString);
      continue;
    }
  }
  return itemsToString.join(QUERY_FIELD_SEPARATOR);
}

/**
 * Parses the provided string value into a SearchFilter object.
 *
 * @param value - The string value to parse.
 * @returns A SearchFilter object containing the parsed fields.
 */
function parseStringAsSearchFilter(value: string, key: SearchFilter["key"]): SearchFilter {
  const result = fieldProcessingOrder.reduce((acc, key) => {
    acc[key] = undefined;
    return acc;
  }, {} as Pick<SearchFilter, QueryConstructFields>);

  let startIndex = 0;
  for (const field of fieldProcessingOrder) {
    const separatorIndex = value.indexOf(QUERY_FIELD_SEPARATOR, startIndex);
    if (separatorIndex !== -1 && field != "value") {
      // Handle field and expression parsing separated by QUERY_FIELD_SEPARATOR
      result[field] = value.slice(startIndex, separatorIndex);
      startIndex = separatorIndex + 1;
    } else if (field != "value") {
      // The string is not separated by QUERY_FIELD_SEPARATOR. Assign the remaining part of the string to the current field
      result[field] = value.slice(startIndex);
      break;
    } else {
      // Handle value parsing
      if (isArrayExpression(result.expression)) {
        // Value type array
        let values = value.slice(startIndex).split(ARRAY_VALUE_SEPARATOR);
        values = values.map((item) => item.trim());
        result[field] = values;
      } else {
        // Value type string
        result[field] = value.slice(startIndex);
      }
      break;
    }
  }

  return {
    key,
    ...result,
  };
}

const SearchCondition = forwardRef(function SearchField(
  props: SearchConditionProps,
  outerRef: React.ForwardedRef<HTMLInputElement>
) {
  const {
    searchFilter,
    activeSuggestion,
    cursorPosition,
    properties,
    assetCache,
    onChange,
    onFocus,
    onDelete,
    updateActiveSuggestion,
    onCursorPositionChange,
    createNewSearchEntry,
    applySuggestion,
    focusSearchCondition,
    className = "",
    autoFocus = false,
  } = props;

  const innerRef = useRef<HTMLInputElement>(null);
  useImperativeHandle(outerRef, () => innerRef.current!, []);

  /**
   * Renders the search item as a string.
   */
  const searchFilterAsString = useMemo(() => renderSearchFilterAsString(searchFilter), [searchFilter]);

  /**
   * Processes and finalizes the current search filter.
   */
  const finalize = useCallback(() => {
    const lastValue = searchFilter.value;
    if (innerRef.current?.selectionStart == searchFilterAsString.length && !isSearchFilterValueEmpty(lastValue)) {
      // Jump to the next filter if no errors exist
      if (validateSearchFilter(properties, searchFilter, assetCache)) return;
      if (searchFilter.isPrimary) {
        createNewSearchEntry();
      } else {
        focusSearchCondition("primary");
      }
    } else {
      // Apply the active suggestion if the current filter is incomplete
      applySuggestion(searchFilter, activeSuggestion);
    }
  }, [
    activeSuggestion,
    applySuggestion,
    createNewSearchEntry,
    focusSearchCondition,
    searchFilterAsString,
    searchFilter,
    properties,
    assetCache,
  ]);

  /**
   * Handles keyboard events within the search field.
   *
   * @param e - The keyboard event.
   */
  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    switch (e.key) {
      // Dropdown navigation using Arrow Keys
      case "ArrowDown":
        e.preventDefault();
        updateActiveSuggestion(1);
        break;

      // Dropdown navigation using Arrow Keys
      case "ArrowUp":
        e.preventDefault();
        updateActiveSuggestion(-1);
        break;

      // Apply suggestions using Tab Key
      case "Tab":
        e.preventDefault();
        applySuggestion(searchFilter, activeSuggestion);
        break;

      // Apply suggestions using Enter Key
      case "Enter":
        e.preventDefault();
        finalize();
        break;

      // Delete previous search condition with Backspace if conditions are met
      case "Backspace":
        if (!searchFilter.isPrimary) return;
        if (isSearchFilterEmpty(searchFilter)) onDelete("last");
        break;
    }
  };

  /**
   * Adjusts the width of an input element to fit its content.
   *
   * @param e - The HTMLInputElement to be resized.
   */
  const resizeInput = useCallback(
    (e: HTMLInputElement, extend = 0) => {
      // The 'grow' class controls the sizing of the primary filter, so we do not set the size here.
      if (searchFilter.isPrimary) {
        e.style.width = "unset";
        return;
      }
      e.style.width = "0px"; // Reset width to enable shrinking
      e.style.width = `${e.scrollWidth + extend < 186 ? 186 : e.scrollWidth + extend}px`;
    },
    [searchFilter.isPrimary]
  );

  const onValueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(parseStringAsSearchFilter(e.target.value, searchFilter.key));
    resizeInput(e.target);
  };

  const onSelect = (_e: React.SyntheticEvent<HTMLInputElement, Event>) => {
    onCursorPositionChange();
  };

  const validationError = useMemo(() => {
    // Currently, validation occurs for each field separately.
    // This means the validation error is shown while the user is typing, rather than after the field entry is complete.
    return validateSearchFilter(properties, searchFilter, assetCache);
  }, [searchFilter, properties, assetCache]);

  const itemBorder = "border-search-item border border-solid rounded-xl";

  const autocompleteSuggestion: AutocompleteSuggestion | undefined = useMemo(() => {
    if (!cursorPosition) return;

    function valueAutocomplete(): AutocompleteSuggestion | undefined {
      const value = isArrayValue(searchFilter.value)
        ? searchFilter.value[searchFilter.value.length - 1]
        : searchFilter.value ?? "";

      if (activeSuggestion?.value.startsWith(value)) {
        return {
          field: "value",
          value: activeSuggestion.value.slice(value.length),
          arrayIndex: activeSuggestion.arrayIndex,
        };
      }
    }

    switch (cursorPosition) {
      case "field":
        if (!searchFilter.expression && activeSuggestion?.value.startsWith(searchFilter.field ?? "")) {
          return {
            field: "field",
            value: activeSuggestion.value.slice((searchFilter.field ?? "").length),
          };
        }
        break;
      case "expression":
        if (!searchFilter.value && activeSuggestion?.value.startsWith(searchFilter.expression ?? "")) {
          return {
            field: "expression",
            value: activeSuggestion.value.slice((searchFilter.expression ?? "").length),
          };
        }
        break;
      case "value":
        return valueAutocomplete();
    }
  }, [cursorPosition, searchFilter, activeSuggestion?.value, activeSuggestion?.arrayIndex]);

  /**  Resize the input element and include suggestion in the input size calculation */
  useEffect(() => {
    if (!innerRef.current) return;
    const size = getTextSizeInPx(autocompleteSuggestion?.value);
    if (innerRef.current) resizeInput(innerRef.current, size);
    // Resize on searchFilter.field change - this fixes an issue
    // where clicking on a dropdown does not trigger the resizing logic
  }, [autocompleteSuggestion, resizeInput, searchFilter.field]);

  return (
    <Box
      className={twClassJoin("m-1 px-2 py-1 flex items-center", !searchFilter.isPrimary ? itemBorder : "", className)}
    >
      {searchFilter.isLocal && (
        <Box as="span" className="me-1">
          [Quick]
        </Box>
      )}
      <Box className="relative flex items-center grow">
        <Box className="absolute h-7 ">
          <RenderSearchFilter
            searchFilter={searchFilter}
            suggestion={autocompleteSuggestion}
            currentField={cursorPosition}
            validationError={validationError}
          />
        </Box>
        <input
          ref={innerRef}
          className="border-0 bg-transparent relative outline-none flex items-center resize-none text-transparent h-7 overflow-hidden grow"
          style={{ caretColor: "oklch(var(--bc)/1)" }}
          spellCheck="false"
          autoComplete="off"
          value={searchFilterAsString}
          onChange={onValueChange}
          onKeyDown={onKeyDown}
          onFocus={onFocus}
          onSelect={onSelect}
          autoFocus={autoFocus}
        ></input>

        {!searchFilter.isPrimary && (
          <XMarkIcon className="w-5 h-5 ms-2 hover:stroke-red-700" onClick={() => onDelete(searchFilter.key)} />
        )}
      </Box>
    </Box>
  );
});

interface DropdownProps {
  active?: boolean;
  children?: React.ReactNode;
}
function Dropdown({ active, children }: DropdownProps) {
  return (
    <Box
      className={twClassJoin(
        "absolute bg-base-100 left-0 right-0 z-10 border-background border border-t-0",
        active ? "" : "hidden"
      )}
    >
      {children}
    </Box>
  );
}

function Item({ children, ...props }: React.ComponentPropsWithoutRef<"span">) {
  return (
    <Box as="span" {...props}>
      {children}
    </Box>
  );
}

function TagsList({ items }: { items?: Tag[] }) {
  return (
    <>
      {items?.map((item) => {
        return (
          <Badge key={item.key} className={twClassJoin("badge-outline", item.className ?? "")}>
            {item.name ?? item.value}
          </Badge>
        );
      })}
    </>
  );
}

interface ListProps<T extends SearchSuggestion> {
  items: T[];
  active?: T["key"];
  highlights?: string[];
  onClick: (item: T) => void;
}
function List<T extends SearchSuggestion>({ items, active, onClick }: ListProps<T>) {
  const parentRef = useRef(null);

  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 36,
    overscan: 10,
  });

  useEffect(() => {
    virtualizer.scrollToIndex(
      items.findIndex((item) => active == item.key),
      { align: "start" }
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  return (
    <>
      <div ref={parentRef} className="max-h-80 overflow-auto flex-row">
        {items.length > 0 && (
          <Menu
            style={{
              height: `${virtualizer.getTotalSize()}px`,
              width: "100%",
              position: "relative",
            }}
          >
            {virtualizer.getVirtualItems().map((virtualItem) => {
              const item = items[virtualItem.index];
              return (
                <MenuItem
                  key={virtualItem.key}
                  onClick={() => onClick(item)}
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%",
                    height: `${virtualItem.size}px`,
                    transform: `translateY(${virtualItem.start}px)`,
                  }}
                >
                  <Box className={twClassJoin("flex", item.key == active ? "active" : "")}>
                    <Item className="w-48 truncate">{item.value}</Item>
                    <Item>{item.description}</Item>
                    <Item className="grow"></Item>
                    <TagsList items={item.tags} />
                  </Box>
                </MenuItem>
              );
            })}
          </Menu>
        )}
        {items.length == 0 && <Text className="p-4">No items found</Text>}
      </div>
      <Box className="text-end text-xs pe-4 pb-2 opacity-80">
        Use <Strong>Tab</Strong>, <Strong>Enter</Strong> and <Strong>Directional</Strong> keys for fast navigation
      </Box>
    </>
  );
}

const initialBuilderState: State = {
  showDropdown: false,
  activeItem: undefined,
  activeSuggestion: undefined,
};

interface SearchQueryBuilderProps {
  className?: string;
  /** An array of search filters. Must contain an initial empty filter with the 'isPrimary' attribute set to true */
  searchFilters: SearchFilter[];
  /** List of available filter fields that the user can choose from for filtering search results */
  properties: FilterField[];
  /** Cache of assets used for suggestions or pre-fetching relevant data to enhance the search filter functionality */
  assetCache: AssetCache;
  /** Indicates whether the MagnifyingGlassIcon should be visible */
  isSearchIconVisible?: boolean;
  /** Function to dispatch actions for updating search filters in the query builder */
  dispatchSearchFilters: React.Dispatch<Action>;
  /** Called when the SearchQueryBuilder loses focus. */
  onSearchBuilderBlur?: SearchBuilderBlurFn;
  /** Called when the SearchQueryBuilder gains focus. */
  onSearchBuilderFocus?: SearchBuilderFocusFn;
  /** Called when the SearchFilter (SearchCondition) gains focus. */
  onSearchFilterFocus?: SearchFilterFocusFn;
}

export function SearchQueryBuilder({
  searchFilters,
  properties,
  assetCache,
  isSearchIconVisible,
  dispatchSearchFilters,
  onSearchBuilderBlur,
  onSearchBuilderFocus,
  onSearchFilterFocus,
  className = "",
}: SearchQueryBuilderProps) {
  const [state, setState] = useState<State>(initialBuilderState);

  const builderRef = useRef<HTMLDivElement>(null);
  const searchConditionsRef = useRef<Record<string, HTMLInputElement | null>>({});

  const activeFilter = useMemo(
    () => searchFilters.find((item) => item.key == state.activeItem) ?? searchFilters[0],
    [searchFilters, state.activeItem]
  );

  // Show dropdown on builder focus
  const onSearchBuilderFocusEvent = useCallback(
    (e: React.FocusEvent<HTMLDivElement>) => {
      if (state.showDropdown == true) return;
      setState((prevState) => ({
        ...prevState,
        showDropdown: true,
      }));
      onSearchBuilderFocus?.(e);
    },
    [state.showDropdown, onSearchBuilderFocus]
  );

  const onSearchBuilderBlurEvent = useCallback(() => {
    if (!state.showDropdown) return;
    setState({ ...initialBuilderState });
    onSearchBuilderBlur?.();
  }, [onSearchBuilderBlur, state.showDropdown]);

  // Close builder only on click outside the builder component
  useOutsideAction("click", builderRef, onSearchBuilderBlurEvent);

  /**
   * Triggered by user typing or pasting.
   */
  const onSearchFilterValueChange = (item: SearchFilter) => {
    dispatchSearchFilters({
      type: "update",
      item: item,
    });

    // Update the active cursor position in the same render instance to prevent dropdown from displaying previous position options.
    const position = getCursorPosition(item);
    setState((prevState) => ({
      ...prevState,
      activeSuggestion: position == state.activeCursorPosition ? state.activeSuggestion : undefined,
      activeCursorPosition: position,
    }));
  };

  /**
   * Retrieves all available suggestions.
   */
  const getAllSuggestions = useCallback(
    (sugProperties: FilterField[], searchFilter: SearchFilter, position?: CursorPosition): SearchSuggestion[] => {
      const availableProperties = getAvailableProperties(sugProperties, searchFilter);

      const getExpressionSuggestion = (): FilterExpression[] => {
        const property = getFieldByValue(availableProperties, searchFilter.field ?? "");
        if (!property) return [];
        if (!searchFilter.expression) return getAllowedExpressions(searchFilter, property);
        // Show all available expressions when the current expression is valid
        if (isSearchFilterExpressionValid(availableProperties, searchFilter))
          return getAllowedExpressions(searchFilter, property);
        return getExpressionsByValueInclude(getAllowedExpressions(searchFilter, property), searchFilter.expression);
      };

      const getFieldSuggestion = (): FilterField[] => {
        // Show all property fields when the current field is empty
        if (!searchFilter?.field) return availableProperties;
        // Show all property ids when the current field is valid
        if (isSearchFilterFieldValid(availableProperties, searchFilter)) return availableProperties;
        // Show only ids that include the current value
        return getFieldsByValueInclude(availableProperties, searchFilter.field);
      };

      /**
       * Retrieves suggestions for the value field.
       * It's up to the implementation of `getValueSuggestion` to return either partial or full lists of value suggestions.
       */
      const getValueSuggestion = (): FilterValue[] => {
        if (!searchFilter?.field) return [];
        const property = getFieldByValue(availableProperties, searchFilter?.field);
        if (!property?.getValueSuggestion) return [];
        return property.getValueSuggestion(searchFilter, assetCache);
      };

      switch (position) {
        case "field":
          return getFieldSuggestion();
        case "expression":
          return getExpressionSuggestion();
        case "value":
          return getValueSuggestion();
        default:
          return [];
      }
    },
    [assetCache]
  );

  // Memoize the suggestions based on the current cursor position to avoid recalculating unless dependencies change
  const suggestionsForCurrentPosition: SearchSuggestion[] = useMemo(() => {
    return getAllSuggestions(properties, activeFilter, state.activeCursorPosition);
  }, [state.activeCursorPosition, activeFilter, getAllSuggestions, properties]);

  /**
   * Determines which part of the search element is currently active based on the cursor position.
   * For this function to work correctly, the input elements must be focused.
   *
   * @param item - The search filter item being evaluated.
   */
  const getCursorPosition = useCallback((item: SearchFilter): CursorPosition => {
    const searchConditionRef = searchConditionsRef.current[String(item?.key)];
    if (!searchConditionRef) return fieldProcessingOrder[0];

    const position = searchConditionRef.selectionStart ?? 0;
    let offset = 0;
    for (const field of fieldProcessingOrder) {
      let currentFieldValue = item[field] ?? "";
      if (isArrayValue(currentFieldValue)) currentFieldValue = currentFieldValue.join(ARRAY_VALUE_SEPARATOR);
      if (position <= offset + currentFieldValue.length && position >= offset) return field;
      offset = offset + currentFieldValue.length + QUERY_FIELD_SEPARATOR.length;
    }
    // Default to the first field in the processing order if no match is found
    return fieldProcessingOrder[0];
  }, []);

  /**
   * Focuses the search condition input element.
   */
  const focusSearchCondition = useCallback(
    (key: SearchFilter["key"] | "primary") => {
      if (key === "primary") key = searchFilters.find((item) => item.isPrimary)?.key ?? "";

      const searchConditionRef = searchConditionsRef.current[String(key)];
      if (!searchConditionRef) return;
      searchConditionRef?.focus();
    },
    [searchFilters]
  );

  // const setCursorPosition = (item: SearchFilter, position: Selection) => {
  //   // Set focus and cursor position when selection changes
  //   const searchConditionRef = searchConditionsRef.current[String(item?.key)];

  //   if (!searchConditionRef || !item) return;
  //   searchConditionRef?.focus();
  //   return;

  //   // const values = [];

  //   // for (const field of fieldProcessingOrder) {
  //   //   const currentFieldValue = item[field];
  //   //   if (currentFieldValue == undefined) break;
  //   //   if (position.position == field) {
  //   //     if (position.placement == "end") {
  //   //       values.push(currentFieldValue);
  //   //     } else {
  //   //       values.push("");
  //   //     }
  //   //     break;
  //   //   }
  //   //   values.push(currentFieldValue);
  //   // }

  //   // const newCursorPosition = values.join(SEPARATOR).length;
  //   // searchConditionRef?.focus();
  //   // searchConditionRef.selectionStart = newCursorPosition;
  //   // searchConditionRef.selectionEnd = newCursorPosition;
  // };

  /**
   * Handles the focus event on a search condition, making it the active item.
   */
  const onSearchConditionFocus = (item: SearchFilter) => {
    setState((prevState) => ({
      ...prevState,
      activeItem: item.key,
      activeSuggestion: undefined,
      // Update the active cursor position to prevent dropdown from flickering.
      activeCursorPosition: getCursorPosition(item),
    }));
    onSearchFilterFocus?.(item);
  };

  /**
   *  Select one suggestion as the main active suggestion, which can be used for autocompletion.
   */
  const activeSuggestionForCurrentPosition: SearchSuggestion | undefined = useMemo(() => {
    if (suggestionsForCurrentPosition.length == 0) return;
    if (!state.activeSuggestion) return suggestionsForCurrentPosition[0];
    const newSuggestion = suggestionsForCurrentPosition.find((item) => item.key == state.activeSuggestion);
    if (!newSuggestion) return suggestionsForCurrentPosition[0];
    return newSuggestion;
  }, [suggestionsForCurrentPosition, state.activeSuggestion]);

  /**
   * Updates the active suggestion based on the provided offset.
   * The offset is used to navigate through the list of suggestions, allowing cyclic navigation.
   *
   * @param {number} offset - The number by which to adjust the current suggestion's index.
   *                          A positive number moves to the next suggestion, a negative number to the previous.
   */
  const updateActiveSuggestion = useCallback(
    (offset: number) => {
      if (suggestionsForCurrentPosition.length == 0) return;

      const index =
        (activeSuggestionForCurrentPosition
          ? suggestionsForCurrentPosition.findIndex((item) => item.key == activeSuggestionForCurrentPosition.key)
          : -1) + offset;

      // Calculate the new index based on the offset, allowing cyclic navigation through the suggestions.
      let nextSuggestion: SearchSuggestion;
      if (index < 0) {
        nextSuggestion = suggestionsForCurrentPosition[suggestionsForCurrentPosition.length - 1];
      } else if (index > suggestionsForCurrentPosition.length - 1) {
        nextSuggestion = suggestionsForCurrentPosition[0];
      } else {
        nextSuggestion = suggestionsForCurrentPosition[index];
      }

      setState((prevState) => ({
        ...prevState,
        activeSuggestion: nextSuggestion?.key,
      }));
    },
    [suggestionsForCurrentPosition, activeSuggestionForCurrentPosition]
  );

  const applyValueSuggestion = useCallback(
    (searchFilter: SearchFilter, suggestion: SearchSuggestion) => {
      if (!isArrayExpression(activeFilter.expression)) {
        // Value is string
        const updatedFilter = {
          ...searchFilter,
          value: suggestion.value,
        };
        dispatchSearchFilters({
          type: "update",
          item: updatedFilter,
        });
        return updatedFilter;
      }

      // Value can be array
      let value: string[];
      if (isArrayValue(activeFilter.value)) {
        value = [
          ...activeFilter.value.map((item, idx) => (suggestion.arrayIndex == idx ? suggestion.value : item)),
          "",
        ];
      } else {
        value = [suggestion.value, ""];
      }
      const updatedFilter = {
        ...searchFilter,
        value: value,
      };
      dispatchSearchFilters({
        type: "update",
        item: updatedFilter,
      });
      return updatedFilter;
    },
    [activeFilter.expression, activeFilter.value, dispatchSearchFilters]
  );

  const applyExpressionSuggestion = useCallback(
    (searchFilter: SearchFilter, suggestion: SearchSuggestion) => {
      const updatedFilter = {
        ...searchFilter,
        expression: suggestion.value,
        // Create the next field with an empty value if it's not already set
        value: castValueAsAllowedType({ ...searchFilter, expression: suggestion.value }) ?? "",
      };
      dispatchSearchFilters({
        type: "update",
        item: updatedFilter,
      });
      // Update the state to reflect the new active cursor position and reset the active suggestion
      setState((prevState) => ({
        ...prevState,
        activeCursorPosition: "value",
        activeSuggestion: undefined,
      }));
      return updatedFilter;
    },
    [dispatchSearchFilters]
  );

  const applyFieldSuggestion = useCallback(
    (searchFilter: SearchFilter, suggestion: SearchSuggestion) => {
      const updatedFilter = {
        ...searchFilter,
        field: suggestion.value,
        // Create the next field with an empty value if it's not already set
        expression: searchFilter.expression ?? "",
      };
      dispatchSearchFilters({
        type: "update",
        item: updatedFilter,
      });
      // Update the state to reflect the new active cursor position and reset the active suggestion
      setState((prevState) => ({
        ...prevState,
        activeCursorPosition: "expression",
        activeSuggestion: undefined,
      }));
      return updatedFilter;
    },
    [dispatchSearchFilters]
  );

  /**
   * Applies the selected suggestion to the search filter and updates the state accordingly.
   *
   * @returns Returns updated searchFilter.
   */
  const applySuggestion = useCallback(
    (searchFilter: SearchFilter, suggestion?: SearchSuggestion): SearchFilter | undefined => {
      if (!state.activeCursorPosition) return;
      if (!suggestion) return;

      switch (state.activeCursorPosition) {
        case "field":
          return applyFieldSuggestion(searchFilter, suggestion);
        case "expression":
          return applyExpressionSuggestion(searchFilter, suggestion);
        case "value":
          return applyValueSuggestion(searchFilter, suggestion);
      }
    },
    [state.activeCursorPosition, applyValueSuggestion, applyExpressionSuggestion, applyFieldSuggestion]
  );

  /**
   * Creates a new primary search entry in the search filters.
   */
  const createNewSearchEntry = useCallback(() => {
    dispatchSearchFilters({
      type: "create",
    });
  }, [dispatchSearchFilters]);

  const handleValueSuggestionApply = useCallback(
    (searchFilter: SearchFilter) => {
      // Value is string
      if (!isArrayExpression(searchFilter.expression)) {
        if (validateSearchFilter(getAvailableProperties(properties, searchFilter), searchFilter, assetCache))
          return focusSearchCondition(searchFilter.key);
        if (searchFilter.isPrimary) return createNewSearchEntry();
        return focusSearchCondition("primary");
      }
      // Value is array
      focusSearchCondition(searchFilter.key);
    },
    [createNewSearchEntry, focusSearchCondition, properties, assetCache]
  );

  /**
   * Handles the click event on a dropdown item, applying the selected suggestion
   * to the currently active search condition.
   */
  const onDropdownItemClick = useCallback(
    (item: SearchSuggestion) => {
      const updatedFilter = applySuggestion(activeFilter, item);
      if (!updatedFilter) return focusSearchCondition(activeFilter.key);
      if (state.activeCursorPosition == "value") return handleValueSuggestionApply(updatedFilter);
      focusSearchCondition(activeFilter.key);
    },
    [applySuggestion, focusSearchCondition, activeFilter, handleValueSuggestionApply, state.activeCursorPosition]
  );

  /**
   * Deletes a search entry from the search filters.
   */
  const onDelete = useCallback(
    (key: SearchFilter["key"] | "last") => {
      dispatchSearchFilters({
        type: "delete",
        key: key == "last" && searchFilters.length > 1 ? searchFilters[searchFilters.length - 2].key : key,
      });
      return;
    },
    [dispatchSearchFilters, searchFilters]
  );

  /**
   * Handles changes in the cursor position to keep `activeCursorPosition` and `selectionStart` in sync.
   */
  const onCursorPositionChange = () => {
    //const activeSearchCondition = searchFilters.find((item) => item.key == state.activeItem);
    const position = getCursorPosition(activeFilter);

    if (position == state.activeCursorPosition) return;
    // Update the state with the new cursor position and clear any active suggestion
    setState((prevState) => ({
      ...prevState,
      activeCursorPosition: position,
      activeSuggestion: undefined,
    }));
  };

  return (
    <div className={twClassJoin("relative", className)} ref={builderRef}>
      <Box className="input input-bordered flex items-center flex-wrap h-auto" onFocus={onSearchBuilderFocusEvent}>
        {isSearchIconVisible && <MagnifyingGlassIcon className="w-4 h-4 opacity-70 me-2" />}
        {searchFilters.map((item, _idx, items) => {
          const isPrimaryFilter = item.isPrimary ?? false;
          const condProperties = getAvailableProperties(properties, item);
          return (
            <SearchCondition
              ref={(el) => (searchConditionsRef.current[String(item.key)] = el)}
              className={isPrimaryFilter ? "grow" : ""}
              key={item.key}
              assetCache={assetCache}
              searchFilter={item}
              properties={condProperties}
              onChange={onSearchFilterValueChange}
              onFocus={() => onSearchConditionFocus(item)}
              onDelete={onDelete}
              updateActiveSuggestion={updateActiveSuggestion}
              activeSuggestion={item.key == state.activeItem ? activeSuggestionForCurrentPosition : undefined}
              onCursorPositionChange={onCursorPositionChange}
              cursorPosition={state.activeCursorPosition}
              applySuggestion={applySuggestion}
              createNewSearchEntry={createNewSearchEntry}
              autoFocus={items.length == 1 || item.isAutoFocusEnabled === false ? false : true}
              focusSearchCondition={focusSearchCondition}
            />
          );
        })}
      </Box>
      <Dropdown active={state.showDropdown}>
        <List
          items={suggestionsForCurrentPosition}
          active={activeSuggestionForCurrentPosition?.key}
          onClick={onDropdownItemClick}
        />
      </Dropdown>
    </div>
  );
}
