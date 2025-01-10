import unexpectedErrorImage from "@/assets/media/unexpected_error.svg";
import { GITHUB } from "@/config/const";
import { appErrorMessages, parseAPIError } from "@/util/error";
import { twClassJoin } from "@/util/twMerge";
import { Box, Center } from "./layout";
import { Image } from "./media";
import { Heading, Text } from "./typography";

/**
 * Renders a message indicating an API loading error.
 *
 * @param error - The error object representing the API error. The component will return null if no error is provided.
 */
export function ContentLoadingError({ error, className = "" }: { error?: Error; className?: string }) {
  if (!error) return null;
  return <p className={twClassJoin("text-error", className)}>{parseAPIError(error).message}</p>;
}

export interface NotFoundErrorProps {
  title?: React.ReactNode;
  message?: React.ReactNode;
}

/**
 * Displays a Not Found error message.
 */
export function NotFoundError({ title = "Not Found", message = appErrorMessages.notFound }: NotFoundErrorProps) {
  return (
    <Center className="h-full text-center">
      <Box className="max-w-md">
        <Heading as="h1" className="text-3xl font-bold">
          {title}
        </Heading>
        <Text className="py-6">{message}</Text>
      </Box>
    </Center>
  );
}

interface ApplicationErrorProps {
  title?: string;
  description?: string;
  children?: React.ReactNode;
  isIconVisible?: boolean;
}

/**
 * Renders a critical application error (full-screen).
 */
export function ApplicationError({
  title = appErrorMessages.unexpected,
  description,
  children,
  isIconVisible = true,
}: ApplicationErrorProps) {
  return (
    <Center className="min-h-screen bg-base-100">
      <Box className="text-center max-w-md">
        {isIconVisible && <Image src={unexpectedErrorImage} className="h-72 m-auto mb-2" />}
        <Heading as="h1" className="text-3xl font-medium">
          {title}
        </Heading>
        <Text className="py-6 text-xs">
          Oops something went wrong. Try to refresh this page or feel free to{" "}
          <a className="link link-primary" href={GITHUB + "/issues"}>
            report
          </a>{" "}
          it if the problem persists.
        </Text>
        {description && <Text className="text-error">{description}</Text>}
        {children}
      </Box>
    </Center>
  );
}
