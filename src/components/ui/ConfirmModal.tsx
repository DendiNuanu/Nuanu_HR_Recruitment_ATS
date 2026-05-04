"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, X, Trash2, ShieldAlert, ArrowRight } from "lucide-react";

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: "danger" | "warning" | "info";
  isLoading?: boolean;
  requireDoubleConfirm?: boolean;
}

export default function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = "YES, delete!",
  cancelText = "No",
  type = "danger",
  isLoading = false,
  requireDoubleConfirm = true,
}: ConfirmModalProps) {
  const [step, setStep] = useState(1);
  
  const colorMap = {
    danger: {
      bg: "bg-red-50",
      text: "text-red-500",
      btn: "bg-red-500 hover:bg-red-600 shadow-red-500/30",
      border: "border-red-100",
      bar: "bg-red-500"
    },
    warning: {
      bg: "bg-amber-50",
      text: "text-amber-500",
      btn: "bg-amber-500 hover:bg-amber-600 shadow-amber-500/30",
      border: "border-amber-100",
      bar: "bg-amber-500"
    },
    info: {
      bg: "bg-blue-50",
      text: "text-blue-500",
      btn: "bg-blue-500 hover:bg-blue-600 shadow-blue-500/30",
      border: "border-blue-100",
      bar: "bg-blue-500"
    }
  };

  const colors = colorMap[type];

  // Reset step when modal closes
  useEffect(() => {
    if (!isOpen) {
      setTimeout(() => setStep(1), 300);
    }
  }, [isOpen]);

  const handleInitialConfirm = () => {
    if (requireDoubleConfirm && step === 1) {
      setStep(2);
    } else {
      onConfirm();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
          {/* Backdrop with heavy blur */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-nuanu-navy/70 backdrop-blur-2xl"
          />

          {/* Modal Content - Wider & More Premium */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 100 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 100 }}
            className="relative w-full max-w-3xl bg-white rounded-[48px] shadow-[0_32px_80px_rgba(0,0,0,0.4)] overflow-hidden border border-nuanu-gray-100"
          >
            {/* Progress Bar for Double Confirm */}
            {requireDoubleConfirm && (
              <div className="absolute top-0 left-0 w-full h-2 bg-nuanu-gray-100">
                <motion.div 
                  className={`h-full ${colors.bar}`}
                  initial={{ width: "0%" }}
                  animate={{ width: step === 1 ? "50%" : "100%" }}
                />
              </div>
            )}

            <div className="flex flex-col md:flex-row">
              {/* Visual Side Column */}
              <div className={`hidden md:flex md:w-2/5 ${colors.bg} items-center justify-center p-12`}>
                <motion.div
                  key={step}
                  initial={{ scale: 0.5, opacity: 0, rotate: -10 }}
                  animate={{ scale: 1, opacity: 1, rotate: 0 }}
                  className={`w-40 h-40 rounded-[40px] bg-white shadow-2xl flex items-center justify-center ${colors.text}`}
                >
                  {step === 1 ? (
                    <AlertTriangle className="w-20 h-20" />
                  ) : (
                    <ShieldAlert className="w-20 h-20 animate-bounce" />
                  )}
                </motion.div>
              </div>

              {/* Main Content Side */}
              <div className="flex-1 p-10 md:p-14">
                <div className="mb-10">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={step}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                    >
                      <h3 className="text-4xl font-black text-nuanu-navy mb-4 tracking-tight leading-none">
                        {step === 1 ? title : "ARE YOU SURE?"}
                      </h3>
                      <p className="text-nuanu-gray-500 text-xl leading-relaxed font-medium">
                        {step === 1 ? message : "This action cannot be undone! This is your final warning before permanent deletion."}
                      </p>
                      {step === 2 && (
                        <div className={`mt-6 p-5 ${colors.bg} rounded-3xl border ${colors.border} flex gap-4 items-start`}>
                          <Trash2 className={`w-6 h-6 mt-1 ${colors.text}`} />
                          <div>
                            <p className={`text-sm font-black uppercase tracking-widest ${colors.text}`}>Caution</p>
                            <p className="text-nuanu-gray-600 text-sm mt-0.5">All associated data, history, and applications will be erased forever.</p>
                          </div>
                        </div>
                      )}
                    </motion.div>
                  </AnimatePresence>
                </div>

                {/* Professional Action Buttons */}
                <div className="flex flex-col gap-4">
                  <button
                    disabled={isLoading}
                    onClick={handleInitialConfirm}
                    className={`w-full py-6 px-10 rounded-[28px] font-black text-xl transition-all flex items-center justify-center gap-3 shadow-2xl ${
                      step === 1 
                        ? `${colors.btn} text-white` 
                        : "bg-nuanu-navy hover:bg-black text-white shadow-nuanu-navy/30"
                    } active:scale-[0.98] disabled:opacity-50 hover:-translate-y-1`}
                  >
                    {isLoading ? (
                      <div className="w-8 h-8 border-4 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        {step === 1 ? (
                          <>I understand, proceed <ArrowRight className="w-6 h-6" /></>
                        ) : confirmText}
                      </>
                    )}
                  </button>
                  
                  <button
                    disabled={isLoading}
                    onClick={onClose}
                    className="w-full py-6 px-10 rounded-[28px] font-bold text-xl text-nuanu-gray-400 bg-nuanu-gray-50 hover:bg-nuanu-gray-100 hover:text-nuanu-navy transition-all active:scale-[0.98]"
                  >
                    {cancelText}
                  </button>
                </div>
              </div>
            </div>

            {/* Close Icon */}
            <button 
              onClick={onClose}
              className="absolute top-8 right-8 p-3 text-nuanu-gray-300 hover:text-nuanu-navy hover:bg-nuanu-gray-50 rounded-full transition-all"
            >
              <X className="w-8 h-8" />
            </button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
