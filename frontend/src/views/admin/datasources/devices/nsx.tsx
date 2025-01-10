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

type VmwareNSXCreate = paths["/api/data_sources/vmware_nsx"]["post"]["requestBody"]["content"]["application/json"];
type VmwareNSXUpdate = paths["/api/data_sources/vmware_nsx/{id}"]["put"]["requestBody"]["content"]["application/json"];
type VmwareNSXGet =
  paths["/api/data_sources/vmware_nsx/{id}"]["get"]["responses"]["200"]["content"]["application/json"];
type ValidateVmwareNSX = components["schemas"]["Body_DataSourceVmwareNSXValidate"];

interface CheckConnectivityProps {
  handleSubmit: UseFormHandleSubmit<ValidateVmwareNSX["config"] & FieldValues>;
  itemId?: ValidateVmwareNSX["item_id"];
}
function CheckConnectivity({ handleSubmit, itemId }: CheckConnectivityProps) {
  const [result, setResult] = useState("");

  const mutation = useMutation({
    mutationFn: async (data: ValidateVmwareNSX) =>
      api
        .post(dataSourceManager.getDataSourceByType(DataSourceTypesEnum.VMWARE_NSX)!.validate.route, data)
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
        <ListItem>
          Currently, basic authentication using a username and password is the only supported authentication method
        </ListItem>
      </Information>
      <Preparation title="Prepare credentials">
        <ListItem>Log in to Vmware NSX-T and create a new user (Read-Only permissions)</ListItem>
        <ListItem>Create a new credential profile and add username and password fields</ListItem>
      </Preparation>
    </Box>
  );
}

const credentialFormConfig: CredentialFormConfiguration = {
  formFieldParams: { token: { visible: false }, domain: { visible: false } },
};

/**
 * Page component for creating an Vmware NSX-T Data Source.
 */
export function VmwareNSXDataSourceCreate({ successCallback, cancelCallback }: DataSourceCreateProps) {
  const methods = useForm<VmwareNSXCreate>({
    defaultValues: {
      is_enabled: true,
      is_asset_collection_enabled: true,
      asset_collection_interval: 5,
      priority: 4,
    },
  });

  const mutation = useMutation({
    mutationFn: (data: VmwareNSXCreate) =>
      api.post(dataSourceManager.getDataSourceByType(DataSourceTypesEnum.VMWARE_NSX)!.create.route, data),
    onSuccess: () => successCallback(),
    onError: (error) => methods.setError(...parseFormError<VmwareNSXCreate>(error)),
  });

  return (
    <Block>
      <BlockTitle>Create VMware NSX-T Data Source</BlockTitle>
      <Box className="lg:max-w-3xl">
        <SourceDescription />
        <Form onSubmit={methods.handleSubmit((data) => mutation.mutate(data))}>
          <PartialFormGeneral
            methods={methods}
            formFieldParams={{
              host: { placeholder: "https://nsx.corp.com" },
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

interface VmwareNSXDataSourceUpdateFormProps {
  id: string;
  values: VmwareNSXUpdate;
  className?: string;
  successCallback: () => void;
  cancelCallback: () => void;
}

/**
 * Form component to update an VMware NSX-T Data Source.
 */
function VmwareNSXDataSourceUpdateForm({
  id,
  values,
  successCallback,
  cancelCallback,
  className,
}: VmwareNSXDataSourceUpdateFormProps) {
  const methods = useForm<VmwareNSXUpdate>({ defaultValues: values });

  const mutation = useMutation({
    mutationFn: (data: VmwareNSXUpdate) =>
      api.put(urlJoin(dataSourceManager.getDataSourceByType(DataSourceTypesEnum.VMWARE_NSX)!.update.route, id), data),
    onSuccess: () => successCallback(),
    onError: (error) => methods.setError(...parseFormError<VmwareNSXUpdate>(error)),
  });

  return (
    <Form className={className} onSubmit={methods.handleSubmit((data) => mutation.mutate(data))}>
      <PartialFormGeneral
        methods={methods}
        formFieldParams={{
          host: { placeholder: "https://nsx.corp.com" },
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
 * Page component for updating an VMware NSX-T Data Source.
 */
export function VmwareNSXDataSourceUpdate({ id, successCallback, cancelCallback }: DataSourceUpdateProps) {
  const query = useQuery<VmwareNSXGet>({
    queryKey: ["data_sources", id],
    queryFn: () =>
      api
        .get<VmwareNSXGet>(
          urlJoin(dataSourceManager.getDataSourceByType(DataSourceTypesEnum.VMWARE_NSX)!.get.route, id)
        )
        .then((response) => response.data),
  });

  if (query.isError) return <ContentLoadingError error={query.error} />;
  if (query.isPending) return <ContentLoadingOverlay />;
  if (!query.data) return;

  return (
    <Block>
      <BlockTitle>Update VMware NSX-T Data Source</BlockTitle>
      <Box className="lg:max-w-3xl">
        <SourceDescription />
        <VmwareNSXDataSourceUpdateForm
          id={id}
          values={query.data}
          successCallback={successCallback}
          cancelCallback={cancelCallback}
        />
      </Box>
    </Block>
  );
}
