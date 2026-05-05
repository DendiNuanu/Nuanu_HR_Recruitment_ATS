"use client";

import { Check, Clock, X, User } from "lucide-react";
import { motion } from "framer-motion";

type ApprovalStep = {
  id: string;
  role: string;
  status: string;
  comment?: string | null;
  approvedAt?: Date | string | null;
  approver?: {
    name: string;
    avatar?: string | null;
  };
};

export default function ApprovalTimeline({ steps }: { steps: ApprovalStep[] }) {
  // Sort steps to ensure MANAGER -> HR -> FINANCE order
  const orderMap: Record<string, number> = { MANAGER: 1, HR: 2, FINANCE: 3 };
  const sortedSteps = [...steps].sort((a, b) => (orderMap[a.role] || 99) - (orderMap[b.role] || 99));

  return (
    <div className="relative flex flex-col md:flex-row items-start md:items-center justify-between gap-8 py-8 px-4">
      {/* Connector Line (Horizontal on Desktop) */}
      <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-nuanu-gray-200 -translate-y-1/2 hidden md:block z-0" />
      
      {sortedSteps.map((step, idx) => {
        const isApproved = step.status === "APPROVED";
        const isRejected = step.status === "REJECTED";
        const isPending = step.status === "PENDING";
        
        return (
          <div key={step.id} className="relative z-10 flex-1 w-full md:w-auto">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: idx * 0.1 }}
              className={`flex flex-col items-center p-4 rounded-2xl border bg-white shadow-sm transition-all ${
                isApproved ? "border-nuanu-emerald bg-emerald-50/30" : 
                isRejected ? "border-nuanu-error bg-red-50/30" : 
                "border-nuanu-gray-200"
              }`}
            >
              <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-3 shadow-inner ${
                isApproved ? "bg-nuanu-emerald text-white" : 
                isRejected ? "bg-nuanu-error text-white" : 
                "bg-nuanu-gray-100 text-nuanu-gray-400"
              }`}>
                {isApproved ? <Check className="w-6 h-6" /> : 
                 isRejected ? <X className="w-6 h-6" /> : 
                 <Clock className="w-6 h-6" />}
              </div>
              
              <h4 className="font-bold text-nuanu-navy text-sm uppercase tracking-wider">{step.role}</h4>
              <p className={`text-[10px] font-bold uppercase mt-1 px-2 py-0.5 rounded-full ${
                isApproved ? "bg-emerald-100 text-emerald-700" : 
                isRejected ? "bg-red-100 text-red-700" : 
                "bg-nuanu-gray-100 text-nuanu-gray-500"
              }`}>
                {step.status}
              </p>
              
              {step.approver && (
                <div className="mt-4 flex items-center gap-2 border-t border-nuanu-gray-100 pt-3 w-full">
                  <div className="w-6 h-6 rounded-full bg-nuanu-gray-200 flex items-center justify-center overflow-hidden">
                    {step.approver.avatar ? (
                      <img src={step.approver.avatar} alt={step.approver.name} className="w-full h-full object-cover" />
                    ) : (
                      <User className="w-3 h-3 text-nuanu-gray-500" />
                    )}
                  </div>
                  <span className="text-xs font-medium text-nuanu-gray-600 truncate max-w-[80px]">
                    {step.approver.name}
                  </span>
                </div>
              )}
              
              {step.comment && (
                <div className="mt-2 text-[10px] text-nuanu-gray-400 italic bg-nuanu-gray-50 p-2 rounded-lg w-full text-center">
                   "{step.comment}"
                </div>
              )}
            </motion.div>
          </div>
        );
      })}
    </div>
  );
}
