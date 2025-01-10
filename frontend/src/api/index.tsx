import { paths } from "@/api/schema";
import { EventsEnum } from "@/config/const";
import axios, { AxiosRequestConfig } from "axios";

type AccessToken = paths["/api/auth/token"]["post"]["responses"]["200"]["content"]["application/json"];

export const api = axios.create();

export interface CustomAxiosRequestConfig extends AxiosRequestConfig {
  refreshAccessToken?: boolean;
}

const refresh: {
  request?: Promise<string | undefined>;
} = {};

function getAccessToken() {
  return api
    .post<AccessToken>("/api/auth/refresh", {}, { refreshAccessToken: false } as CustomAxiosRequestConfig)
    .then((response) => response.data.access_token)
    .catch(() => undefined);
}

async function refreshAccessToken() {
  if (refresh.request) return await refresh.request;

  refresh.request = getAccessToken();
  const access_token = await refresh.request;
  refresh.request = undefined;
  if (!access_token) {
    // Trigger session expiration event
    const event = new CustomEvent(EventsEnum.SESSION_EXPIRED, { detail: true });
    document.dispatchEvent(event);
    return;
  }
  api.defaults.headers.common.Authorization = "Bearer " + access_token;
  return access_token;
}

// Response interceptor for API calls. Refresh the access token if a 401 response is received.
api.interceptors.response.use(
  (response) => {
    return response;
  },
  async function (error) {
    const originalRequest = error.config;
    if (error.response.status == 401 && originalRequest.refreshAccessToken != false) {
      originalRequest.refreshAccessToken = false;
      const access_token = await refreshAccessToken();
      if (!access_token) return Promise.reject(error);
      originalRequest.headers.Authorization = "Bearer " + access_token;
      return api(originalRequest);
    }
    return Promise.reject(error);
  }
);
