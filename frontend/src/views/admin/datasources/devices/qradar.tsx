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

type QRadarCreate = paths["/api/data_sources/qradar"]["post"]["requestBody"]["content"]["application/json"];
type QRadarUpdate = paths["/api/data_sources/qradar/{id}"]["put"]["requestBody"]["content"]["application/json"];
type QRadarGet = paths["/api/data_sources/qradar/{id}"]["get"]["responses"]["200"]["content"]["application/json"];
type ValidateQRadar = components["schemas"]["Body_DataSourceQRadarValidate"];

interface CheckConnectivityProps {
  handleSubmit: UseFormHandleSubmit<ValidateQRadar["config"] & FieldValues>;
  itemId?: ValidateQRadar["item_id"];
}
function CheckConnectivity({ handleSubmit, itemId }: CheckConnectivityProps) {
  const [result, setResult] = useState("");

  const mutation = useMutation({
    mutationFn: async (data: ValidateQRadar) =>
      api
        .post(dataSourceManager.getDataSourceByType(DataSourceTypesEnum.QRADAR)!.validate.route, data)
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
        <ListItem>Log in to QRadar and create a new API Key</ListItem>
        <ListItem>Create a new credential profile and add API Key to the &apos;Token&apos; field.</ListItem>
      </Preparation>
    </Box>
  );
}

const credentialFormConfig: CredentialFormConfiguration = {
  formFieldParams: {
    password: { visible: false },
    domain: { visible: false },
    username: { visible: false },
  },
};

/**
 * Page component for creating an QRadar Data Source.
 */
export function QRadarDataSourceCreate({ successCallback, cancelCallback }: DataSourceCreateProps) {
  const methods = useForm<QRadarCreate>({
    defaultValues: {
      is_enabled: true,
      is_log_fetching_enabled: true,
      is_asset_collection_enabled: true,
      asset_collection_interval: 5,
      priority: 3,
    },
  });

  const mutation = useMutation({
    mutationFn: (data: QRadarCreate) =>
      api.post(dataSourceManager.getDataSourceByType(DataSourceTypesEnum.QRADAR)!.create.route, data),
    onSuccess: () => successCallback(),
    onError: (error) => methods.setError(...parseFormError<QRadarCreate>(error)),
  });

  return (
    <Block>
      <BlockTitle>Create QRadar Data Source</BlockTitle>
      <Box className="lg:max-w-3xl">
        <SourceDescription />
        <Form onSubmit={methods.handleSubmit((data) => mutation.mutate(data))}>
          <PartialFormGeneral
            methods={methods}
            formFieldParams={{
              host: { placeholder: "https://qradar.corp.com" },
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

interface QRadarDataSourceUpdateFormProps {
  id: string;
  values: QRadarUpdate;
  className?: string;
  successCallback: () => void;
  cancelCallback: () => void;
}

/**
 * Form component to update an QRadar Data Source.
 */
function QRadarDataSourceUpdateForm({
  id,
  values,
  successCallback,
  cancelCallback,
  className,
}: QRadarDataSourceUpdateFormProps) {
  const methods = useForm<QRadarUpdate>({ defaultValues: values });

  const mutation = useMutation({
    mutationFn: (data: QRadarUpdate) =>
      api.put(urlJoin(dataSourceManager.getDataSourceByType(DataSourceTypesEnum.QRADAR)!.update.route, id), data),
    onSuccess: () => successCallback(),
    onError: (error) => methods.setError(...parseFormError<QRadarUpdate>(error)),
  });

  return (
    <Form className={className} onSubmit={methods.handleSubmit((data) => mutation.mutate(data))}>
      <PartialFormGeneral
        methods={methods}
        formFieldParams={{
          host: { placeholder: "https://qradar.corp.com" },
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
 * Page component for updating an QRadar Data Source.
 */
export function QRadarDataSourceUpdate({ id, successCallback, cancelCallback }: DataSourceUpdateProps) {
  const query = useQuery<QRadarGet>({
    queryKey: ["data_sources", id],
    queryFn: () =>
      api
        .get<QRadarGet>(urlJoin(dataSourceManager.getDataSourceByType(DataSourceTypesEnum.QRADAR)!.get.route, id))
        .then((response) => response.data),
  });

  if (query.isError) return <ContentLoadingError error={query.error} />;
  if (query.isPending) return <ContentLoadingOverlay />;
  if (!query.data) return;

  return (
    <Block>
      <BlockTitle>Update AQRadar Data Source</BlockTitle>
      <Box className="lg:max-w-3xl">
        <SourceDescription />
        <QRadarDataSourceUpdateForm
          id={id}
          values={query.data}
          successCallback={successCallback}
          cancelCallback={cancelCallback}
        />
      </Box>
    </Block>
  );
}
