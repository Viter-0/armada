export function Image({ children, alt = "", ...props }: React.ComponentPropsWithoutRef<"img">) {
  return (
    <img alt={alt} {...props}>
      {children}
    </img>
  );
}
