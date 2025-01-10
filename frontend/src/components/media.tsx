export function Image({ children, ...props }: React.ComponentPropsWithoutRef<"img">) {
  return <img {...props}>{children}</img>;
}
