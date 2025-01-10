import { twClassJoin } from "@/util/twMerge";

export function Anchor({ children, ...props }: React.ComponentPropsWithoutRef<"a">) {
  return <a {...props}>{children}</a>;
}

export function HyperLink({ children, className = "", ...props }: React.ComponentPropsWithoutRef<"a">) {
  return (
    <a {...props} className={"link " + className}>
      {children}
    </a>
  );
}

/**
 * A container for tab links.
 */
export function TabList({
  children,
  className = "",
  role = "tablist",
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
  return (
    <div {...props} role={role} className={"tabs " + className}>
      {children}
    </div>
  );
}

export interface TabLinkProps extends React.ComponentPropsWithoutRef<"a"> {
  isActive?: boolean;
}
/**
 * An individual tab link.
 *
 * @param isActive - Indicates whether the tab is currently active.
 */
export function TabLink({ children, className = "", isActive, ...props }: TabLinkProps) {
  return (
    <a {...props} role="tab" className={twClassJoin("tab", isActive ? "tab-active" : "", className)}>
      {children}
    </a>
  );
}

export interface TabContentProps extends React.ComponentPropsWithoutRef<"div"> {
  isActive?: boolean;
}
/**
 * The content of a tab.
 *
 * @param isActive - Indicates whether the tab content is currently active.
 */
export function TabContent({ children, className = "", role = "tabpanel", isActive, ...props }: TabContentProps) {
  return (
    <div {...props} role={role} className={"tab-content " + (isActive ? "!block " : "!hidden ") + className}>
      {children}
    </div>
  );
}
