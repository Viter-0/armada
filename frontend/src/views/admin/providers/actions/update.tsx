import { NotFoundError } from "@/components";
import { useNavigate, useParams } from "react-router";
import { authenticationProviderManager } from "../supportedProviders";

/**
 * Page component for updating an authentication provider. It dynamically loads the appropriate form based on the authentication provider type.
 */
export default function AuthenticationProviderUpdate() {
  const { Id: entityId, type: providerType } = useParams();
  const navigate = useNavigate();

  const updateProviderCallback = () => navigate("..");

  if (!entityId || !providerType) return <NotFoundError />;
  const provider = authenticationProviderManager.getProviderByType(providerType);
  if (!provider) return <NotFoundError />;

  return <provider.update.component id={entityId} callback={updateProviderCallback} />;
}
