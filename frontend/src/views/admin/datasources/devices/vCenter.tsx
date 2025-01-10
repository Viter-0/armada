import { api } from "@/api";
import { components, paths } from "@/api/schema";
import {
  Block,
  BlockTitle,
  Box,
  CheckConnectivityButton,
  ContentLoadingError,
  ContentLoadingOverlay,
  ListItem,
} from "@/components";
import { Form, FormError, FormGenericActions } from "@/components/form";
import { DataSourceTypesEnum } from "@/config/const";
import { parseAPIError, parseFormError } from "@/util/error";
import { urlJoin } from "@/util/helpers";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { FieldValues, UseFormHandleSubmit, useForm } from "react-hook-form";
import { InfoItemSSLCertificate, Information, Preparation } from "../shared";
import { dataSourceManager } from "../supportedDataSources";
import { CredentialFormConfiguration, DataSourceCreateProps, DataSourceUpdateProps } from "../types";
import { PartialFormAssets, PartialFormGeneral, PartialFormLogs } from "./generic";

type VmwareVCenterCreate =
  paths["/api/data_sources/vmware_vcenter"]["post"]["requestBody"]["content"]["application/json"];
type VmwareVCenterUpdate =
  paths["/api/data_sources/vmware_vcenter/{id}"]["put"]["requestBody"]["content"]["application/json"];
type VmwareVCenterGet =
  paths["/api/data_sources/vmware_vcenter/{id}"]["get"]["responses"]["200"]["content"]["application/json"];
type ValidateVmwareVCenter = components["schemas"]["Body_DataSourceVmwareVCenterValidate"];

interface CheckConnectivityProps {
  handleSubmit: UseFormHandleSubmit<ValidateVmwareVCenter["config"] & FieldValues>;
  itemId?: ValidateVmwareVCenter["item_id"];
}
function CheckConnectivity({ handleSubmit, itemId }: CheckConnectivityProps) {
  const [result, setResult] = useState("");

  const mutation = useMutation({
    mutationFn: async (data: ValidateVmwareVCenter) =>
      api
        .post(dataSourceManager.getDataSourceByType(DataSourceTypesEnum.VMWARE_VCENTER)!.validate.route, data)
        .then(() => setResult("Success")),
    onError: (error) => setResult(parseAPIError(error).message),
  });

  return (
    <CheckConnectivityButton
      onClick={handleSubmit((data) => mutation.mutate({ config: data, item_id: itemId }))}
      isPending={mutation.isPending}
      isSuccess={mutation.isSuccess}
      result={result}
    />
  );
}

function SourceDescription() {
  return (
    <Box>
      <Information>
        <InfoItemSSLCertificate />
      </Information>
      <Preparation title="Prepare credentials">
        <ListItem>Log in to vCenter and create a new user (Read-Only permissions)</ListItem>
        <ListItem>Create a new credential profile and add username and password fields</ListItem>
      </Preparation>
    </Box>
  );
}

const credentialFormConfig: CredentialFormConfiguration = {
  formFieldParams: { token: { visible: false }, domain: { visible: false } },
};

/**
 * Page component for creating an Vmware vCenter Data Source.
 */
export function VmwareVCenterDataSourceCreate({ successCallback, cancelCallback }: DataSourceCreateProps) {
  const methods = useForm<VmwareVCenterCreate>({
    defaultValues: {
      is_enabled: true,
      is_asset_collection_enabled: true,
      asset_collection_interval: 5,
      priority: 4,
    },
  });

  const mutation = useMutation({
    mutationFn: (data: VmwareVCenterCreate) =>
      api.post(dataSourceManager.getDataSourceByType(DataSourceTypesEnum.VMWARE_VCENTER)!.create.route, data),
    onSuccess: () => successCallback(),
    onError: (error) => methods.setError(...parseFormError<VmwareVCenterCreate>(error)),
  });

  return (
    <Block>
      <BlockTitle>Create VMware vCenter Data Source</BlockTitle>
      <Box className="lg:max-w-3xl">
        <SourceDescription />
        <Form onSubmit={methods.handleSubmit((data) => mutation.mutate(data))}>
          <PartialFormGeneral
            methods={methods}
            formFieldParams={{
              host: { placeholder: "https://vcenter.corp.com" },
            }}
            credentialFormConfig={credentialFormConfig}
          />
          <PartialFormAssets methods={methods} />
          <CheckConnectivity handleSubmit={methods.handleSubmit} />
          <FormError>{methods.formState.errors.root?.message}</FormError>
          <FormGenericActions
            cancelBtnName="Discard"
            submitBtnName="Create"
            onCancel={cancelCallback}
            isPending={mutation.isPending}
          />
        </Form>
      </Box>
    </Block>
  );
}

interface VmwareVCenterDataSourceUpdateFormProps {
  id: string;
  values: VmwareVCenterUpdate;
  className?: string;
  successCallback: () => void;
  cancelCallback: () => void;
}

/**
 * Form component to update an VMware vCenter Data Source.
 */
function VmwareVCenterDataSourceUpdateForm({
  id,
  values,
  successCallback,
  cancelCallback,
  className,
}: VmwareVCenterDataSourceUpdateFormProps) {
  const methods = useForm<VmwareVCenterUpdate>({ defaultValues: values });

  const mutation = useMutation({
    mutationFn: (data: VmwareVCenterUpdate) =>
      api.put(
        urlJoin(dataSourceManager.getDataSourceByType(DataSourceTypesEnum.VMWARE_VCENTER)!.update.route, id),
        data
      ),
    onSuccess: () => successCallback(),
    onError: (error) => methods.setError(...parseFormError<VmwareVCenterUpdate>(error)),
  });

  return (
    <Form className={className} onSubmit={methods.handleSubmit((data) => mutation.mutate(data))}>
      <PartialFormGeneral
        methods={methods}
        formFieldParams={{
          host: { placeholder: "https://vcenter.corp.com" },
        }}
        credentialFormConfig={credentialFormConfig}
      />
      <PartialFormLogs methods={methods} />
      <PartialFormAssets methods={methods} />
      <CheckConnectivity handleSubmit={methods.handleSubmit} itemId={id} />
      <FormError>{methods.formState.errors.root?.message}</FormError>
      <FormGenericActions
        cancelBtnName="Cancel"
        submitBtnName="Save Changes"
        onCancel={cancelCallback}
        isPending={mutation.isPending}
      />
    </Form>
  );
}

/**
 * Page component for updating an VMware vCenter Data Source.
 */
export function VmwareVCenterDataSourceUpdate({ id, successCallback, cancelCallback }: DataSourceUpdateProps) {
  const query = useQuery<VmwareVCenterGet>({
    queryKey: ["data_sources", id],
    queryFn: () =>
      api
        .get<VmwareVCenterGet>(
          urlJoin(dataSourceManager.getDataSourceByType(DataSourceTypesEnum.VMWARE_VCENTER)!.get.route, id)
        )
        .then((response) => response.data),
  });

  if (query.isError) return <ContentLoadingError error={query.error} />;
  if (query.isPending) return <ContentLoadingOverlay />;
  if (!query.data) return;

  return (
    <Block>
      <BlockTitle>Update VMware vCenter Data Source</BlockTitle>
      <Box className="lg:max-w-3xl">
        <SourceDescription />
        <VmwareVCenterDataSourceUpdateForm
          id={id}
          values={query.data}
          successCallback={successCallback}
          cancelCallback={cancelCallback}
        />
      </Box>
    </Block>
  );
}
