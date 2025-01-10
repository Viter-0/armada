import { api } from "@/api";
import { parseAPIError } from "@/util/error";
import { urlJoin } from "@/util/helpers";
import { useMutation } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { dataSourceManager } from "../supportedDataSources";

/**
 * Hook to delete a Data Source.
 *
 * @param type - The type of the data source
 * @param id - The ID of the data source to delete.
 */
export function useDataSourceDelete({ id, type, onSuccess }: { id: string; type: string; onSuccess?: () => void }) {
  const mutation = useMutation({
    mutationFn: () => {
      const dataSource = dataSourceManager.getDataSourceByType(type);
      if (!dataSource) throw new Error(`Invalid data source type - ${dataSource}`);
      return api.delete(urlJoin(dataSource.delete.route, id));
    },
    onSuccess: () => (onSuccess ? onSuccess() : toast.success("The Data Source was deleted")),
    onError: (error) => toast.error(parseAPIError(error).message),
  });

  return { deleteSource: mutation.mutate };
}
