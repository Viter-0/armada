import { api } from "@/api";
import { ContentLoadingError, ContentLoadingOverlay, NotFoundError } from "@/components";
import { useQuery } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router";
import { userProviderManager } from "../supportedUserProviders";
import { RolesGetList } from "../types";

/**
 * Page component for updating a user. It dynamically loads the appropriate form based on the user type.
 */
export default function UserUpdate() {
  const { userId, type: userType } = useParams();
  const navigate = useNavigate();

  const query = useQuery({
    queryKey: ["roles"],
    queryFn: () => api.get<RolesGetList>("/api/roles").then((response) => response.data),
  });

  const updateUserCallback = () => navigate("..");

  if (!userId || !userType) return <NotFoundError />;
  const provider = userProviderManager.getUserProviderByType(userType);
  if (!provider) return <NotFoundError />;

  if (query.isPending) return <ContentLoadingOverlay />;
  if (query.isError) return <ContentLoadingError error={query.error} />;
  if (!query.data) return null;

  const roles: Record<string, string> = {};
  query.data.forEach((item) => (roles[item.id] = item.name));

  return <provider.update.component id={userId} callback={updateUserCallback} roles={roles} />;
}
