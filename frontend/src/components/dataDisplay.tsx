import { twClassJoin, twClassMerge } from "@/util/twMerge";
import { useState } from "react";
import { Button } from "./actions";
import { Box, Divider } from "./layout";
import { Anchor, TabLink, TabList } from "./navigation";
import { Heading, Text } from "./typography";

/**
 * Creates an expandable section with a title and content.
 * It is intended to wrap Collapse elements.
 *
 * @param type - Defines the behavior for closing the div.
 *               `focus` - The div closes when it loses focus.
 *               `checkbox` - The div requires another click to close.
 *               Default - `checkbox`.
 *
 * @example
 *
 * <Collapse>
 *     <CollapseTitle>Title</CollapseTitle>
 *     <CollapseContent>content</CollapseContent>
 * </Collapse>
 *
 */
export function Collapse({
  children,
  className = "",
  type = "checkbox",
  ...props
}: React.ComponentPropsWithoutRef<"div"> & { type?: "focus" | "checkbox" }) {
  const focusProp = type == "focus" ? { tabIndex: 0 } : {};
  return (
    <div
      {...props}
      {...focusProp}
      className={twClassMerge("collapse bg-base-content/5 text-base-content rounded", className)}
    >
      {type == "checkbox" && <input type="checkbox" />}
      {children}
    </div>
  );
}

export function CollapseTitle({ children, className = "", ...props }: React.ComponentPropsWithoutRef<"div">) {
  return (
    <div {...props} className={twClassMerge("collapse-title text-xl font-medium", className)}>
      {children}
    </div>
  );
}

export function CollapseContent({ children, className = "", ...props }: React.ComponentPropsWithoutRef<"div">) {
  return (
    <div {...props} className={"collapse-content " + className}>
      {children}
    </div>
  );
}

export function Card({ children, className = "", ...props }: React.ComponentPropsWithoutRef<"div">) {
  return (
    <div {...props} className={twClassMerge("card card-bordered p-6 bg-base-100 rounded", className)}>
      {children}
    </div>
  );
}

export function CardTitle({
  children,
  className = "",
  description,
  ...props
}: { description?: string } & React.ComponentPropsWithoutRef<"h3">) {
  return (
    <div>
      <h3 {...props} className={"card-title " + className}>
        {children}
      </h3>
      {description && <Text className="text-sm opacity-80">{description}</Text>}
    </div>
  );
}

export function CardHeader({
  children,
  className = "",
  divider = false,
  ...props
}: { divider?: boolean } & React.ComponentPropsWithoutRef<"div">) {
  return (
    <>
      <div {...props} className={"flex " + className}>
        {children}
      </div>
      {divider && <div className="divider mt-2"></div>}
    </>
  );
}

export function CardBody({ children, className = "", ...props }: React.ComponentPropsWithoutRef<"div">) {
  return (
    <div {...props} className={twClassMerge("h-full w-full pb-6", className)}>
      {children}
    </div>
  );
}

export function CardTopActions({ children, className = "", ...props }: React.ComponentPropsWithoutRef<"div">) {
  return (
    <div {...props} className={twClassMerge("ml-auto", className)}>
      {children}
    </div>
  );
}

export function CardTopActionsButton({ children, className = "", ...props }: React.ComponentPropsWithoutRef<"button">) {
  return (
    <Button {...props} className={twClassMerge("btn-primary ms-4 px-6 btn-sm normal-case", className)}>
      {children}
    </Button>
  );
}

export type CardTopActionsTabsItem<T> = T & { key: React.Key; name: string };
export interface CardTopActionsTabsProps<T> {
  items: CardTopActionsTabsItem<T>[];
  activeItem: CardTopActionsTabsItem<T>;
  onChange: (item: CardTopActionsTabsItem<T>) => void;
  className?: string;
}

/**
 * Reusable tab component designed to handle switching between different tab items.
 */
export function CardTopActionsTabs<T>({ items, activeItem, onChange, className = "" }: CardTopActionsTabsProps<T>) {
  return (
    <TabList className={twClassMerge("tabs-boxed tabs-sm", className)}>
      {items.map((item) => {
        const isActive = item.name == activeItem.name;
        return (
          <TabLink
            key={item.key}
            className={isActive ? "[--fallback-p:dodgerblue] [--fallback-pc:white]" : ""}
            isActive={isActive}
            onClick={() => onChange(item)}
          >
            {item.name}
          </TabLink>
        );
      })}
    </TabList>
  );
}

