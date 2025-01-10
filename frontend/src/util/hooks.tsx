import { api } from "@/api";
import { paths } from "@/api/schema";
import { ContextMenuPosition } from "@/components/menu";
import { useQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useState } from "react";
import { To, useLocation, useNavigate } from "react-router";

type SetupSettings = paths["/api/setup/state"]["get"]["responses"]["200"]["content"]["application/json"];

/**
 * Hook to handle modal actions.
 */
export function useModal() {
  const [isOpen, setOpen] = useState(false);

  const open = () => setOpen(true);
  const close = () => setOpen(false);

  return { isOpen, setOpen, open, close };
}

/**
 * Hook to handle Context Menu actions.
 */
export function useContextMenu() {
  const [isOpen, setOpen] = useState(false);
  const [position, setPosition] = useState<ContextMenuPosition>({ x: 0, y: 0 });

  const open = () => setOpen(true);
  const close = () => setOpen(false);

  return { isOpen, setOpen, open, close, position, setPosition };
}

/**
 * Hook to handle actions outside a specified element.
 *
 * @param type - The type of event to listen for.
 * @param ref - The reference to the element.
 * @param callback - The callback to execute when the event occurs outside the element.
 */
export function useOutsideAction<T>(
  type: keyof DocumentEventMap,
  ref: React.MutableRefObject<T>,
  callback: (e: Event) => void
) {
  useEffect(() => {
    const handleAction = (event: Event) => {
      if (ref.current && ref.current instanceof Node && !ref.current.contains(event.target as Node)) {
        callback(event);
      }
    };
    document.addEventListener(type, handleAction, true);

    return () => {
      document.removeEventListener(type, handleAction, true);
    };
  }, [type, ref, callback]);
}

/**
 * A hook that provides a function to navigate to the last visited location.
 * If the last visited location doesn't exist, it navigates to a specified fallback route.
 *
 * @returns A callback function `lastVisited` that navigates to the last location if available, or to the specified fallback.
 */
export function useLastVisitedLocation() {
  const location = useLocation();
  const navigate = useNavigate();

  const lastVisited = useCallback(
    (fallback: To = "..") => {
      const lastLocationExists = location.key !== "default";
      if (lastLocationExists) {
        navigate(-1);
      } else {
        navigate(fallback);
      }
    },
    [location, navigate]
  );

  return lastVisited;
}

/**
 * Custom hook to redirect the user to the setup screen if the setup process is not completed.
 *
 * This hook is designed to be used in routes outside the state loader.
 *
 */
export function useSetupNotCompleteRedirect() {
  const navigate = useNavigate();
  const setupState = useQuery({
    queryKey: ["setup_state"],
    queryFn: () => api.get<SetupSettings>("/api/setup/state").then((response) => response.data),
  });

  useEffect(() => {
    if (setupState.data?.is_setup_complete == false) navigate("/setup");
  }, [setupState.data, navigate]);

  return { isPending: setupState.isPending };
}
