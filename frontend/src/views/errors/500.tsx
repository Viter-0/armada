import { ApplicationError } from "@/components/error";
import { useRouteError } from "react-router";

/**
 * Page component displayed when the application encounters an unrecoverable error.
 */
export function InternalErrorPage() {
  const routeError = useRouteError();
  return <ApplicationError description={routeError ? String(routeError) : undefined} />;
}
