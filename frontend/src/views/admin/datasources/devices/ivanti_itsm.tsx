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
  OrderedList,
  SectionTitle,
} from "@/components";
import { Form, FormError, FormGenericActions } from "@/components/form";
import { DataSourceTypesEnum } from "@/config/const";
import { parseAPIError, parseFormError } from "@/util/error";
import { urlJoin } from "@/util/helpers";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { FieldValues, UseFormHandleSubmit, useForm } from "react-hook-form";
import { InfoItemSSLCertificate, Information } from "../shared";
import { dataSourceManager } from "../supportedDataSources";
import { DataSourceCreateProps, DataSourceUpdateProps } from "../types";
import { PartialFormAssets, PartialFormGeneral } from "./generic";

type IvantiITSMCreate = paths["/api/data_sources/ivanti_itsm"]["post"]["requestBody"]["content"]["application/json"];
type IvantiITSMUpdate =
  paths["/api/data_sources/ivanti_itsm/{id}"]["put"]["requestBody"]["content"]["application/json"];
type IvantiITSMGet =
  paths["/api/data_sources/ivanti_itsm/{id}"]["get"]["responses"]["200"]["content"]["application/json"];
type ValidateIvantiITSM = components["schemas"]["Body_DataSourceIvantiITSMValidate"];

interface CheckConnectivityProps {
  handleSubmit: UseFormHandleSubmit<ValidateIvantiITSM["config"] & FieldValues>;
  itemId?: ValidateIvantiITSM["item_id"];
}
function CheckConnectivity({ handleSubmit, itemId }: CheckConnectivityProps) {
  const [result, setResult] = useState("");

  const mutation = useMutation({
    mutationFn: async (data: ValidateIvantiITSM) =>
      api
        .post(dataSourceManager.getDataSourceByType(DataSourceTypesEnum.IVANTI_ITSM)!.validate.route, data)
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
        <ListItem>Currently, this source only processes CI objects</ListItem>
        <ListItem>If a CI object contains multiple IP addresses, they should be comma-separated</ListItem>
        <ListItem>Custom attribute mapping is not yet supported. This feature is planned for a future release</ListItem>
      </Information>
      <SectionTitle>Prepare credentials</SectionTitle>
      <Box className="prose">
        <OrderedList>
          <ListItem>Log in to Ivanti and create a new REST API Key</ListItem>
          <ListItem>Create a new credential profile and add API Key to the &apos;Token&apos; field.</ListItem>
        </OrderedList>
      </Box>
    </Box>
  );
}

/**
 * Page component for creating an Ivanti ITSM Data Source.
 */
export function IvantiITSMDataSourceCreate({ successCallback, cancelCallback }: DataSourceCreateProps) {
  const methods = useForm<IvantiITSMCreate>({
    defaultValues: {
      is_enabled: true,
      is_asset_collection_enabled: true,
      asset_collection_interval: 5,
      priority: 4,
    },
  });

  const mutation = useMutation({
    mutationFn: (data: IvantiITSMCreate) =>
      api.post(dataSourceManager.getDataSourceByType(DataSourceTypesEnum.IVANTI_ITSM)!.create.route, data),
    onSuccess: () => successCallback(),
    onError: (error) => methods.setError(...parseFormError<IvantiITSMCreate>(error)),
  });

  return (
    <Block>
      <BlockTitle>Create Ivanti ITSM Data Source</BlockTitle>
      <Box className="lg:max-w-3xl">
        <SourceDescription />
        <Form onSubmit={methods.handleSubmit((data) => mutation.mutate(data))}>
          <PartialFormGeneral
            methods={methods}
            formFieldParams={{
              host: {
                placeholder: "https://ivanti.corp.com",
                description:
                  "If you are using the HEAT version of ITSM, the host URL should follow this format: https://ivanti.corp.com/HEAT/",
              },
              is_certificate_validation_enabled: { title: "Verify SSL Certificate" },
            }}
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

interface IvantiITSMDataSourceUpdateFormProps {
  id: string;
  values: IvantiITSMUpdate;
  className?: string;
  successCallback: () => void;
  cancelCallback: () => void;
}

/**
 * Form component to update an Ivanti ITSM Data Source.
 */
function IvantiITSMDataSourceUpdateForm({
  id,
  values,
  successCallback,
  cancelCallback,
  className,
}: IvantiITSMDataSourceUpdateFormProps) {
  const methods = useForm<IvantiITSMUpdate>({ defaultValues: values });

  const mutation = useMutation({
    mutationFn: (data: IvantiITSMUpdate) =>
      api.put(urlJoin(dataSourceManager.getDataSourceByType(DataSourceTypesEnum.IVANTI_ITSM)!.update.route, id), data),
    onSuccess: () => successCallback(),
    onError: (error) => methods.setError(...parseFormError<IvantiITSMUpdate>(error)),
  });

  return (
    <Form className={className} onSubmit={methods.handleSubmit((data) => mutation.mutate(data))}>
      <PartialFormGeneral
        methods={methods}
        formFieldParams={{
          host: {
            placeholder: "https://ivanti.corp.com",
            description:
              "If you are using the HEAT version of ITSM, the host URL should follow this format: https://ivanti.corp.com/HEAT/",
          },
          is_certificate_validation_enabled: { title: "Verify SSL Certificate" },
        }}
      />
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
 * Page component for updating an Ivanti ITSM Data Source.
 */
export function IvantiITSMDataSourceUpdate({ id, successCallback, cancelCallback }: DataSourceUpdateProps) {
  const query = useQuery<IvantiITSMGet>({
    queryKey: ["data_sources", id],
    queryFn: () =>
      api
        .get<IvantiITSMGet>(
          urlJoin(dataSourceManager.getDataSourceByType(DataSourceTypesEnum.IVANTI_ITSM)!.get.route, id)
        )
        .then((response) => response.data),
  });

  if (query.isError) return <ContentLoadingError error={query.error} />;
  if (query.isPending) return <ContentLoadingOverlay />;
  if (!query.data) return;

  return (
    <Block>
      <BlockTitle>Update Ivanti ITSM Data Source</BlockTitle>
      <Box className="lg:max-w-3xl">
        <SourceDescription />
        <IvantiITSMDataSourceUpdateForm
          id={id}
          values={query.data}
          successCallback={successCallback}
          cancelCallback={cancelCallback}
        />
      </Box>
    </Block>
  );
}
