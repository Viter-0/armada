import { CardTopActionsButton, DeleteEntityButton, Modal, ModalTitle, SelectList } from "@/components";
import { AlertModal } from "@/components/feedback";
import { SelectItem } from "@/components/types";
import { urlJoin } from "@/util/helpers";
import { useModal } from "@/util/hooks";
import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { dataSourceManager } from "../supportedDataSources";
import { useDataSourceDelete } from "./delete";

type DataSourceItem = {
  route: string;
  type: string;
  vendor: string;
  id: string;
} & SelectItem;

/**
 * Array of available data source types to select from.
 */
const dataSourceSelectList: DataSourceItem[] = [];

Object.entries(dataSourceManager.getAllDataSources()).forEach(([_, value]) => {
  if (!value.create.component || !value.create.route || value.isVisible == false) return;
  dataSourceSelectList.push({
    name: value.name,
    description: value.description,
    icon: value.icon,
    route: value.create.route,
    type: value.type,
    vendor: value.vendor,
    id: value.id,
  });
});

/**
 * Modal to select Data Source type.
 */
export function DataSourceTypeSelect() {
  const { isOpen, open, close } = useModal();
  const [selected, setSelected] = useState<DataSourceItem | null>(null);
  const navigate = useNavigate();

  const closeModal = useCallback(() => {
    setSelected(null);
    close();
  }, [close]);

  // Redirect to the Data Source create form
  useEffect(() => {
    if (selected) {
      navigate(urlJoin(selected.id, "create"));
    }
  }, [selected, navigate]);

  // Select Data Source Type
  return (
    <>
      <CardTopActionsButton className="btn-primary" onClick={open}>
        Add New
      </CardTopActionsButton>
      <Modal isOpen={isOpen} close={closeModal} className="max-w-4xl h-[40rem]">
        <ModalTitle>Select Data Source Type</ModalTitle>
        <SelectList
          items={dataSourceSelectList}
          isSearchBarVisible={true}
          itemContainerClassName="overflow-y-scroll pe-1 h-[30rem]"
          filter={[
            { name: "Type", value: "type" },
            { name: "Vendor", value: "vendor" },
          ]}
          onSelected={setSelected}
        />
      </Modal>
    </>
  );
}

/**
 * Table Action to delete a Data Source.
 *
 * @param type - The type of the data source
 * @param id - The ID of the data source to delete.
 */
export function DataSourceDeleteTableAction({ id, type }: { id: string; type: string }) {
  const modal = useModal();
  const { deleteSource } = useDataSourceDelete({ id, type });
  return (
    <>
      <DeleteEntityButton onClick={() => modal.setOpen(true)} />
      <AlertModal
        isOpen={modal.isOpen}
        close={modal.close}
        message="Are you sure you want to delete this entry?"
        action={() => deleteSource()}
      />
    </>
  );
}
