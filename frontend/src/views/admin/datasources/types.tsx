import { components, paths } from "@/api/schema";

export type { CredentialFormConfiguration } from "./credentials/create";

export interface DataSourceCreateProps {
  successCallback: () => void;
  cancelCallback: () => void;
}

export interface DataSourceUpdateProps {
  id: string;
  successCallback: () => void;
  cancelCallback: () => void;
}

export type DataSourceCreateComponent = React.FC<DataSourceCreateProps>;
export type DataSourceUpdateComponent = React.FC<DataSourceUpdateProps>;

export type DataSourcesGetList = paths["/api/data_sources"]["get"]["responses"]["200"]["content"]["application/json"];

export type TasksMetricsGetList = paths["/api/metrics/tasks"]["get"]["responses"]["200"]["content"]["application/json"];
export type TimeInterval = components["schemas"]["TimeInterval"];

// Time Interval with display name
export type TimeIntervalWithName = TimeInterval & { name: string };

export type GenericDataSourceGet = components["schemas"]["PolymorphicDataSourceResponse"];
