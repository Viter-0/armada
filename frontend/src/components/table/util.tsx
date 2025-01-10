export function EmptyTableMessage({ children, className = "" }: React.ComponentPropsWithoutRef<"div">) {
  return <div className={"flex p-10 justify-center " + className}>{children}</div>;
}

export function EmptyFilterResultMessage({ message }: { message: React.ReactNode }) {
  return <div className="flex p-10 justify-center">{message}</div>;
}
