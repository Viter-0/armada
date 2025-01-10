import { twClassJoin } from "@/util/twMerge";
import { forwardRef } from "react";
import { Toggle } from "../actions";
import { FormControl } from "./control";
import { FormError } from "./error";

export interface FormToggleProps extends React.ComponentPropsWithoutRef<"input"> {
  title?: string;
  titleClassName?: string;
  containerClassName?: string;
  titlePosition?: "before" | "after";
  error?: string;
}

export const FormToggle = forwardRef(function FormToggle(
  props: FormToggleProps,
  ref: React.ForwardedRef<HTMLInputElement>
) {
  const {
    title,
    error,
    titleClassName = "justify-normal",
    titlePosition = "after",
    containerClassName = "",
    ...rest
  } = props;

  return (
    <FormControl className={containerClassName}>
      {titlePosition === "before" && (
        <label className={twClassJoin("label cursor-pointer", titleClassName)}>
          <span className="label-text text-base-content">{title}</span>
          <Toggle {...rest} className="toggle-primary ms-4" ref={ref} />
        </label>
      )}
      {titlePosition === "after" && (
        <label className={twClassJoin("label cursor-pointer", titleClassName)}>
          <Toggle {...rest} className="toggle-primary" ref={ref} />
          <span className="label-text text-base-content ms-4">{title}</span>
        </label>
      )}
      {error && <FormError>{error}</FormError>}
    </FormControl>
  );
});
