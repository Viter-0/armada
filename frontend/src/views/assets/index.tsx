import { Box, Menu, MenuTitle, NotFoundError } from "@/components";
import { NavRoute, SidebarNav } from "@/layout/navbar";
import { Outlet, useParams } from "react-router";
import AssetNetworks from "./networks";

const navRoutes: NavRoute[] = [
  {
    path: "hosts",
    name: "Hosts",
    activeRoutePropagation: true,
  },
  // {
  //   path: "firewall_rules",
  //   name: "Firewall Rules",
  //   activeRoutePropagation: true,
  // },
  {
    path: "networks",
    name: "Networks",
    activeRoutePropagation: true,
  },
  {
    path: "services",
    name: "Services",
    activeRoutePropagation: true,
  },
  {
    path: "users",
    name: "Users",
    activeRoutePropagation: true,
  },
];

export function Assets() {
  return (
    <Box className="flex grow">
      <Box className="w-72 bg-base-100">
        <Menu className="p-2">
          <MenuTitle className="text-xl">Assets</MenuTitle>
          <SidebarNav navRoutes={navRoutes} />
        </Menu>
      </Box>
      <Box className="p-4 grow relative">
        <Outlet />
      </Box>
    </Box>
  );
}

const supportedAssets: Record<string, JSX.Element> = {
  networks: <AssetNetworks />,
};

/**
 * Page component for loading asset index element.
 */
export default function AssetTypeLoader() {
  const { type: assetType } = useParams();

  if (!assetType) return <NotFoundError />;
  const assetElement = supportedAssets[assetType];
  if (!assetElement) return <NotFoundError />;

  return <>{assetElement}</>;
}
