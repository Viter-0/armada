import { NotFoundError } from "@/components";
import { useLastVisitedLocation } from "@/util/hooks";
import { useParams } from "react-router";
import { dataSourceManager } from "../supportedDataSources";

/**
 * Page component for updating a Data Source. It dynamically loads the appropriate form based on the data source type.
 */
export default function DataSourceUpdate() {
  const { dataSourceId, type: dataSourceType } = useParams();
  const navigate = useLastVisitedLocation();
  const callback = () => navigate("..");

  if (!dataSourceType || !dataSourceId) return <NotFoundError />;
  const dataSource = dataSourceManager.getDataSourceByType(dataSourceType);
  if (!dataSource) return <NotFoundError />;

  return <dataSource.update.component id={dataSourceId} successCallback={callback} cancelCallback={callback} />;
}
