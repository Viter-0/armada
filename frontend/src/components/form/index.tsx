import { twClassMerge } from "@/util/twMerge";
import { Button } from "../actions";
import { FormButton } from "./button";

export { FormButton, FormDiscardButton } from "./button";
export { FormControl } from "./control";
export { FormError } from "./error";
export { FormInput } from "./input";
export { FormLabel } from "./label";
export { FormSelect } from "./select";
export { FormToggle } from "./toggle";

export function Form({ children, ...props }: React.ComponentPropsWithoutRef<"form">) {
  return <form {...props}>{children}</form>;
}

export function FormActions({ children, className = "", ...props }: React.ComponentPropsWithoutRef<"div">) {
  return (
    <div {...props} className={twClassMerge("flex justify-end my-4", className)}>
      {children}
    </div>
  );
}

interface FormGenericActionsProps {
  isPending: boolean;
  onCancel: () => void;
  cancelBtnName: string;
  submitBtnName: string;
}

/**
 * Section for forms with generic action buttons.
 *
 * - Displays a "Cancel" button that triggers the provided cancel callback.
 * - Displays a "Submit" button that handles form submission.
 */
export function FormGenericActions({
  isPending,
  onCancel,
  cancelBtnName = "Cancel",
  submitBtnName = "Submit",
}: FormGenericActionsProps) {
  return (
    <FormActions>
      <Button type="button" className="me-4 btn-neutral" onClick={() => onCancel()}>
        {cancelBtnName}
      </Button>
      <FormButton className="btn-primary" isPending={isPending}>
        {submitBtnName}
      </FormButton>
    </FormActions>
  );
}
