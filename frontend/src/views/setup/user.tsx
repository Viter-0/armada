import { api } from "@/api";
import { paths } from "@/api/schema";
import setupLogo from "@/assets/media/setup_logo.svg";
import { Box, Card, Center, Heading, Image, Progress, Text } from "@/components";
import { Form, FormButton, FormError, FormInput } from "@/components/form";
import { APP_NAME } from "@/config/const";
import { useGlobalStore } from "@/store";
import { formErrorMessages, parseFormError } from "@/util/error";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { useShallow } from "zustand/react/shallow";

type User = paths["/api/setup/user"]["post"]["requestBody"]["content"]["application/json"];

/**
 * Create initial application user.
 */
export function SetupUser({ progress, successCallback }: { progress: string | number; successCallback?: () => void }) {
  const {
    register,
    formState: { errors },
    handleSubmit,
    setError,
  } = useForm<User>();

  const auth = useGlobalStore(
    useShallow((state) => ({
      signin: state.signin,
    }))
  );

  const mutation = useMutation({
    mutationFn: async (data: User) => {
      await api.post("/api/setup/user", data);
      await auth.signin({ username: data.email, password: data.password, scope: "" });
    },
    onSuccess: () => successCallback && successCallback(),
    onError: (error) => setError(...parseFormError<User>(error)),
  });

  const options = { required: { value: true, message: formErrorMessages.fieldRequired } };

  return (
    <Center className="min-h-screen bg-base-200">
      <Card className="mx-auto max-w-lg shadow-none bg-base-none">
        <Form onSubmit={handleSubmit((data) => mutation.mutate(data))}>
          <Box className="py-16 px-10 shadow-xl bg-base-100 rounded-xl">
            <Box className="text-center">
              <Image src={setupLogo} className="mb-2 h-32 m-auto" alt="Setup logo"></Image>
              <Heading className="text-3xl font-semibold mb-2 ">Welcome to {APP_NAME}!</Heading>
              <Text>
                Collect logs from various sources across your network infrastructure and enhance them with metadata.
              </Text>
            </Box>
            <Box className="divider uppercase text-xs">Create admin user</Box>

            <FormInput
              {...register("name", options)}
              error={errors.name?.message}
              containerClassName="mt-4"
              title="Name"
              required
            />
            <FormInput
              {...register("email", options)}
              error={errors.email?.message}
              type="email"
              containerClassName="mt-4"
              title="Email"
              required
            />
            <FormInput
              {...register("password", options)}
              error={errors.password?.message}
              type="password"
              containerClassName="mt-4"
              title="Password"
              required
            />
            <FormError>{errors.root?.message}</FormError>
          </Box>
          <Box className="flex items-center mt-4">
            <Box className="flex-1">
              <Progress className="progress-primary w-36" value={progress} max="100"></Progress>
            </Box>
            <FormButton className="btn btn-primary ">Create</FormButton>
          </Box>
        </Form>
      </Card>
    </Center>
  );
}
