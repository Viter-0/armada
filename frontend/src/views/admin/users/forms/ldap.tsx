import { api } from "@/api";
import { Block, BlockTitle, Button, ContentLoadingError, ContentLoadingOverlay } from "@/components";
import { Form, FormActions, FormButton, FormError, FormInput, FormSelect, FormToggle } from "@/components/form";
import { ProviderTypesEnum, RolesEnum } from "@/config/const";
import { formErrorMessages, parseFormError } from "@/util/error";
import { urlJoin } from "@/util/helpers";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { Link } from "react-router";
import { userProviderManager } from "../supportedUserProviders";
import { UserCreate, UserCreateProps, UserGet, UserUpdate, UserUpdateProps } from "../types";

const defaultFormOptions = { required: { value: true, message: formErrorMessages.fieldRequired } };

/**
 * Page component for creating an LDAP user.
 */
export function LdapUserCreate({ callback, roles, providerId }: UserCreateProps) {
  const defaultRole = Object.entries(roles).find((entry) => entry[1] === RolesEnum.USER);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
  } = useForm<UserCreate>({
    defaultValues: {
      is_enabled: true,
      provider_id: providerId,
      role_id: defaultRole ? defaultRole[0] : undefined,
    },
  });

  const mutation = useMutation({
    mutationFn: (data: UserCreate) =>
      api.post(userProviderManager.getUserProviderByType(ProviderTypesEnum.LDAP)!.create.route, data),
    onSuccess: () => callback(),
    onError: (error) => setError(...parseFormError<UserCreate>(error)),
  });

  return (
    <Block>
      <BlockTitle>Create LDAP user</BlockTitle>
      <Form className="lg:max-w-3xl" onSubmit={handleSubmit((data) => mutation.mutate(data))}>
        <FormInput {...register("name", defaultFormOptions)} title="Name" error={errors.name?.message} required />
        <FormInput
          {...register("email", defaultFormOptions)}
          error={errors.email?.message}
          title="Email"
          description="Value assigned to the authentication attribute"
          required
        />
        <FormInput {...register("provider_id")} type="hidden" />
        <FormSelect
          {...register("role_id", defaultFormOptions)}
          isEmptyOptionVisible={false}
          values={roles}
          error={errors.role_id?.message}
          title="Role"
          required
        />
        <FormToggle
          {...register("is_enabled")}
          error={errors.is_enabled?.message}
          title="Enabled"
          titlePosition="after"
        />
        <FormError>{errors.root?.message}</FormError>
        <FormActions>
          <Link to={".."}>
            <Button type="button" className="me-4 btn-neutral">
              Discard
            </Button>
          </Link>
          <FormButton className="btn-primary" isPending={mutation.isPending}>
            Create
          </FormButton>
        </FormActions>
      </Form>
    </Block>
  );
}

interface LdapUserUpdateFormProps extends Pick<UserUpdateProps, "roles" | "id"> {
  values: UserGet;
  className?: string;
  callback: () => void;
}

interface UserUpdateForm extends UserUpdate {
  email: UserGet["email"];
}

/**
 * Form component to update an LDAP user.
 */
function LdapUserUpdateForm({ id, values, callback, className, roles }: LdapUserUpdateFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
  } = useForm<UserUpdateForm>({ defaultValues: values });

  const mutation = useMutation({
    mutationFn: (data: UserUpdate) =>
      api.put(urlJoin(userProviderManager.getUserProviderByType(ProviderTypesEnum.LDAP)!.update.route, id), data),
    onSuccess: () => callback(),
    onError: (error) => setError(...parseFormError<UserUpdate>(error)),
  });

  return (
    <Form className={className} onSubmit={handleSubmit((data) => mutation.mutate(data))}>
      <FormInput {...register("name", defaultFormOptions)} title="Name" error={errors.name?.message} required />
      <FormInput
        {...register("email", { disabled: true })}
        title="Email"
        description="Value assigned to the authentication attribute"
        required
      />
      <FormSelect
        {...register("role_id", defaultFormOptions)}
        isEmptyOptionVisible={false}
        values={roles}
        error={errors.role_id?.message}
        title="Role"
      />
      <FormToggle
        {...register("is_enabled")}
        error={errors.is_enabled?.message}
        title="Enabled"
        titlePosition="after"
      />
      <FormError>{errors.root?.message}</FormError>
      <FormActions>
        <Link to={".."}>
          <Button type="button" className="me-4">
            Cancel
          </Button>
        </Link>
        <FormButton isPending={mutation.isPending} className="btn-primary">
          Save Changes
        </FormButton>
      </FormActions>
    </Form>
  );
}

/**
 * Page component for updating an LDAP user.
 */
export function LdapUserUpdate({ id, callback, roles }: UserUpdateProps) {
  const query = useQuery<UserGet>({
    queryKey: ["users", id],
    queryFn: () =>
      api
        .get<UserGet>(urlJoin(userProviderManager.getUserProviderByType(ProviderTypesEnum.LDAP)!.get.route, id))
        .then((response) => response.data),
  });

  if (query.isError) return <ContentLoadingError error={query.error} />;
  if (query.isPending) return <ContentLoadingOverlay />;
  if (!query.data) return null;

  return (
    <Block>
      <BlockTitle>Update LDAP user</BlockTitle>
      <LdapUserUpdateForm id={id} values={query.data} className="lg:max-w-3xl" callback={callback} roles={roles} />
    </Block>
  );
}
