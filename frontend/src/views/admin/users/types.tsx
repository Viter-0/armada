import { paths } from "@/api/schema";

export interface UserCreateProps {
  providerId: string;
  callback: () => void;
  roles: Record<string, string>;
}
export interface UserUpdateProps {
  id: string;
  callback: () => void;
  roles: Record<string, string>;
}

export type UserCreateComponent = React.FC<UserCreateProps>;
export type UserUpdateComponent = React.FC<UserUpdateProps>;

export type ProvidersGetList = paths["/api/providers"]["get"]["responses"]["200"]["content"]["application/json"];
export type RolesGetList = paths["/api/roles"]["get"]["responses"]["200"]["content"]["application/json"];

export type UsersGetList = paths["/api/users"]["get"]["responses"]["200"]["content"]["application/json"];
export type User = UsersGetList[0];

export type UserCreate = paths["/api/users"]["post"]["requestBody"]["content"]["application/json"];
export type UserUpdate = paths["/api/users/{id}"]["put"]["requestBody"]["content"]["application/json"];
export type UserGet = paths["/api/users/{id}"]["get"]["responses"]["200"]["content"]["application/json"];
