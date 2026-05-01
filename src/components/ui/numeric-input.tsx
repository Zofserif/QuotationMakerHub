"use client";

import {
  useState,
  type FocusEvent,
  type InputHTMLAttributes,
} from "react";

import { Input } from "@/components/ui/input";

type NumericInputProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "autoComplete" | "inputMode" | "onChange" | "type" | "value"
> & {
  inputMode: "decimal" | "numeric";
  normalizeValue?: (value: string) => string;
  onValueChange: (value: string) => void;
  value: string;
};

export function NumericInput({
  inputMode,
  normalizeValue,
  onBlur,
  onFocus,
  onValueChange,
  value,
  ...props
}: NumericInputProps) {
  const [draftValue, setDraftValue] = useState<string | null>(null);

  function handleBlur(event: FocusEvent<HTMLInputElement>) {
    const normalizedValue = normalizeValue
      ? normalizeValue(event.currentTarget.value)
      : event.currentTarget.value;

    setDraftValue(null);

    if (normalizedValue !== event.currentTarget.value) {
      onValueChange(normalizedValue);
    }

    onBlur?.(event);
  }

  function handleFocus(event: FocusEvent<HTMLInputElement>) {
    setDraftValue(value);
    onFocus?.(event);
  }

  return (
    <Input
      {...props}
      autoComplete="off"
      inputMode={inputMode}
      type="text"
      value={draftValue ?? value}
      onBlur={handleBlur}
      onChange={(event) => {
        const nextValue = event.target.value;

        setDraftValue(nextValue);
        onValueChange(nextValue);
      }}
      onFocus={handleFocus}
    />
  );
}
