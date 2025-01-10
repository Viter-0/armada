import {
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  Dropdown,
  DropdownContent,
  DropdownToggle,
  Heading,
} from "@/components";
import { BellIcon } from "@heroicons/react/24/outline";

export function NotificationsIndicator() {
  return (
    <Dropdown className="dropdown-end">
      <DropdownToggle className="ms-2 btn-ghost btn-circle" isChevronVisible={false}>
        <BellIcon className="w-6 h-6" />
      </DropdownToggle>
      <DropdownContent>
        <Card className="w-80 h-80 card-bordered">
          <CardHeader divider={true}>
            <CardTitle>Notifications</CardTitle>
          </CardHeader>
          <CardBody>
            <Heading>No notifications to display</Heading>
          </CardBody>
        </Card>
      </DropdownContent>
    </Dropdown>
  );
}
