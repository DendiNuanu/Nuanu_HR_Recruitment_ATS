"use client";

import { useState, useRef, useEffect } from "react";
import { Calendar as CalendarIcon, Clock, ChevronLeft, ChevronRight, Check, X, RotateCcw } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { format, addMonths, subMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, isSameDay, isSameMonth, setHours, setMinutes, parseISO, isValid } from "date-fns";

interface DateTimePickerProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
}

export default function DateTimePicker({ value, onChange, label }: DateTimePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const containerRef = useRef<HTMLDivElement>(null);

  // Parse current value or default to now
  const parseValue = (val: string) => {
    if (!val) return new Date();
    const parsed = parseISO(val);
    return isValid(parsed) ? parsed : new Date();
  };

  const selectedDate = parseValue(value);
  
  // Local state for the picker before "Saving"
  const [tempDate, setTempDate] = useState(selectedDate);
  const [tempTime, setTempTime] = useState({
    hours: selectedDate.getHours() % 12 || 12,
    minutes: Math.floor(selectedDate.getMinutes() / 5) * 5,
    ampm: selectedDate.getHours() >= 12 ? "PM" : "AM"
  });

  useEffect(() => {
    if (value) {
      const d = parseValue(value);
      setTempDate(d);
      setTempTime({
        hours: d.getHours() % 12 || 12,
        minutes: Math.floor(d.getMinutes() / 5) * 5,
        ampm: d.getHours() >= 12 ? "PM" : "AM"
      });
    }
  }, [value, isOpen]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSave = () => {
    const finalDate = new Date(tempDate);
    let hours = tempTime.hours;
    if (tempTime.ampm === "PM" && hours < 12) hours += 12;
    if (tempTime.ampm === "AM" && hours === 12) hours = 0;
    
    finalDate.setHours(hours);
    finalDate.setMinutes(tempTime.minutes);
    finalDate.setSeconds(0);
    finalDate.setMilliseconds(0);
    
    // Format to ISO string for datetime-local compatibility (YYYY-MM-DDTHH:mm)
    const offset = finalDate.getTimezoneOffset();
    const adjustedDate = new Date(finalDate.getTime() - (offset * 60 * 1000));
    onChange(adjustedDate.toISOString().slice(0, 16));
    setIsOpen(false);
  };

  const handleReset = () => {
    const now = new Date();
    setTempDate(now);
    setTempTime({
      hours: now.getHours() % 12 || 12,
      minutes: Math.floor(now.getMinutes() / 5) * 5,
      ampm: now.getHours() >= 12 ? "PM" : "AM"
    });
    setCurrentMonth(now);
  };

  const renderCalendar = () => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);

    const rows = [];
    let days = [];
    let day = startDate;
    const dateFormat = "d";

    while (day <= endDate) {
      for (let i = 0; i < 7; i++) {
        const cloneDay = day;
        const isSelected = isSameDay(day, tempDate);
        const isCurrentMonth = isSameMonth(day, monthStart);
        const isToday = isSameDay(day, new Date());

        days.push(
          <div
            key={day.toString()}
            className={`w-9 h-9 flex items-center justify-center text-sm cursor-pointer rounded-xl transition-all relative ${
              !isCurrentMonth ? "text-gray-300 opacity-50" : 
              isSelected ? "bg-emerald-600 text-white font-bold shadow-lg shadow-emerald-600/30" : 
              "hover:bg-emerald-50 hover:text-emerald-700 text-nuanu-navy"
            }`}
            onClick={() => setTempDate(cloneDay)}
          >
            {format(day, dateFormat)}
            {isToday && !isSelected && (
              <div className="absolute bottom-1 w-1 h-1 bg-emerald-500 rounded-full" />
            )}
          </div>
        );
        day = addDays(day, 1);
      }
      rows.push(
        <div className="grid grid-cols-7 gap-1" key={day.toString()}>
          {days}
        </div>
      );
      days = [];
    }
    return <div className="space-y-1">{rows}</div>;
  };

  return (
    <div className="relative" ref={containerRef}>
      {label && <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">{label}</label>}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between input-field py-3 px-4 transition-all duration-300 ${
          isOpen ? "ring-2 ring-emerald-500 border-emerald-500 bg-emerald-50/10" : "bg-white border-gray-200"
        }`}
      >
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg transition-colors ${isOpen ? "bg-emerald-100 text-emerald-600" : "bg-gray-100 text-gray-400"}`}>
            <CalendarIcon className="w-4 h-4" />
          </div>
          <span className={value ? "text-nuanu-navy font-bold text-sm" : "text-gray-400 font-medium"}>
            {value ? format(parseISO(value), "EEE, MMM d, yyyy • hh:mm a") : "Choose Date & Time"}
          </span>
        </div>
        <Clock className={`w-4 h-4 transition-transform duration-300 ${isOpen ? "rotate-180 text-emerald-500" : "text-gray-400"}`} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9, filter: "blur(10px)" }}
            animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: 20, scale: 0.9, filter: "blur(10px)" }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="absolute z-[200] mt-3 bg-white border border-gray-100 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.15)] p-6 w-[350px] right-0 md:left-0"
          >
            {/* Popover Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex flex-col">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em]">Select Schedule</span>
                <h3 className="font-extrabold text-nuanu-navy text-lg">{format(currentMonth, "MMMM yyyy")}</h3>
              </div>
              <div className="flex gap-2">
                <button 
                  type="button" 
                  onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                  className="p-2 hover:bg-gray-100 rounded-xl text-nuanu-navy transition-colors"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button 
                  type="button" 
                  onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                  className="p-2 hover:bg-gray-100 rounded-xl text-nuanu-navy transition-colors"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Weekdays */}
            <div className="grid grid-cols-7 gap-1 mb-3">
              {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map(d => (
                <div key={d} className="w-9 text-center text-[10px] font-black text-gray-300 uppercase">
                  {d}
                </div>
              ))}
            </div>

            {/* Days Grid */}
            <div className="mb-6">
              {renderCalendar()}
            </div>

            {/* Time Selector Area */}
            <div className="bg-nuanu-gray-50 rounded-2xl p-4 border border-nuanu-gray-100 mb-6">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-emerald-600" />
                  <span className="text-xs font-bold text-nuanu-navy uppercase tracking-wider">Set Interview Time</span>
                </div>
                <button 
                  type="button"
                  onClick={handleReset}
                  className="text-[10px] font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
                >
                  <RotateCcw className="w-3 h-3" /> Reset to Now
                </button>
              </div>
              
              <div className="flex items-center justify-center gap-4">
                <div className="flex flex-col items-center">
                  <select 
                    value={tempTime.hours}
                    onChange={e => setTempTime({...tempTime, hours: parseInt(e.target.value)})}
                    className="appearance-none bg-white border-2 border-transparent hover:border-emerald-200 rounded-xl py-2 px-3 text-lg font-black text-nuanu-navy text-center focus:ring-0 focus:border-emerald-500 outline-none transition-all shadow-sm cursor-pointer"
                  >
                    {Array.from({length: 12}, (_, i) => i + 1).map(h => (
                      <option key={h} value={h}>{h.toString().padStart(2, '0')}</option>
                    ))}
                  </select>
                  <span className="text-[9px] font-bold text-gray-400 uppercase mt-1">Hours</span>
                </div>
                
                <span className="text-xl font-black text-gray-300 -mt-5">:</span>
                
                <div className="flex flex-col items-center">
                  <select 
                    value={tempTime.minutes}
                    onChange={e => setTempTime({...tempTime, minutes: parseInt(e.target.value)})}
                    className="appearance-none bg-white border-2 border-transparent hover:border-emerald-200 rounded-xl py-2 px-3 text-lg font-black text-nuanu-navy text-center focus:ring-0 focus:border-emerald-500 outline-none transition-all shadow-sm cursor-pointer"
                  >
                    {Array.from({length: 12}, (_, i) => i * 5).map(m => (
                      <option key={m} value={m}>{m.toString().padStart(2, '0')}</option>
                    ))}
                  </select>
                  <span className="text-[9px] font-bold text-gray-400 uppercase mt-1">Mins</span>
                </div>

                <div className="flex flex-col items-center gap-1.5 ml-2">
                  {["AM", "PM"].map(p => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setTempTime({...tempTime, ampm: p as "AM" | "PM"})}
                      className={`px-3 py-1 text-[10px] font-black rounded-lg transition-all ${
                        tempTime.ampm === p ? "bg-nuanu-navy text-white shadow-md scale-110" : "bg-white text-gray-400 hover:bg-gray-100"
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Popover Footer - Big Save Button */}
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="py-3 px-4 border-2 border-gray-100 hover:bg-gray-50 text-gray-500 rounded-2xl text-xs font-bold transition-all flex items-center justify-center gap-2"
              >
                <X className="w-4 h-4" /> Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                className="py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-xl shadow-emerald-600/20 active:scale-95 group"
              >
                <Check className="w-4 h-4 group-hover:scale-125 transition-transform" /> 
                APPLY SCHEDULE
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
