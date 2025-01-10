import { api } from "@/api";
import { paths } from "@/api/schema";
import { Block, BlockTitle, ContentLoadingError, ContentLoadingOverlay, SettingsOption } from "@/components";
import { Form, FormActions, FormButton, FormError, FormInput } from "@/components/form";
import { formErrorMessages, parseFormError } from "@/util/error";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";

type SettingsGet = paths["/api/settings/security"]["get"]["responses"]["200"]["content"]["application/json"];
type SettingsUpdate = paths["/api/settings/security"]["put"]["requestBody"]["content"]["application/json"];

const defaultFormOptions = { required: { value: true, message: formErrorMessages.fieldRequired } };

/**
 * Form component to update security settings.
 */
function Settings({ values, className = "" }: { values: SettingsGet; className?: string }) {
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<SettingsUpdate>({ values });

  const mutation = useMutation({
    mutationFn: (data: SettingsUpdate) => api.put("/api/settings/security", data),
    onSuccess: () => toast.success("Settings updated"),
    onError: (error) => setError(...parseFormError<SettingsUpdate>(error)),
  });

  return (
    <Form className={className} onSubmit={handleSubmit((data) => mutation.mutate(data))}>
      <SettingsOption title="Session auth lifespan" description="JWT session token lifespan (minutes)" required>
        <FormInput
          {...register("auth_jwt_lifespan", defaultFormOptions)}
          error={errors.auth_jwt_lifespan?.message}
          required
        />
      </SettingsOption>
      <SettingsOption
        title="Session refresh lifespan"
        description="JWT session refresh token lifespan (minutes). Must be longer than the session token lifespan"
        required
      >
        <FormInput
          {...register("refresh_jwt_lifespan", defaultFormOptions)}
          error={errors.refresh_jwt_lifespan?.message}
          required
        />
      </SettingsOption>
      <FormError>{errors.root?.message}</FormError>
      <FormActions>
        <FormButton isPending={mutation.isPending} className="btn-primary">
          Save Changes
        </FormButton>
      </FormActions>
    </Form>
  );
}

/**
 * Page component to list all security settings.
 */
export default function SettingsSecurity() {
  const query = useQuery({
    queryKey: ["settings", "security"],
    queryFn: () => api.get<SettingsGet>("/api/settings/security").then((response) => response.data),
  });

  return (
    <Block>
      <BlockTitle>Security & Privacy</BlockTitle>
      {query.isSuccess && <Settings className="lg:max-w-4xl" values={query.data} />}
      {query.isLoading && <ContentLoadingOverlay />}
      {query.isError && <ContentLoadingError error={query.error} />}
    </Block>
  );
}
