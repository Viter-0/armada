import logo from "@/assets/media/logo_app.png";
import { Box, Heading, Image, Menu, MenuItem, Navigation } from "@/components";
import { APP_NAME } from "@/config/const";
import { NotificationsIndicator } from "@/features/notifications";
import { ThemeToggle } from "@/features/themeChanger";
import { Outlet } from "react-router";
import { TopBarNav } from "../navbar";
import { ProfileDropdown } from "../profile";
import { navRoutes } from "./navRoutes";

export function CoreLayout() {
  return (
    <Box className="flex flex-col bg-base-200 min-h-screen">
      {/* Navbar */}
      <Navigation className="w-full bg-base-100 h-16">
        <Box className="flex-1">
          <Menu className="menu-horizontal p-2">
            <MenuItem className="hidden lg:block">
              <Heading className="flex items-center tracking-widest font-semibold text-inherit menu-title">
                <Image className="me-2 w-10" src={logo} alt="App Logo" />
                {APP_NAME}
              </Heading>
            </MenuItem>

            {/* Navbar menu */}
            <TopBarNav navRoutes={navRoutes} />
          </Menu>
        </Box>

        {/* Light and dark theme selection**/}
        <ThemeToggle />

        {/* Notifications */}
        <NotificationsIndicator />

        {/* Profile, opening menu on click */}
        <ProfileDropdown />
      </Navigation>

      {/* Page content */}
      <Outlet />
    </Box>
  );
}