export function CardBottomActions({ children, className = "", ...props }: React.ComponentPropsWithoutRef<"div">) {
  return (
    <div {...props} className={"card-actions " + className}>
      {children}
    </div>
  );
}

export function Block({ children, className = "", ...props }: React.ComponentPropsWithoutRef<"div">) {
  return (
    <div {...props} className={twClassMerge("p-4", className)}>
      {children}
    </div>
  );
}

export function BlockBody({ children, className = "", ...props }: React.ComponentPropsWithoutRef<"div">) {
  return (
    <div {...props} className={twClassMerge("bg-base-100", className)}>
      {children}
    </div>
  );
}

export function BlockTitle({ children, description }: { children?: React.ReactNode; description?: React.ReactNode }) {
  return (
    <div className="mb-6">
      <h1 className="font-semibold text-xl">{children}</h1>
      {description && <p className="text-sm opacity-80">{description}</p>}
    </div>
  );
}

export function BlockFooter({ children, ...props }: React.ComponentPropsWithoutRef<"div">) {
  return <div {...props}>{children}</div>;
}

export function Badge({ children, className = "", ...props }: React.ComponentPropsWithoutRef<"div">) {
  return (
    <div {...props} className={"badge " + className}>
      {children}
    </div>
  );
}

/**
 * Native HTML Table.
 */
export function TableNative({ children, ...props }: React.ComponentPropsWithoutRef<"table">) {
  return <table {...props}>{children}</table>;
}

export function TableHead({ children, ...props }: React.ComponentPropsWithoutRef<"thead">) {
  return <thead {...props}>{children}</thead>;
}

export function TableBody({ children, ...props }: React.ComponentPropsWithoutRef<"tbody">) {
  return <tbody {...props}>{children}</tbody>;
}

export function TableTr({ children, ...props }: React.ComponentPropsWithoutRef<"tr">) {
  return <tr {...props}>{children}</tr>;
}

export function TableTd({ children, ...props }: React.ComponentPropsWithoutRef<"td">) {
  return <td {...props}>{children}</td>;
}

export function TableTh({ children, ...props }: React.ComponentPropsWithoutRef<"th">) {
  return <th {...props}>{children}</th>;
}

export function Stat({ children, className = "", ...props }: React.ComponentPropsWithoutRef<"div">) {
  return (
    <div {...props} className={twClassJoin("stat", className)}>
      {children}
    </div>
  );
}

export function StatTitle({ children, className = "", ...props }: React.ComponentPropsWithoutRef<"div">) {
  return (
    <div {...props} className={twClassJoin("stat-title", className)}>
      {children}
    </div>
  );
}
export function StatValue({ children, className = "", ...props }: React.ComponentPropsWithoutRef<"div">) {
  return (
    <div {...props} className={twClassJoin("stat-value", className)}>
      {children}
    </div>
  );
}
export function StatDesc({ children, className = "", ...props }: React.ComponentPropsWithoutRef<"div">) {
  return (
    <div {...props} className={twClassJoin("stat-desc", className)}>
      {children}
    </div>
  );
}
export function StatFigure({ children, className = "", ...props }: React.ComponentPropsWithoutRef<"div">) {
  return (
    <div {...props} className={twClassJoin("stat-figure", className)}>
      {children}
    </div>
  );
}

export function OrderedList({ children, ...props }: React.ComponentPropsWithoutRef<"ol">) {
  return <ol {...props}>{children}</ol>;
}

export function UnorderedList({ children, ...props }: React.ComponentPropsWithoutRef<"ul">) {
  return <ul {...props}>{children}</ul>;
}

export function ListItem({ children, ...props }: React.ComponentPropsWithoutRef<"li">) {
  return <li {...props}>{children}</li>;
}

export function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <Box className="mt-4 mb-2">
      <Heading as="h2">{children}</Heading>
      <Divider className="my-0" />
    </Box>
  );
}

/**
 * Reveals its content when a trigger element is clicked.
 */
export function RevealContent({ text, children }: { text?: React.ReactNode; children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);

  if (!text) text = <Box className="link text-xs text-primary">Show details</Box>;

  if (isOpen) return <>{children}</>;
  return <Anchor onClick={() => setIsOpen(true)}>{text}</Anchor>;
}
