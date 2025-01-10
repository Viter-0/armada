import { useOutsideAction } from "@/util/hooks";
import { twClassJoin, twClassMerge } from "@/util/twMerge";
import { ChevronDownIcon, ChevronUpIcon } from "@heroicons/react/24/outline";
import { createContext, useContext, useRef, useState } from "react";

export interface DropdownProps extends React.ComponentPropsWithoutRef<"details"> {
  children: React.ReactNode;
  className?: string;
  isDismissible?: boolean;
}

export interface DropdownContextProps {
  isOpen: boolean;
  toggleDropdown: () => void;
}

export const DropdownContext = createContext<DropdownContextProps>({ isOpen: false, toggleDropdown: () => undefined });

/**
 *  Container to store dropdown toggle elements.
 */
export function Dropdown({ children, className = "", isDismissible = true, ...props }: DropdownProps) {
  const dropdownRef = useRef<null | HTMLDetailsElement>(null);
  const [isOpen, setIsOpen] = useState(false);

  const toggleDropdown = () => {
    if (isOpen) {
      closeDropdown();
    } else {
      openDropdown();
    }
  };

  const openDropdown = () => {
    if (dropdownRef.current) dropdownRef.current.setAttribute("open", "");
    setIsOpen(true);
  };
  const closeDropdown = () => {
    if (dropdownRef.current) dropdownRef.current.removeAttribute("open");
    setIsOpen(false);
  };

  const dismissDropdown = (_: Event) => {
    if (isDismissible) closeDropdown();
  };

  useOutsideAction("click", dropdownRef, dismissDropdown);

  return (
    <DropdownContext.Provider value={{ isOpen, toggleDropdown }}>
      <details {...props} className={twClassJoin("dropdown", className)} ref={dropdownRef}>
        {children}
      </details>
    </DropdownContext.Provider>
  );
}

export interface DropdownToggleProps extends React.ComponentPropsWithoutRef<"summary"> {
  isChevronVisible?: boolean;
}

/**
 * Dropdown toggle element, intended for use inside the Dropdown component.
 * By default, it has the 'btn' CSS className, which can be removed with the '-btn' className.
 *
 */
export function DropdownToggle({
  children,
  onClick,
  className = "",
  isChevronVisible = true,
  ...props
}: DropdownToggleProps) {
  const dropdownContext = useContext(DropdownContext);

  const chevron = dropdownContext.isOpen ? (
    <ChevronUpIcon className="ml-auto h-4 w-4" />
  ) : (
    <ChevronDownIcon className="ml-auto h-4 w-4" />
  );

  const onToggleClick = (e: React.MouseEvent<HTMLElement, MouseEvent>) => {
    e.preventDefault();
    dropdownContext.toggleDropdown();
    if (onClick) onClick(e);
  };
  return (
    <summary {...props} className={twClassMerge("btn", className)} onClick={onToggleClick}>
      {children} {isChevronVisible && chevron}
    </summary>
  );
}

/**
 * Dropdown content element, intended for use inside the Dropdown component.
 */
export function DropdownContent({ children, className = "", ...props }: React.ComponentPropsWithoutRef<"div">) {
  return (
    <div {...props} className={"dropdown-content z-[1] " + className}>
      {children}
    </div>
  );
}
