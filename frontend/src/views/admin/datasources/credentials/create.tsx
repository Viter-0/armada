import { api } from "@/api";
import { paths } from "@/api/schema";
import { Block, BlockTitle } from "@/components";
import { Form, FormActions, FormButton, FormDiscardButton, FormError, FormInput } from "@/components/form";
import { formErrorMessages, parseFormError } from "@/util/error";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router";

type CredentialProfileCreate = paths["/api/credential_profiles"]["post"]["requestBody"]["content"]["application/json"];
type CredentialProfileCreateResult =
  paths["/api/credential_profiles"]["post"]["responses"]["200"]["content"]["application/json"];

export type FieldConfig = Record<string, unknown> & {
  visible?: boolean;
};

export interface CredentialFormConfiguration {
  defaultValues?: Partial<CredentialProfileCreate>;
  formFieldParams: Partial<Record<keyof CredentialProfileCreate, FieldConfig>>;
}

interface CreateCredentialProfileFormProps {
  className?: string;
  callback?: (data: CredentialProfileCreateResult) => void;
  isDiscardButtonVisible?: boolean;
  formConfig?: CredentialFormConfiguration;
}

// Default form field options
const defaultFieldOptions = { required: { value: true, message: formErrorMessages.fieldRequired } };

/**
 * Form component to create a credential profile.
 */
export function CreateCredentialProfileForm({
  callback,
  className,
  isDiscardButtonVisible = false,
  formConfig,
}: CreateCredentialProfileFormProps) {
  const {
    register,
    formState: { errors },
    handleSubmit,
    setError,
  } = useForm<CredentialProfileCreate>({ defaultValues: formConfig?.defaultValues });

  const mutation = useMutation({
    mutationFn: async (data: CredentialProfileCreate) =>
      api.post<CredentialProfileCreateResult>("/api/credential_profiles", data).then((response) => response.data),
    onSuccess: (data) => callback && callback(data),
    onError: (error) => setError(...parseFormError<CredentialProfileCreate>(error)),
  });

  return (
    <Form className={className}>
      <FormInput
        {...register("name", defaultFieldOptions)}
        type="text"
        title="Name"
        error={errors.name?.message}
        required
        {...formConfig?.formFieldParams.name}
      />
      <FormInput
        {...register("description")}
        type="text"
        title="Description"
        error={errors.description?.message}
        {...formConfig?.formFieldParams.description}
      />
      {(formConfig?.formFieldParams.username?.visible ?? true) && (
        <FormInput
          {...register("username")}
          type="text"
          title="Username"
          error={errors.username?.message}
          {...formConfig?.formFieldParams.username}
        />
      )}
      {(formConfig?.formFieldParams.password?.visible ?? true) && (
        <FormInput
          {...register("password", { setValueAs: (v) => (v === "" ? null : v) })}
          type="password"
          title="Password"
          error={errors.password?.message}
          {...formConfig?.formFieldParams.password}
        />
      )}
      {(formConfig?.formFieldParams.token?.visible ?? true) && (
        <FormInput
          {...register("token", { setValueAs: (v) => (v === "" ? null : v) })}
          type="password"
          title="Token"
          error={errors.token?.message}
          {...formConfig?.formFieldParams.token}
        />
      )}
      {(formConfig?.formFieldParams.domain?.visible ?? true) && (
        <FormInput
          {...register("domain")}
          type="text"
          title="Domain"
          error={errors.domain?.message}
          {...formConfig?.formFieldParams.domain}
        />
      )}

      <FormError>{errors.root?.message}</FormError>

      <FormActions>
        {isDiscardButtonVisible && <FormDiscardButton to={".."}>Discard</FormDiscardButton>}
        {/* Submit the form when the button is clicked. Since this form is used as a modal within another form, 
            ensure that only the current form is submitted without triggering the submission of the background form */}
        <FormButton
          type="button"
          className="btn-primary"
          isPending={mutation.isPending}
          onClick={handleSubmit((data) => mutation.mutate(data))}
        >
          Create
        </FormButton>
      </FormActions>
    </Form>
  );
}

/**
 * Page component for creating a credential profile.
 */
export default function CredentialsCreate({ formConfig }: { formConfig?: CredentialFormConfiguration }) {
  const navigate = useNavigate();

  return (
    <Block className="p-4">
      <BlockTitle>Create Credential Profile</BlockTitle>
      <CreateCredentialProfileForm
        className="lg:max-w-3xl"
        isDiscardButtonVisible
        callback={() => navigate("..")}
        formConfig={formConfig}
      />
    </Block>
  );
}
