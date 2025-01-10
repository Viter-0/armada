import { twClassMerge } from "@/util/twMerge";

/**
 *  Centered Flexbox.
 */
export function Center({ children, className = "", ...props }: React.ComponentPropsWithoutRef<"div">) {
  return (
    <div {...props} className={twClassMerge("items-center justify-center flex", className)}>
      {children}
    </div>
  );
}

type BoxProps =
  | (React.ComponentPropsWithoutRef<"div"> & { as?: "div" })
  | (React.ComponentPropsWithoutRef<"span"> & { as?: "span" });
export function Box({ children, as = "div", ...props }: BoxProps) {
  switch (as) {
    case "div":
      return <div {...props}>{children}</div>;
    case "span":
      return <span {...props}>{children}</span>;
    default:
      return <div {...props}>{children}</div>;
  }
}

export function Divider({ children, className = "" }: React.ComponentPropsWithoutRef<"div">) {
  return <div className={"divider " + className}>{children}</div>;
}

/**
 *  Navbar
 */
export function Navigation({ children, className = "" }: React.ComponentPropsWithoutRef<"div">) {
  return <div className={"navbar " + className}>{children}</div>;
}
