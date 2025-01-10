import { twClassMerge } from "@/util/twMerge";

type HeadingProps =
  | (React.ComponentPropsWithoutRef<"h1"> & { as?: "h1" })
  | (React.ComponentPropsWithoutRef<"h2"> & { as?: "h2" })
  | (React.ComponentPropsWithoutRef<"h3"> & { as?: "h3" })
  | (React.ComponentPropsWithoutRef<"h4"> & { as?: "h4" });

export function Heading({ children, as = "h2", className, ...props }: HeadingProps) {
  switch (as) {
    case "h1":
      return (
        <h1 className={twClassMerge("text-2xl", className)} {...props}>
          {children}
        </h1>
      );
    case "h2":
      return (
        <h2 className={twClassMerge("text-xl", className)} {...props}>
          {children}
        </h2>
      );
    case "h3":
      return (
        <h3 className={twClassMerge("text-lg", className)} {...props}>
          {children}
        </h3>
      );
    case "h4":
      return (
        <h4 className={className} {...props}>
          {children}
        </h4>
      );
    default:
      return (
        <h2 className={twClassMerge("text-xl", className)} {...props}>
          {children}
        </h2>
      );
  }
}

export function Text({ children, ...props }: React.ComponentPropsWithoutRef<"p">) {
  return <p {...props}>{children}</p>;
}

export function Strong({ children, ...props }: React.ComponentPropsWithoutRef<"strong">) {
  return <strong {...props}>{children}</strong>;
}
