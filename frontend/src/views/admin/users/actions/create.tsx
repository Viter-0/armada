import { api } from "@/api";
import { ContentLoadingError, ContentLoadingOverlay, NotFoundError } from "@/components";
import { useQuery } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router";
import { userProviderManager } from "../supportedUserProviders";
import { RolesGetList } from "../types";

/**
 * Page component for creating a user. It dynamically loads the appropriate form based on the user type.
 */
export default function UserCreate() {
  const { type: userType, providerId } = useParams();
  const navigate = useNavigate();

  const query = useQuery({
    queryKey: ["roles"],
    queryFn: () => api.get<RolesGetList>("/api/roles").then((response) => response.data),
  });

  const createUserCallback = () => navigate("..");

  if (!userType || !providerId) return <NotFoundError />;
  const userProvider = userProviderManager.getUserProviderByType(userType);
  if (!userProvider) return <NotFoundError />;

  if (query.isLoading) return <ContentLoadingOverlay />;
  if (query.isError) return <ContentLoadingError error={query.error} />;
  if (!query.data) return null;

  const roles: Record<string, string> = {};
  query.data.forEach((item) => (roles[item.id] = item.name));

  return <userProvider.create.component providerId={providerId} callback={createUserCallback} roles={roles} />;
}
