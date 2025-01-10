import { Box, SectionTitle } from "@/components";
import { InformationTooltip } from "@/components/feedback";
import { FormInput, FormToggle } from "@/components/form";
import { formErrorMessages } from "@/util/error";
import { partialForm } from "@/util/helpers";
import { FieldValues, UseFormReturn } from "react-hook-form";
import { CredentialsFormSelect } from "../credentials";
import { CredentialFormConfiguration } from "../credentials/create";

interface PartialFormGeneralValues {
  name: string;
  host: string;
  description?: string | null;
  is_enabled?: boolean;
  credential_profile_id?: string | null;
  is_certificate_validation_enabled?: boolean;
}

interface PartialFormGeneralProps<T extends FieldValues> {
  methods: UseFormReturn<T & PartialFormGeneralValues>;
  feature_certificate?: boolean;
  /** Optional configuration for individual form fields */
  formFieldParams?: Partial<Record<keyof PartialFormGeneralValues, Record<string, unknown> | undefined>>;
  credentialFormConfig?: CredentialFormConfiguration;
}

/**
 * Partial form. Manages General fields.
 *
 * @param methods - React Hook Form methods for form state and validation
 * @param feature_certificate - Whether to show certificate validation toggle
 * @param formFieldParams - Additional configuration for individual form fields
 */
export function PartialFormGeneral<T extends FieldValues>({
  methods,
  formFieldParams,
  credentialFormConfig,
  feature_certificate = true,
}: PartialFormGeneralProps<T>) {
  const options = { required: { value: true, message: formErrorMessages.fieldRequired } };
  const {
    register,
    formState: { errors },
    setValue,
  } = partialForm<PartialFormGeneralValues>(methods);

  // Delay setting credential ID to allow for API fetch to complete
  const createNewProfileCallback = (id: string) => setTimeout(() => setValue("credential_profile_id", id), 200);

  return (
    <>
      <SectionTitle>General</SectionTitle>
      <FormInput
        {...formFieldParams?.name}
        {...register("name", options)}
        type="text"
        title="Name"
        error={errors.name?.message}
        required
      />
      <FormInput
        {...formFieldParams?.description}
        {...register("description")}
        title="Description"
        error={errors.description?.message}
      />
      <FormInput
        {...formFieldParams?.host}
        {...register("host", options)}
        title="Host"
        error={errors.host?.message}
        required
      />
      <CredentialsFormSelect
        {...formFieldParams?.credential_profile_id}
        {...register("credential_profile_id", options)}
        createNewProfileCallback={createNewProfileCallback}
        error={errors.credential_profile_id?.message}
        formConfig={credentialFormConfig}
        required
      />
      {feature_certificate && (
        <FormToggle
          {...register("is_certificate_validation_enabled")}
          error={errors.is_certificate_validation_enabled?.message}
          titlePosition="after"
          title="Verify SSL Certificate"
          {...formFieldParams?.is_certificate_validation_enabled}
        />
      )}
      <FormToggle
        {...formFieldParams?.is_enabled}
        {...register("is_enabled")}
        error={errors.is_enabled?.message}
        title="Enabled"
        titlePosition="after"
      />
    </>
  );
}

interface PartialFormLogsValues {
  is_log_fetching_enabled?: boolean;
}

interface PartialFormLogsProps<T extends FieldValues> {
  methods: UseFormReturn<T & PartialFormLogsValues>;
  formFieldParams?: Partial<Record<keyof PartialFormLogsValues, Record<string, unknown> | undefined>>;
}

/**
 * Partial form. Manages standard Logs fields.
 *
 * @param methods - React Hook Form methods for form state and validation
 * @param formFieldParams - Additional configuration for individual form fields
 */
export function PartialFormLogs<T extends FieldValues>({ methods, formFieldParams }: PartialFormLogsProps<T>) {
  const {
    register,
    formState: { errors },
  } = partialForm<PartialFormLogsValues>(methods);

  return (
    <>
      <SectionTitle>Logs</SectionTitle>
      <Box className="flex items-center">
        <FormToggle
          {...formFieldParams?.is_log_fetching_enabled}
          {...register("is_log_fetching_enabled")}
          error={errors.is_log_fetching_enabled?.message}
          title="Enable log fetching"
          titlePosition="after"
        />
        <InformationTooltip message="Enabling this option will allow you to fetch logs from this data source." />
      </Box>
    </>
  );
}

interface PartialFormAssetsValues {
  asset_collection_interval?: number;
  is_asset_collection_enabled?: boolean;
  priority?: number;
}

interface PartialFormAssetsProps<T extends FieldValues> {
  methods: UseFormReturn<T & PartialFormAssetsValues>;
  formFieldParams?: Partial<Record<keyof PartialFormAssetsValues, Record<string, unknown> | undefined>>;
}

/**
 * Partial form. Manages standard Asset fields.
 *
 * @param methods - React Hook Form methods for form state and validation
 * @param formFieldParams - Additional configuration for individual form fields
 */
export function PartialFormAssets<T extends FieldValues>({ methods, formFieldParams }: PartialFormAssetsProps<T>) {
  const options = { required: { value: true, message: formErrorMessages.fieldRequired } };
  const {
    register,
    formState: { errors },
  } = partialForm<PartialFormAssetsValues>(methods);

  return (
    <>
      <SectionTitle>Asset</SectionTitle>
      <FormInput
        {...formFieldParams?.asset_collection_interval}
        {...register("asset_collection_interval", {
          ...options,
          min: { value: 1, message: "Input should be more than or equal to 1" },
          max: { value: 1440, message: "Input should be less than or equal to 1440" },
        })}
        error={errors.asset_collection_interval?.message}
        type="number"
        title="Collection Interval"
        description="Specify the interval (in minutes) for asset collection."
      />
      <FormInput
        {...formFieldParams?.priority}
        {...register("priority", {
          ...options,
          min: { value: 1, message: "Input should be more than or equal to 1" },
          max: { value: 10, message: "Input should be less than or equal to 10" },
        })}
        error={errors.priority?.message}
        type="number"
        title="Priority"
        description="In cases where multiple sources provide a value for the same asset, the source with the higher priority takes precedence"
      />
      <Box className="flex items-center">
        <FormToggle
          {...formFieldParams?.is_asset_collection_enabled}
          {...register("is_asset_collection_enabled")}
          error={errors.is_asset_collection_enabled?.message}
          title="Enable asset collection"
          titlePosition="after"
        />
        <InformationTooltip message="Enabling this option will allow you to collect asset information from this data source." />
      </Box>
    </>
  );
}
