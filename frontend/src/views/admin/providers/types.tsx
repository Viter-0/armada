import { paths } from "@/api/schema";

export interface ProviderCreateProps {
  callback: () => void;
}

export interface ProviderUpdateProps {
  id: string;
  callback: () => void;
}

export type ProviderCreateComponent = React.FC<ProviderCreateProps>;
export type ProviderUpdateComponent = React.FC<ProviderUpdateProps>;

export type ProvidersGetList = paths["/api/providers"]["get"]["responses"]["200"]["content"]["application/json"];
