import { twClassMerge } from "@/util/twMerge";
import { Link, To } from "react-router";
import { Button } from "../actions";
import { FormSubmitSpinner } from "../feedback";

export interface FormButtonProps extends React.ComponentPropsWithoutRef<"button"> {
  isPending?: boolean;
}

export function FormButton({ children, isPending = false, type = "submit", disabled, ...props }: FormButtonProps) {
  return (
    <Button {...props} type={isPending ? "button" : type} disabled={isPending ? true : disabled}>
      <FormSubmitSpinner isPending={isPending}>{children}</FormSubmitSpinner>
    </Button>
  );
}

/**
 *  Renders a button inside navigation link.
 */
export function FormDiscardButton({
  to,
  children,
  className = "",
  type = "button",
  ...props
}: React.ComponentPropsWithoutRef<"button"> & { to: To }) {
  return (
    <Link to={to}>
      <Button {...props} type={type} className={twClassMerge("me-4 btn-neutral", className)}>
        {children}
      </Button>
    </Link>
  );
}
