import { twClassMerge } from "@/util/twMerge";
import { CheckIcon } from "@heroicons/react/24/outline";
import { useCallback, useContext, useMemo } from "react";
import { Badge } from "./dataDisplay";
import { Dropdown, DropdownContent, DropdownContext, DropdownToggle } from "./dropdown";
import { Box } from "./layout";
import { Menu, MenuItem } from "./menu";
import { Anchor } from "./navigation";

export interface SelectDropdownOption<T> {
  disabled?: boolean;
  key: T;
  title: React.ReactNode;
}

export interface SelectDropdownProps<T> {
  options: SelectDropdownOption<T>[];
  prefix?: React.ReactNode;
  isClosedOnSelect?: boolean;
  title?: React.ReactNode;
  isMultiSelect?: boolean;
  value: T[];
  dropdownClassName?: string;
  buttonClassName?: string;
  onChange: (value: T[]) => void;
}

interface ListProps<T> {
  options: SelectDropdownOption<T>[];
  value: T[];
  isClosedOnSelect?: boolean;
  isMultiSelect?: boolean;
  dropdownClassName?: string;
  onChange: (value: T[]) => void;
}

/**
 * A list of selectable options, with multi-select support.
 */
export function SelectDropdownList<T extends React.Key>({
  options,
  value,
  isClosedOnSelect,
  dropdownClassName,
  onChange,
  isMultiSelect = false,
}: ListProps<T>) {
  const dropdownContext = useContext(DropdownContext);

  const onSelect = (option: SelectDropdownOption<T>) => {
    if (isMultiSelect) {
      if (!value.includes(option.key)) {
        onChange([...value, option.key]);
      } else {
        onChange(value.filter((item) => item != option.key));
      }
    } else {
      onChange([option.key]);
    }
    if (isClosedOnSelect) dropdownContext.toggleDropdown();
  };

  if (isMultiSelect) {
    return (
      <DropdownContent className={dropdownClassName}>
        <Menu className="bg-base-100 rounded-box p-2 shadow">
          {options.map((option) => {
            return (
              <MenuItem key={option.key} onClick={() => onSelect(option)}>
                <Anchor className={value.includes(option.key) ? "bg-base-200" : ""}>
                  <Box as="span" className="w-4">
                    {value.includes(option.key) && <CheckIcon className="w-4 h-4 stroke-accent" />}
                  </Box>
                  {option.title}
                </Anchor>
              </MenuItem>
            );
          })}
        </Menu>
      </DropdownContent>
    );
  } else {
    return (
      <DropdownContent className={dropdownClassName}>
        <Menu className="bg-base-100 rounded-box p-2 shadow">
          {options.map((option) => {
            return (
              <MenuItem key={option.key} onClick={() => onSelect(option)}>
                <Anchor className={option.key == value[0] ? "bg-base-200" : ""}>
                  <Box as="span" className="w-4">
                    {option.key == value[0] && <CheckIcon className="w-4 h-4 stroke-accent" />}
                  </Box>
                  {option.title}
                </Anchor>
              </MenuItem>
            );
          })}
        </Menu>
      </DropdownContent>
    );
  }
}

function getActiveOptions<T extends React.Key>(keys: T[], options: SelectDropdownOption<T>[]) {
  return options.filter((option) => keys.includes(option.key));
}

/**
 * Dropdown menu for selecting options, with multi-select support.
 */
export function SelectDropdown<T extends React.Key>({
  options,
  onChange,
  prefix,
  value,
  isMultiSelect = false,
  isClosedOnSelect = true,
  title = "Choose an option",
  dropdownClassName = "",
  buttonClassName = "",
}: SelectDropdownProps<T>) {
  const createTitle = useCallback(() => {
    const activeOptions = getActiveOptions(value, options);

    if (activeOptions.length == 0) return title;
    if (activeOptions.length == 1) return activeOptions[0].title;

    return (
      <span>
        {activeOptions[0].title}{" "}
        <Badge className="badge-accent badge-outline ms-1 text-xs">+{activeOptions.length - 1}</Badge>
      </span>
    );
  }, [value, options, title]);

  const dropdownTitle = (() => {
    return (
      <div>
        {prefix && <span className="font-bold">{prefix}: </span>}
        {createTitle()}
      </div>
    );
  })();

  const listProps = useMemo<ListProps<T>>(() => {
    return {
      options,
      value,
      isClosedOnSelect,
      onChange,
      isMultiSelect,
      dropdownClassName,
    };
  }, [options, value, isClosedOnSelect, onChange, isMultiSelect, dropdownClassName]);

  return (
    <Dropdown>
      <DropdownToggle className={twClassMerge("no-animation bg-base-100 input-bordered", buttonClassName)}>
        {dropdownTitle}
      </DropdownToggle>
      <SelectDropdownList {...listProps} />
    </Dropdown>
  );
}
