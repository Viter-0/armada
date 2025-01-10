import logoMicrosoft from "@/assets/media/logo_microsoft.svg";
import { Image } from "@/components";
import { ProviderTypesEnum } from "@/config/const";
import { urlJoin } from "@/util/helpers";
import { BuildingLibraryIcon } from "@heroicons/react/24/outline";
import { LdapProviderCreate, LdapProviderUpdate } from "./forms/ldap";
import { LocalProviderUpdate } from "./forms/local";
import { ProviderCreateComponent, ProviderUpdateComponent } from "./types";

const iconClasses = "h-10 w-10";

/**
 * Represents the structure of a authentication provider that the application can handle.
 */
export interface SupportedAuthenticationProvider {
  id: string; // URL-safe string
  name: string;
  description: string;
  icon: React.ReactNode;
  create: {
    component?: ProviderCreateComponent;
    route?: string;
  };
  get: {
    component: undefined;
    route: string;
  };
  delete: {
    component: undefined;
    route?: string;
  };
  update: {
    component: ProviderUpdateComponent;
    route: string;
  };
  validate?: {
    component: undefined;
    route: string;
  };
}

/**
 * Helper function to create CRUD operations with defaults
 */
function createCRUDOperations(
  baseRoute: string,
  updateComponent: ProviderUpdateComponent,
  createComponent?: ProviderCreateComponent,
  validateRoute?: boolean
): Pick<SupportedAuthenticationProvider, "get" | "delete" | "create" | "update" | "validate"> {
  return {
    get: { route: baseRoute, component: undefined },
    delete: { route: baseRoute, component: undefined },
    create: { route: baseRoute, component: createComponent },
    update: { route: baseRoute, component: updateComponent },
    validate: validateRoute
      ? {
          component: undefined,
          route: urlJoin(baseRoute, "validate"),
        }
      : undefined,
  };
}

/**
 * A list of supported authentication providers with detailed configurations for each.
 */
export const supportedAuthenticationProviders: SupportedAuthenticationProvider[] = [
  {
    id: ProviderTypesEnum.LDAP,
    name: "LDAP",
    description: "LDAP (Lightweight Directory Access Protocol)",
    ...createCRUDOperations("/api/providers/ldap", LdapProviderUpdate, LdapProviderCreate, true),
    icon: <Image className={iconClasses} src={logoMicrosoft} />,
  },
  {
    id: ProviderTypesEnum.LOCAL,
    name: "Local",
    description: "",
    ...createCRUDOperations("/api/providers/local", LocalProviderUpdate),
    icon: <BuildingLibraryIcon className={"stroke-red-700 shrink-0 " + iconClasses} />,
  },
];

/**
 * Utility object to manage authentication providers.
 */
export const authenticationProviderManager = {
  getProviderByType(type: string): SupportedAuthenticationProvider | undefined {
    return supportedAuthenticationProviders.find((item) => item.id === type);
  },

  getAllProviders(): SupportedAuthenticationProvider[] {
    return supportedAuthenticationProviders;
  },
};
