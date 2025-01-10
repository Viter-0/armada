import { CustomAxiosRequestConfig, api } from "@/api";
import { paths } from "@/api/schema";
import { THEME_DARK } from "@/config/const";
import { create } from "zustand";
import { persist } from "zustand/middleware";

type User = paths["/api/users/me"]["get"]["responses"]["200"]["content"]["application/json"];
type AccessToken = paths["/api/auth/token"]["post"]["responses"]["200"]["content"]["application/json"];
type Credentials = paths["/api/auth/token"]["post"]["requestBody"]["content"]["application/x-www-form-urlencoded"];
type SetupSettings = paths["/api/setup/state"]["get"]["responses"]["200"]["content"]["application/json"];

export interface State {
  user: null | User;
  showNotifications: boolean;
  setup?: SetupSettings;
  theme: string;
  // The timezone setting of the user/application
  timezone: string;
}

export interface Actions {
  // Signs in a user with the provided credentials and updates the user state
  signin: (data: Credentials) => Promise<void>;
  // Signs out the user and clears the user state
  signout: () => Promise<void>;
  // Refreshes the current user session, typically for re-authentication or token renewal
  refresh: () => Promise<void>;
  updateSetup: (settings: State["setup"]) => void;
  updateTheme: (name: string) => void;
  updateTimezone: (value: string) => void;
  toggleShowNotifications: () => void;
}

/**
 * This store is responsible for storing the global app state
 */
export const useGlobalStore = create<State & Actions>()(
  persist(
    (set, get) => ({
      user: null,
      showNotifications: false,
      theme: THEME_DARK,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,

      signin: async (data: Credentials) => {
        const res = await api.post<AccessToken>("/api/auth/token", data, {
          headers: { "Content-Type": "multipart/form-data" },
          refreshAccessToken: false,
        } as CustomAxiosRequestConfig);

        api.defaults.headers.common.Authorization = "Bearer " + res.data.access_token;
        await get().refresh();
      },

      signout: async () => {
        await api.delete("/api/auth/token");
        set(() => ({ user: null }));
      },

      refresh: async () => {
        const userData = await api.get<User>("/api/users/me");
        set(() => ({ user: userData.data }));
      },

      updateSetup: (settings?: SetupSettings) => set({ setup: settings }),
      updateTheme: (name: string) => set({ theme: name }),
      updateTimezone: (value: string) => set({ timezone: value }),
      toggleShowNotifications: () => set((state) => ({ showNotifications: !state.showNotifications })),
    }),
    {
      name: "global",
      partialize: (state) => ({
        showNotifications: state.showNotifications,
        theme: state.theme,
        timezone: state.timezone,
      }),
    }
  )
);
