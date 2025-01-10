import logoMicrosoft from "@/assets/media/logo_microsoft.svg";
import { Image } from "@/components";
import { ProviderTypesEnum } from "@/config/const";
import { BuildingLibraryIcon } from "@heroicons/react/24/outline";
import { LdapUserCreate, LdapUserUpdate } from "./forms/ldap";
import { LocalUserCreate, LocalUserUpdate } from "./forms/local";
import { UserCreateComponent, UserUpdateComponent } from "./types";

const iconClasses = "h-10 w-10";

/**
 * Represents the structure of a user provider that the application can handle.
 */
export interface SupportedUserProvider {
  id: string; // URL-safe string
  icon: React.ReactNode;
  create: {
    component: UserCreateComponent;
    route: string;
  };
  get: {
    component: undefined;
    route: string;
  };
  delete: {
    component: undefined;
    route: string;
  };
  update: {
    component: UserUpdateComponent;
    route: string;
  };
}

/**
 * Helper function to create CRUD operations with defaults
 */
function createCRUDOperations(
  baseRoute: string,
  createComponent: UserCreateComponent,
  updateComponent: UserUpdateComponent
): Pick<SupportedUserProvider, "get" | "delete" | "create" | "update"> {
  return {
    get: { route: baseRoute, component: undefined },
    delete: { route: baseRoute, component: undefined },
    create: { route: baseRoute, component: createComponent },
    update: { route: baseRoute, component: updateComponent },
  };
}

/**
 * A list of supported user providers with detailed configurations for each.
 */
export const supportedUserProviders: SupportedUserProvider[] = [
  {
    id: ProviderTypesEnum.LDAP,
    ...createCRUDOperations("/api/users", LdapUserCreate, LdapUserUpdate),
    icon: <Image className={iconClasses} src={logoMicrosoft} />,
  },
  {
    id: ProviderTypesEnum.LOCAL,
    ...createCRUDOperations("/api/users", LocalUserCreate, LocalUserUpdate),
    icon: <BuildingLibraryIcon className={"stroke-sky-700 shrink-0 " + iconClasses} />,
  },
];

/**
 * Utility object to manage user providers.
 */
export const userProviderManager = {
  getUserProviderByType(type: string): SupportedUserProvider | undefined {
    return supportedUserProviders.find((item) => item.id === type);
  },

  getAllUserProviders(): SupportedUserProvider[] {
    return supportedUserProviders;
  },
};
