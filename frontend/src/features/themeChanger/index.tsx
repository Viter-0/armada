import { Anchor, Button, Dropdown, DropdownContent, DropdownToggle, Menu, MenuItem } from "@/components";
import { THEME_DARK, THEME_LIGHT } from "@/config/const";
import { useGlobalStore } from "@/store";
import { MoonIcon, SunIcon } from "@heroicons/react/24/outline";
import { useShallow } from "zustand/react/shallow";

/**
 * Allows users to switch between 'dark' and 'light' themes.
 */
export function ThemeToggle() {
  const state = useGlobalStore(
    useShallow((state) => ({
      theme: state.theme,
      updateTheme: state.updateTheme,
    }))
  );

  if (![THEME_DARK, THEME_LIGHT].includes(state.theme)) return null;

  return (
    <Button
      className="btn-ghost btn-circle"
      onClick={() => (state.theme == THEME_DARK ? state.updateTheme(THEME_LIGHT) : state.updateTheme(THEME_DARK))}
    >
      {state.theme == THEME_DARK && <SunIcon className="swap-on fill-current w-6 h-6" />}
      {state.theme == THEME_LIGHT && <MoonIcon className="swap-off fill-current w-6 h-6" />}
    </Button>
  );
}

/**
 * Allows users to select theme.
 */
export function ThemeSelect({ className }: { className?: string }) {
  const state = useGlobalStore(
    useShallow((state) => ({
      theme: state.theme,
      updateTheme: state.updateTheme,
    }))
  );

  // List of themes to select from
  const themes = [THEME_LIGHT, THEME_DARK];

  return (
    <Dropdown className={className}>
      <DropdownToggle>Theme</DropdownToggle>
      <DropdownContent>
        <Menu className="bg-base-300">
          {themes.map((item) => (
            <MenuItem key={item} onClick={() => state.updateTheme(item)}>
              <Anchor className={state.theme == item ? "bg-base-100" : ""}>
                {item.charAt(0).toUpperCase() + item.slice(1)}
              </Anchor>
            </MenuItem>
          ))}
        </Menu>
      </DropdownContent>
    </Dropdown>
  );
}
