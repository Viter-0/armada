import { twClassJoin, twClassMerge } from "@/util/twMerge";
import { forwardRef } from "react";
import { FormControl } from "./control";
import { FormError } from "./error";
import { FormLabel } from "./label";

interface FormInputProps extends React.ComponentPropsWithoutRef<"input"> {
  title?: string;
  description?: string;
  titleClassName?: string;
  containerClassName?: string;
  error?: string;
}

export const FormInput = forwardRef(function FormInput(
  props: FormInputProps,
  ref: React.ForwardedRef<HTMLInputElement>
) {
  const {
    title,
    required,
    description,
    error,
    titleClassName = "",
    type = "text",
    className = "",
    containerClassName = "",
    ...rest
  } = props;

  if (type === "hidden") return <input ref={ref} {...rest} type={type} />;

  return (
    <FormControl className={containerClassName}>
      {title && (
        <FormLabel
          className={twClassMerge("label-text text-base-content", required ? "form-required" : "", titleClassName)}
        >
          {title}
        </FormLabel>
      )}
      <input
        ref={ref}
        {...rest}
        className={twClassJoin("input input-bordered", error ? "input-error" : "", className)}
        type={type}
      />
      {description && <FormLabel className="label-text-alt opacity-80">{description}</FormLabel>}
      {error && <FormError>{error}</FormError>}
    </FormControl>
  );
});
