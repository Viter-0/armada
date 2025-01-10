import { api } from "@/api";
import { paths } from "@/api/schema";
import {
  AlertModal,
  Box,
  Button,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  CardTopActions,
  CardTopActionsButton,
  ContentLoadingError,
  ContentLoadingOverlay,
  DeleteEntityButton,
  Modal,
  ModalTitle,
  ToolTip,
  UpdateEntityButton,
} from "@/components";
import { FormSelect } from "@/components/form";
import { Table, TableProps } from "@/components/table";
import { FormSelectProps } from "@/components/types";
import { parseAPIError } from "@/util/error";
import { urlJoin } from "@/util/helpers";
import { useModal } from "@/util/hooks";
import { PlusIcon } from "@heroicons/react/24/outline";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Cell, createColumnHelper } from "@tanstack/react-table";
import { forwardRef, useCallback, useMemo } from "react";
import toast from "react-hot-toast";
import { Link } from "react-router";
import { CreateCredentialProfileForm, CredentialFormConfiguration } from "./create";

type CredentialProfileCreateResult =
  paths["/api/credential_profiles"]["post"]["responses"]["200"]["content"]["application/json"];
type CredentialProfileGetList =
  paths["/api/credential_profiles"]["get"]["responses"]["200"]["content"]["application/json"];

interface CredentialsSelectProps {
  className?: string;
  callback?: (data: CredentialProfileCreateResult) => void;
  formConfig?: CredentialFormConfiguration;
}

/**
 * Modal component for creating a new credential profile.
 */
export function CredentialsCreateModal({ className, callback, formConfig }: CredentialsSelectProps) {
  const { isOpen, open, close } = useModal();

  const successCallback = useCallback(
    (data: CredentialProfileCreateResult) => {
      close();
      if (callback) callback(data);
    },
    [callback, close]
  );

  return (
    <>
      <ToolTip message="Create New" className={className}>
        <Button className="btn-ghost btn-circle">
          <PlusIcon className="w-7 h-7" onClick={open} />
        </Button>
      </ToolTip>
      <Modal isOpen={isOpen} close={close} isDismissibleOnOutsideClick={false} className="max-w-2xl min-h-96">
        <ModalTitle>Create Credential Profile</ModalTitle>
        <CreateCredentialProfileForm callback={successCallback} formConfig={formConfig} />
      </Modal>
    </>
  );
}

export interface CredentialsFormSelectProps extends Omit<FormSelectProps, "values"> {
  title?: string;
  createNewProfileCallback?: (id: string) => void;
  formConfig?: CredentialFormConfiguration;
}

/**
 * Form select component for credential profiles.
 */
export const CredentialsFormSelect = forwardRef(function CredentialsFormSelect(
  props: CredentialsFormSelectProps,
  ref: React.ForwardedRef<HTMLSelectElement>
) {
  const { createNewProfileCallback, title = "Credentials Profile", formConfig, ...rest } = props;

  const query = useQuery({
    queryKey: ["credential_profiles"],
    queryFn: () => api.get<CredentialProfileGetList>("/api/credential_profiles").then((response) => response.data),
    meta: {
      showError: true,
      errorMessage: "Failed to load credential profiles",
    },
  });

  const val = useMemo(() => query.data?.reduce((a, v) => ({ ...a, [v.id]: v.name }), {}) ?? {}, [query.data]);

  if (!query.isSuccess) return <FormSelect {...rest} ref={ref} values={{}} containerClassName="grow" title={title} />;

  return (
    <Box className="flex">
      <FormSelect {...rest} ref={ref} values={val} containerClassName="grow" title={title} />
      <CredentialsCreateModal
        className="mt-9 ms-1"
        callback={(data) => createNewProfileCallback && createNewProfileCallback(data.id)}
        formConfig={formConfig}
      />
    </Box>
  );
});

/**
 * Component to delete a credential profile.
 *
 * @param id - The ID of the credential profile to delete.
 */
export function CredentialsDelete({ id }: { id: string }) {
  const modal = useModal();

  const mutation = useMutation({
    mutationFn: () => api.delete(urlJoin("/api/credential_profiles", id)),
    onSuccess: () => toast.success("The credential profile was deleted"),
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

/**
 * Component to render table actions for a given cell.
 *
 * @param cell - The cell for which to render actions.
 */
function TableActions<TData, TValue>({ cell }: { cell: Cell<TData, TValue> }) {
  const entityID = String(cell.getValue());

  return (
    <Box className="flex gap-2">
      <Link to={urlJoin(entityID, "update")}>
        <UpdateEntityButton />
      </Link>
      <CredentialsDelete id={entityID} />
    </Box>
  );
}

/**
 * Page component to list all credential profiles.
 */
export default function Credentials() {
  const query = useQuery({
    queryKey: ["credential_profiles"],
    queryFn: () => api.get<CredentialProfileGetList>("/api/credential_profiles").then((response) => response.data),
  });

  const columns = useMemo(() => {
    const columnHelper = createColumnHelper<CredentialProfileGetList[0]>();
    return [
      columnHelper.accessor("name", {
        header: "Name",
      }),
      columnHelper.accessor("description", {
        header: "Description",
      }),
      columnHelper.accessor("entity_type", {
        header: "Type",
      }),
      columnHelper.accessor("username", {
        header: "Username",
      }),
      columnHelper.accessor("domain", {
        header: "Domain",
      }),
      columnHelper.accessor("id", {
        header: "Actions",
        enableGlobalFilter: false,
        cell: ({ cell }) => <TableActions cell={cell} />,
      }),
    ];
  }, []);

  const data = useMemo(() => query.data ?? [], [query.data]);

  const tableProps: TableProps<CredentialProfileGetList[0]> = {
    data: data,
    columns: columns,
    enablePagination: true,
  };

  return (
    <Box className="m-4">
      <Card className="grow">
        <CardHeader divider={true}>
          <CardTitle description="Using credential profiles lets you apply credential settings consistently across devices">
            Credential Profiles
          </CardTitle>
          <CardTopActions>
            <Link to="create">
              <CardTopActionsButton className="btn-primary">Add New</CardTopActionsButton>
            </Link>
          </CardTopActions>
        </CardHeader>
        <CardBody>
          {query.isSuccess && <Table {...tableProps} />}
          {query.isPending && <ContentLoadingOverlay />}
          {query.isError && <ContentLoadingError error={query.error} />}
        </CardBody>
      </Card>
    </Box>
  );
}
