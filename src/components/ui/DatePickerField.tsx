"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Calendar, ChevronLeft, ChevronRight, Check, X } from "lucide-react";

interface DatePickerFieldProps {
  value: string; // YYYY-MM-DD or ""
  onChange: (date: string) => void;
  placeholder?: string;
  required?: boolean;
  minDate?: string;
  label?: string;
}

const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];
const DAY_HEADERS = ["Su","Mo","Tu","We","Th","Fr","Sa"];

const SHORTCUTS = [
  { label: "Today",    days: 0  },
  { label: "+1 Week",  days: 7  },
  { label: "+2 Weeks", days: 14 },
  { label: "+1 Month", days: 30 },
  { label: "+3 Months",days: 90 },
];

function addDays(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

function formatDisplay(dateStr: string): string {
  if (!dateStr) return "";
  // parse as local date to avoid UTC offset shifts
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function todayISO(): string {
  return new Date().toISOString().split("T")[0];
}

export default function DatePickerField({
  value,
  onChange,
  placeholder = "Select date",
  required,
  minDate,
}: DatePickerFieldProps) {
  const today = todayISO();

  // Calendar view state
  const initFromValue = () => {
    if (value) {
      const [y, m] = value.split("-").map(Number);
      return { year: y, month: m - 1 };
    }
    const n = new Date();
    return { year: n.getFullYear(), month: n.getMonth() };
  };

  const [isOpen, setIsOpen] = useState(false);
  const [viewYear, setViewYear] = useState(initFromValue().year);
  const [viewMonth, setViewMonth] = useState(initFromValue().month);
  const [pendingDate, setPendingDate] = useState(value ?? "");
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Sync pendingDate when value prop changes externally
  useEffect(() => {
    setPendingDate(value ?? "");
    if (value) {
      const [y, m] = value.split("-").map(Number);
      setViewYear(y);
      setViewMonth(m - 1);
    }
  }, [value]);

  // Close on outside click (cancel pending selection)
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setPendingDate(value ?? "");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [isOpen, value]);

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay();

  const makeISO = (day: number) =>
    `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  };

  const selectShortcut = (days: number) => {
    const d = addDays(days);
    setPendingDate(d);
    const [y, m] = d.split("-").map(Number);
    setViewYear(y); setViewMonth(m - 1);
  };

  const handleApply = () => {
    onChange(pendingDate);
    setIsOpen(false);
  };

  const handleClear = () => {
    setPendingDate("");
    onChange("");
    setIsOpen(false);
  };

  const open = () => {
    setPendingDate(value ?? "");
    if (value) {
      const [y, m] = value.split("-").map(Number);
      setViewYear(y); setViewMonth(m - 1);
    }
    setIsOpen(true);
  };

  return (
    <div ref={wrapperRef} className="relative">
      {/* ── Trigger ── */}
      <button
        type="button"
        onClick={() => (isOpen ? setIsOpen(false) : open())}
        className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl border text-sm transition-all bg-white text-left ${
          isOpen
            ? "border-emerald-500 ring-2 ring-emerald-500/20"
            : "border-gray-200 hover:border-emerald-400"
        }`}
      >
        <Calendar
          className={`w-4 h-4 shrink-0 ${
            value ? "text-emerald-500" : "text-gray-400"
          }`}
        />
        <span className={`flex-1 ${value ? "text-nuanu-navy font-semibold" : "text-gray-400"}`}>
          {value ? formatDisplay(value) : placeholder}
        </span>
        {value ? (
          <span className="text-[9px] font-black text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full uppercase tracking-wide">
            Set
          </span>
        ) : (
          <ChevronRight
            className={`w-3.5 h-3.5 text-gray-300 transition-transform ${isOpen ? "rotate-90" : ""}`}
          />
        )}
      </button>

      {/* ── Popup ── */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.97 }}
            transition={{ duration: 0.14, ease: "easeOut" }}
            className="absolute z-[300] top-full mt-2 left-0 w-72 bg-white rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.15)] border border-gray-100 overflow-hidden"
          >
            {/* Quick shortcuts */}
            <div className="px-3 pt-3 pb-2.5 bg-gradient-to-r from-gray-50 to-emerald-50/30 border-b border-gray-100">
              <p className="text-[9px] font-black text-gray-400 uppercase tracking-[0.15em] mb-2">
                Quick Select
              </p>
              <div className="flex flex-wrap gap-1.5">
                {SHORTCUTS.map((s) => {
                  const d = addDays(s.days);
                  const isActive = pendingDate === d;
                  return (
                    <button
                      key={s.label}
                      type="button"
                      onClick={() => selectShortcut(s.days)}
                      className={`px-2.5 py-1 text-[11px] font-bold rounded-lg border transition-all ${
                        isActive
                          ? "bg-emerald-500 text-white border-emerald-500 shadow-sm"
                          : "bg-white border-gray-200 text-gray-600 hover:border-emerald-400 hover:text-emerald-700 hover:bg-emerald-50"
                      }`}
                    >
                      {s.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Month nav */}
            <div className="flex items-center justify-between px-3 py-2.5">
              <button
                type="button"
                onClick={prevMonth}
                className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-sm font-black text-nuanu-navy tracking-tight">
                {MONTHS[viewMonth]} {viewYear}
              </span>
              <button
                type="button"
                onClick={nextMonth}
                className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Day headers */}
            <div className="grid grid-cols-7 px-2">
              {DAY_HEADERS.map((d) => (
                <div
                  key={d}
                  className="text-center text-[10px] font-black text-gray-400 py-1"
                >
                  {d}
                </div>
              ))}
            </div>

            {/* Days */}
            <div className="grid grid-cols-7 px-2 pb-1">
              {/* Empty cells before first day */}
              {Array.from({ length: firstDayOfWeek }).map((_, i) => (
                <div key={`pad-${i}`} />
              ))}

              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1;
                const iso = makeISO(day);
                const isSelected = iso === pendingDate;
                const isTodayCell = iso === today;
                const isDisabled = !!minDate && iso < minDate;

                return (
                  <button
                    key={day}
                    type="button"
                    disabled={isDisabled}
                    onClick={() => !isDisabled && setPendingDate(iso)}
                    className={`relative flex items-center justify-center w-full aspect-square rounded-xl text-xs font-bold transition-all m-px ${
                      isSelected
                        ? "bg-emerald-500 text-white shadow-md shadow-emerald-500/40 scale-105"
                        : isTodayCell
                        ? "ring-1 ring-emerald-400 text-emerald-700 bg-emerald-50"
                        : isDisabled
                        ? "text-gray-300 cursor-not-allowed"
                        : "text-gray-700 hover:bg-emerald-50 hover:text-emerald-700"
                    }`}
                  >
                    {day}
                    {isTodayCell && !isSelected && (
                      <span className="absolute bottom-px left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-emerald-500" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Selected preview */}
            {pendingDate && (
              <div className="mx-3 mb-2 px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center gap-2">
                <Calendar className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                <span className="text-xs font-bold text-emerald-700">
                  {formatDisplay(pendingDate)}
                </span>
              </div>
            )}

            {/* Action buttons */}
            <div className="px-3 pb-3 flex gap-2">
              {!required && (
                <button
                  type="button"
                  onClick={handleClear}
                  className="flex items-center justify-center gap-1 flex-1 py-2 text-xs font-bold text-gray-500 bg-gray-50 hover:bg-gray-100 rounded-xl transition-colors border border-gray-200"
                >
                  <X className="w-3.5 h-3.5" /> Clear
                </button>
              )}
              <button
                type="button"
                onClick={handleApply}
                disabled={required && !pendingDate}
                className="flex items-center justify-center gap-1.5 flex-1 py-2 text-xs font-black text-white bg-emerald-500 hover:bg-emerald-600 active:scale-[0.98] rounded-xl transition-all shadow-sm shadow-emerald-500/30 disabled:opacity-40"
              >
                <Check className="w-3.5 h-3.5" />
                Apply
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
