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

type HostCreate = paths["/api/assets/hosts"]["post"]["requestBody"]["content"]["application/json"];
type HostGet = paths["/api/assets/hosts/{id}"]["get"]["responses"]["200"]["content"]["application/json"];
type HostUpdate = paths["/api/assets/hosts/{id}"]["put"]["requestBody"]["content"]["application/json"];

/**
 * Page component for creating an host asset.
 */
export function AssetHostCreate() {
  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
  } = useForm<HostCreate>();

  const navigate = useNavigate();
  const callback = () => navigate(-1);

  const mutation = useMutation({
    mutationFn: (data: HostCreate) => api.post("/api/assets/hosts", data),
    onSuccess: () => callback(),
    onError: (error) => setError(...parseFormError<HostCreate>(error)),
  });

  return (
    <Block>
      <BlockTitle>Create Host Asset</BlockTitle>
      <Box className="lg:max-w-3xl">
        <Form onSubmit={handleSubmit((data) => mutation.mutate(data))}>
          <FormInput
            {...register("name", { required: { value: true, message: formErrorMessages.fieldRequired } })}
            error={errors.name?.message}
            title="Name"
            required
          />
          <FormInput
            {...register("ip", { required: { value: true, message: formErrorMessages.fieldRequired } })}
            error={errors.ip?.message}
            title="IP"
            placeholder="192.168.1.1"
            required
          />
          <FormInput {...register("description")} error={errors.description?.message} title="Description" />
          <FormInput {...register("domain")} error={errors.domain?.message} title="Domain" />
          <FormInput {...register("mac_address")} error={errors.mac_address?.message} title="MAC Address" />
          <FormInput {...register("vendor")} error={errors.vendor?.message} title="Vendor" />
          <FormInput {...register("owner")} error={errors.owner?.message} title="Owner" />

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

interface AssetHostUpdateFormProps {
  values: HostGet;
  className?: string;
  callback: () => void;
  isDiscardButtonVisible?: boolean;
}

function AssetHostUpdateForm({ values, callback, className }: AssetHostUpdateFormProps) {
  const {
    register,
    formState: { errors },
    handleSubmit,
    setError,
  } = useForm<HostUpdate>({ values });

  const mutation = useMutation({
    mutationFn: (data: HostUpdate) =>
      api.put(urlJoin("/api/assets/hosts", values.id), data).then((response) => response.data),
    onSuccess: () => callback && callback(),
    onError: (error) => setError(...parseFormError<HostUpdate>(error)),
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
        {...register("ip", { required: { value: true, message: formErrorMessages.fieldRequired } })}
        error={errors.ip?.message}
        title="IP"
        placeholder="192.168.1.1"
        required
      />
      <FormInput {...register("description")} error={errors.description?.message} title="Description" />
      <FormInput {...register("domain")} error={errors.domain?.message} title="Domain" />
      <FormInput {...register("mac_address")} error={errors.mac_address?.message} title="MAC Address" />
      <FormInput {...register("vendor")} error={errors.vendor?.message} title="Vendor" />
      <FormInput {...register("owner")} error={errors.owner?.message} title="Owner" />
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
 * Page component for updating host asset.
 */
export default function AssetHostUpdate() {
  const navigate = useNavigate();

  const { assetId } = useParams();

  const query = useQuery<HostGet>({
    queryKey: ["assets_hosts", assetId],
    queryFn: () => api.get<HostGet>(urlJoin("/api/assets/hosts", assetId ?? "")).then((response) => response.data),
    enabled: assetId != undefined,
  });

  if (!assetId) return <NotFoundError />;
  if (query.isError) return <ContentLoadingError error={query.error} />;
  if (query.isPending) return <ContentLoadingOverlay />;
  if (!query.data) return null;

  return (
    <Block>
      <BlockTitle>Update Host Asset</BlockTitle>
      <AssetHostUpdateForm
        values={query.data}
        className="lg:max-w-3xl"
        isDiscardButtonVisible={true}
        callback={() => navigate(-1)}
      />
    </Block>
  );
}
