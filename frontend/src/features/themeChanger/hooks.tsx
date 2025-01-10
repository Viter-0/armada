import { useGlobalStore } from "@/store";
import { useEffect } from "react";
import { useShallow } from "zustand/react/shallow";

/**
 * Custom hook for changing the theme of the application.
 *
 * This hook updates the `data-theme` attribute on the body element based on the current theme state.
 *
 */
export function useThemeChanger() {
  const state = useGlobalStore(
    useShallow((state) => ({
      theme: state.theme,
    }))
  );

  useEffect(() => {
    document.body.setAttribute("data-theme", state.theme);
  }, [state.theme]);
}
