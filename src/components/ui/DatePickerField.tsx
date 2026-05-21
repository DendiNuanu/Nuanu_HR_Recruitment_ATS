"use client";

import { useState, useEffect, useLayoutEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Check,
  X,
} from "lucide-react";

type DatePickerVariant = "default" | "dob";
type PickerView = "day" | "month" | "year";

interface DatePickerFieldProps {
  value: string; // YYYY-MM-DD or ""
  onChange: (date: string) => void;
  placeholder?: string;
  required?: boolean;
  minDate?: string;
  maxDate?: string;
  label?: string;
  className?: string;
  /** DOB: year/month grids, no shortcuts, sensible year range */
  variant?: DatePickerVariant;
}

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

/** Monday-first week (dd/mm/yyyy locales) */
const DAY_HEADERS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

const SHORTCUTS = [
  { label: "Today", days: 0 },
  { label: "Yesterday", days: -1 },
  { label: "1 Week ago", days: -7 },
];

const MONTH_SHORT = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

const DOB_YEAR_MIN = 1940;
const DOB_DEFAULT_AGE_YEARS = 25;

function addDaysFromToday(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Display as dd/mm/yyyy */
export function formatDateDDMMYYYY(dateStr: string): string {
  if (!dateStr) return "";
  const [y, m, d] = dateStr.split("-").map(Number);
  if (!y || !m || !d) return "";
  return `${String(d).padStart(2, "0")}/${String(m).padStart(2, "0")}/${y}`;
}

function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function mondayBasedOffset(year: number, month: number): number {
  const day = new Date(year, month, 1).getDay();
  return day === 0 ? 6 : day - 1;
}

function yearFromISO(iso: string | undefined, fallback: number): number {
  if (!iso) return fallback;
  const y = Number(iso.split("-")[0]);
  return Number.isFinite(y) ? y : fallback;
}

function buildYearRange(minDate?: string, maxDate?: string): number[] {
  const now = new Date().getFullYear();
  const minY = Math.max(DOB_YEAR_MIN, yearFromISO(minDate, DOB_YEAR_MIN));
  const maxY = yearFromISO(maxDate, now);
  const years: number[] = [];
  for (let y = maxY; y >= minY; y--) years.push(y);
  return years;
}

export default function DatePickerField({
  value,
  onChange,
  placeholder = "dd/mm/yyyy",
  required,
  minDate,
  maxDate,
  className = "",
  variant = "default",
}: DatePickerFieldProps) {
  const isDob = variant === "dob";
  const today = todayISO();

  const initFromValue = () => {
    if (value) {
      const [y, m] = value.split("-").map(Number);
      return { year: y, month: m - 1 };
    }
    const n = new Date();
    return { year: n.getFullYear(), month: n.getMonth() };
  };

  const [isOpen, setIsOpen] = useState(false);
  const [pickerView, setPickerView] = useState<PickerView>("day");
  const [viewYear, setViewYear] = useState(initFromValue().year);
  const [viewMonth, setViewMonth] = useState(initFromValue().month);
  const [pendingDate, setPendingDate] = useState(value ?? "");
  const [popupPos, setPopupPos] = useState({ top: 0, left: 0, width: 288 });
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const POPUP_ESTIMATE_HEIGHT = 420;

  useEffect(() => {
    setPendingDate(value ?? "");
    if (value) {
      const [y, m] = value.split("-").map(Number);
      setViewYear(y);
      setViewMonth(m - 1);
    }
  }, [value]);

  const updatePopupPosition = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const width = 300;
    const gap = 8;
    const margin = 12;
    let left = rect.left;

    const popupHeight =
      popupRef.current?.offsetHeight ?? POPUP_ESTIMATE_HEIGHT;
    const spaceBelow = window.innerHeight - rect.bottom - gap;
    const spaceAbove = rect.top - gap;

    let top =
      spaceBelow >= popupHeight || spaceBelow >= spaceAbove
        ? rect.bottom + gap
        : rect.top - popupHeight - gap;

    top = Math.max(
      margin,
      Math.min(top, window.innerHeight - popupHeight - margin),
    );

    if (left + width > window.innerWidth - margin) {
      left = window.innerWidth - width - margin;
    }
    if (left < margin) left = margin;

    setPopupPos({ top, left, width });
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    updatePopupPosition();
    const onScroll = () => updatePopupPosition();
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        wrapperRef.current?.contains(target) ||
        document.getElementById("nuanu-date-picker-popup")?.contains(target)
      ) {
        return;
      }
      setIsOpen(false);
      setPickerView("day");
      setPendingDate(value ?? "");
    };
    window.addEventListener("resize", updatePopupPosition);
    window.addEventListener("scroll", onScroll, true);
    document.addEventListener("mousedown", handler);
    return () => {
      window.removeEventListener("resize", updatePopupPosition);
      window.removeEventListener("scroll", onScroll, true);
      document.removeEventListener("mousedown", handler);
    };
  }, [isOpen, value, updatePopupPosition]);

  useLayoutEffect(() => {
    if (!isOpen) return;
    updatePopupPosition();
    const raf = requestAnimationFrame(updatePopupPosition);
    return () => cancelAnimationFrame(raf);
  }, [isOpen, viewMonth, viewYear, pendingDate, pickerView, updatePopupPosition]);

  const yearOptions = buildYearRange(minDate, maxDate);

  const monthDisabled = (monthIndex: number) => {
    const first = `${viewYear}-${String(monthIndex + 1).padStart(2, "0")}-01`;
    const lastDay = new Date(viewYear, monthIndex + 1, 0).getDate();
    const last = `${viewYear}-${String(monthIndex + 1).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
    if (minDate && last < minDate) return true;
    if (maxDate && first > maxDate) return true;
    return false;
  };

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDayOfWeek = mondayBasedOffset(viewYear, viewMonth);

  const makeISO = (day: number) =>
    `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

  const isOutOfRange = (iso: string) =>
    (!!minDate && iso < minDate) || (!!maxDate && iso > maxDate);

  const prevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else setViewMonth((m) => m - 1);
  };

  const nextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else setViewMonth((m) => m + 1);
  };

  const selectShortcut = (days: number) => {
    const d = addDaysFromToday(days);
    if (isOutOfRange(d)) return;
    setPendingDate(d);
    const [y, m] = d.split("-").map(Number);
    setViewYear(y);
    setViewMonth(m - 1);
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

  const defaultDobYear = () => {
    const cap = yearFromISO(maxDate, new Date().getFullYear());
    return cap - DOB_DEFAULT_AGE_YEARS;
  };

  const open = () => {
    setPendingDate(value ?? "");
    setPickerView("day");
    if (value) {
      const [y, m] = value.split("-").map(Number);
      setViewYear(y);
      setViewMonth(m - 1);
    } else if (isDob) {
      setViewYear(defaultDobYear());
      setViewMonth(0);
    }
    updatePopupPosition();
    setIsOpen(true);
  };

  const headerLabel = () => {
    if (pickerView === "year") return "Select year";
    if (pickerView === "month") return `Select month · ${viewYear}`;
    return `${MONTHS[viewMonth]} ${viewYear}`;
  };

  const onHeaderClick = () => {
    if (!isDob) return;
    if (pickerView === "day") setPickerView("year");
    else if (pickerView === "month") setPickerView("year");
  };

  const selectYear = (y: number) => {
    setViewYear(y);
    setPickerView("month");
  };

  const selectMonth = (m: number) => {
    setViewMonth(m);
    setPickerView("day");
  };

  const popup = (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          ref={popupRef}
          id="nuanu-date-picker-popup"
          initial={{ opacity: 0, y: 8, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 8, scale: 0.96 }}
          transition={{ duration: 0.15, ease: "easeOut" }}
          style={{
            position: "fixed",
            top: popupPos.top,
            left: popupPos.left,
            width: popupPos.width,
            zIndex: 9999,
          }}
          className="bg-white rounded-2xl shadow-[0_24px_64px_rgba(0,0,0,0.18)] border border-gray-100 overflow-hidden"
        >
          <div className="px-4 pt-4 pb-3 bg-gradient-to-br from-emerald-50 to-white border-b border-emerald-100/80">
            <p className="text-[10px] font-black text-emerald-700/70 uppercase tracking-[0.2em] mb-2">
              {isDob ? "Date of birth" : "Select date"}
            </p>
            {!isDob && (
              <div className="flex flex-wrap gap-1.5">
                {SHORTCUTS.map((s) => {
                  const d = addDaysFromToday(s.days);
                  const disabled = isOutOfRange(d);
                  const isActive = pendingDate === d;
                  return (
                    <button
                      key={s.label}
                      type="button"
                      disabled={disabled}
                      onClick={() => selectShortcut(s.days)}
                      className={`px-2.5 py-1 text-[11px] font-bold rounded-lg border transition-all ${
                        isActive
                          ? "bg-emerald-500 text-white border-emerald-500 shadow-sm"
                          : disabled
                            ? "bg-gray-50 border-gray-100 text-gray-300 cursor-not-allowed"
                            : "bg-white border-gray-200 text-gray-600 hover:border-emerald-400 hover:text-emerald-700 hover:bg-emerald-50"
                      }`}
                    >
                      {s.label}
                    </button>
                  );
                })}
              </div>
            )}
            {isDob && (
              <p className="text-[11px] font-semibold text-emerald-800/80">
                Tap the month or year to jump quickly
              </p>
            )}
          </div>

          <div className="flex items-center justify-between px-4 py-3 gap-2">
            <button
              type="button"
              onClick={() => {
                if (pickerView === "day") prevMonth();
                else if (pickerView === "month") setPickerView("year");
                else setPickerView("day");
              }}
              className="p-2 rounded-xl hover:bg-emerald-50 text-gray-600 transition-colors shrink-0"
              aria-label={
                pickerView === "day"
                  ? "Previous month"
                  : pickerView === "month"
                    ? "Back to years"
                    : "Back to calendar"
              }
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            {isDob ? (
              <button
                type="button"
                onClick={onHeaderClick}
                disabled={pickerView !== "day"}
                className="flex-1 flex items-center justify-center gap-1.5 min-w-0 px-3 py-1.5 rounded-xl text-sm font-black text-nuanu-navy tracking-tight border border-emerald-200/80 bg-emerald-50/60 hover:bg-emerald-100 hover:border-emerald-400 transition-all shadow-sm disabled:opacity-100 disabled:cursor-default"
              >
                <span className="truncate">{headerLabel()}</span>
                {pickerView === "day" && (
                  <ChevronDown className="w-4 h-4 text-emerald-600 shrink-0" />
                )}
              </button>
            ) : (
              <span className="text-sm font-black text-nuanu-navy tracking-tight">
                {MONTHS[viewMonth]} {viewYear}
              </span>
            )}
            {pickerView === "day" ? (
              <button
                type="button"
                onClick={nextMonth}
                className="p-2 rounded-xl hover:bg-emerald-50 text-gray-600 transition-colors shrink-0"
                aria-label="Next month"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <div className="w-9 shrink-0" aria-hidden />
            )}
          </div>

          {isDob && pickerView === "year" && (
            <div className="px-3 pb-3 max-h-[220px] overflow-y-auto grid grid-cols-4 gap-1.5">
              {yearOptions.map((y) => {
                const isActive = y === viewYear;
                return (
                  <button
                    key={y}
                    type="button"
                    onClick={() => selectYear(y)}
                    className={`py-2 rounded-xl text-xs font-bold transition-all ${
                      isActive
                        ? "bg-emerald-500 text-white shadow-md shadow-emerald-500/30"
                        : "text-gray-700 hover:bg-emerald-50 hover:text-emerald-700"
                    }`}
                  >
                    {y}
                  </button>
                );
              })}
            </div>
          )}

          {isDob && pickerView === "month" && (
            <div className="px-3 pb-3 grid grid-cols-3 gap-1.5">
              {MONTH_SHORT.map((label, idx) => {
                const disabled = monthDisabled(idx);
                const isActive = idx === viewMonth;
                return (
                  <button
                    key={label}
                    type="button"
                    disabled={disabled}
                    onClick={() => !disabled && selectMonth(idx)}
                    className={`py-2.5 rounded-xl text-xs font-bold transition-all ${
                      isActive
                        ? "bg-emerald-500 text-white shadow-md shadow-emerald-500/30"
                        : disabled
                          ? "text-gray-300 cursor-not-allowed"
                          : "text-gray-700 hover:bg-emerald-50 hover:text-emerald-700"
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          )}

          {pickerView === "day" && (
            <>
              <div className="grid grid-cols-7 px-3 gap-0.5">
                {DAY_HEADERS.map((d) => (
                  <div
                    key={d}
                    className="text-center text-[10px] font-black text-gray-400 py-1"
                  >
                    {d}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-7 px-3 pb-2 gap-0.5">
                {Array.from({ length: firstDayOfWeek }).map((_, i) => (
                  <div key={`pad-${i}`} />
                ))}
                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const day = i + 1;
                  const iso = makeISO(day);
                  const isSelected = iso === pendingDate;
                  const isTodayCell = !isDob && iso === today;
                  const disabled = isOutOfRange(iso);

                  return (
                    <button
                      key={day}
                      type="button"
                      disabled={disabled}
                      onClick={() => !disabled && setPendingDate(iso)}
                      className={`relative flex items-center justify-center w-full aspect-square rounded-xl text-xs font-bold transition-all ${
                        isSelected
                          ? "bg-emerald-500 text-white shadow-md shadow-emerald-500/35 scale-105"
                          : isTodayCell
                            ? "ring-2 ring-emerald-400/60 text-emerald-700 bg-emerald-50"
                            : disabled
                              ? "text-gray-300 cursor-not-allowed"
                              : "text-gray-700 hover:bg-emerald-50 hover:text-emerald-700"
                      }`}
                    >
                      {day}
                    </button>
                  );
                })}
              </div>
            </>
          )}

          <div className="mx-4 mb-3 px-3 py-2 rounded-xl bg-nuanu-navy/5 border border-gray-100 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <Calendar className="w-4 h-4 text-emerald-500 shrink-0" />
              <span className="text-xs font-bold text-nuanu-navy truncate">
                {pendingDate
                  ? formatDateDDMMYYYY(pendingDate)
                  : "No date selected"}
              </span>
            </div>
            <span className="text-[10px] font-black text-gray-400 uppercase shrink-0">
              dd/mm/yyyy
            </span>
          </div>

          <div className="px-4 pb-4 flex gap-2">
            {!required && (
              <button
                type="button"
                onClick={handleClear}
                className="flex items-center justify-center gap-1 flex-1 py-2.5 text-xs font-bold text-gray-500 bg-gray-50 hover:bg-gray-100 rounded-xl transition-colors border border-gray-200"
              >
                <X className="w-3.5 h-3.5" /> Clear
              </button>
            )}
            <button
              type="button"
              onClick={handleApply}
              disabled={required && !pendingDate}
              className="flex items-center justify-center gap-1.5 flex-[1.2] py-2.5 text-xs font-black text-white bg-emerald-500 hover:bg-emerald-600 active:scale-[0.98] rounded-xl transition-all shadow-md shadow-emerald-500/30 disabled:opacity-40"
            >
              <Check className="w-4 h-4" />
              Apply
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return (
    <div ref={wrapperRef} className={`relative ${className}`}>
      <button
        ref={triggerRef}
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
        <span
          className={`flex-1 tabular-nums ${
            value ? "text-nuanu-navy font-semibold" : "text-gray-400"
          }`}
        >
          {value ? formatDateDDMMYYYY(value) : placeholder}
        </span>
        {value && (
          <span className="text-[9px] font-black text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full uppercase tracking-wide shrink-0">
            Set
          </span>
        )}
      </button>

      {typeof document !== "undefined" && createPortal(popup, document.body)}
    </div>
  );
}
