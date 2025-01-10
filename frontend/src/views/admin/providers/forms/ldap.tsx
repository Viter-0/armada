import { api } from "@/api";
import { components, paths } from "@/api/schema";
import {
  Block,
  BlockTitle,
  Box,
  Button,
  Collapse,
  CollapseContent,
  CollapseTitle,
  ContentLoadingError,
  ContentLoadingOverlay,
  ListItem,
  UnorderedList,
  ValidateConnectivityResult,
} from "@/components";
import { InformationTooltip } from "@/components/feedback";
import { Form, FormActions, FormButton, FormError, FormInput, FormToggle } from "@/components/form";
import { ProviderTypesEnum } from "@/config/const";
import { formErrorMessages, parseAPIError, parseFormError } from "@/util/error";
import { urlJoin } from "@/util/helpers";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { FieldValues, UseFormHandleSubmit, useForm } from "react-hook-form";
import { Link } from "react-router";
import { authenticationProviderManager } from "../supportedProviders";
import { ProviderCreateProps, ProviderUpdateProps } from "../types";

type ProviderCreate = paths["/api/providers/ldap"]["post"]["requestBody"]["content"]["application/json"];
type ProviderValidate = components["schemas"]["Body_validate_provider_ldap_api_providers_ldap_validate_post"];
type ProviderGet = paths["/api/providers/ldap/{id}"]["get"]["responses"]["200"]["content"]["application/json"];
type ProviderUpdate = paths["/api/providers/ldap/{id}"]["put"]["requestBody"]["content"]["application/json"];

interface CheckConnectivityProps {
  handleSubmit: UseFormHandleSubmit<ProviderValidate["config"] & FieldValues>;
  itemId?: ProviderValidate["item_id"];
}

const defaultFormOptions = { required: { value: true, message: formErrorMessages.fieldRequired } };

/**
 * Component to check connectivity for LDAP provider.
 */
function CheckConnectivity({ handleSubmit, itemId }: CheckConnectivityProps) {
  const [result, setResult] = useState("");

  const mutation = useMutation({
    mutationFn: async (data: ProviderValidate) => {
      const route = authenticationProviderManager.getProviderByType(ProviderTypesEnum.LDAP)?.validate?.route;
      if (!route) throw new Error("Validate LDAP provider - API route does not exist");
      return api.post(route, data).then(() => setResult("Success"));
    },
    onError: (error) => setResult(parseAPIError(error).message),
  });

  return (
    <Box className="flex items-center mt-2">
      <Button
        className="btn-neutral btn-sm me-2"
        onClick={handleSubmit((data) => mutation.mutate({ config: data, item_id: itemId }))}
      >
        Check Connectivity
      </Button>
      <ValidateConnectivityResult isPending={mutation.isPending} state={mutation.isSuccess ? "success" : "error"}>
        {result}
      </ValidateConnectivityResult>
    </Box>
  );
}

function Information() {
  return (
    <Collapse className="collapse-arrow" type="checkbox">
      <CollapseTitle>Information</CollapseTitle>
      <CollapseContent className="prose">
        <UnorderedList>
          <ListItem>The LDAP server supports only LDAP (unencrypted) and LDAPS (encrypted) protocols</ListItem>
          <ListItem>Simple Bind is the only supported authentication method</ListItem>
          <ListItem>
            To ensure proper certificate verification for LDAPS connections, the CA certificate used to sign the
            server&apos;s certificate must be imported into the system&apos;s CA certificate store.
          </ListItem>
        </UnorderedList>
      </CollapseContent>
    </Collapse>
  );
}

/**
 * Page component for creating LDAP authentication provider.
 */
