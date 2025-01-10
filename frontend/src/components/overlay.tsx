import { twClassJoin, twClassMerge } from "@/util/twMerge";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { createContext, useContext, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Button, CloseXButton } from "./actions";
import { Box } from "./layout";
import { Text } from "./typography";

export interface ModalProps {
  isOpen: boolean;
  close: () => void;
  children: React.ReactNode;
  isDismissButtonVisible?: boolean;
  isDismissibleOnOutsideClick?: boolean;
  className?: string;
}

/**
 * Modal
 *
 * @param isOpen - Indicates whether the modal is open.
 * @param close - Function to close the modal.
 * @param isDismissButtonVisible - Determines if a dismiss button should be shown.
 * @param isDismissibleOnOutsideClick - Determines if clicking outside the modal should close it.
 *
 */
export function Modal({
  isOpen,
  close,
  children,
  isDismissButtonVisible = true,
  isDismissibleOnOutsideClick = true,
  className = "",
}: ModalProps) {
  return (
    <>
      {isOpen &&
        createPortal(
          <dialog className="modal modal-open">
            <div className={"modal-box " + className}>
              {isDismissButtonVisible == true && (
                <form method="dialog">
                  <Button onClick={() => close()} className="btn-sm btn-circle btn-ghost absolute right-2 top-2">
                    <XMarkIcon className="h-5 w-5" />
                  </Button>
                </form>
              )}
              {children}
            </div>
            {isDismissibleOnOutsideClick == true && (
              <form method="dialog" className="modal-backdrop">
                <a onClick={() => close()}>Close</a>
              </form>
            )}
          </dialog>,
          document.body
        )}
    </>
  );
}

export function ModalTitle({ children, className = "", ...props }: React.ComponentPropsWithoutRef<"h3">) {
  return (
    <h3 {...props} className={twClassMerge("font-semibold text-xl pb-6 text-center", className)}>
      {children}
    </h3>
  );
}

export function ModalActions({ children, className = "", ...props }: React.ComponentPropsWithoutRef<"div">) {
  return (
    <div {...props} className={"modal-action " + className}>
      {children}
    </div>
  );
}

export function ModalActionsButton({ children, ...props }: React.ComponentPropsWithoutRef<"button">) {
  return <Button {...props}>{children}</Button>;
}

export interface DrawerContextProps {
  isOpen: boolean;
  toggle: () => void;
}

export const DrawerContext = createContext<DrawerContextProps>({ isOpen: false, toggle: () => undefined });

/**
 * Container for the drawer content.
 *
 * @example
 * <Drawer>
 *   <DrawerContent/>
 *   <DrawerSide/>
 * </Drawer>
 */
export function Drawer({ children, className = "" }: React.ComponentPropsWithoutRef<"div">) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <DrawerContext.Provider value={{ isOpen, toggle: () => setIsOpen(!isOpen) }}>
      <div className={"drawer " + className}>
        <input type="checkbox" checked={isOpen} onChange={() => setIsOpen(!isOpen)} className="drawer-toggle" />
        {children}
      </div>
    </DrawerContext.Provider>
  );
}

/**
 * Wraps the content of the drawer.
 */
export function DrawerContent({ children, className = "" }: React.ComponentPropsWithoutRef<"div">) {
  return <div className={"drawer-content " + className}>{children}</div>;
}

export interface DrawerSideProps extends React.ComponentPropsWithoutRef<"div"> {
  isOverlayVisible?: boolean;
}

/**
 * Displays the side content of the drawer.
 *
 * @param isOverlayVisible - Whether to show an overlay that can be clicked to close the drawer.
 */
export function DrawerSide({ children, className = "", isOverlayVisible = true }: DrawerSideProps) {
  const drawerContext = useContext(DrawerContext);

  return (
    <div className={"drawer-side " + className}>
      {isOverlayVisible && (
        <label aria-label="close sidebar" onClick={() => drawerContext.toggle()} className="drawer-overlay"></label>
      )}
      {children}
    </div>
  );
}

/**
 * Button to toggle the drawer open and closed.
 */
export function DrawerButton({ children, className = "" }: React.ComponentPropsWithoutRef<"button">) {
  const drawerContext = useContext(DrawerContext);
  return (
    <button className={twClassJoin("btn", className)} onClick={() => drawerContext.toggle()}>
      {children}
    </button>
  );
}

export interface SideViewProps extends React.ComponentPropsWithoutRef<"div"> {
  isOpen?: boolean;
  position?: "left" | "right";
}

/**
 * A side panel, similar to a drawer but positioned using absolute CSS.
 */
export function SideView({ isOpen, className = "", children, position = "right" }: SideViewProps) {
  const positionClassName = useMemo(() => {
    switch (position) {
      case "left":
        return "left-0 top-0";
      case "right":
        return "right-0 top-0";
      default:
        return "";
    }
  }, [position]);

  if (!isOpen) return null;

  return <div className={twClassMerge("absolute h-full z-10", positionClassName, className)}>{children}</div>;
}

export function SideViewBody({ children, className = "" }: { children?: React.ReactNode; className?: string }) {
  return (
    <Box className={twClassMerge("bg-base-100 w-[30rem] h-full border-background border-s border-t", className)}>
      {children}
    </Box>
  );
}

interface SideViewHeaderProps {
  children?: React.ReactNode;
  isCloseBtnVisible?: boolean;
  close?: () => void;
}
export function SideViewHeader({ children, isCloseBtnVisible, close }: SideViewHeaderProps) {
  return (
    <Box className="flex justify-between pe-2">
      <Box>{children}</Box>
      {isCloseBtnVisible && <CloseXButton className="btn-sm" onClick={() => close && close()} />}
    </Box>
  );
}

export function SideViewTitle({ title = "Detailed View" }: { title: string }) {
  return <Text className="opacity-70 ms-4">{title}</Text>;
}
