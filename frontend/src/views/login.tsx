import { paths } from "@/api/schema";
import logo from "@/assets/media/logo_app.png";
import { Box, Card, CardBody, Center, Heading, Image, Loading } from "@/components";
import { Form, FormButton, FormError, FormInput, FormToggle } from "@/components/form";
import { APP_NAME } from "@/config/const";
import { useGlobalStore } from "@/store";
import { parseFormError } from "@/util/error";
import { useSetupNotCompleteRedirect } from "@/util/hooks";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { useLocation, useNavigate } from "react-router";
import { useShallow } from "zustand/react/shallow";

type Credentials = paths["/api/auth/token"]["post"]["requestBody"]["content"]["application/x-www-form-urlencoded"];
type FormCredentials = { remember: boolean } & Credentials;

function AppTitle() {
  return (
    <Heading as="h1" className="text-3xl text-center tracking-widest pb-10">
      <Image src={logo} className="w-12 inline-block mr-2" alt="app-logo" />
      {APP_NAME}
    </Heading>
  );
}

export function Login() {
  const methods = useForm<FormCredentials>({
    defaultValues: { username: localStorage.getItem("email") ?? "", remember: true },
  });
  const auth = useGlobalStore(
    useShallow((state) => ({
      signin: state.signin,
    }))
  );
  const location = useLocation();
  const navigate = useNavigate();

  // Redirect user to the setup page if process is not complete.
  const setupRedirect = useSetupNotCompleteRedirect();

  const from = location.state?.from?.pathname || "/";

  const mutation = useMutation({
    mutationFn: async (data: FormCredentials) => {
      await auth.signin(data);
      if (data.remember) {
        localStorage.setItem("email", data.username);
      } else {
        localStorage.removeItem("email");
      }
    },
    onSuccess: () => navigate(from, { replace: true }),
    onError: (error) => methods.setError(...parseFormError<FormCredentials>(error)),
  });

  if (setupRedirect.isPending) {
    return (
      <Center className="flex-col bg-base-200 min-h-screen">
        <AppTitle />
        <Loading className="loading-bars text-primary w-12" />
      </Center>
    );
  }

  return (
    <Center className="bg-base-200 min-h-screen">
      <Card className="max-w-lg w-full py-24 px-10 bg-base-100">
        <CardBody>
          <AppTitle />
          <Heading as="h2" className="text-2xl font-semibold mb-2 text-center">
            Login to your account
          </Heading>
          <Form onSubmit={methods.handleSubmit((data) => mutation.mutate(data))}>
            <Box className="mb-4">
              <FormInput
                {...methods.register("username", { required: { value: true, message: "Email is required" } })}
                error={methods.formState.errors.username?.message}
                containerClassName="mt-4"
                title="Email"
                required
              />
              <FormInput
                {...methods.register("password", { required: { value: true, message: "Password is required" } })}
                error={methods.formState.errors.password?.message}
                name="password"
                type="password"
                containerClassName="mt-4"
                title="Password"
                required
              />
              <FormError>{methods.formState.errors.root?.message}</FormError>
            </Box>
            <FormToggle
              {...methods.register("remember")}
              containerClassName="mt-4"
              title="Remember email"
              titlePosition="after"
            />
            <FormButton isPending={mutation.isPending} type="submit" className="mt-2 w-full btn-primary">
              Login
            </FormButton>
          </Form>
        </CardBody>
      </Card>
    </Center>
  );
}
