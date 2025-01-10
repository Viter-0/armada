import { DATETIME_FORMAT, DATETIME_WITH_MILLISECONDS_FORMAT } from "@/config/const";
import { useGlobalStore } from "@/store";
import { formatInTimeZone, fromZonedTime, toZonedTime } from "date-fns-tz";
import { Address4, Address6 } from "ip-address";
import { FieldValues, UseFormReturn } from "react-hook-form";

/**
 * A utility function to create a partial of UseFormReturn.
 *
 * This function is useful for breaking down a large form into smaller, manageable sections while maintaining type safety.
 *
 * https://github.com/orgs/react-hook-form/discussions/9345
 *
 * @example
 *
 * type PartialFormValues =  { name: string, host: string }
 * function PartialFormExample<T extends FieldValues>({ fullForm }: { fullForm: UseFormReturn<T & PartialFormValues> }) {
 *   const form = partialForm<PartialFormValues>(fullForm)
 *   return <FormInput {...form.register('name')}  name="name" type="text" title="Name"/>
 * }
 *
 */
export function partialForm<TFieldValues extends FieldValues = FieldValues, TContext = unknown>(form: unknown) {
  return form as unknown as UseFormReturn<TFieldValues, TContext>;
}

/**
 * Converts an object containing query parameters into a URL-encoded query string.
 * This function ensures that all values are converted to strings before encoding.
 */
export function buildQueryParams(params: Record<string, unknown | unknown[]>): string {
  const urlParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      value.forEach((value) => urlParams.append(key, String(value)));
    } else {
      urlParams.append(key, String(value));
    }
  });
  return urlParams.toString();
}

/**
 * Formats a Date object into a string based on the application's timezone.
 * By default, it uses the ISO 8601 standard (short version) for formatting.
 */
export function formatDateTime(date: Date, format = DATETIME_FORMAT) {
  return formatInTimeZone(date, useGlobalStore.getState().timezone, format);
}

/**
 * Formats a Date object into a string with millisecond precision based on the application's timezone.
 * By default, it uses ISO 8601 format with milliseconds included.
 */
export function formatDateTimeWithMilliseconds(date: Date, format = DATETIME_WITH_MILLISECONDS_FORMAT) {
  return formatInTimeZone(date, useGlobalStore.getState().timezone, format);
}

/**
 * Converts a Date object to the application's configured timezone.
 * This function adjusts the given date to the timezone set in the global application state.
 */
export function toDateTimeInCurrentTimezone(date: Date) {
  return toZonedTime(date, useGlobalStore.getState().timezone);
}

/**
 * Converts the application's Date object to the current system time zone.
 * This function adjusts the given date from the timezone set in the global application state to UTC.
 */
export function fromCurrentTimezoneToLocal(date: Date) {
  return fromZonedTime(date, useGlobalStore.getState().timezone);
}

/**
 * Joins multiple string segments into a well-formed URL.
 *
 * This function takes multiple string arguments representing different parts of a URL,
 * joins them with a single slash (`/`), and ensures that the final URL is properly formatted
 * by removing any duplicate slashes and handling special cases such as protocols and query parameters.
 *
 */
export function urlJoin(...args: string[]) {
  return args
    .join("/")
    .replace(/[/]+/g, "/")
    .replace(/^(.+):\//, "$1://")
    .replace(/^file:/, "file:/")
    .replace(/\/(\?|&|#[^!])/g, "$1")
    .replace(/\?/g, "&")
    .replace("&", "?");
}

/**
 * Parses a given IP address string and returns an instance of Address4 or Address6.
 */
export function ipAddress(ip: string): Address4 | Address6 | undefined {
  try {
    return new Address4(ip);
  } catch {
    try {
      return new Address6(ip);
    } catch {
      return;
    }
  }
}
