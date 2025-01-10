import { fromCurrentTimezoneToLocal, toDateTimeInCurrentTimezone } from "@/util/helpers";
import { useCallback } from "react";
import DatePicker, { DatePickerProps } from "react-datepicker";

type OnDateChange = (
  date: Date | null,
  event?: React.MouseEvent<HTMLElement> | React.KeyboardEvent<HTMLElement>
) => void;
type DateTimePrickerProps = Omit<DatePickerProps, "onChange"> & {
  isAppTimezoneEnabled?: boolean;
  onChange: OnDateChange;
};

export function DateTimePricker({ selected, onChange, isAppTimezoneEnabled = true, ...props }: DateTimePrickerProps) {
  const selectedDate = isAppTimezoneEnabled ? (selected ? toDateTimeInCurrentTimezone(selected) : selected) : selected;

  const onDateTimeChange: OnDateChange = useCallback(
    (date, event) => {
      if (isAppTimezoneEnabled && date) return onChange(fromCurrentTimezoneToLocal(date), event);
      return onChange(date, event);
    },
    [isAppTimezoneEnabled, onChange]
  );

  return (
    <DatePicker
      dateFormat="yyyy-MM-dd HH:mm"
      timeFormat="HH:mm"
      calendarStartDay={1}
      selected={selectedDate}
      onChange={onDateTimeChange}
      {...props}
    />
  );
}
