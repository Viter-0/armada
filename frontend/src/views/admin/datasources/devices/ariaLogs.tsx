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
import { InfoItemSSLCertificate, Information, Preparation } from "../shared";
import { dataSourceManager } from "../supportedDataSources";
import { CredentialFormConfiguration, DataSourceCreateProps, DataSourceUpdateProps } from "../types";
import { PartialFormGeneral, PartialFormLogs } from "./generic";

type AriaLogsCreate = paths["/api/data_sources/aria_logs"]["post"]["requestBody"]["content"]["application/json"];
type AriaLogsUpdate = paths["/api/data_sources/aria_logs/{id}"]["put"]["requestBody"]["content"]["application/json"];
type AriaLogsGet = paths["/api/data_sources/aria_logs/{id}"]["get"]["responses"]["200"]["content"]["application/json"];
type ValidateAriaLogs = components["schemas"]["Body_DataSourceAriaLogsValidate"];

interface CheckConnectivityProps {
  handleSubmit: UseFormHandleSubmit<ValidateAriaLogs["config"] & FieldValues>;
  itemId?: ValidateAriaLogs["item_id"];
}
function CheckConnectivity({ handleSubmit, itemId }: CheckConnectivityProps) {
  const [result, setResult] = useState("");

  const mutation = useMutation({
    mutationFn: async (data: ValidateAriaLogs) =>
      api
        .post(dataSourceManager.getDataSourceByType(DataSourceTypesEnum.ARIA_LOGS)!.validate.route, data)
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
          This data source currently supports only NSX logs. To enable proper search functionality for NSX logs, the
          &quot;VMware NSX&quot; Content Pack is required.
        </ListItem>
      </Information>
      <Preparation title="Prepare credentials">
        <ListItem>Log in to Aria Logs and create a new user (Read-Only permissions)</ListItem>
        <ListItem>Install Aria Logs Content Pack - VMware NSX</ListItem>
        <ListItem>Create a new credential profile and add username, password and domain fields</ListItem>
        <ListItem>
          The domain field specifies the account type, which can be one of the following:
          <Strong> Local</Strong>, <Strong>ActiveDirectory</Strong> or <Strong>vIDM</Strong>.
        </ListItem>
      </Preparation>
    </Box>
  );
}

const credentialFormConfig: CredentialFormConfiguration = {
  formFieldParams: {
    token: { visible: false },
    domain: { placeholder: "Account type - 'Local' or 'ActiveDirectory' or 'vIDM'" },
  },
};

/**
 * Page component for creating an Aria Logs Data Source.
 */
export function AriaLogsDataSourceCreate({ successCallback, cancelCallback }: DataSourceCreateProps) {
  const methods = useForm<AriaLogsCreate>({
    defaultValues: {
      is_enabled: true,
      is_log_fetching_enabled: true,
    },
  });

  const mutation = useMutation({
    mutationFn: (data: AriaLogsCreate) =>
      api.post(dataSourceManager.getDataSourceByType(DataSourceTypesEnum.ARIA_LOGS)!.create.route, data),
    onSuccess: () => successCallback(),
    onError: (error) => methods.setError(...parseFormError<AriaLogsCreate>(error)),
  });

  return (
    <Block>
      <BlockTitle>Create Aria Logs Data Source</BlockTitle>
      <Box className="lg:max-w-3xl">
        <SourceDescription />
        <Form onSubmit={methods.handleSubmit((data) => mutation.mutate(data))}>
          <PartialFormGeneral
            methods={methods}
            formFieldParams={{
              host: { placeholder: "https://arialogs.corp.com:9543" },
              is_certificate_validation_enabled: { title: "Verify SSL Certificate" },
            }}
            credentialFormConfig={credentialFormConfig}
          />
          <PartialFormLogs methods={methods} />
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

interface AriaLogsDataSourceUpdateFormProps {
  id: string;
  values: AriaLogsUpdate;
  className?: string;
  successCallback: () => void;
  cancelCallback: () => void;
}

/**
 * Form component to update an Aria Logs Data Source.
 */
function AriaLogsDataSourceUpdateForm({
  id,
  values,
  successCallback,
  cancelCallback,
  className,
}: AriaLogsDataSourceUpdateFormProps) {
  const methods = useForm<AriaLogsUpdate>({ defaultValues: values });

  const mutation = useMutation({
    mutationFn: (data: AriaLogsUpdate) =>
      api.put(urlJoin(dataSourceManager.getDataSourceByType(DataSourceTypesEnum.ARIA_LOGS)!.update.route, id), data),
    onSuccess: () => successCallback(),
    onError: (error) => methods.setError(...parseFormError<AriaLogsUpdate>(error)),
  });

  return (
    <Form className={className} onSubmit={methods.handleSubmit((data) => mutation.mutate(data))}>
      <PartialFormGeneral
        methods={methods}
        formFieldParams={{
          host: { placeholder: "https://arialogs.corp.com:9543" },
          is_certificate_validation_enabled: { title: "Verify SSL Certificate" },
        }}
        credentialFormConfig={credentialFormConfig}
      />
      <PartialFormLogs methods={methods} />
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
 * Page component for updating an Aria Logs Data Source.
 */
export function AriaLogsDataSourceUpdate({ id, successCallback, cancelCallback }: DataSourceUpdateProps) {
  const query = useQuery<AriaLogsGet>({
    queryKey: ["data_sources", id],
    queryFn: () =>
      api
        .get<AriaLogsGet>(urlJoin(dataSourceManager.getDataSourceByType(DataSourceTypesEnum.ARIA_LOGS)!.get.route, id))
        .then((response) => response.data),
  });

  if (query.isError) return <ContentLoadingError error={query.error} />;
  if (query.isPending) return <ContentLoadingOverlay />;
  if (!query.data) return;

  return (
    <Block>
      <BlockTitle>Update Aria Logs Data Source</BlockTitle>
      <Box className="lg:max-w-3xl">
        <SourceDescription />
        <AriaLogsDataSourceUpdateForm
          id={id}
          values={query.data}
          successCallback={successCallback}
          cancelCallback={cancelCallback}
        />
      </Box>
    </Block>
  );
}
