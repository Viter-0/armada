import { Cog6ToothIcon, CubeIcon, HomeIcon, UsersIcon } from "@heroicons/react/24/outline";
import { NavRoute } from "../navbar";

const iconClasses = ` h-6 w-6 `;
//const submenuIconClasses = ` h-5 w-5`;

export const navRoutes: NavRoute[] = [
  {
    path: "/",
    icon: <HomeIcon className={iconClasses} />,
    name: "Home",
  },

  {
    path: "",
    icon: <UsersIcon className={`${iconClasses} inline`} />,
    name: "Identity",
    submenu: [
      {
        path: "/admin/users",
        name: "Users",
        activeRoutePropagation: true,
      },
      {
        path: "/admin/roles",
        name: "Roles",
      },
      {
        path: "/admin/providers",
        name: "Providers",
        activeRoutePropagation: true,
      },
    ],
  },
  {
    path: "",
    icon: <CubeIcon className={iconClasses} />,
    name: "Data Sources",
    submenu: [
      {
        path: "/admin/datasources/devices",
        name: "Sources",
        activeRoutePropagation: true,
      },
      {
        path: "/admin/datasources/credentials",
        name: "Credentials",
        activeRoutePropagation: true,
      },
    ],
  },
  // {
  //   path: '',
  //   icon: <ShieldCheckIcon className={iconClasses}/>,
  //   name: 'Security',
  //   submenu : [
  //     {
  //       path: '/admin/security/certificates',
  //       icon: <Square3Stack3DIcon className={submenuIconClasses}/>,
  //       name: 'Certificates',
  //       activeRoutePropagation: true
  //     },
  //   ]
  // },
  {
    path: "/admin/settings",
    icon: <Cog6ToothIcon className={iconClasses} />,
    name: "Settings",
    activeRoutePropagation: true,
    submenu: [
      {
        path: "/admin/settings/general",
        name: "General",
        activeRoutePropagation: true,
      },
      {
        path: "/admin/settings/security",
        name: "Security",
        activeRoutePropagation: true,
      },
    ],
  },
];
