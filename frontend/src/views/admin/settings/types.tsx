import { paths } from "@/api/schema";

export type SettingsGet = paths["/api/settings/general"]["get"]["responses"]["200"]["content"]["application/json"];
export type SettingsUpdate = paths["/api/settings/general"]["put"]["requestBody"]["content"]["application/json"];
