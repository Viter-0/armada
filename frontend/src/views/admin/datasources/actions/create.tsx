import { NotFoundError } from "@/components";
import { useNavigate, useParams } from "react-router";
import { dataSourceManager } from "../supportedDataSources";

/**
 * Page component for creating a Data Source. It dynamically loads the appropriate form based on the data source type.
 */
export default function DataSourceCreate() {
  const { type: dataSourceType } = useParams();

  const navigate = useNavigate();
  const callback = () => navigate("..");

  if (!dataSourceType) return <NotFoundError />;
  const dataSource = dataSourceManager.getDataSourceByType(dataSourceType);
  if (!dataSource) return <NotFoundError />;

  return <dataSource.create.component successCallback={callback} cancelCallback={callback} />;
}
