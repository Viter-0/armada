import { api } from "@/api";
import { paths } from "@/api/schema";
import {
  AlertInfo,
  Block,
  BlockTitle,
  Box,
  Card,
  CardBody,
  CardBottomActions,
  CardHeader,
  CardTitle,
  Heading,
  SettingsOption,
} from "@/components";
import { Form, FormButton, FormError, FormInput, FormSelect, FormToggle } from "@/components/form";
import { ProviderTypesEnum } from "@/config/const";
import { useGlobalStore } from "@/store";
import { formErrorMessages, parseFormError } from "@/util/error";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { useShallow } from "zustand/react/shallow";
import { useLogsStore } from "./logs/store";

type NewPassword = paths["/api/auth/password"]["post"]["requestBody"]["content"]["application/json"];
type UserCredentials = { name: string; email: string } & NewPassword;

interface UserSettings {
  showNotifications?: boolean;
  assetCacheSize: number;
  timezone: string;
}

const timezones = (Intl.supportedValuesOf("timeZone") as string[]).reduce((acc, val) => {
  acc[val] = val;
  return acc;
}, {} as Record<string, string>);

function Settings() {
  const logsState = useLogsStore(
    useShallow((state) => ({
      assetCacheSize: state.assetCacheSize,
      updateAssetCacheSize: state.updateAssetCacheSize,
    }))
  );

  const globalState = useGlobalStore(
    useShallow((state) => ({
      updateTimezone: state.updateTimezone,
      toggleShowNotifications: state.toggleShowNotifications,
      showNotifications: state.showNotifications,
      timezone: state.timezone,
    }))
  );

  const {
    register,
    formState: { errors },
    handleSubmit,
  } = useForm<UserSettings>({
    defaultValues: {
      assetCacheSize: logsState.assetCacheSize,
      showNotifications: globalState.showNotifications,
      timezone: globalState.timezone,
    },
  });

  const options = {
    required: { value: true, message: formErrorMessages.fieldRequired },
  };

  const saveSettings = (data: UserSettings) => {
    try {
      logsState.updateAssetCacheSize(data.assetCacheSize);
      globalState.updateTimezone(data.timezone);
      if (globalState.showNotifications != data.showNotifications) globalState.toggleShowNotifications();
    } catch (err) {
      toast.error("Update failed. " + String(err));
    }
    toast.success("Success!");
  };

  return (
    <Card className="h-full">
      <CardHeader divider={true}>
        <CardTitle>Settings</CardTitle>
      </CardHeader>
      <CardBody>
        <Form className="flex flex-col h-full" onSubmit={handleSubmit((data) => saveSettings(data))}>
          <SettingsOption title="Show Notifications">
            <FormToggle {...register("showNotifications")} titlePosition="after" />
          </SettingsOption>
          <SettingsOption
            title="Asset cache size"
            description="By default, the app fetches all assets to enable autocompletion. In large environments, this can cause performance issues. 
            You can limit the number of assets fetched by specifying a value for this setting. Setting the value to 0 will fetch all assets."
            required
          >
            <FormInput
              {...register("assetCacheSize", options)}
              error={errors.assetCacheSize?.message}
              type="number"
              required
            />
          </SettingsOption>
          <SettingsOption
            title="Timezone"
            description="This setting allows you to adjust the timezone based on your geographic location."
            required
          >
            <FormSelect
              isEmptyOptionVisible={false}
              values={timezones}
              {...register("timezone", options)}
              error={errors.timezone?.message}
              required
            />
          </SettingsOption>
          <CardBottomActions className="justify-end mt-4 items-end grow">
            <Box className="flex items-center">
              <FormError className="mx-4">{errors.root?.message}</FormError>
              <FormButton className="btn-primary">Update</FormButton>
            </Box>
          </CardBottomActions>
        </Form>
      </CardBody>
    </Card>
  );
}

function Account() {
  const state = useGlobalStore(
    useShallow((state) => ({
      user: state.user,
    }))
  );

  const allowPasswordChange = state.user?.provider?.entity_type == ProviderTypesEnum.LOCAL;

  const {
    register,
    reset,
    formState: { errors },
    handleSubmit,
    setError,
  } = useForm<UserCredentials>({
    defaultValues: {
      name: state.user?.name,
      email: state.user?.email,
    },
  });

  const mutation = useMutation({
    mutationFn: async (data: NewPassword) => {
      await api.post("/api/auth/password", data);
    },
    onSuccess: () => {
      reset();
      toast.success("Success!");
    },
    onError: (error) => {
      setError(...parseFormError<NewPassword>(error));
    },
  });
  const options = {
    disabled: !allowPasswordChange,
    required: { value: true, message: formErrorMessages.fieldRequired },
  };

  return (
    <Card className="h-full">
      <CardHeader divider={true}>
        <CardTitle>Account</CardTitle>
      </CardHeader>
      <CardBody>
        <Form onSubmit={handleSubmit((data) => mutation.mutate(data))}>
          <FormInput {...register("name", { disabled: true })} title="Name" />
          <FormInput {...register("email", { disabled: true })} type="email" title="Email" />
          <Heading as="h3" className="my-2">
            Change password
          </Heading>
          {!allowPasswordChange && (
            <AlertInfo message="Not Available" description="Password changes are only allowed for local accounts." />
          )}

          <FormInput
            {...register("current_password", options)}
            error={errors.current_password?.message}
            type="password"
            title="Current password"
            required
          />
          <FormInput
            {...register("new_password", options)}
            error={errors.new_password?.message}
            type="password"
            title="New password"
            required
          />
          <FormInput
            {...register("repeat_password", options)}
            error={errors.repeat_password?.message}
            type="password"
            title="Repeat new password"
            required
          />
          <CardBottomActions className="items-center justify-end mt-4">
            <FormError className="mx-4">{errors.root?.message}</FormError>
            <FormButton className="btn-primary" disabled={!allowPasswordChange} isPending={mutation.isPending}>
              Update
            </FormButton>
          </CardBottomActions>
        </Form>
      </CardBody>
    </Card>
  );
}

/**
 * Page component for displaying the current user's profile.
 */
export function CurrentUserProfile() {
  return (
    <Block className="p-8">
      <BlockTitle description="A collection of settings and information associated with your account.">
        Profile
      </BlockTitle>
      <Box className="flex flex-wrap -mb-4 -mx-4">
        <Box className="w-full mb-4 px-2 md:w-1/2">
          <Settings />
        </Box>
        <Box className="w-full mb-4 px-2 md:w-1/2">
          <Account />
        </Box>
      </Box>
    </Block>
  );
}
