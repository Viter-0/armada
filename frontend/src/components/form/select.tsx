import { twClassMerge } from "@/util/twMerge";
import { forwardRef } from "react";
import { FormControl } from "./control";
import { FormError } from "./error";
import { FormLabel } from "./label";

export interface FormSelectProps extends React.ComponentPropsWithoutRef<"select"> {
  values: Record<string, string | JSX.Element>;
  isEmptyOptionVisible?: boolean;
  emptyOptionLabel?: string;
  title?: string;
  description?: string;
  titleClassName?: string;
  containerClassName?: string;
  className?: string;
  error?: string;
}

export const FormSelect = forwardRef(function FormSelect(
  props: FormSelectProps,
  ref: React.ForwardedRef<HTMLSelectElement>
) {
  const {
    title,
    values,
    required,
    description,
    error,
    isEmptyOptionVisible = true,
    className = "",
    titleClassName = "",
    containerClassName = "",
    emptyOptionLabel = "Please choose an option",
    ...rest
  } = props;

  return (
    <FormControl className={containerClassName}>
      {title && (
        <FormLabel
          className={twClassMerge("label-text text-base-content", required ? "form-required" : "", titleClassName)}
        >
          {title}
        </FormLabel>
      )}
      <select
        {...rest}
        ref={ref}
        className={twClassMerge("select select-bordered w-full", error ? "select-error" : "", className)}
      >
        {isEmptyOptionVisible && <option value="">{emptyOptionLabel}</option>}
        {Object.keys(values).map((key) => (
          <option key={key} value={key}>
            {values[key]}
          </option>
        ))}
      </select>
      {description && <FormLabel className="label-text-alt opacity-80">{description}</FormLabel>}
      {error && <FormError>{error}</FormError>}
    </FormControl>
  );
});
