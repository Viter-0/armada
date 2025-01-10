import { ExpressionType, FilterExpression } from "./types";

export const Expressions: Record<ExpressionType, FilterExpression> = {
  eq: {
    key: "eq",
    value: "eq",
    description: "Exactly matches the specified value",
    isMultipleValuesSupported: false,
  },
  neq: {
    key: "neq",
    value: "neq",
    description: "Does not match the specified value",
    isMultipleValuesSupported: false,
  },
  in: {
    key: "in",
    value: "in",
    description: "Matches any value in the specified list",
    isMultipleValuesSupported: true,
  },
  nin: {
    key: "nin",
    value: "nin",
    description: "Does not match any value in the specified list",
    isMultipleValuesSupported: true,
  },
  like: {
    key: "like",
    value: "like",
    description: "Contains the specified text anywhere in the value",
    isMultipleValuesSupported: false,
  },
  nlike: {
    key: "nlike",
    value: "nlike",
    description: "Does not contain the specified text anywhere in the value",
    isMultipleValuesSupported: false,
  },
  more: {
    key: "more",
    value: ">",
    description: "Greater than the specified value",
    isMultipleValuesSupported: false,
  },
  moreq: {
    key: "moreq",
    value: ">=",
    description: "Greater than or equal to the specified value",
    isMultipleValuesSupported: false,
  },
  less: {
    key: "less",
    value: "<",
    description: "Less than the specified value",
    isMultipleValuesSupported: false,
  },
};

/** Available filter expressions */
export const availableExpressions = Object.values(Expressions);

// Expressions used to filter fields locally
export const localExpressions = [
  Expressions.eq,
  Expressions.neq,
  Expressions.in,
  Expressions.nin,
  Expressions.like,
  Expressions.nlike,
];
