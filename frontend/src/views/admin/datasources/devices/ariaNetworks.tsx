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
  Strong,
} from "@/components";
import { Form, FormError, FormGenericActions } from "@/components/form";
import { DataSourceTypesEnum } from "@/config/const";
import { parseAPIError, parseFormError } from "@/util/error";
import { urlJoin } from "@/util/helpers";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { FieldValues, UseFormHandleSubmit, useForm } from "react-hook-form";
import { InfoItemSSLCertificate, InfoItemSupportedVersion, Information, Preparation } from "../shared";
import { dataSourceManager } from "../supportedDataSources";
import { CredentialFormConfiguration, DataSourceCreateProps, DataSourceUpdateProps } from "../types";
import { PartialFormAssets, PartialFormGeneral, PartialFormLogs } from "./generic";

type AriaNetworksCreate =
  paths["/api/data_sources/aria_networks"]["post"]["requestBody"]["content"]["application/json"];
type AriaNetworksUpdate =
  paths["/api/data_sources/aria_networks/{id}"]["put"]["requestBody"]["content"]["application/json"];
type AriaNetworksGet =
  paths["/api/data_sources/aria_networks/{id}"]["get"]["responses"]["200"]["content"]["application/json"];
type ValidateAriaNetworks = components["schemas"]["Body_DataSourceAriaNetworksValidate"];

interface CheckConnectivityProps {
  handleSubmit: UseFormHandleSubmit<ValidateAriaNetworks["config"] & FieldValues>;
  itemId?: ValidateAriaNetworks["item_id"];
}
function CheckConnectivity({ handleSubmit, itemId }: CheckConnectivityProps) {
  const [result, setResult] = useState("");

  const mutation = useMutation({
    mutationFn: async (data: ValidateAriaNetworks) =>
      api
        .post(dataSourceManager.getDataSourceByType(DataSourceTypesEnum.ARIA_NETWORKS)!.validate.route, data)
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
        <InfoItemSupportedVersion min="v6.14" />
      </Information>
      <Preparation title="Prepare credentials">
        <ListItem>Log in to Aria Networks and create a new user (Read-Only permissions)</ListItem>
        <ListItem>Create a new credential profile and add username, password and domain fields</ListItem>
        <ListItem>
          The domain field specifies the account type, which can be one of the following:
          <Strong> LOCAL</Strong> or <Strong>LDAP</Strong>.
        </ListItem>
      </Preparation>
    </Box>
  );
}

const credentialFormConfig: CredentialFormConfiguration = {
  formFieldParams: { token: { visible: false }, domain: { placeholder: "LOCAL or LDAP" } },
};

/**
 * Page component for creating an Aria Networks Data Source.
 */
export function AriaNetworksDataSourceCreate({ successCallback, cancelCallback }: DataSourceCreateProps) {
  const methods = useForm<AriaNetworksCreate>({
    defaultValues: {
      is_enabled: true,
      is_log_fetching_enabled: true,
      is_asset_collection_enabled: true,
      asset_collection_interval: 5,
      priority: 5,
    },
  });

  const mutation = useMutation({
    mutationFn: (data: AriaNetworksCreate) =>
      api.post(dataSourceManager.getDataSourceByType(DataSourceTypesEnum.ARIA_NETWORKS)!.create.route, data),
    onSuccess: () => successCallback(),
    onError: (error) => methods.setError(...parseFormError<AriaNetworksCreate>(error)),
  });

  return (
    <Block>
      <BlockTitle>Create Aria Networks Data Source</BlockTitle>
      <Box className="lg:max-w-3xl">
        <SourceDescription />
        <Form onSubmit={methods.handleSubmit((data) => mutation.mutate(data))}>
          <PartialFormGeneral
            methods={methods}
            formFieldParams={{
              host: { placeholder: "https://arianetworks.corp.com" },
              is_certificate_validation_enabled: { title: "Verify SSL Certificate" },
            }}
            credentialFormConfig={credentialFormConfig}
          />
          <PartialFormLogs methods={methods} />
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

interface AriaNetworksDataSourceUpdateFormProps {
  id: string;
  values: AriaNetworksUpdate;
  className?: string;
  successCallback: () => void;
  cancelCallback: () => void;
}

/**
 * Form component to update an Aria Networks Data Source.
 */
function AriaNetworksDataSourceUpdateForm({
  id,
  values,
  successCallback,
  cancelCallback,
  className,
}: AriaNetworksDataSourceUpdateFormProps) {
  const methods = useForm<AriaNetworksUpdate>({ defaultValues: values });

  const mutation = useMutation({
    mutationFn: (data: AriaNetworksUpdate) =>
      api.put(
        urlJoin(dataSourceManager.getDataSourceByType(DataSourceTypesEnum.ARIA_NETWORKS)!.update.route, id),
        data
      ),
    onSuccess: () => successCallback(),
    onError: (error) => methods.setError(...parseFormError<AriaNetworksUpdate>(error)),
  });

  return (
    <Form className={className} onSubmit={methods.handleSubmit((data) => mutation.mutate(data))}>
      <PartialFormGeneral
        methods={methods}
        formFieldParams={{
          host: { placeholder: "https://arianetworks.corp.com" },
          is_certificate_validation_enabled: { title: "Verify SSL Certificate" },
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
 * Page component for updating an Aria Networks Data Source.
 */
export function AriaNetworksDataSourceUpdate({ id, successCallback, cancelCallback }: DataSourceUpdateProps) {
  const query = useQuery<AriaNetworksGet>({
    queryKey: ["data_sources", id],
    queryFn: () =>
      api
        .get<AriaNetworksGet>(
          urlJoin(dataSourceManager.getDataSourceByType(DataSourceTypesEnum.ARIA_NETWORKS)!.get.route, id)
        )
        .then((response) => response.data),
  });

  if (query.isError) return <ContentLoadingError error={query.error} />;
  if (query.isPending) return <ContentLoadingOverlay />;
  if (!query.data) return;

  return (
    <Block>
      <BlockTitle>Update Aria Networks Data Source</BlockTitle>
      <Box className="lg:max-w-3xl">
        <SourceDescription />
        <AriaNetworksDataSourceUpdateForm
          id={id}
          values={query.data}
          successCallback={successCallback}
          cancelCallback={cancelCallback}
        />
      </Box>
    </Block>
  );
}
