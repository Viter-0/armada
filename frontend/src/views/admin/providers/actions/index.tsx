import { api } from "@/api";
import { AlertModal, CardTopActionsButton, DeleteEntityButton, Modal, ModalTitle } from "@/components";
import { SelectItem, SelectList } from "@/components/menu";
import { parseAPIError } from "@/util/error";
import { urlJoin } from "@/util/helpers";
import { useModal } from "@/util/hooks";
import { useMutation } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { useNavigate } from "react-router";
import { authenticationProviderManager } from "../supportedProviders";

type ProviderSelectItem = {
  id: string;
} & SelectItem;

/**
 * Modal to select authentication provider type.
 */
export function AuthenticationProviderTypeSelect() {
  const { isOpen, open, close } = useModal();
  const [selected, setSelected] = useState<ProviderSelectItem | null>(null);
  const navigate = useNavigate();

  const closeModal = () => {
    setSelected(null);
    close();
  };

  // Redirect to the Provider create form
  useEffect(() => {
    if (selected) {
      navigate(urlJoin(selected.id, "create"));
    }
  }, [selected, navigate]);

  // Select provider type
  return (
    <>
      <CardTopActionsButton className="btn-primary" onClick={open}>
        Add New
      </CardTopActionsButton>
      <Modal isOpen={isOpen} close={closeModal} className="max-w-4xl h-3/4">
        <ModalTitle>Select provider type</ModalTitle>
        <ProviderSelectList onSelected={setSelected} />
      </Modal>
    </>
  );
}

function ProviderSelectList({ onSelected }: { onSelected: (item: ProviderSelectItem | null) => void }) {
  const providerSelectList: ProviderSelectItem[] = [];

  for (const providerEntity of authenticationProviderManager.getAllProviders()) {
    if (!providerEntity.create.component) continue;

    providerSelectList.push({
      name: providerEntity.name,
      description: providerEntity.description ?? "",
      icon: providerEntity.icon,
      id: providerEntity.id,
    });
  }

  return <SelectList items={providerSelectList} onSelected={onSelected} />;
}

/**
 * Component to delete an authentication provider.
 *
 * @param type - The type of the provider
 * @param id - The ID of the entity to delete.
 */
export function AuthenticationProviderDelete({ id, type }: { id: string; type: string }) {
  const modal = useModal();

  const mutation = useMutation({
    mutationFn: () => {
      const provider = authenticationProviderManager.getProviderByType(type);
      if (!provider) throw new Error("Delete provider - can't find provider type definition");
      if (!provider.delete.route)
        throw new Error("The provider can't be deleted because the delete route is not defined.");
      return api.delete(urlJoin(provider.delete.route, id));
    },
    onSuccess: () => toast.success("The provider was deleted"),
    onError: (error) => toast.error(parseAPIError(error).message),
  });

  return (
    <>
      <DeleteEntityButton onClick={() => modal.setOpen(true)}></DeleteEntityButton>
      <AlertModal
        isOpen={modal.isOpen}
        close={modal.close}
        message="Are you sure you want to delete this entry?"
        action={() => mutation.mutate()}
      />
    </>
  );
}
