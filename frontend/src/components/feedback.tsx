import logo from "@/assets/media/logo_app.png";
import { APP_NAME } from "@/config/const";
import { twClassMerge } from "@/util/twMerge";
import { ExclamationTriangleIcon } from "@heroicons/react/24/outline";
import InformationCircleIcon from "@heroicons/react/24/outline/InformationCircleIcon";
import QuestionMarkCircleIcon from "@heroicons/react/24/outline/QuestionMarkCircleIcon";
import { useMemo } from "react";
import { twJoin } from "tailwind-merge";
import { Box, Center } from "./layout";
import { Image } from "./media";
import { Modal, ModalActions, ModalActionsButton } from "./overlay";
import { Heading, Text } from "./typography";

export function Progress({ className = "", ...props }: React.ComponentPropsWithoutRef<"progress">) {
  return <progress {...props} className={"progress " + className}></progress>;
}

export function Loading({ className = "", ...props }: React.ComponentPropsWithoutRef<"span">) {
  return <span {...props} className={"loading " + className}></span>;
}

/**
 * Base component for Alerts.
 */
export function Alert({ children, className = "", role = "alert", ...props }: React.ComponentPropsWithoutRef<"div">) {
  return (
    <Box {...props} role={role} className={"alert " + className}>
      {children}
    </Box>
  );
}

export interface AlertInfoProps {
  message: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

/**
 * Displays an informational alert.
 */
export function AlertInfo({ message, description, action, className }: AlertInfoProps) {
  return (
    <Box role="alert" className={twClassMerge("alert shadow-lg", className)}>
      <InformationCircleIcon className="stroke-info shrink-0 w-6 h-6" />
      <Box>
        <Heading as="h3">{message}</Heading>
        {description && <Text className="text-xs">{description}</Text>}
      </Box>
      {action}
    </Box>
  );
}

export interface AlertModalProps {
  isOpen: boolean;
  close: () => void;
  action: () => void;
  message: string | React.ReactNode;
  title?: string | React.ReactNode;
}

/**
 * Renders a modal dialog with a message and actions.
 */
export function AlertModal({ isOpen, close, action, title = "Are you sure?", message }: AlertModalProps) {
  return (
    <Modal isOpen={isOpen} close={close} className="border-t-2 border-warning">
      <Box className="text-center">
        <ExclamationTriangleIcon className="stroke-warning size-14 m-auto" />
        <Heading as="h3" className="my-2 font-bold">
          {title}
        </Heading>
        <Text className="mt-4">{message}</Text>
      </Box>
      <ModalActions>
        <ModalActionsButton className="me-4" onClick={close}>
          Close
        </ModalActionsButton>
        <ModalActionsButton
          className="btn-primary"
          onClick={() => {
            close();
            action();
          }}
        >
          Confirm
        </ModalActionsButton>
      </ModalActions>
    </Modal>
  );
}

export interface ToolTipProps extends React.ComponentPropsWithoutRef<"div"> {
  message: string;
}
export function ToolTip({ children, message, className = "", ...props }: ToolTipProps) {
  return (
    <Box {...props} className={twJoin("tooltip", className)} data-tip={message}>
      {children}
    </Box>
  );
}

export interface InformationTooltipProps {
  message: string;
  iconClassName?: string;
  className?: string;
}
/**
 * Renders a tooltip message with an information icon.
 */
export function InformationTooltip({ message, className = "", iconClassName = "" }: InformationTooltipProps) {
  return (
    <ToolTip className={className} message={message}>
      <QuestionMarkCircleIcon className={twClassMerge("shrink-0 w-6 h-6", iconClassName)} />
    </ToolTip>
  );
}

/**
 * Displays the result of a connectivity validation.
 * It shows a loading spinner when the validation is pending and displays a message with a state-based style.
 */
export function ValidateConnectivityResult({
  state = "success",
  isPending = false,
  children,
}: {
  state?: "error" | "success" | "warning";
  isPending?: boolean;
  children?: React.ReactNode;
}) {
  const textClassName = useMemo(() => {
    switch (state) {
      case "error":
        return "text-error";
      case "success":
        return "text-success";
      case "warning":
        return "text-warning";
    }
  }, [state]);

  return (
    <FormSubmitSpinner className="loading-sm" isPending={isPending}>
      <span className={textClassName}>{children}</span>
    </FormSubmitSpinner>
  );
}

/**
 * Is typically used during the initial loading of the application to display a loading indicator.
 */
export function AppLoadingOverlay() {
  return (
    <Center className="text-center min-h-screen bg-base-100">
      <Box className="max-w-md">
        <Image src={logo} className="w-12 inline-block" alt={APP_NAME} />
        <Text className="py-6">Preparing application</Text>
        <Progress className="w-56 progress-primary"></Progress>
      </Box>
    </Center>
  );
}

/**
 * Displays a loading spinner within a container.
 * This is typically used to indicate loading within a specific section of the page.
 *
 * @param size - The size of the loading spinner.
 * @param isPending - Boolean to control the visibility of the loading spinner.
 */
export function ContentLoadingOverlay({
  size = 12,
  isPending = true,
  containerClassName = "",
}: {
  size?: number | string;
  isPending?: boolean;
  containerClassName?: string;
}) {
  return (
    <>
      {isPending && (
        <Center className={twClassMerge("text-center my-4", containerClassName)}>
          <Loading className={"loading-spinner text-primary w-" + size}></Loading>
        </Center>
      )}
    </>
  );
}

/**
 * Replaces its children with a spinner when isPending is set to true. This is typically used to provide feedback during form submission.
 *
 * @param isPending - Boolean to control the visibility of the spinner.
 */
export function FormSubmitSpinner({
  children,
  isPending,
  className,
}: {
  children: React.ReactNode;
  isPending: boolean;
  className?: string;
}) {
  return (
    <>
      {isPending ? <Loading className={twClassMerge("loading-spinner text-white-600", className)}></Loading> : children}
    </>
  );
}
