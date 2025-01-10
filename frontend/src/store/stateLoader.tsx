import { api } from "@/api";
import { paths } from "@/api/schema";
import { AppLoadingOverlay } from "@/components";
import { ApplicationError } from "@/components/error";
import { EventsEnum } from "@/config/const";
import { useGlobalStore } from "@/store";
import { useMutation } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router";
import { useShallow } from "zustand/react/shallow";

type SetupSettings = paths["/api/setup/state"]["get"]["responses"]["200"]["content"]["application/json"];

function useLoader() {
  const [isComplete, setIsComplete] = useState(false);

  const state = useGlobalStore(
    useShallow((state) => ({
      user: state.user,
      setup: state.setup,
      signout: state.signout,
      refresh: state.refresh,
      updateSetup: state.updateSetup,
    }))
  );

  const mutation = useMutation({
    mutationFn: async () => {
      // Load settings
      const setupState = await api.get<SetupSettings>("/api/setup/state").then((response) => response.data);
      state.updateSetup(setupState);

      // Refresh user session
      await state.refresh().catch(() => {
        return null;
      });
    },
    onSuccess: () => setIsComplete(true),
    onError: () => setIsComplete(true),
  });

  useEffect(() => {
    return mutation.mutate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { isComplete, state, isError: mutation.isError };
}

/**
 * StateLoader is a wrapper component that ensures all necessary application states
 * (such as user authentication, setup completion, etc.) are properly loaded and validated
 * before rendering its child components.
 */
export function StateLoader({ children }: { children?: React.ReactNode }) {
  const loader = useLoader();
  const location = useLocation();

  useEffect(() => {
    // Clear the user session when a 401 response is received and the user session cannot be refreshed.
    document.addEventListener(EventsEnum.SESSION_EXPIRED, () => loader.state.signout());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!loader.isComplete) return <AppLoadingOverlay />;
  if (loader.isError) return <ApplicationError />;

  if (!loader.state.setup?.is_setup_complete) return <Navigate to="/setup" />;
  if (!loader.state.user) return <Navigate to="/login" state={{ from: location }} replace />;

  return <>{children}</>;
}