export function LdapProviderCreate({ callback }: ProviderCreateProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
    watch,
    setValue,
  } = useForm<ProviderCreate>({
    defaultValues: {
      is_enabled: true,
      port: 389,
      cn: "mail",
      is_connection_secure: false,
      is_certificate_validation_enabled: true,
      search_filter:
        "(&(objectCategory=person)(objectClass=user)(!(userAccountControl:1.2.840.113556.1.4.803:=2))(%a=%u))",
    },
  });

  const watchSecure = watch("is_connection_secure");

  useEffect(() => {
    setValue("port", watchSecure ? 636 : 389);
  }, [watchSecure, setValue]);

  const mutation = useMutation({
    mutationFn: async (data: ProviderCreate) => {
      const route = authenticationProviderManager.getProviderByType(ProviderTypesEnum.LDAP)?.create.route;
      if (!route) throw Error("Create LDAP provider - API route does not exist");
      return api.post(route, data);
    },
    onSuccess: () => callback(),
    onError: (error) => setError(...parseFormError<ProviderCreate>(error)),
  });

  return (
    <Block>
      <BlockTitle>Create LDAP authentication provider</BlockTitle>
      <Box className="lg:max-w-3xl">
        <Information />
        <Form onSubmit={handleSubmit((data) => mutation.mutate(data))}>
          <FormInput {...register("name", defaultFormOptions)} error={errors.name?.message} title="Name" required />
          <FormInput {...register("description")} error={errors.description?.message} title="Description" />
          <FormInput
            {...register("server", defaultFormOptions)}
            error={errors.server?.message}
            title="Server IP / FQDN"
            required
          />
          <FormInput {...register("port", defaultFormOptions)} error={errors.port?.message} title="Port" required />
          <Box className="flex items-center">
            <FormToggle
              {...register("is_connection_secure")}
              error={errors.is_connection_secure?.message}
              title="SSL"
              titlePosition="after"
            />
            <InformationTooltip message="Switch between LDAP and LDAPS protocols" />
          </Box>
          <Box className="flex items-center">
            <FormToggle
              {...register("is_certificate_validation_enabled")}
              error={errors.is_certificate_validation_enabled?.message}
              title="Validate Certificate"
              titlePosition="after"
            />
            <InformationTooltip message="Validate server certificate if SSL is enabled" />
          </Box>
          <FormInput
            {...register("cn", defaultFormOptions)}
            error={errors.cn?.message}
            title="Common Name"
            description="Attribute to use for authentication (login)"
            required
          />
          <FormInput
            {...register("base", defaultFormOptions)}
            error={errors.base?.message}
            title="Base DN"
            placeholder="OU=users,DC=example,DC=com"
            description="Search for users only in this OU"
            required
          />
          <FormInput
            {...register("user", defaultFormOptions)}
            error={errors.user?.message}
            title="User"
            placeholder="CN=service_account,OU=users,DC=example,DC=com"
            required
          />
          <FormInput
            {...register("password", defaultFormOptions)}
            error={errors.password?.message}
            type="password"
            title="Password"
            required
          />

          <Collapse className="collapse-arrow mt-4" type="checkbox">
            <CollapseTitle>Additional settings</CollapseTitle>
            <CollapseContent>
              {" "}
              <FormInput
                {...register("search_filter", defaultFormOptions)}
                error={errors.search_filter?.message}
                title="Search Filter"
                required
                description="Specify the search filter where '%a' will be replaced with the common name and '%u' with the value. Use this to customize the query."
              />
            </CollapseContent>
          </Collapse>

          <FormToggle
            {...register("is_enabled")}
            error={errors.is_enabled?.message}
            title="Enabled"
            titlePosition="after"
          />
          <CheckConnectivity handleSubmit={handleSubmit} />
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
      </Box>
    </Block>
  );
}

interface LdapProviderUpdateFormProps extends Pick<ProviderUpdateProps, "id"> {
  values: ProviderGet;
  className?: string;
  callback: () => void;
}

interface ProviderUpdateForm extends ProviderUpdate {
  name: ProviderGet["name"];
}

/**
 * Form component to update LDAP authentication provider.
 */
