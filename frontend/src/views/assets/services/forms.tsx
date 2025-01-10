import { api } from "@/api";
import { paths } from "@/api/schema";
import { Block, BlockTitle, Box, ContentLoadingError, ContentLoadingOverlay, NotFoundError } from "@/components";
import { Form, FormError, FormGenericActions, FormInput } from "@/components/form";
import { formErrorMessages, parseFormError } from "@/util/error";
import { urlJoin } from "@/util/helpers";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { useNavigate, useParams } from "react-router";
import { AssetLockStatus } from "../shared";

type ServiceCreate = paths["/api/assets/services"]["post"]["requestBody"]["content"]["application/json"];
type ServiceGet = paths["/api/assets/services/{id}"]["get"]["responses"]["200"]["content"]["application/json"];
type ServiceUpdate = paths["/api/assets/services/{id}"]["put"]["requestBody"]["content"]["application/json"];

/**
 * Page component for creating an Service Asset.
 */
export function AssetServiceCreate() {
  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
  } = useForm<ServiceCreate>();

  const navigate = useNavigate();
  const callback = () => navigate(-1);

  const mutation = useMutation({
    mutationFn: (data: ServiceCreate) => api.post("/api/assets/services", data),
    onSuccess: () => callback(),
    onError: (error) => setError(...parseFormError<ServiceCreate>(error)),
  });

  return (
    <Block>
      <BlockTitle>Create Service Asset</BlockTitle>
      <Box className="lg:max-w-3xl">
        <Form onSubmit={handleSubmit((data) => mutation.mutate(data))}>
          <FormInput
            {...register("name", { required: { value: true, message: formErrorMessages.fieldRequired } })}
            error={errors.name?.message}
            title="Name"
            required
          />
          <FormInput
            {...register("port", { required: { value: true, message: formErrorMessages.fieldRequired } })}
            error={errors.port?.message}
            title="Port"
            placeholder="443"
            required
          />
          <FormInput {...register("protocol")} error={errors.protocol?.message} title="Protocol" placeholder="TCP" />
          <FormInput {...register("description")} error={errors.description?.message} title="Description" />
          <FormError>{errors.root?.message}</FormError>
          <FormGenericActions
            cancelBtnName="Discard"
            submitBtnName="Create"
            onCancel={callback}
            isPending={mutation.isPending}
          />
        </Form>
      </Box>
    </Block>
  );
}

interface AssetServiceUpdateFormProps {
  values: ServiceGet;
  className?: string;
  callback: () => void;
  isDiscardButtonVisible?: boolean;
}

function AssetServiceUpdateForm({ values, callback, className }: AssetServiceUpdateFormProps) {
  const {
    register,
    formState: { errors },
    handleSubmit,
    setError,
  } = useForm<ServiceUpdate>({ values });

  const mutation = useMutation({
    mutationFn: (data: ServiceUpdate) =>
      api.put(urlJoin("/api/assets/services", values.id), data).then((response) => response.data),
    onSuccess: () => callback && callback(),
    onError: (error) => setError(...parseFormError<ServiceUpdate>(error)),
  });

  return (
    <Form className={className} onSubmit={handleSubmit((data) => mutation.mutate(data))}>
      <AssetLockStatus isLocked={values.is_modified_by_user} />
      <FormInput
        {...register("name", { required: { value: true, message: formErrorMessages.fieldRequired } })}
        error={errors.name?.message}
        title="Name"
        required
      />
      <FormInput
        {...register("port", { required: { value: true, message: formErrorMessages.fieldRequired } })}
        error={errors.port?.message}
        title="Port"
        placeholder="443"
        required
      />
      <FormInput {...register("protocol")} error={errors.protocol?.message} title="Protocol" placeholder="TCP" />
      <FormInput {...register("description")} error={errors.description?.message} title="Description" />

      <FormError>{errors.root?.message}</FormError>
      <FormGenericActions
        cancelBtnName="Cancel"
        submitBtnName="Save Changes"
        onCancel={callback}
        isPending={mutation.isPending}
      />
    </Form>
  );
}

/**
 * Page component for updating service asset.
 */
export default function AssetServiceUpdate() {
  const navigate = useNavigate();

  const { assetId } = useParams();

  const query = useQuery<ServiceGet>({
    queryKey: ["assets_services", assetId],
    queryFn: () =>
      api.get<ServiceGet>(urlJoin("/api/assets/services", assetId ?? "")).then((response) => response.data),
    enabled: assetId != undefined,
  });

  if (!assetId) return <NotFoundError />;
  if (query.isError) return <ContentLoadingError error={query.error} />;
  if (query.isPending) return <ContentLoadingOverlay />;
  if (!query.data) return null;

  return (
    <Block>
      <BlockTitle>Update Service Asset</BlockTitle>
      <AssetServiceUpdateForm
        values={query.data}
        className="lg:max-w-3xl"
        isDiscardButtonVisible={true}
        callback={() => navigate(-1)}
      />
    </Block>
  );
}
