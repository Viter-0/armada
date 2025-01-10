import { twClassJoin } from "@/util/twMerge";
import { Badge } from "../dataDisplay";

export function Bool({ value }: { value: boolean; className?: string }) {
  return <div className={"badge badge-outline " + (value ? "badge-success" : "badge-error")}>{String(value)}</div>;
}

export function ReverseBool({ value, className = "" }: { value: boolean; className?: string }) {
  return (
    <Badge className={twClassJoin("badge-outline ", value ? "badge-error" : "badge-success", className)}>
      {String(value)}
    </Badge>
  );
}

export function Tags({ tags, className = "badge-outline badge-accent" }: { tags: string[]; className?: string }) {
  return tags.map((tag) => (
    <div key={tag} className={"badge me-2 " + className}>
      {tag}
    </div>
  ));
}

export function Lock({ isLocked = false, className = "" }: { isLocked?: boolean; className?: string }) {
  return (
    <Badge className={twClassJoin("badge-outline", isLocked ? "badge-error" : "badge-success", className)}>
      {isLocked ? "Locked" : "Unlocked"}
    </Badge>
  );
}
