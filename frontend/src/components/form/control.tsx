import { twClassJoin } from "@/util/twMerge";

export function FormControl({ children, className = "", ...props }: React.ComponentPropsWithoutRef<"div">) {
  return (
    <div {...props} className={twClassJoin("form-control", className)}>
      {children}
    </div>
  );
}
