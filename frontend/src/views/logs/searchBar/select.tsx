import {
  Block,
  Box,
  Button,
  DateTimePricker,
  Dropdown,
  DropdownContent,
  DropdownContext,
  DropdownToggle,
  Heading,
  Menu,
  MenuItem,
  SelectDropdown,
} from "@/components";
import { useGlobalStore } from "@/store";
import { useContext, useState } from "react";
import { Link } from "react-router";
import { useShallow } from "zustand/react/shallow";
import { QueryWithoutFilters } from "../types";
import { logCountValues, timeSelectValues, typeSelectValues } from "./entities";

interface TimeSelectItem {
  key: number;
  title: string;
}

interface TimeSelectContentProps {
  items: TimeSelectItem[];
  onChange: (value: QueryWithoutFilters["time_interval"]) => void;
}
function TimeSelectContent({ items, onChange }: TimeSelectContentProps) {
  const dropdownContext = useContext(DropdownContext);
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());

  const globalState = useGlobalStore(
    useShallow((state) => ({
      timezone: state.timezone,
    }))
  );

  const onTimeItemClick = (value: TimeSelectItem["key"]) => {
    onChange({
      start_time: value,
      end_time: 0,
    });
    dropdownContext.toggleDropdown();
  };

  const onStartTimeInput = (date: Date | null) => {
    if (date == null) return;
    setStartDate(date);
    onChange({
      start_time: Math.floor(date.getTime() / 1000),
      end_time: Math.floor(endDate.getTime() / 1000),
    });
  };

  const onEndTimeInput = (date: Date | null) => {
    if (date == null) return;
    setEndDate(date);
    onChange({
      start_time: Math.floor(startDate.getTime() / 1000),
      end_time: Math.floor(endDate.getTime() / 1000),
    });
  };

  return (
    <DropdownContent className="w-[32rem]">
      <Box className="flex bg-base-100 h-80">
        <Box className="overflow-auto">
          <Menu className="  ">
            {items.map((item) => {
              return (
                <MenuItem key={item.key} className="w-36" onClick={() => onTimeItemClick(item.key)}>
                  <a>{item.title}</a>
                </MenuItem>
              );
            })}
          </Menu>
        </Box>
        <Block className="flex flex-col">
          <Heading as="h3" className="mb-2">
            From
          </Heading>
          <DateTimePricker
            className="input input-bordered"
            selected={startDate}
            onChange={onStartTimeInput}
            showTimeSelect={true}
          />
          <Heading as="h3" className="my-2">
            To
          </Heading>
          <DateTimePricker
            className="input input-bordered"
            selected={endDate}
            onChange={onEndTimeInput}
            showTimeSelect={true}
          />
          <Box className="mt-auto">
            <Box as="span">Timezone - </Box>
            <Box as="span" className="font-semibold text-secondary">
              {globalState.timezone}
            </Box>
            <Link className="ms-4" to="/profile">
              <Button className="btn-xs btn-neutral">Change</Button>
            </Link>
          </Box>
        </Block>
      </Box>
    </DropdownContent>
  );
}

interface TimeSelectProps {
  buttonClassName?: string;
  timeInterval: QueryWithoutFilters["time_interval"];
  onValueChange: (value: QueryWithoutFilters["time_interval"]) => void;
}
export function TimeSelect({ timeInterval, onValueChange, buttonClassName = "" }: TimeSelectProps) {
  const dropdownTitle = (() => {
    return (
      <Box>
        <Box as="span" className="font-bold">
          Time:{" "}
        </Box>
        {timeInterval.end_time == 0
          ? timeSelectValues.find((item) => item.key == timeInterval.start_time)?.title ?? timeInterval.start_time
          : "Custom range"}
      </Box>
    );
  })();

  return (
    <Dropdown>
      <DropdownToggle className={"no-animation bg-base-100 border-background " + buttonClassName}>
        {dropdownTitle}
      </DropdownToggle>
      <TimeSelectContent items={timeSelectValues} onChange={onValueChange} />
    </Dropdown>
  );
}

interface LogCountSelectProps {
  logCount: QueryWithoutFilters["log_count"];
  onValueChange: (value: QueryWithoutFilters["log_count"]) => void;
  dropdownClassName?: string;
  buttonClassName?: string;
}
export function LogCountSelect({ logCount, onValueChange, dropdownClassName, buttonClassName }: LogCountSelectProps) {
  return (
    <SelectDropdown
      value={[logCount]}
      options={logCountValues}
      prefix="Log Count"
      onChange={(value: number[]) => onValueChange(value[0])}
      dropdownClassName={dropdownClassName}
      buttonClassName={buttonClassName}
    />
  );
}

interface LogTypeSelectProps {
  dropdownClassName?: string;
  buttonClassName?: string;
}
/**
 * Currently not used, the app only supports IP traffic
 */
export function LogTypeSelect({ dropdownClassName, buttonClassName }: LogTypeSelectProps) {
  const [value, setValue] = useState<string[]>([typeSelectValues[0].key]);

  const updateStatusFilter = (value: string[]) => setValue(value);

  return (
    <SelectDropdown
      value={value}
      options={typeSelectValues}
      prefix="Type"
      onChange={updateStatusFilter}
      dropdownClassName={dropdownClassName}
      buttonClassName={buttonClassName}
    />
  );
}
