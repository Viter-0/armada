import { api } from "@/api";
import { parseAPIError } from "@/util/error";
import { useModal } from "@/util/hooks";
import { twClassJoin, twClassMerge } from "@/util/twMerge";
import { EyeIcon, PencilSquareIcon, TrashIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { useMutation } from "@tanstack/react-query";
import { forwardRef } from "react";
import toast from "react-hot-toast";
import { AlertModal, ToolTip, ToolTipProps, ValidateConnectivityResult } from "./feedback";
import { Box } from "./layout";

/**
 * Generic Button.
 */
export function Button({
  children,
  className = "",
  type = "button",
  ...props
}: React.ComponentPropsWithoutRef<"button">) {
  return (
    <button {...props} type={type} className={twClassJoin("btn", className)}>
      {children}
    </button>
  );
}

/**
 *  Renders a small ghost-style button with a trash icon.
 */
export function DeleteEntityButton({
  className = "",
  ...props
}: Omit<React.ComponentPropsWithoutRef<"button">, "children">) {
  return (
    <Button {...props} className={twClassMerge("btn-xs btn-ghost", className)}>
      <TrashIcon className="h-6 w-6 stroke-red-600" />
    </Button>
  );
}

/**
 *  Renders a small ghost-style button with a pencil icon.
 */
export function UpdateEntityButton({
  className = "",
  ...props
}: Omit<React.ComponentPropsWithoutRef<"button">, "children">) {
  return (
    <Button {...props} className={twClassMerge("btn-xs btn-ghost", className)}>
      <PencilSquareIcon className="h-6 w-6" />
    </Button>
  );
}

/**
 *  Renders a small ghost-style button with an eye icon.
 */
export function ViewEntityButton({
  className = "",
  ...props
}: Omit<React.ComponentPropsWithoutRef<"button">, "children">) {
  return (
    <Button {...props} className={twClassMerge("btn-xs btn-ghost", className)}>
      <EyeIcon className="h-6 w-6" />
    </Button>
  );
}

/**
 *  Renders a ghost-style button with an XMark icon.
 */
export function CloseXButton({ className = "", ...props }: Omit<React.ComponentPropsWithoutRef<"button">, "children">) {
  return (
    <Button {...props} className={twClassMerge("btn-circle btn-ghost", className)}>
      <XMarkIcon className="w-6 h-6 hover:stroke-red-700" />
    </Button>
  );
}

// interface CancelButtonProps extends React.ComponentPropsWithoutRef<"button"> {
//   to?: To;
// }
// /**
//  * A cancel button that either navigates back to the last visited location or to a specified fallback path.
//  *
//  * This button works as follows:
//  * - If the last location exists, it navigates back to that location.
//  * - If the last location doesn't exist, it navigates to the `to` prop value (default: "..").
//  */
// export function CancelButton({ children, onClick, className = "", to = "..", ...props }: CancelButtonProps) {
//   const location = useLocation();
//   const navigate = useNavigate();
//   const lastLocationExists = location.key !== "default";

//   const onButtonClick = (e: React.MouseEvent<HTMLButtonElement>) => {
//     onClick?.(e);
//     if (lastLocationExists) {
//       navigate(-1);
//     } else {
//       navigate(to);
//     }
//   };
//   return (
//     <Button {...props} onClick={onButtonClick} type="button" className={twClassMerge("me-4 btn-neutral", className)}>
//       {children}
//     </Button>
//   );
// }

interface CheckConnectivityButtonProps {
  isPending: boolean;
  isSuccess: boolean;
  result: string;
  onClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
}
export function CheckConnectivityButton({ isPending, isSuccess, result, onClick }: CheckConnectivityButtonProps) {
  return (
    <Box className="flex items-center mt-4">
      <Button className="btn-neutral btn-sm me-2" onClick={onClick}>
        Check Connectivity
      </Button>
      <ValidateConnectivityResult isPending={isPending} state={isSuccess ? "success" : "error"}>
        {result}
      </ValidateConnectivityResult>
    </Box>
  );
}

export const Toggle = forwardRef(function Toggle(
  props: React.ComponentPropsWithRef<"input">,
  ref: React.ForwardedRef<HTMLInputElement>
) {
  return <input ref={ref} {...props} type={props.type ?? "checkbox"} className={"toggle " + (props.className ?? "")} />;
});

export type SwapProps = React.ComponentPropsWithoutRef<"input">;
/**
 * Swap allows you to toggle the visibility of two elements.
 * This component is intended to wrap elements that represent the 'on' and 'off' states.
 *
 * @example
 *
 * <Swap>
 *     <div className="swap-on">ON</div>
 *     <div className="swap-off">OFF</div>
 * </Swap>
 *
 */
export function Swap({ children, type = "checkbox", className = "", ...props }: SwapProps) {
  return (
    <label className={"swap " + className}>
      <input {...props} type={type} />
      {children}
    </label>
  );
}

export type ToggleElementWithToolTipProps = Pick<SwapProps, "checked" | "onChange"> &
  Pick<ToolTipProps, "message"> & { children: React.ReactNode; position?: "left" | "top" | "right" | "bottom" };

/**
 *
 * Renders a toggle element with a tooltip.
 * It combines the functionality of the Swap and ToolTip components,
 * allowing for a toggle element with tooltip behavior.
 *
 * @example
 * // Example usage:
 *
 * <ToggleElementWithToolTip
 *   checked={isChecked}
 *   onChange={handleToggleChange}
 *   message="Tooltip message"
 *   position="bottom"
 * >
 *   <BoltIcon className="w-5 h-5 swap-on"/>
 *   <PlusIcon className="w-5 h-5 swap-off"/>
 * </ToggleElementWithToolTip>
 */
export function ToggleElementWithToolTip({
  children,
  checked,
  onChange,
  message,
  position = "top",
}: ToggleElementWithToolTipProps) {
  const tooltipPosition = "tooltip-" + position;

  return (
    <Button className="btn-ghost btn-circle btn-xs">
      <ToolTip message={message} className={tooltipPosition}>
        <Swap checked={checked} onChange={onChange}>
          {children}
        </Swap>
      </ToolTip>
    </Button>
  );
}

export const Input = forwardRef(function Input(
  props: React.ComponentPropsWithRef<"input">,
  ref: React.ForwardedRef<HTMLInputElement>
) {
  return (
    <input ref={ref} {...props} className={twClassJoin("input", props.className ?? "")}>
      {props.children}
    </input>
  );
});

interface DeleteEntityButtonAPIProps {
  apiRoute: string;
  successMessage?: string;
  promptMessage?: string;
}

/**
 * Delete entities via an API call.
 * Provides a confirmation modal before initiating the delete operation and displays success or error messages upon completion.
 * Uses DeleteEntityButton
 */
export function DeleteEntityButtonAPI({
  apiRoute,
  successMessage = "The entity was deleted",
  promptMessage = "Are you sure you want to delete this entry?",
}: DeleteEntityButtonAPIProps) {
  const modal = useModal();

  const mutation = useMutation({
    mutationFn: () => api.delete(apiRoute),
    onSuccess: () => toast.success(successMessage),
    onError: (error) => toast.error(parseAPIError(error).message),
  });

  return (
    <>
      <DeleteEntityButton onClick={() => modal.setOpen(true)} />
      <AlertModal isOpen={modal.isOpen} close={modal.close} message={promptMessage} action={() => mutation.mutate()} />
    </>
  );
}
