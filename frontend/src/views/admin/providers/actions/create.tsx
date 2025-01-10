import { NotFoundError } from "@/components";
import { useNavigate, useParams } from "react-router";
import { authenticationProviderManager } from "../supportedProviders";

/**
 * Page component for creating an authentication provider. It dynamically loads the appropriate form based on the authentication provider type.
 */
export default function AuthenticationProviderCreate() {
  const { type: providerType } = useParams();
  const navigate = useNavigate();

  const createProviderCallback = () => navigate("..");

  if (!providerType) return <NotFoundError />;
  const provider = authenticationProviderManager.getProviderByType(providerType);
  if (!provider?.create.component) return <NotFoundError />;

  return <provider.create.component callback={createProviderCallback} />;
}
