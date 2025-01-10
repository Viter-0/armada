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

type NetworkCreate = paths["/api/assets/networks"]["post"]["requestBody"]["content"]["application/json"];
type NetworkGet = paths["/api/assets/networks/{id}"]["get"]["responses"]["200"]["content"]["application/json"];
type NetworkUpdate = paths["/api/assets/networks/{id}"]["put"]["requestBody"]["content"]["application/json"];

/**
 * Page component for creating an Network Asset.
 */
export function AssetNetworkCreate() {
  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
  } = useForm<NetworkCreate>();

  const navigate = useNavigate();
  const callback = () => navigate(-1);

  const mutation = useMutation({
    mutationFn: (data: NetworkCreate) => api.post("/api/assets/networks", data),
    onSuccess: () => callback(),
    onError: (error) => setError(...parseFormError<NetworkCreate>(error)),
  });

  return (
    <Block>
      <BlockTitle>Create Network Asset</BlockTitle>
      <Box className="lg:max-w-3xl">
        <Form onSubmit={handleSubmit((data) => mutation.mutate(data))}>
          <FormInput
            {...register("name", { required: { value: true, message: formErrorMessages.fieldRequired } })}
            error={errors.name?.message}
            title="Name"
            required
          />
          <FormInput
            {...register("cidr", { required: { value: true, message: formErrorMessages.fieldRequired } })}
            error={errors.cidr?.message}
            title="CIDR"
            placeholder="192.168.1.0/24"
            required
          />
          <FormInput {...register("description")} error={errors.description?.message} title="Description" />
          <FormInput {...register("location")} error={errors.location?.message} title="Location" />
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

interface AssetNetworkUpdateFormProps {
  values: NetworkGet;
  className?: string;
  callback: () => void;
  isDiscardButtonVisible?: boolean;
}

function AssetNetworkUpdateForm({ values, callback, className }: AssetNetworkUpdateFormProps) {
  const {
    register,
    formState: { errors },
    handleSubmit,
    setError,
  } = useForm<NetworkUpdate>({ values });

  const mutation = useMutation({
    mutationFn: (data: NetworkUpdate) =>
      api.put(urlJoin("/api/assets/networks", values.id), data).then((response) => response.data),
    onSuccess: () => callback && callback(),
    onError: (error) => setError(...parseFormError<NetworkUpdate>(error)),
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
        {...register("cidr", { required: { value: true, message: formErrorMessages.fieldRequired } })}
        error={errors.cidr?.message}
        title="CIDR"
        placeholder="192.168.1.0/24"
        required
      />
      <FormInput {...register("description")} error={errors.description?.message} title="Description" />
      <FormInput {...register("location")} error={errors.location?.message} title="Location" />
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
 * Page component for updating network asset.
 */
export default function AssetNetworkUpdate() {
  const navigate = useNavigate();

  const { assetId } = useParams();

  const query = useQuery<NetworkGet>({
    queryKey: ["assets_networks", assetId],
    queryFn: () =>
      api.get<NetworkGet>(urlJoin("/api/assets/networks", assetId ?? "")).then((response) => response.data),
    enabled: assetId != undefined,
  });

  if (!assetId) return <NotFoundError />;
  if (query.isError) return <ContentLoadingError error={query.error} />;
  if (query.isPending) return <ContentLoadingOverlay />;
  if (!query.data) return null;

  return (
    <Block>
      <BlockTitle>Update Network Asset</BlockTitle>
      <AssetNetworkUpdateForm
        values={query.data}
        className="lg:max-w-3xl"
        isDiscardButtonVisible={true}
        callback={() => navigate(-1)}
      />
    </Block>
  );
}