function LdapProviderUpdateForm({ id, values, callback, className }: LdapProviderUpdateFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
    watch,
    setValue,
  } = useForm<ProviderUpdateForm>({ defaultValues: values });

  const watchSecure = watch("is_connection_secure");

  useEffect(() => {
    setValue("port", watchSecure ? 636 : 389);
  }, [watchSecure, setValue]);

  const mutation = useMutation({
    mutationFn: (data: ProviderUpdate) =>
      api.put(urlJoin(authenticationProviderManager.getProviderByType(ProviderTypesEnum.LDAP)!.update.route, id), data),
    onSuccess: () => callback(),
    onError: (error) => setError(...parseFormError<ProviderUpdate>(error)),
  });

  return (
    <Form className={className} onSubmit={handleSubmit((data) => mutation.mutate(data))}>
      <FormInput {...register("name")} disabled title="Name" required />
      <FormInput {...register("description")} error={errors.description?.message} title="Description" />
      <FormInput
        {...register("server", defaultFormOptions)}
        error={errors.server?.message}
        title="Server IP / FQDN"
        required
      />
      <FormInput {...register("port", defaultFormOptions)} error={errors.port?.message} title="Port" required />
      <Box className="flex items-center">
        <FormToggle
          {...register("is_connection_secure")}
          error={errors.is_connection_secure?.message}
          title="SSL"
          titlePosition="after"
        />
        <InformationTooltip message="Switch between LDAP and LDAPS protocols" />
      </Box>
      <Box className="flex items-center">
        <FormToggle
          {...register("is_certificate_validation_enabled")}
          error={errors.is_certificate_validation_enabled?.message}
          title="Validate Certificate"
          titlePosition="after"
        />
        <InformationTooltip message="Validate server certificate if SSL is enabled" />
      </Box>
      <FormInput
        {...register("cn", defaultFormOptions)}
        error={errors.cn?.message}
        title="Common Name"
        description="Attribute to use for authentication (login)"
        required
      />
      <FormInput
        {...register("base", defaultFormOptions)}
        error={errors.base?.message}
        title="Base DN"
        placeholder="OU=users,DC=example,DC=com"
        description="Search for users only in this OU"
        required
      />
      <FormInput
        {...register("user", defaultFormOptions)}
        error={errors.user?.message}
        title="User"
        placeholder="CN=service_account,OU=users,DC=example,DC=com"
        required
      />
      <FormInput
        {...register("password", defaultFormOptions)}
        error={errors.password?.message}
        type="password"
        title="Password"
        required
      />

      <Collapse className="collapse-arrow mt-4" type="checkbox">
        <CollapseTitle>Additional settings</CollapseTitle>
        <CollapseContent>
          {" "}
          <FormInput
            {...register("search_filter", defaultFormOptions)}
            error={errors.search_filter?.message}
            title="Search Filter"
            required
            description="Specify the search filter where '%a' will be replaced with the common name and '%u' with the value. Use this to customize the query."
          />
        </CollapseContent>
      </Collapse>

      <FormToggle
        {...register("is_enabled")}
        error={errors.is_enabled?.message}
        title="Enabled"
        titlePosition="after"
      />
      <CheckConnectivity handleSubmit={handleSubmit} itemId={id} />
      <FormError>{errors.root?.message}</FormError>
      <FormActions>
        <Link to={".."}>
          <Button type="button" className="me-4 btn-neutral">
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
 * Page component for updating LDAP authentication provider.
 */
export function LdapProviderUpdate({ id, callback }: ProviderUpdateProps) {
  const query = useQuery<ProviderGet>({
    queryKey: ["providers", id],
    queryFn: () =>
      api
        .get<ProviderGet>(
          urlJoin(authenticationProviderManager.getProviderByType(ProviderTypesEnum.LDAP)!.get.route, id)
        )
        .then((response) => response.data),
  });

  if (query.isError) return <ContentLoadingError error={query.error} />;
  if (query.isPending) return <ContentLoadingOverlay />;
  if (!query.data) return null;

  return (
    <Block className="lg:max-w-3xl">
      <BlockTitle>Update LDAP authentication provider</BlockTitle>
      <Information />
      <LdapProviderUpdateForm id={id} values={query.data} callback={callback} />
    </Block>
  );
}
