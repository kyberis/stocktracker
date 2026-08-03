"use client";

import { useId, useMemo, type MouseEvent } from "react";
import { mergeExchangeSuggestions } from "@/lib/known-exchanges";

interface ExchangeSuggestInputProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  /** Exchange codes already used on the user's holdings. */
  extraCodes?: string[];
  onClick?: (e: MouseEvent<HTMLInputElement>) => void;
}

export default function ExchangeSuggestInput({
  id,
  value,
  onChange,
  placeholder,
  className = "w-full",
  extraCodes = [],
  onClick,
}: ExchangeSuggestInputProps) {
  const reactId = useId();
  const listId = `exchange-suggest-${reactId.replace(/:/g, "")}`;

  const options = useMemo(
    () => mergeExchangeSuggestions(extraCodes),
    [extraCodes],
  );

  return (
    <>
      <input
        id={id}
        type="text"
        list={listId}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={() => {
          const next = value.trim().toUpperCase();
          if (next !== value) onChange(next);
        }}
        placeholder={placeholder}
        className={className}
        autoComplete="off"
        onClick={onClick}
      />
      <datalist id={listId}>
        {options.map((opt) => (
          <option key={opt.code} value={opt.code}>
            {opt.label}
          </option>
        ))}
      </datalist>
    </>
  );
}
