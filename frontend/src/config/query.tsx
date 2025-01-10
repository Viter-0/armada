import { useGlobalStore } from "@/store";
import { parseAPIError } from "@/util/error";
import { MutationCache, QueryCache, QueryClient } from "@tanstack/react-query";
import { AxiosError } from "axios";
import toast from "react-hot-toast";

interface QueryMetaMeta extends Record<string, unknown> {
  /** Whether to show a toast message when the query fails. Defaults to false */
  showError?: boolean;
  /** Custom error message to overwrite the default query response error */
  errorMessage?: string;
}

interface MutationMetaMeta extends Record<string, unknown> {
  /** Whether to invalidate queries. Defaults to true */
  invalidateQueries: boolean;
}

declare module "@tanstack/react-query" {
  interface Register {
    defaultError: AxiosError;
    queryMeta: QueryMetaMeta;
    mutationMeta: MutationMetaMeta;
  }
}

export const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error: Error | AxiosError, query) => {
      if (query?.meta?.showError && useGlobalStore.getState().user) {
        if (query?.meta?.errorMessage) {
          toast.error(query.meta.errorMessage);
        } else {
          toast.error(parseAPIError(error).message);
        }
        return;
      }
    },
  }),
  mutationCache: new MutationCache({
    onSuccess: (_data, _variables, _context, mutation) => {
      if (!(mutation.options.meta?.invalidateQueries ?? true)) return;
      queryClient.invalidateQueries();
    },
  }),
});
