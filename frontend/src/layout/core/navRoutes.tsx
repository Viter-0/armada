import { Square3Stack3DIcon, Squares2X2Icon } from "@heroicons/react/24/outline";
import { NavRoute } from "../navbar";

const iconClasses = `h-6 w-6`;

export const navRoutes: NavRoute[] = [
  {
    path: "/",
    icon: <Squares2X2Icon className={iconClasses} />,
    name: "Logs",
  },
  {
    path: "/assets",
    icon: <Square3Stack3DIcon className={iconClasses} />,
    name: "Assets",
    activeRoutePropagation: true,
  },
];
