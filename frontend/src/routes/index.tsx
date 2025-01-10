import { ScopesEnum } from "@/config/const";
import { AdminLayout } from "@/layout/admin";
import { CoreLayout } from "@/layout/core";
import { StateLoader } from "@/store/stateLoader";
import { Assets } from "@/views/assets";
import AssetFirewallRules from "@/views/assets/firewall_rules";
import AssetHosts from "@/views/assets/hosts";
import AssetHostUpdate, { AssetHostCreate } from "@/views/assets/hosts/forms";
import AssetNetworks from "@/views/assets/networks";
import AssetNetworkUpdate, { AssetNetworkCreate } from "@/views/assets/networks/forms";
import { AssetOverview } from "@/views/assets/overview";
import AssetServices from "@/views/assets/services";
import AssetServiceUpdate, { AssetServiceCreate } from "@/views/assets/services/forms";
import AssetUsers from "@/views/assets/users";
import { NotFoundErrorPage } from "@/views/errors/404";
import { InternalErrorPage } from "@/views/errors/500";
import { Login } from "@/views/login";
import { Logs } from "@/views/logs";
import { CurrentUserProfile } from "@/views/profile";
import { lazy, Suspense } from "react";
import { createBrowserRouter, Outlet, RouterProvider } from "react-router";
import { AuthGuard } from "./authGuard";

/**
 * Function that wraps and returns a lazy-loaded version of the component.
 *
 * @remarks
 * - The component being lazy-loaded should be the default export of the module.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function makeLazyLoad<C extends React.ComponentType<any>>(resolve: () => Promise<{ default: C }>) {
  const LazyComponent = lazy(resolve);
  function RouteLazyLoad(props: React.ComponentProps<C>) {
    return (
      <Suspense
      // fallback={<ContentLoadingOverlay containerClassName="h-full" />}
      >
        <LazyComponent {...props} />
      </Suspense>
    );
  }

  return RouteLazyLoad;
}

const AdminDashboard = makeLazyLoad(() => import("@/views/admin/dashboard"));
const ApplicationUsers = makeLazyLoad(() => import("@/views/admin/users"));
const Setup = makeLazyLoad(() => import("@/views/setup"));
const UserCreate = makeLazyLoad(() => import("@/views/admin/users/actions/create"));
const UserUpdate = makeLazyLoad(() => import("@/views/admin/users/actions/update"));
const SettingsGeneral = makeLazyLoad(() => import("@/views/admin/settings/general"));
const SettingsSecurity = makeLazyLoad(() => import("@/views/admin/settings/security"));
const Roles = makeLazyLoad(() => import("@/views/admin/roles"));
const AuthenticationProviders = makeLazyLoad(() => import("@/views/admin/providers"));
const AuthenticationProviderCreate = makeLazyLoad(() => import("@/views/admin/providers/actions/create"));
const AuthenticationProviderUpdate = makeLazyLoad(() => import("@/views/admin/providers/actions/update"));
const DataSources = makeLazyLoad(() => import("@/views/admin/datasources"));
const DataSourceCreate = makeLazyLoad(() => import("@/views/admin/datasources/actions/create"));
const DataSourceUpdate = makeLazyLoad(() => import("@/views/admin/datasources/actions/update"));
const Credentials = makeLazyLoad(() => import("@/views/admin/datasources/credentials"));
const CredentialsCreate = makeLazyLoad(() => import("@/views/admin/datasources/credentials/create"));
const CredentialsUpdate = makeLazyLoad(() => import("@/views/admin/datasources/credentials/update"));
const DataSourceDetails = makeLazyLoad(() => import("@/views/admin/datasources/details"));

const router = createBrowserRouter([
  {
    path: "/login",
    element: <Login />,
    errorElement: import.meta.env.PROD ? <InternalErrorPage /> : undefined,
  },
  {
    path: "/setup",
    element: <Setup />,
    errorElement: <InternalErrorPage />,
  },

  {
    id: "app",
    path: "/",
    element: (
      <StateLoader>
        <Outlet />
      </StateLoader>
    ),
    errorElement: import.meta.env.PROD ? <InternalErrorPage /> : undefined,
    children: [
      {
        id: "admin",
        path: "/admin",
        element: (
          <AuthGuard scopes={[ScopesEnum.ADMIN_READ]}>
            <AdminLayout />
          </AuthGuard>
        ),
        children: [
          {
            index: true,
            element: <AdminDashboard />,
          },
          {
            path: "users",
            children: [
              {
                index: true,
                element: <ApplicationUsers />,
              },
              {
                path: ":type/:providerId/create",
                element: <UserCreate />,
              },
              {
                path: ":type/:userId/update",
                element: <UserUpdate />,
              },
            ],
          },
          {
            path: "providers",
            children: [
              {
                index: true,
                element: <AuthenticationProviders />,
              },
              {
                path: ":type/create",
                element: <AuthenticationProviderCreate />,
              },
              {
                path: ":type/:Id/update",
                element: <AuthenticationProviderUpdate />,
              },
            ],
          },
          {
            path: "roles",
            element: <Roles />,
          },
          {
            path: "datasources",
            children: [
              {
                path: "devices",
                children: [
                  {
                    index: true,
                    element: <DataSources />,
                  },
                  {
                    path: ":type/create",
                    element: <DataSourceCreate />,
                  },
                  {
                    path: ":type/:dataSourceId/update",
                    element: <DataSourceUpdate />,
                  },
                  {
                    path: ":type/:dataSourceId",
                    element: <DataSourceDetails />,
                  },
                ],
              },
              {
                path: "credentials",
                children: [
                  {
                    index: true,
                    element: <Credentials />,
                  },
                  {
                    path: "create",
                    element: <CredentialsCreate />,
                  },
                  {
                    path: ":profileId/update",
                    element: <CredentialsUpdate />,
                  },
                ],
              },
            ],
          },
          {
            path: "settings",
            children: [
              {
                path: "general",
                element: <SettingsGeneral />,
              },
              {
                path: "security",
                element: <SettingsSecurity />,
              },
            ],
          },
        ],
      },
      {
        path: "/",
        element: <CoreLayout />,
        children: [
          {
            index: true,
            element: <Logs />,
          },
          {
            path: "assets",
            element: <Assets />,
            children: [
              {
                index: true,
                element: <AssetOverview />,
              },
              {
                path: "hosts",
                children: [
                  {
                    index: true,
                    element: <AssetHosts />,
                  },
                  {
                    path: "create",
                    element: <AssetHostCreate />,
                  },
                  {
                    path: ":assetId/update",
                    element: <AssetHostUpdate />,
                  },
                ],
              },
              {
                path: "networks",
                children: [
                  {
                    index: true,
                    element: <AssetNetworks />,
                  },
                  {
                    path: "create",
                    element: <AssetNetworkCreate />,
                  },
                  {
                    path: ":assetId/update",
                    element: <AssetNetworkUpdate />,
                  },
                ],
              },
              {
                path: "services",
                children: [
                  {
                    index: true,
                    element: <AssetServices />,
                  },
                  {
                    path: "create",
                    element: <AssetServiceCreate />,
                  },
                  {
                    path: ":assetId/update",
                    element: <AssetServiceUpdate />,
                  },
                ],
              },
              {
                path: "firewall_rules",
                element: <AssetFirewallRules />,
              },
              {
                path: "users",
                element: <AssetUsers />,
              },
            ],
          },
          {
            path: "profile",
            element: <CurrentUserProfile />,
          },
        ],
      },
    ],
  },

  {
    path: "*",
    element: <NotFoundErrorPage />,
  },
]);

export function Router() {
  return <RouterProvider router={router} />;
}
