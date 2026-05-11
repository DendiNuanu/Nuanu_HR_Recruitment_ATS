"use client";

import { useState, useEffect, useRef } from "react";

interface CurrencyInputProps {
  value: number;
  onChange: (value: number) => void;
  placeholder?: string;
  required?: boolean;
  currency?: string; // e.g. "Rp"
  min?: number;
}

/**
 * A polished currency input that:
 * - Shows the currency prefix in a separate badge (no overlap)
 * - Formats numbers with thousand-separators while typing (IDR style)
 * - Returns a plain `number` via onChange
 */
export default function CurrencyInput({
  value,
  onChange,
  placeholder = "0",
  required,
  currency = "Rp",
  min = 0,
}: CurrencyInputProps) {
  const formatIDR = (n: number) =>
    n === 0 ? "" : n.toLocaleString("id-ID");

  const [display, setDisplay] = useState(formatIDR(value));
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync when external value changes
  useEffect(() => {
    if (!focused) {
      setDisplay(formatIDR(value));
    }
  }, [value, focused]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Strip everything except digits
    const raw = e.target.value.replace(/\D/g, "");
    const num = raw === "" ? 0 : parseInt(raw, 10);
    // Format with thousand separators
    setDisplay(num === 0 ? "" : num.toLocaleString("id-ID"));
    onChange(num);
  };

  const handleFocus = () => {
    setFocused(true);
    // On focus show raw number without separators for easier editing
    if (value > 0) setDisplay(String(value));
  };

  const handleBlur = () => {
    setFocused(false);
    // Reformat nicely on blur
    setDisplay(formatIDR(value));
  };

  return (
    <div
      className={`flex items-stretch rounded-xl border overflow-hidden transition-all bg-white ${
        focused
          ? "border-emerald-500 ring-2 ring-emerald-500/20"
          : "border-gray-200 hover:border-emerald-400"
      }`}
    >
      {/* Currency badge — fully separated, never overlaps */}
      <button
        type="button"
        tabIndex={-1}
        onClick={() => inputRef.current?.focus()}
        className="flex items-center justify-center px-3 bg-emerald-50 border-r border-gray-200 text-xs font-black text-emerald-700 shrink-0 select-none cursor-text hover:bg-emerald-100 transition-colors min-w-[2.75rem]"
      >
        {currency}
      </button>

      {/* Number input */}
      <input
        ref={inputRef}
        type="text"
        inputMode="numeric"
        required={required}
        value={display}
        onChange={handleChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        placeholder={placeholder}
        min={min}
        className="flex-1 px-3 py-2.5 text-sm text-nuanu-navy font-semibold focus:outline-none bg-transparent placeholder:text-gray-400 placeholder:font-normal"
      />
    </div>
  );
}
