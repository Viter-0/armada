import axios, { AxiosError } from "axios";
import { ErrorOption } from "react-hook-form";

type FormError<T> = [keyof T | `root.${string}` | "root", ErrorOption];

// Class representing an API error
class APIError extends Error {
  public status?: number;
  public method?: string;
  public url?: string;

  constructor(message: string, status?: number, url?: string, method?: string, name = "APIError") {
    super(message);
    this.name = name;
    this.status = status;
    this.url = url;
    this.method = method;
    Object.setPrototypeOf(this, APIError.prototype);
  }
}

// Common form error messages
export const formErrorMessages = {
  fieldRequired: "Field is required",
};

// Common application error messages
export const appErrorMessages = {
  internalServer: "Internal Server Error",
  unexpected: "An unexpected error has occurred!",
  notFound: "We are sorry, but the page you are looking for was not found.",
};

/**
 * Function to parse API errors and return a standardized APIError object
 */
export function parseAPIError(error: Error | AxiosError): APIError {
  const errorMessage: APIError = new APIError(appErrorMessages.internalServer);

  if (typeof error === "string") {
    errorMessage.message = error;
    return errorMessage;
  }

  if (!axios.isAxiosError(error)) {
    if (typeof error === "object") {
      if ("message" in error) errorMessage.message = error.message;
      if ("stack" in error) errorMessage.stack = error.stack;
    }
    return errorMessage;
  }

  errorMessage.url = error.config?.url;
  errorMessage.stack = error.stack;
  errorMessage.status = error.response?.status;

  const details = error.response?.data?.detail;

  if (!details) return errorMessage;

  if (typeof details === "string" || typeof details === "number") {
    errorMessage.message = String(details);
    return errorMessage;
  }

  if (Array.isArray(details)) {
    if (details[0]?.loc) errorMessage.message = details[0].loc[details[0].loc.length - 1] + details[0].msg;
    return errorMessage;
  }

  return errorMessage;
}

/**
 * Parses an error (which can be a generic Error or an AxiosError) and returns a standardized
 * `FormError` object compatible with react-hook-form's `setError` function.
 */
export function parseFormError<T>(error: Error | AxiosError<APIError>): FormError<T> {
  const responseError: FormError<T> = ["root", { type: "APIError", message: appErrorMessages.internalServer }];

  if (typeof error === "string") {
    responseError[1].message = error;
    return responseError;
  }

  if (!axios.isAxiosError(error)) {
    if (typeof error === "object") {
      if ("message" in error) responseError[1].message = error.message;
    }
    return responseError;
  }

  const details = error.response?.data?.detail;

  if (!details) return responseError;
  if (typeof details === "string" || typeof details === "number") {
    responseError[1].message = String(details);
    return responseError;
  }

  if (Array.isArray(details)) {
    responseError[1].message = details[0].msg;
    responseError[0] = details[0].loc[details[0].loc.length - 1] as keyof T;
  }

  return responseError;
}
