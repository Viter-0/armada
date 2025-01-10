import { twClassMerge } from "@/util/twMerge";
import { MagnifyingGlassIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { useCallback, useState } from "react";

export interface SearchBarProps {
  placeholder?: string;
  className?: string;
  labelClassName?: string;
  value?: string;
  isClearXMarkVisible?: boolean;
  onChange?: (query: string) => void;
  onSearch?: (query: string) => void;
}

/**
 * Renders an input field with search functionality.
 *
 * @param labelClassName - The CSS class name applied to the label that surrounds the input field. This label has the input styling.
 */
export function SearchBar({
  placeholder = "Search",
  className = "",
  labelClassName = "",
  onChange,
  onSearch,
  value,
  isClearXMarkVisible,
}: SearchBarProps) {
  const [query, setQuery] = useState("");

  const inputValue = value ?? query;

  const onQueryChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setQuery(e.target.value);
      onChange?.(e.target.value);
    },
    [onChange]
  );

  const onQuerySearch = useCallback(
    (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      onSearch?.(inputValue);
    },
    [onSearch, inputValue]
  );

  const clearQuery = useCallback(() => {
    setQuery("");
    onChange?.("");
    onSearch?.("");
  }, [onSearch, onChange]);

  return (
    <form onSubmit={onQuerySearch} className={className}>
      <label className={twClassMerge("input input-bordered flex items-center gap-2", labelClassName)}>
        <MagnifyingGlassIcon className="w-4 h-4 opacity-70" />
        <input type="text" className="grow" placeholder={placeholder} value={inputValue} onChange={onQueryChange} />
        {inputValue && (isClearXMarkVisible ?? true) && (
          <XMarkIcon className="w-4 h-4 cursor-pointer" onClick={clearQuery} />
        )}
      </label>
    </form>
  );
}
