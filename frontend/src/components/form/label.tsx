export function FormLabel({ children, ...props }: React.ComponentPropsWithoutRef<"span">) {
  return (
    <label className="label">
      <span {...props}>{children}</span>
    </label>
  );
}
