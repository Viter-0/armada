import { api } from "@/api";
import { paths } from "@/api/schema";
import { Block, BlockTitle, ContentLoadingError, ContentLoadingOverlay } from "@/components";
import { Form, FormActions, FormButton, FormDiscardButton, FormError, FormInput, FormToggle } from "@/components/form";
import { ProviderTypesEnum } from "@/config/const";
import { parseFormError } from "@/util/error";
import { urlJoin } from "@/util/helpers";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { authenticationProviderManager } from "../supportedProviders";
import { ProviderUpdateProps } from "../types";

type ProviderGet = paths["/api/providers/local/{id}"]["get"]["responses"]["200"]["content"]["application/json"];
type ProviderUpdate = paths["/api/providers/local/{id}"]["put"]["requestBody"]["content"]["application/json"];

interface LocalProviderUpdateFormProps extends Pick<ProviderUpdateProps, "id"> {
  values: ProviderGet;
  className?: string;
  callback: () => void;
}

interface ProviderUpdateForm extends ProviderUpdate {
  name: ProviderGet["name"];
  description: ProviderGet["description"];
}

/**
 * Form component to update local authentication provider.
 */
function LocalProviderUpdateForm({ id, values, callback, className }: LocalProviderUpdateFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
  } = useForm<ProviderUpdateForm>({ defaultValues: values });

  const mutation = useMutation({
    mutationFn: (data: ProviderUpdate) =>
      api.put(
        urlJoin(authenticationProviderManager.getProviderByType(ProviderTypesEnum.LOCAL)!.update.route, id),
        data
      ),
    onSuccess: () => callback(),
    onError: (error) => setError(...parseFormError<ProviderUpdate>(error)),
  });

  return (
    <Form className={className} onSubmit={handleSubmit((data) => mutation.mutate(data))}>
      <FormInput {...register("name")} disabled title="Name" required />
      <FormInput {...register("description")} disabled title="Description" />
      <FormToggle
        {...register("is_enabled")}
        error={errors.is_enabled?.message}
        title="Enabled"
        titlePosition="after"
      />

      <FormError>{errors.root?.message}</FormError>
      <FormActions>
        <FormDiscardButton to={".."}>Cancel</FormDiscardButton>
        <FormButton isPending={mutation.isPending} className="btn-primary">
          Save Changes
        </FormButton>
      </FormActions>
    </Form>
  );
}

/**
 * Page component for updating local authentication provider.
 */
export function LocalProviderUpdate({ id, callback }: ProviderUpdateProps) {
  const query = useQuery<ProviderGet>({
    queryKey: ["providers", id],
    queryFn: () =>
      api
        .get<ProviderGet>(
          urlJoin(authenticationProviderManager.getProviderByType(ProviderTypesEnum.LOCAL)!.get.route, id)
        )
        .then((response) => response.data),
  });

  if (query.isError) return <ContentLoadingError error={query.error} />;
  if (query.isPending) return <ContentLoadingOverlay />;
  if (!query.data) return null;

  return (
    <Block>
      <BlockTitle>Update local authentication provider</BlockTitle>
      <LocalProviderUpdateForm id={id} values={query.data} className="lg:max-w-3xl" callback={callback} />
    </Block>
  );
}
