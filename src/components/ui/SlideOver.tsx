"use client";

import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import { createPortal } from "react-dom";

interface SlideOverProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: "md" | "lg" | "xl" | "xxl";
}

const sizes: Record<string, string> = {
  md: "max-w-xl",
  lg: "max-w-2xl",
  xl: "max-w-3xl",
  xxl: "max-w-5xl",
};

export function SlideOver({
  open,
  onClose,
  title,
  description,
  icon,
  children,
  footer,
  size = "xxl",
}: SlideOverProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (open) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleKey);
    }
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKey);
    };
  }, [open, onClose]);

  if (typeof window === "undefined") return null;

  const content = (
    <div
      className={`fixed inset-0 z-[9999] flex justify-end transition-all duration-300 ${
        open ? "visible" : "invisible pointer-events-none"
      }`}
    >
      {/* Backdrop */}
      <div
        className={`absolute inset-0 bg-black/40 backdrop-blur-[2px] transition-opacity duration-300 ${
          open ? "opacity-100" : "opacity-0"
        }`}
        onClick={onClose}
      />

      {/* Panel */}
      <div
        ref={panelRef}
        className={`relative z-10 flex flex-col h-full bg-white shadow-2xl w-full ${sizes[size]} transition-transform duration-300 ease-out ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="flex-shrink-0 border-b border-gray-100">
          <div className="flex items-start justify-between px-8 py-6">
            <div className="flex items-center gap-4">
              {icon && (
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600 flex-shrink-0">
                  {icon}
                </div>
              )}
              <div>
                <h2 className="text-xl font-bold text-gray-900 tracking-tight">
                  {title}
                </h2>
                {description && (
                  <p className="text-sm text-gray-500 mt-0.5">{description}</p>
                )}
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2.5 hover:bg-gray-100 rounded-xl transition-colors flex-shrink-0 ml-6"
              aria-label="Close"
            >
              <X size={20} className="text-gray-500" />
            </button>
          </div>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto px-8 py-7 space-y-7">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="flex-shrink-0 border-t border-gray-100 bg-gray-50/60 px-8 py-5">
            <div className="flex items-center justify-end gap-3">{footer}</div>
          </div>
        )}
      </div>
    </div>
  );

  return createPortal(content, document.body);
}
