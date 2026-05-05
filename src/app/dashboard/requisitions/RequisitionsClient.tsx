"use client";

import { useState, useEffect } from "react";
import { Check, X, FileText, Search, Filter, Loader2, AlertCircle, Clock, Eye, Plus, RefreshCw, Building } from "lucide-react";
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
    title: string;
    code: string;
    department: { name: string };
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

  // Summary Metrics
  const stats = {
    total: requisitions.length,
    pending: requisitions.filter(r => r.status === "PENDING").length,
    approved: requisitions.filter(r => r.status === "APPROVED").length,
    rejected: requisitions.filter(r => r.status === "REJECTED").length,
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

      let data;
      try {
        data = await res.json();
      } catch (e) {
        console.error("Non-JSON response:", e);
        throw new Error("Server returned an invalid response");
      }

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
            className="p-3 bg-white border border-nuanu-gray-200 rounded-xl hover:bg-nuanu-gray-50 text-nuanu-gray-400 transition-all"
            title="Refresh List"
          >
            <RefreshCw className={`w-5 h-5 ${loading ? "animate-spin" : ""}`} />
          </button>
          <Link href="/dashboard/jobs/create" className="btn-primary shadow-lg shadow-emerald-500/20">
            <Plus className="w-5 h-5" /> Create New Requisition
          </Link>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6 mb-10">
        {[
          { label: "Total Requests", value: stats.total, icon: FileText, color: "emerald", bg: "bg-emerald-50" },
          { label: "Pending Approval", value: stats.pending, icon: Clock, color: "amber", bg: "bg-amber-50" },
          { label: "Fully Approved", value: stats.approved, icon: Check, color: "emerald", bg: "bg-emerald-50" },
          { label: "Rejected", value: stats.rejected, icon: X, color: "red", bg: "bg-red-50" },
        ].map((stat, i) => (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            key={stat.label}
            className={`flex flex-col items-center justify-center p-8 rounded-3xl ${stat.bg} border border-nuanu-gray-100 shadow-sm min-w-[180px] transition-all hover:shadow-md`}
          >
            <div className="w-14 h-14 rounded-2xl bg-white flex items-center justify-center mb-4 shadow-sm">
              <stat.icon className={`w-7 h-7 text-nuanu-${stat.color}`} />
            </div>
            <p className="text-[12px] font-bold text-nuanu-gray-500 uppercase tracking-widest mb-2 text-center whitespace-nowrap">
              {stat.label}
            </p>
            <p className="text-4xl font-black text-nuanu-navy text-center">
              {stat.value}
            </p>
          </motion.div>
        ))}
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1 group">
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-nuanu-gray-400 group-focus-within:text-emerald-500 transition-colors pointer-events-none z-10">
            <Search className="w-5 h-5" />
          </div>
          <input 
            type="text" 
            placeholder="Search by job title or code..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-field !pl-14 h-12 shadow-sm focus:shadow-emerald-500/5 transition-all"
          />
        </div>
        
        <div className="flex items-center gap-3 bg-white p-1.5 rounded-xl border border-nuanu-gray-200 shadow-sm">
          {["all", "pending", "approved", "rejected"].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
                filter === f 
                ? "bg-nuanu-navy text-white shadow-md shadow-nuanu-navy/20" 
                : "text-nuanu-gray-400 hover:text-nuanu-navy hover:bg-nuanu-gray-50"
              }`}
            >
              {f}
            </button>
          ))}
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
           <p className="text-nuanu-gray-500 mt-2 max-w-md mx-auto">There are no job requests matching your current filter. New requests will appear here for review.</p>
        </div>
      ) : (
        <div className="grid gap-6">
          {filtered.map((req) => (
            <motion.div 
              layout
              key={req.id}
              className={`card !p-0 overflow-hidden border-l-4 transition-all ${
                req.status === "APPROVED" ? "border-l-nuanu-emerald" : 
                req.status === "REJECTED" ? "border-l-nuanu-error" : 
                "border-l-nuanu-warning"
              }`}
            >
              <div className="p-8 md:p-10">
                <div className="flex flex-col md:flex-row justify-between gap-8">
                  <div className="flex gap-6">
                    <div className={`w-16 h-16 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-sm ${
                       req.status === "APPROVED" ? "bg-emerald-50 text-nuanu-emerald" : 
                       req.status === "REJECTED" ? "bg-red-50 text-nuanu-error" : 
                       "bg-amber-50 text-nuanu-warning"
                    }`}>
                      <FileText className="w-7 h-7" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-3 mb-1.5 flex-wrap">
                        <h3 className="text-xl font-bold text-nuanu-navy truncate">{req.vacancy.title}</h3>
                        <span className="text-xs font-mono font-bold bg-nuanu-gray-100 text-nuanu-gray-500 px-2 py-0.5 rounded">
                          #{req.vacancy.code}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-nuanu-gray-500 font-medium">
                        <span className="font-semibold text-nuanu-navy">{req.vacancy.department?.name || "No Department"}</span>
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
                    <div className="flex items-center gap-2">
                      <Link 
                        href={`/careers/${req.vacancyId}`} 
                        target="_blank"
                        className="p-2.5 rounded-xl text-nuanu-gray-400 hover:text-nuanu-emerald hover:bg-emerald-50 transition-all hover:scale-110"
                        title="Preview Job Page"
                      >
                        <Eye className="w-5 h-5" />
                      </Link>
                    </div>
                  </div>
                </div>
                
                <div className="mt-6 flex justify-end">
                  <button 
                    onClick={() => setSelectedId(selectedId === req.id ? null : req.id)}
                    className="text-xs font-bold text-nuanu-emerald hover:underline"
                  >
                    {selectedId === req.id ? "Hide Timeline" : "View Approval Flow"}
                  </button>
                </div>
              </div>

              <AnimatePresence>
                {selectedId === req.id && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden bg-nuanu-gray-50/50 border-t border-nuanu-gray-100"
                  >
                    <div className="p-8 md:p-10">
                      <ApprovalTimeline steps={req.approvals} />
                      
                      {req.status === "PENDING" && (
                        <div className="mt-8 bg-white p-6 rounded-2xl border border-nuanu-gray-100 shadow-sm">
                          <div className="flex flex-col gap-4">
                            <label className="text-xs font-bold text-nuanu-gray-400 uppercase tracking-widest">
                              Approval Comments / Reason for rejection
                            </label>
                            <textarea
                              value={comment}
                              onChange={(e) => setComment(e.target.value)}
                              placeholder="Enter your comments here..."
                              className="input-field min-h-[100px] resize-none"
                            />
                            <div className="flex justify-end gap-3">
                              <button
                                onClick={() => handleAction(req.id, "reject")}
                                disabled={actionLoading === req.id}
                                className="btn-secondary !text-nuanu-error !border-nuanu-error/20 hover:!bg-red-50"
                              >
                                {actionLoading === req.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />}
                                Reject Requisition
                              </button>
                              <button
                                onClick={() => handleAction(req.id, "approve")}
                                disabled={actionLoading === req.id}
                                className="btn-primary"
                              >
                                {actionLoading === req.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                                Approve Requisition
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
