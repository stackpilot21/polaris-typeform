"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Input } from "@/components/ui/input";

export function SSNInput({
  value,
  onChange,
  className,
  ...props
}: {
  value: string;
  onChange: (val: string) => void;
  className?: string;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "type">) {
  const [display, setDisplay] = useState("");
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const formatSSN = useCallback((raw: string) => {
    const digits = raw.replace(/\D/g, "").slice(0, 9);
    if (digits.length <= 3) return digits;
    if (digits.length <= 5) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
    return `${digits.slice(0, 3)}-${digits.slice(3, 5)}-${digits.slice(5)}`;
  }, []);

  const maskSSN = useCallback((formatted: string, showLast: boolean) => {
    if (!formatted) return "";
    if (!showLast) {
      return formatted.replace(/\d/g, "•");
    }
    // Show the last digit, mask the rest
    const lastDigitIndex = formatted.length - 1;
    let result = "";
    let foundLast = false;
    for (let i = formatted.length - 1; i >= 0; i--) {
      if (!foundLast && /\d/.test(formatted[i])) {
        foundLast = true;
        result = formatted[i] + result;
      } else {
        result = (/\d/.test(formatted[i]) ? "•" : formatted[i]) + result;
      }
    }
    return result;
  }, []);

  useEffect(() => {
    // When value changes externally, update display
    setDisplay(maskSSN(formatSSN(value), false));
  }, []);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const inputVal = e.target.value;

    // Extract only new digits from the input (user may have typed or deleted)
    const newDigits = inputVal.replace(/[^0-9]/g, "");
    const oldDigits = value.replace(/\D/g, "");

    let digits: string;
    if (newDigits.length < oldDigits.length) {
      // Deletion
      digits = oldDigits.slice(0, -1);
    } else {
      // Get the new character typed
      const addedChar = inputVal.slice(-1);
      if (/\d/.test(addedChar) && oldDigits.length < 9) {
        digits = oldDigits + addedChar;
      } else {
        digits = oldDigits;
      }
    }

    const formatted = formatSSN(digits);
    onChange(digits);

    // Show the last typed digit briefly
    setDisplay(maskSSN(formatted, true));

    // After a delay, mask everything
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      setDisplay(maskSSN(formatted, false));
    }, 800);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace") {
      e.preventDefault();
      const digits = value.replace(/\D/g, "");
      if (digits.length > 0) {
        const newDigits = digits.slice(0, -1);
        const formatted = formatSSN(newDigits);
        onChange(newDigits);
        setDisplay(maskSSN(formatted, false));
      }
    }
  }

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  return (
    <Input
      ref={inputRef}
      type="text"
      inputMode="numeric"
      autoComplete="off"
      placeholder="XXX-XX-XXXX"
      value={display}
      onChange={handleChange}
      onKeyDown={handleKeyDown}
      className={className}
      {...props}
    />
  );
}
