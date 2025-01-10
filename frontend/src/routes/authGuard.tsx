import { useGlobalStore } from "@/store";
import { ForbiddenErrorPage } from "@/views/errors/403";
import { Navigate, useLocation } from "react-router";
import { useShallow } from "zustand/react/shallow";

/**
 * Guard routes based on user authentication and authorization.
 * It checks if the user is authenticated and has the required permissions (scopes).
 *
 * @param children - The child components to render if the user is authorized.
 * @param scopes - The required scopes for the route (OR comparison).
 */
export function AuthGuard({ children, scopes = [] }: { children: React.ReactNode; scopes: string[] }) {
  const auth = useGlobalStore(
    useShallow((state) => ({
      user: state.user,
    }))
  );

  const location = useLocation();
  let hasPermissions = false;

  if (!auth) return;

  if (!auth.user) return <Navigate to="/login" state={{ from: location }} replace />;

  for (const scope of scopes) {
    if (auth.user.role?.scope_list.includes(scope)) {
      hasPermissions = true;
      break;
    }
  }

  if (!hasPermissions) return <ForbiddenErrorPage />;

  return <>{children}</>;
}
