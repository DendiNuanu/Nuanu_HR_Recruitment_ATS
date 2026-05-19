"use client";

import { X } from "lucide-react";
import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface AppDialogProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  size?: "md" | "lg" | "xl" | "2xl" | "full";
  children: React.ReactNode;
  footer?: React.ReactNode;
}

const sizeMap: Record<string, string> = {
  md: "max-w-lg",
  lg: "max-w-2xl",
  xl: "max-w-3xl",
  "2xl": "max-w-4xl",
  full: "max-w-5xl",
};

export function AppDialog({
  isOpen,
  onClose,
  title,
  subtitle,
  icon,
  size = "xl",
  children,
  footer,
}: AppDialogProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Dialog */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 16 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className={`relative z-10 w-full ${sizeMap[size]} bg-white rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden`}
          >
            {/* Sticky Header */}
            <div className="flex items-start justify-between p-6 pb-4 border-b border-gray-100 flex-shrink-0">
              <div className="flex items-center gap-3">
                {icon && (
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 flex-shrink-0">
                    {icon}
                  </div>
                )}
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 leading-tight">
                    {title}
                  </h2>
                  {subtitle && (
                    <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>
                  )}
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-xl transition-colors flex-shrink-0 ml-4"
              >
                <X size={20} className="text-gray-500" />
              </button>
            </div>

            {/* Scrollable Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              {children}
            </div>

            {/* Sticky Footer */}
            {footer && (
              <div className="flex items-center justify-end gap-3 p-6 pt-4 border-t border-gray-100 flex-shrink-0 bg-gray-50/50">
                {footer}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
