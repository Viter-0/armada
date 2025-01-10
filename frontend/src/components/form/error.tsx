import { twClassJoin } from "@/util/twMerge";

export function FormError({ children, className = "", ...props }: React.ComponentPropsWithoutRef<"p">) {
  return (
    <p {...props} className={twClassJoin("text-error", className)}>
      {children}
    </p>
  );
}
