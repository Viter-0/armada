import { api } from "@/api";
import { paths } from "@/api/schema";
import { Block, BlockTitle, ContentLoadingError, ContentLoadingOverlay, NotFoundError } from "@/components";
import { Form, FormActions, FormButton, FormDiscardButton, FormError, FormInput } from "@/components/form";
import { formErrorMessages, parseFormError } from "@/util/error";
import { urlJoin } from "@/util/helpers";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { useNavigate, useParams } from "react-router";

type CredentialProfileGet =
  paths["/api/credential_profiles/{id}"]["get"]["responses"]["200"]["content"]["application/json"];
type CredentialProfileUpdate =
  paths["/api/credential_profiles/{id}"]["put"]["requestBody"]["content"]["application/json"];

// Default form field options
const defaultFieldOptions = { required: { value: true, message: formErrorMessages.fieldRequired } };

interface UpdateCredentialProfileFormProps {
  values: CredentialProfileGet;
  className?: string;
  callback?: () => void;
  isDiscardButtonVisible?: boolean;
}

/**
 * Form component to update a credential profile.
 */
function UpdateCredentialProfileForm({
  values,
  callback,
  className,
  isDiscardButtonVisible = false,
}: UpdateCredentialProfileFormProps) {
  const {
    register,
    formState: { errors },
    handleSubmit,
    setError,
  } = useForm<CredentialProfileUpdate>({ values });

  const mutation = useMutation({
    mutationFn: (data: CredentialProfileUpdate) =>
      api.put(urlJoin("/api/credential_profiles", values.id), data).then((response) => response.data),
    onSuccess: () => callback && callback(),
    onError: (error) => setError(...parseFormError<CredentialProfileUpdate>(error)),
  });

  return (
    <Form className={className} onSubmit={handleSubmit((data) => mutation.mutate(data))}>
      <FormInput
        {...register("name", defaultFieldOptions)}
        type="text"
        title="Name"
        error={errors.name?.message}
        required
      />
      <FormInput {...register("description")} type="text" title="Description" error={errors.description?.message} />
      <FormInput {...register("username")} type="text" title="Username" error={errors.username?.message} />
      <FormInput
        {...register("password", { setValueAs: (v) => (v === "" ? null : v) })}
        type="password"
        title="Password"
        error={errors.password?.message}
      />
      <FormInput
        {...register("token", { setValueAs: (v) => (v === "" ? null : v) })}
        type="password"
        title="Token"
        error={errors.token?.message}
      />
      <FormInput {...register("domain")} type="text" title="Domain" error={errors.domain?.message} />
      <FormError>{errors.root?.message}</FormError>

      <FormActions>
        {isDiscardButtonVisible && <FormDiscardButton to={".."}>Cancel</FormDiscardButton>}
        <FormButton isPending={mutation.isPending} className="btn-primary">
          Save Changes
        </FormButton>
      </FormActions>
    </Form>
  );
}

/**
 * Page component for updating a credential profile.
 */
export default function CredentialsUpdate() {
  const navigate = useNavigate();

  const { profileId } = useParams();

  const query = useQuery<CredentialProfileGet>({
    queryKey: ["credential_profiles", profileId],
    queryFn: () =>
      api
        .get<CredentialProfileGet>(urlJoin("/api/credential_profiles", profileId ?? ""))
        .then((response) => response.data),
    enabled: profileId != undefined,
  });

  if (!profileId) return <NotFoundError />;
  if (query.isError) return <ContentLoadingError error={query.error} />;
  if (query.isPending) return <ContentLoadingOverlay />;
  if (!query.data) return null;

  return (
    <Block>
      <BlockTitle>Update Credential Profile</BlockTitle>
      <UpdateCredentialProfileForm
        values={query.data}
        className="lg:max-w-3xl"
        isDiscardButtonVisible={true}
        callback={() => navigate("..")}
      />
    </Block>
  );
}
