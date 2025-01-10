import { api } from "@/api";
import { paths } from "@/api/schema";
import { ApplicationError, Center, ContentLoadingOverlay } from "@/components";
import { useQuery } from "@tanstack/react-query";
import { SetupComplete } from "./complete";
import { SetupUser } from "./user";

type SetupState = paths["/api/setup/state"]["get"]["responses"]["200"]["content"]["application/json"];

/**
 * Page component for the initial application setup.
 */
export default function Setup() {
  const { isLoading, isError, data, refetch } = useQuery({
    queryKey: ["setupState"],
    queryFn: () => {
      return api.get<SetupState>("/api/setup/state").then((response) => response.data);
    },
  });

  if (isLoading)
    return (
      <Center className="min-h-screen">
        <ContentLoadingOverlay size={20} />
      </Center>
    );
  if (isError) return <ApplicationError description="Failed to load setup state" />;

  const createUserCallback = () => {
    refetch();
  };

  switch (true) {
    case data?.is_initial_user_created !== true:
      return <SetupUser progress={50} successCallback={createUserCallback} />;
    case data?.is_setup_complete === true:
      return <SetupComplete progress={100} />;
    default:
      return (
        <ApplicationError description="Invalid setup state - The current setup state doesn't match any of the available options." />
      );
  }
}
