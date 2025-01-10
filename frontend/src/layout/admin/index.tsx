import logo from "@/assets/media/logo_app.png";
import {
  Box,
  Drawer,
  DrawerButton,
  DrawerContent,
  DrawerSide,
  Heading,
  Image,
  Menu,
  MenuItem,
  Navigation,
} from "@/components";
import { APP_NAME } from "@/config/const";
import { NotificationsIndicator } from "@/features/notifications";
import { ThemeToggle } from "@/features/themeChanger";
import { Bars3Icon, XMarkIcon } from "@heroicons/react/24/outline";
import { Outlet } from "react-router";
import { SidebarNav } from "../navbar";
import { ProfileDropdown } from "../profile";
import { navRoutes } from "./navRoutes";

export function AdminLayout() {
  return (
    <Box className="min-h-screen bg-base-200">
      <Drawer className="lg:drawer-open">
        <DrawerContent className="flex flex-col content-center">
          {/* Navbar */}
          <Navigation className="w-full py-3 h-16 bg-base-100">
            <Box className="lg:hidden">
              <DrawerButton className="btn-primary">
                <Bars3Icon className="h-5 inline-block w-5" />
              </DrawerButton>
            </Box>

            <Heading as="h1" className="font-semibold ml-2 flex-1">
              Admin Dashboard
            </Heading>

            {/* Light and dark theme selection**/}
            <ThemeToggle />

            {/* Notifications */}
            <NotificationsIndicator />

            {/* Profile, opening menu on click */}
            <ProfileDropdown />
          </Navigation>

          {/* Page content. */}
          <Outlet />
        </DrawerContent>
        <DrawerSide>
          <Menu className="p-4 pt-3 w-80 min-h-full">
            <DrawerButton className="btn-ghost bg-base-300 btn-circle z-50 top-0 right-0 mt-4 mr-2 absolute lg:hidden">
              <XMarkIcon className="h-5 inline-block w-5" />
            </DrawerButton>
            <MenuItem>
              <Heading className="menu-title flex items-center tracking-widest font-semibold text-inherit py-1">
                <Image className="me-2 w-10" src={logo} alt="App Logo" />
                {APP_NAME}
              </Heading>
            </MenuItem>

            {/* Sidebar routes */}
            <SidebarNav navRoutes={navRoutes} />
          </Menu>
        </DrawerSide>
      </Drawer>
    </Box>
  );
}
