import { api } from "@/api";
import {
  AlertModal,
  CardTopActionsButton,
  ContentLoadingError,
  ContentLoadingOverlay,
  DeleteEntityButton,
  Modal,
  ModalTitle,
  SelectList,
} from "@/components";
import { SelectItem } from "@/components/types";
import { parseAPIError } from "@/util/error";
import { urlJoin } from "@/util/helpers";
import { useModal } from "@/util/hooks";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { useNavigate } from "react-router";
import { userProviderManager } from "../supportedUserProviders";
import { ProvidersGetList } from "../types";

type UserProviderSelectItem = {
  id: string;
  type: string;
} & SelectItem;

/**
 * Modal to select User type (Provider).
 */
export function UserProviderTypeSelect() {
  const { isOpen, open, close } = useModal();
  const [selected, setSelected] = useState<UserProviderSelectItem | null>(null);
  const navigate = useNavigate();

  const closeModal = () => {
    setSelected(null);
    close();
  };

  // Redirect to the User create form
  useEffect(() => {
    if (selected) {
      navigate(urlJoin(selected.type, selected.id, "create"));
    }
  }, [selected, navigate]);

  // Select User Provider
  return (
    <>
      <CardTopActionsButton className="btn-primary" onClick={open}>
        Add New
      </CardTopActionsButton>
      <Modal isOpen={isOpen} close={closeModal} className="max-w-4xl h-3/4">
        <ModalTitle>Select user provider</ModalTitle>
        <UserProviderSelectList onSelected={setSelected} />
      </Modal>
    </>
  );
}

function UserProviderSelectList({ onSelected }: { onSelected: (item: UserProviderSelectItem | null) => void }) {
  const query = useQuery({
    queryKey: ["providers"],
    queryFn: () => api.get<ProvidersGetList>("/api/providers").then((response) => response.data),
  });

  if (query.isError) return <ContentLoadingError error={query.error} />;
  if (query.isPending) return <ContentLoadingOverlay />;
  if (!query.data) return null;

  const userProviderSelectList: UserProviderSelectItem[] = [];

  for (const providerEntity of query.data) {
    if (!providerEntity.is_enabled) continue;

    const provider = userProviderManager.getUserProviderByType(providerEntity.entity_type);
    if (!provider) {
      console.error("SupportedUserProvider for " + providerEntity.entity_type + " does not exist");
      continue;
    }

    if (!provider.create.component) {
      console.error("Create new user component of type " + providerEntity.entity_type + " does not exist");
      continue;
    }

    userProviderSelectList.push({
      name: providerEntity.name,
      description: providerEntity.description ?? "",
      icon: provider.icon,
      type: providerEntity.entity_type,
      id: providerEntity.id,
    });
  }

  return (
    <SelectList items={userProviderSelectList} filter={[{ name: "Type", value: "type" }]} onSelected={onSelected} />
  );
}

/**
 * Component to delete a User.
 *
 * @param type - The type of the user
 * @param id - The ID of the user to delete.
 */
export function UserDelete({ id, type }: { id: string; type: string }) {
  const modal = useModal();

  const mutation = useMutation({
    mutationFn: () => {
      const userType = userProviderManager.getUserProviderByType(type);
      if (!userType) throw new Error(`Invalid user provider type - ${type}`);
      return api.delete(urlJoin(userType.delete.route, id));
    },
    onSuccess: () => toast.success("The User was deleted"),
    onError: (error) => toast.error(parseAPIError(error).message),
  });

  return (
    <>
      <DeleteEntityButton onClick={() => modal.setOpen(true)} />
      <AlertModal
        isOpen={modal.isOpen}
        close={modal.close}
        message="Are you sure you want to delete this entry?"
        action={() => mutation.mutate()}
      />
    </>
  );
}
