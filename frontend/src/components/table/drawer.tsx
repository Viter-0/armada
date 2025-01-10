import { twClassJoin } from "@/util/twMerge";
import { useState } from "react";
import { Block } from "../dataDisplay";
import { TabContent, TabLink, TabList } from "../navigation";
import { SideView, SideViewBody, SideViewHeader, SideViewTitle } from "../overlay";
import { Panel } from "./types";

interface TableDrawerProps {
  /** Whether the drawer is currently open */
  isOpen?: boolean;
  /** Function to toggle the drawer open/closed */
  toggle: () => void;
  /** List of panels to render as tabs in the drawer */
  panels: Panel[];
  drawerTitle?: string;
  /** Additional CSS classes to apply to the drawer container */
  drawerContainerClassName?: string;
  /** Additional CSS classes to apply to the drawer body */
  drawerBodyClassName?: string;
  /** Additional CSS classes to apply to the drawer content */
  drawerContentClassName?: string;
}

/**
 * A slide-out drawer component that displays detailed information in tabs.
 */
export function TableDrawer(props: TableDrawerProps) {
  const [activePanelId, setActivePanelId] = useState<React.Key>();

  const currentPanelId = activePanelId ?? props.panels?.[0]?.key;
  const renderPanel = props.panels.find((item) => item.key == currentPanelId) ?? props.panels?.[0];

  if (!props.isOpen || !renderPanel) return null;

  return (
    <SideView isOpen className={props.drawerContainerClassName ?? ""}>
      <SideViewBody className={props.drawerBodyClassName ?? ""}>
        <SideViewHeader isCloseBtnVisible close={props.toggle}>
          <SideViewTitle title={props.drawerTitle ?? "Detailed View"} />
        </SideViewHeader>
        <TabList className="tabs-bordered">
          {props.panels.map((item) => (
            <TabLink
              key={item.key}
              onClick={() => setActivePanelId(item.key)}
              className={twClassJoin(
                "hover:bg-base-hover text-nowrap",
                item.key === currentPanelId ? "!border-secondary" : "",
                item.key === props.panels[0].key ? "ms-4" : ""
              )}
            >
              {item.name}
            </TabLink>
          ))}
          <TabContent isActive>
            <Block className={props.drawerContentClassName ?? ""}>{renderPanel.element}</Block>
          </TabContent>
        </TabList>
      </SideViewBody>
    </SideView>
  );
}
