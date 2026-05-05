"use client";

import { useState, useEffect } from "react";
import { Check, X, FileText, Search, Loader2, Clock, Eye, Plus, RefreshCw, Lock } from "lucide-react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import ApprovalTimeline from "@/components/requisitions/ApprovalTimeline";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

type Requisition = {
  id: string;
  vacancyId: string;
  requestedById: string;
  status: string;
  currentStep: number;
  createdAt: string;
  vacancy: {
    id: string;
    title: string;
    code: string;
    department: { 
      id: string;
      name: string;
    };
  };
  approvals: Array<{
    id: string;
    approverId: string;
    role: string;
    status: string;
    comment?: string | null;
    approvedAt?: string | null;
    approver: { name: string; avatar?: string | null };
  }>;
};

export default function RequisitionsClient({ initialUser }: { initialUser: any }) {
  const [requisitions, setRequisitions] = useState<Requisition[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [comment, setComment] = useState("");

  const fetchRequisitions = async () => {
    try {
      const res = await fetch("/api/requisition/list");
      const data = await res.json();
      if (Array.isArray(data)) {
        setRequisitions(data);
      } else {
        setRequisitions([]);
      }
    } catch (error) {
      toast.error("Failed to load requisitions");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequisitions();
  }, []);

  const handleAction = async (requisitionId: string, action: "approve" | "reject") => {
    if (action === "reject" && !comment) {
      toast.error("Please provide a reason for rejection");
      return;
    }

    setActionLoading(requisitionId);
    try {
      const res = await fetch(`/api/requisition/${action}`, {
        method: "POST",
        body: JSON.stringify({
          requisitionId,
          approverId: initialUser.id,
          comment: comment || (action === "approve" ? "Approved" : "")
        }),
        headers: { "Content-Type": "application/json" }
      });

      const data = await res.json();

      if (data.success) {
        toast.success(`Requisition ${action}d successfully`);
        setComment("");
        fetchRequisitions();
      } else {
        toast.error(data.error || `Failed to ${action}`);
      }
    } catch (error: any) {
      toast.error(error.message || "An unexpected error occurred");
    } finally {
      setActionLoading(null);
    }
  };

  const isSuperAdmin = initialUser.roles?.some((r: string) => r.toLowerCase() === "super-admin");

  const filtered = Array.isArray(requisitions) ? requisitions.filter(r => {
    const matchesSearch = r.vacancy.title.toLowerCase().includes(search.toLowerCase()) || 
                         r.vacancy.code.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = filter === "all" || r.status.toLowerCase() === filter.toLowerCase();
    return matchesSearch && matchesFilter;
  }) : [];

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-nuanu-navy tracking-tight">Job Requisitions</h1>
          <p className="text-nuanu-gray-500 mt-1">Review and approve job creation requests across the organization.</p>
        </div>
        
        <div className="flex items-center gap-3">
          <button 
            onClick={() => { setLoading(true); fetchRequisitions(); }}
            className="p-3 bg-white border border-nuanu-gray-200 rounded-xl hover:bg-nuanu-gray-50 text-nuanu-gray-400 transition-all shadow-sm"
          >
            <RefreshCw className={`w-5 h-5 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-32 space-y-4">
          <Loader2 className="w-12 h-12 text-nuanu-emerald animate-spin" />
          <p className="text-nuanu-gray-400 font-medium animate-pulse">Fetching requisitions...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-3xl border border-nuanu-gray-200 p-20 text-center shadow-sm">
           <div className="w-20 h-20 bg-nuanu-gray-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <FileText className="w-10 h-10 text-nuanu-gray-300" />
           </div>
           <h3 className="text-xl font-bold text-nuanu-navy">No requisitions found</h3>
        </div>
      ) : (
        <div className="grid gap-6">
          {filtered.map((req) => {
            const roleOrder = ["MANAGER", "HR", "FINANCE"];
            const currentRole = roleOrder[req.currentStep - 1];
            const currentApproval = req.approvals.find(a => a.role === currentRole && a.status === "PENDING");
            const isMyTurn = isSuperAdmin || (currentApproval?.approverId === initialUser.id);

            return (
              <motion.div layout key={req.id} className="card !p-0 overflow-hidden border-l-4 transition-all shadow-sm hover:shadow-md border-l-nuanu-emerald">
                <div className="p-8 md:p-10">
                  <div className="flex flex-col md:flex-row justify-between gap-8">
                    <div className="flex gap-6">
                      <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-nuanu-emerald flex items-center justify-center flex-shrink-0 shadow-sm">
                        <FileText className="w-7 h-7" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-3 mb-1.5 flex-wrap">
                          <h3 className="text-xl font-bold text-nuanu-navy truncate">{req.vacancy.title}</h3>
                          <span className="text-xs font-mono font-bold bg-nuanu-gray-100 text-nuanu-gray-500 px-2 py-0.5 rounded">#{req.vacancy.code}</span>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-nuanu-gray-500 font-medium">
                          <span className="font-semibold text-nuanu-navy">{req.vacancy.department.name}</span>
                          <span className="w-1 h-1 rounded-full bg-nuanu-gray-300" />
                          <span>Requested {formatDistanceToNow(new Date(req.createdAt), { addSuffix: true })}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-3 flex-shrink-0">
                      <span className={`px-5 py-2 rounded-full text-[10px] font-black uppercase tracking-[0.2em] shadow-sm ${
                        req.status === "APPROVED" ? "bg-emerald-100 text-emerald-700" :
                        req.status === "REJECTED" ? "bg-red-100 text-red-700" :
                        "bg-amber-100 text-amber-700"
                      }`}>
                        {req.status}
                      </span>
                      <button onClick={() => setSelectedId(selectedId === req.id ? null : req.id)} className="text-xs font-bold text-nuanu-emerald hover:underline">
                        {selectedId === req.id ? "Hide Timeline" : "View Approval Flow"}
                      </button>
                    </div>
                  </div>
                </div>

                <AnimatePresence>
                  {selectedId === req.id && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden bg-nuanu-gray-50/50 border-t border-nuanu-gray-100">
                      <div className="p-8 md:p-10">
                        <ApprovalTimeline steps={req.approvals} />
                        
                        <div className="mt-8 space-y-6">
                          {/* Approval Actions with Turn Control */}
                          {req.status === "PENDING" && (
                            <div className="bg-white p-6 rounded-2xl border border-nuanu-gray-100 shadow-sm">
                              {!isMyTurn ? (
                                <div className="flex flex-col items-center justify-center py-6 text-center space-y-3">
                                  <div className="w-12 h-12 rounded-full bg-nuanu-gray-50 flex items-center justify-center text-nuanu-gray-300">
                                    <Lock className="w-6 h-6" />
                                  </div>
                                  <div>
                                    <p className="text-sm font-bold text-nuanu-navy uppercase tracking-widest">Waiting for {currentRole} Approval</p>
                                    <p className="text-xs text-nuanu-gray-400 mt-1">You can approve this requisition once the {currentRole} step is completed.</p>
                                  </div>
                                </div>
                              ) : (
                                <div className="flex flex-col gap-4">
                                  <label className="text-xs font-bold text-nuanu-gray-400 uppercase tracking-widest">Approval Comments</label>
                                  <textarea value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Enter your comments here..." className="input-field min-h-[100px] resize-none" />
                                  <div className="flex justify-end gap-3">
                                    <button onClick={() => handleAction(req.id, "reject")} disabled={actionLoading === req.id} className="btn-secondary !text-nuanu-error hover:!bg-red-50">
                                      <X className="w-4 h-4" /> Reject
                                    </button>
                                    <button onClick={() => handleAction(req.id, "approve")} disabled={actionLoading === req.id} className="btn-primary">
                                      {actionLoading === req.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Approve Now
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
