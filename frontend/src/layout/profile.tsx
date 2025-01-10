import avatar from "@/assets/media/avatar.png";
import { Anchor, Box, Divider, Dropdown, DropdownContent, DropdownToggle, Image, Menu, MenuItem } from "@/components";
import AboutModal from "@/features/about";
import { useGlobalStore } from "@/store";
import { Link } from "react-router";
import { useShallow } from "zustand/react/shallow";

/**
 * Navbar profile dropdown
 */
export function ProfileDropdown() {
  const auth = useGlobalStore(
    useShallow((state) => ({
      signout: state.signout,
      user: state.user,
    }))
  );

  return (
    <Dropdown className="dropdown-end ml-4">
      <DropdownToggle className="btn-ghost btn-circle avatar" isChevronVisible={false}>
        <Box className="w-10 rounded-full">
          <Image src={avatar} alt="profile" />
        </Box>
      </DropdownToggle>
      <DropdownContent className="mt-3 w-52 z-10 shadow rounded-box">
        <Menu className="menu-compact p-2">
          <MenuItem className="ms-2 font-semibold">{auth.user?.email}</MenuItem>
          <Divider className="mt-0 mb-0" />
          <MenuItem>
            <Link to={"/admin"}>Admin Panel</Link>
          </MenuItem>
          <MenuItem>
            <Link to={"/profile"}>Profile Settings</Link>
          </MenuItem>
          <MenuItem>
            <AboutModal />
          </MenuItem>
          <Divider className="mt-0 mb-0" />
          <MenuItem>
            <Anchor onClick={() => auth.signout()}>Logout</Anchor>
          </MenuItem>
        </Menu>
      </DropdownContent>
    </Dropdown>
  );
}
