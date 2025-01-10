import { useEffect, useState } from "react";
import { NavLink, useLocation } from "react-router";

export interface NavRoute {
  path: string;
  icon?: React.ReactNode;
  name: string;
  activeRoutePropagation?: boolean;
  submenu?: NavRoute[];
}

const activeRouteIndicatorSidebar = "absolute mt-1 mb-1 inset-y-0 left-0 w-1 rounded-tr-md rounded-br-md bg-primary";
const activeRouteIndicatorTopBar = "absolute mx-1 inset-x-0 bottom-0 h-1 rounded-tr-md rounded-tl-md bg-primary";

/**
 * Single navigation link in the sidebar.
 * @param navRoute - The navigation route object.
 */
function SidebarNavLink({ navRoute }: { navRoute: NavRoute }) {
  return (
    <NavLink
      end={!navRoute.activeRoutePropagation}
      className={({ isActive }) => `${isActive ? "font-semibold bg-base-200 " : "font-normal"}`}
      to={navRoute.path}
    >
      {({ isActive }) => (
        <>
          {navRoute.icon ?? null} {navRoute.name}
          {isActive && <span className={activeRouteIndicatorSidebar} aria-hidden="true"></span>}
        </>
      )}
    </NavLink>
  );
}

/**
 * Sidebar submenu.
 * @param navRoute - The navigation route object.
 */
function SidebarNavSubmenu({ navRoute }: { navRoute: NavRoute }) {
  const location = useLocation();
  const [isExpanded, setIsExpanded] = useState(false);

  /** On page load, open submenu if the current path is found in the submenu routes */
  useEffect(() => {
    if (navRoute.submenu?.some((m) => m.path === location.pathname)) {
      setIsExpanded(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <details open={isExpanded}>
      <summary>
        {navRoute.icon} {navRoute.name}
      </summary>
      <ul>{navRoute.submenu && <SidebarNav navRoutes={navRoute.submenu} />}</ul>
    </details>
  );
}

/**
 * Sidebar navigation.
 * Intended for use in the Menu component.
 * @param navRoutes - The array of navigation routes.
 */
export function SidebarNav({ navRoutes }: { navRoutes: NavRoute[] }) {
  return navRoutes.map((route, k) => (
    <li key={k}>{route.submenu ? <SidebarNavSubmenu navRoute={route} /> : <SidebarNavLink navRoute={route} />}</li>
  ));
}

/**
 * Single navigation link in the top bar.
 * @param navRoute - The navigation route object.
 */
function TopBarNavLink({ navRoute }: { navRoute: NavRoute }) {
  return (
    <NavLink
      end={!navRoute.activeRoutePropagation}
      className={({ isActive }) => `${isActive ? "font-semibold" : "font-normal"}`}
      to={navRoute.path}
    >
      {({ isActive }) => (
        <>
          {navRoute.icon} {navRoute.name}
          {isActive && <span className={activeRouteIndicatorTopBar} aria-hidden="true"></span>}
        </>
      )}
    </NavLink>
  );
}

/**
 * Top bar navigation.
 * @param navRoutes - The array of navigation routes.
 */
export function TopBarNav({ navRoutes }: { navRoutes: NavRoute[] }) {
  return navRoutes.map((route, k) => (
    <li key={k}>{route.submenu ? <SidebarNavSubmenu navRoute={route} /> : <TopBarNavLink navRoute={route} />}</li>
  ));
}
