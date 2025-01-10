export type AssetCache = Record<string, unknown>;

export interface FilterError {
  /** Indicates the field in which an error occurred */
  field?: keyof SearchFilter;
  /** WIP - currently, the message can't be displayed: Error message associated with the field */
  message?: string;
  /**
   * If the field consists of an array of values, specifying this parameter will highlight
   * only the specified value with an error, rather than applying the error to all values in the array.
   */
  arrayIndex?: number;
}

/**
 * Interface for search suggestions in the search bar.
 */
export interface SearchSuggestion {
  /** Unique identifier for the suggestion */
  key: React.Key;
  /** Value of the suggestion */
  value: string;
  /** Tags associated with the suggestion */
  tags?: Tag[];
  /** Description providing details about the suggestion */
  description?: string;
  /** Group to which the suggestion belongs; suggestions in the same group will be grouped together */
  group?: string;
  /**
   * If the field consists of an array of values, specifying this parameter will target
   * only the specified value.
   */
  arrayIndex?: number;
}

/**
 * Interface for tags used by the search bar.
 */
export interface Tag {
  /** Unique identifier for the tag */
  key: React.Key;
  /** Value of the tag */
  value: string;
  /** Optional display name; if the name is absent, the value is used */
  name?: string;
  /** Optional CSS class name for styling (badge CSS) */
  className?: string;
}

/**
 * Interface for search filter fields in the search bar.
 */
export interface FilterField extends SearchSuggestion {
  /** Allowed comparison expressions for this field (server-side) */
  expressions: FilterExpression[];
  /** Allowed comparison expressions for this field (client-side) */
  localExpressions: FilterExpression[];
  /** Function to validate field values (if required) */
  validateValue?: (searchFilter: SearchFilter, assetCache: AssetCache) => FilterError | undefined;
  /** Function to provide suggestions for field values (if applicable) */
  getValueSuggestion?: (searchFilter: SearchFilter, assetCache: AssetCache) => FilterValue[];
  /** Type is used to inform the backend how the property should be processed. Assets have a different processing logic than logs. Defaults to 'log' */
  type?: string;
  /** This field exists only in the frontend and is unavailable for server-side filtering. */
  isLocal?: boolean;
}

/** Interface for search filter expressions in the search bar. */
export interface FilterExpression extends SearchSuggestion {
  /** Indicates whether the expression supports an array of values */
  isMultipleValuesSupported?: boolean;
}

/** Type for search filter values in the search bar. */
export type FilterValue = SearchSuggestion;

export type WithRequired<T, K extends keyof T> = T & Required<Pick<T, K>>;

/**
 * Interface representing a single filter used in search operations.
 */
export interface SearchFilter {
  /** Unique identifier for the search filter */
  key: React.Key;
  /** Query field name used to search logs */
  field?: string;
  /** Comparison expression for the field */
  expression?: string;
  /** Value associated with the field */
  value?: string | string[];
  /** Indicates whether the search filter is marked for local filtering only */
  isLocal?: boolean;
  /** Indicates whether this item is hidden in the search bar */
  isHidden?: boolean;
  /**
   * The primary filter is the main input field used for searching in the search bar.
   * Only one primary filter can exist, and it is managed internally by the search bar
   * component. It is excluded from API requests and should not be set to true manually
   * outside of the search bar component.
   */
  isPrimary?: boolean;
  /** This parameter is used to disable autofocus when creating a SearchFilter outside of the search bar */
  isAutoFocusEnabled?: boolean;
}

/** A valid search filter type that includes required "field", "expression", and "value" properties */
export type ValidSearchFilter = WithRequired<SearchFilter, "field" | "expression" | "value">;

/** Interfaces for actions to update, create, or delete search filters */
export interface ActionUpdate {
  type: "update";
  item: Partial<SearchFilter> & Pick<SearchFilter, "key">;
}
export interface ActionCreate {
  type: "create";
}
export interface ActionDelete {
  type: "delete";
  key: SearchFilter["key"];
}
export interface ActionAppend {
  type: "append";
  item: SearchFilter;
}
export type Action = ActionUpdate | ActionCreate | ActionDelete | ActionAppend;

/** Available comparison expressions */
export type ExpressionType = "eq" | "neq" | "in" | "nin" | "like" | "nlike" | "more" | "less" | "moreq";

/**
 * Callback function triggered when a search filter gains focus.
 */
export type SearchFilterFocusFn = (filter: SearchFilter) => void;

/**
 * Callback function triggered when a search builder loses focus.
 */
export type SearchBuilderBlurFn = () => void;

/**
 * Callback function triggered when a search builder gains focus.
 */
export type SearchBuilderFocusFn = (e: React.FocusEvent<HTMLDivElement>) => void;
