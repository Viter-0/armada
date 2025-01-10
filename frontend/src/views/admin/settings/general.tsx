import { api } from "@/api";
import { paths } from "@/api/schema";
import { Block, BlockTitle, ContentLoadingError, ContentLoadingOverlay, SettingsOption } from "@/components";
import { Form, FormActions, FormButton, FormError, FormInput, FormToggle } from "@/components/form";
import { formErrorMessages, parseFormError } from "@/util/error";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";

type SettingsGet = paths["/api/settings/general"]["get"]["responses"]["200"]["content"]["application/json"];
type SettingsUpdate = paths["/api/settings/general"]["put"]["requestBody"]["content"]["application/json"];

const defaultFormOptions = { required: { value: true, message: formErrorMessages.fieldRequired } };

/**
 * Form component to update general settings.
 */
function Settings({ values, className = "" }: { values: SettingsGet; className?: string }) {
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<SettingsUpdate>({ values });

  const mutation = useMutation({
    mutationFn: async (data: SettingsUpdate) => api.put("/api/settings/general", data),
    onSuccess: () => toast.success("Settings updated"),
    onError: (error) => setError(...parseFormError<SettingsUpdate>(error)),
  });

  return (
    <Form className={className} onSubmit={handleSubmit((data) => mutation.mutate(data))}>
      <SettingsOption title="Check for updates" description="Check for updates automatically">
        <FormToggle {...register("check_for_updates")} error={errors.check_for_updates?.message} />
      </SettingsOption>
      <SettingsOption
        title="Stale asset retention period"
        description="The retention period (in days) for stale assets before they are purged. 
        This only applies to dynamic assets and does not affect user-defined or modified assets."
        required
      >
        <FormInput
          {...register("stale_asset_retention", defaultFormOptions)}
          error={errors.stale_asset_retention?.message}
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
 * Page component to list all general settings.
 */
export default function SettingsGeneral() {
  const query = useQuery({
    queryKey: ["settings", "general"],
    queryFn: () => api.get<SettingsGet>("/api/settings/general").then((response) => response.data),
  });

  return (
    <Block>
      <BlockTitle>General</BlockTitle>
      {query.isSuccess && <Settings className="lg:max-w-4xl" values={query.data} />}
      {query.isLoading && <ContentLoadingOverlay />}
      {query.isError && <ContentLoadingError error={query.error} />}
    </Block>
  );
}
