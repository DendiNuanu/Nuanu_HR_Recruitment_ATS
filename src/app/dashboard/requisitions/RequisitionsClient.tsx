"use client";

import { useState, useEffect } from "react";
import { Check, X, FileText, Search, Loader2, Clock, Eye, Plus, RefreshCw, Lock, Trash2, Send, AlertCircle, ChevronRight, Briefcase, Building2, Layers, Target, GraduationCap, Award, ListChecks } from "lucide-react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import ApprovalTimeline from "@/components/requisitions/ApprovalTimeline";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import Portal from "@/components/ui/Portal";

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

export default function RequisitionsClient({ initialUser, departments }: { initialUser: any, departments: any[] }) {
  const [requisitions, setRequisitions] = useState<Requisition[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [comment, setComment] = useState("");

  // New Requisition Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    departmentId: "",
    positionLevel: "Mid-Level",
    employmentType: "Full-Time",
    salaryMin: "",
    salaryMax: "",
    justificationType: "New Position",
    replacing: "",
    businessNeed: "",
    responsibilities: ["", ""],
    education: "",
    experienceYears: "0",
    requiredSkills: [""],
    certifications: "",
  });

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

  const handleCreateRequisition = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const res = await fetch("/api/requisition/create", {
        method: "POST",
        body: JSON.stringify({
          ...formData,
          userId: initialUser.id,
          isFullForm: true,
          responsibilities: formData.responsibilities.filter(r => r.trim() !== ""),
          requiredSkills: formData.requiredSkills.filter(s => s.trim() !== ""),
        }),
        headers: { "Content-Type": "application/json" }
      });

      const data = await res.json();

      if (data.success) {
        toast.success("Job Requisition submitted successfully!");
        setIsModalOpen(false);
        fetchRequisitions();
        // Reset form
        setFormData({
          title: "",
          departmentId: "",
          positionLevel: "Mid-Level",
          employmentType: "Full-Time",
          salaryMin: "",
          salaryMax: "",
          justificationType: "New Position",
          replacing: "",
          businessNeed: "",
          responsibilities: ["", ""],
          education: "",
          experienceYears: "0",
          requiredSkills: [""],
          certifications: "",
        });
      } else {
        toast.error(data.error || "Failed to submit requisition");
      }
    } catch (error) {
      toast.error("An unexpected error occurred");
    } finally {
      setIsSubmitting(false);
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
    <div className="pb-20 relative">
      <div className="space-y-8 animate-fade-in">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-4xl font-black text-nuanu-navy tracking-tight uppercase">Job Requisitions</h1>
          <p className="text-nuanu-gray-500 mt-1 font-semibold uppercase tracking-wider text-xs">Internal Position Creation & Approval Pipeline</p>
        </div>
        
        <div className="flex items-center gap-3">
          <button 
            onClick={() => { setLoading(true); fetchRequisitions(); }}
            className="p-4 bg-white border border-nuanu-gray-200 rounded-2xl hover:bg-nuanu-gray-50 text-nuanu-gray-400 transition-all shadow-sm active:scale-95"
          >
            <RefreshCw className={`w-5 h-5 ${loading ? "animate-spin" : ""}`} />
          </button>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="btn-primary py-4 px-8 rounded-2xl shadow-2xl shadow-emerald-500/20 text-sm font-black uppercase tracking-widest"
          >
            <Plus className="w-5 h-5" /> New Requisition
          </button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 group">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-6 h-6 text-nuanu-gray-400 group-focus-within:text-nuanu-emerald transition-colors" />
          <input 
            type="text" 
            placeholder="SEARCH BY TITLE OR CODE..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-field !pl-14 h-16 bg-white border-nuanu-gray-200 focus:border-nuanu-emerald focus:ring-8 focus:ring-emerald-500/5 transition-all font-bold uppercase placeholder:text-nuanu-gray-300"
          />
        </div>
        <div className="flex items-center gap-2 bg-white p-1.5 border border-nuanu-gray-200 rounded-2xl shadow-sm">
          {["all", "pending", "approved", "rejected"].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all ${
                filter === f 
                  ? "bg-nuanu-navy text-white shadow-xl scale-[1.05]" 
                  : "text-nuanu-gray-400 hover:text-nuanu-navy hover:bg-nuanu-gray-50"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-40 space-y-6">
          <Loader2 className="w-16 h-16 text-nuanu-emerald animate-spin" />
          <p className="text-nuanu-gray-400 font-black animate-pulse uppercase tracking-[0.3em] text-[10px]">Synchronizing Pipeline...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-[3rem] border border-nuanu-gray-200 p-32 text-center shadow-sm">
           <div className="w-28 h-28 bg-nuanu-gray-50 rounded-[2rem] flex items-center justify-center mx-auto mb-10 shadow-inner">
              <FileText className="w-14 h-14 text-nuanu-gray-200" />
           </div>
           <h3 className="text-3xl font-black text-nuanu-navy uppercase tracking-tight">No Active Requisitions</h3>
           <p className="text-nuanu-gray-400 mt-4 max-w-sm mx-auto font-bold uppercase tracking-widest text-xs">Initiate a requisition to begin the recruitment process.</p>
           <button onClick={() => setIsModalOpen(true)} className="btn-secondary mt-12 font-black border-2 px-12 py-5 rounded-2xl uppercase tracking-widest text-xs">
             Create First Request
           </button>
        </div>
      ) : (
        <div className="grid gap-8">
          {filtered.map((req) => {
            const roleOrder = ["MANAGER", "HR", "FINANCE"];
            const currentRole = roleOrder[req.currentStep - 1];
            const currentApproval = req.approvals.find(a => a.role === currentRole && a.status === "PENDING");
            const isMyTurn = isSuperAdmin || (currentApproval?.approverId === initialUser.id);

            return (
              <motion.div layout key={req.id} className="group bg-white rounded-3xl border border-nuanu-gray-200 overflow-hidden transition-all shadow-sm hover:shadow-[0_40px_80px_rgba(10,22,40,0.08)] hover:border-nuanu-emerald/40">
                <div className="p-6 md:p-8">
                  <div className="flex flex-col lg:flex-row justify-between gap-6">
                    <div className="flex gap-6 items-start">
                      <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-nuanu-emerald flex items-center justify-center flex-shrink-0 shadow-sm group-hover:scale-110 transition-transform duration-700">
                        <Briefcase className="w-8 h-8" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-4 mb-2 flex-wrap">
                          <h3 className="text-xl font-black text-nuanu-navy tracking-tight truncate">{req.vacancy.title}</h3>
                          <span className="text-[10px] font-black bg-nuanu-navy text-white px-3 py-1 rounded-full uppercase tracking-[0.2em] shadow-lg shadow-nuanu-navy/20">#{req.vacancy.code}</span>
                        </div>
                        <div className="flex flex-wrap items-center gap-6 text-xs text-nuanu-gray-500 font-black uppercase tracking-widest">
                          <div className="flex items-center gap-2">
                            <Building2 className="w-4 h-4 text-nuanu-emerald" />
                            <span className="text-nuanu-navy">{req.vacancy.department.name}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <Clock className="w-5 h-5 text-nuanu-gray-300" />
                            <span>{formatDistanceToNow(new Date(req.createdAt), { addSuffix: true })}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-5 flex-shrink-0">
                      <span className={`px-8 py-3 rounded-full text-[11px] font-black uppercase tracking-[0.3em] shadow-xl border-2 transition-all ${
                        req.status === "APPROVED" ? "bg-emerald-500 text-white border-emerald-400 shadow-emerald-500/20" :
                        req.status === "REJECTED" ? "bg-red-500 text-white border-red-400 shadow-red-500/20" :
                        "bg-amber-500 text-white border-amber-400 shadow-amber-500/20"
                      }`}>
                        {req.status}
                      </span>
                      <button onClick={() => setSelectedId(selectedId === req.id ? null : req.id)} className="flex items-center gap-3 text-xs font-black text-nuanu-emerald hover:text-nuanu-navy transition-all group/btn uppercase tracking-[0.2em] bg-nuanu-gray-50/50 px-6 py-3 rounded-xl border border-transparent hover:border-nuanu-emerald/20">
                        {selectedId === req.id ? "HIDE DETAILS" : "VIEW PIPELINE"}
                        <ChevronRight className={`w-5 h-5 transition-transform duration-500 ${selectedId === req.id ? "rotate-90" : "group-hover/btn:translate-x-1"}`} />
                      </button>
                    </div>
                  </div>
                </div>

                <AnimatePresence>
                  {selectedId === req.id && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden bg-nuanu-gray-50/40 border-t border-nuanu-gray-100">
                      <div className="p-8 md:p-10">
                        <div className="mb-10">
                          <h4 className="text-[10px] font-black text-nuanu-gray-400 uppercase tracking-[0.4em] mb-8 text-center">Approval Governance Chain</h4>
                          <ApprovalTimeline steps={req.approvals} />
                        </div>
                        
                        <div className="mt-10 w-full px-4">
                          {req.status === "PENDING" && (
                            <div className="bg-white p-8 rounded-[2.5rem] border border-nuanu-gray-200 shadow-[0_50px_100px_rgba(10,22,40,0.1)] ring-1 ring-black/5 w-full">
                              {!isMyTurn ? (
                                <div className="flex flex-col items-center justify-center py-16 text-center space-y-6">
                                  <div className="w-20 h-20 rounded-[2rem] bg-nuanu-gray-50 flex items-center justify-center text-nuanu-gray-200 border border-nuanu-gray-100 shadow-inner">
                                    <Lock className="w-10 h-10" />
                                  </div>
                                  <div>
                                    <p className="text-lg font-black text-nuanu-navy uppercase tracking-[0.3em]">Phase Restricted</p>
                                    <p className="text-sm text-nuanu-gray-400 mt-3 max-w-xs mx-auto font-bold uppercase tracking-widest leading-loose">Waiting for <span className="text-nuanu-emerald">{currentRole}</span> to complete their review.</p>
                                  </div>
                                </div>
                              ) : (
                                <div className="space-y-10">
                                  <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-xl bg-nuanu-emerald text-white flex items-center justify-center shadow-xl shadow-emerald-500/20">
                                      <Check className="w-5 h-5" />
                                    </div>
                                    <div>
                                      <h4 className="text-base font-black text-nuanu-navy uppercase tracking-tight">Your Decision Required</h4>
                                      <p className="text-[9px] font-bold text-nuanu-gray-400 uppercase tracking-widest mt-1">Review the requisition and provide final feedback</p>
                                    </div>
                                  </div>
                                  
                                  <div className="space-y-3">
                                    <label className="text-[9px] font-black text-nuanu-gray-400 uppercase tracking-[0.2em] block ml-1">Decision Rationale</label>
                                    <textarea 
                                      value={comment} 
                                      onChange={(e) => setComment(e.target.value)} 
                                      placeholder="State your reasons for approval or rejection in detail..." 
                                      className="input-field min-h-[100px] resize-none !rounded-2xl p-5 text-sm font-medium placeholder:text-nuanu-gray-300 leading-relaxed bg-nuanu-gray-50/30 border-nuanu-gray-200 focus:bg-white" 
                                    />
                                  </div>

                                  <div className="flex justify-end gap-4 pt-4">
                                    <button 
                                      onClick={() => handleAction(req.id, "reject")} 
                                      disabled={actionLoading === req.id} 
                                      className="btn-secondary !text-red-600 hover:!bg-red-50 !border-red-100 font-black px-8 py-4 rounded-xl active:scale-95 transition-all disabled:opacity-50 uppercase tracking-[0.15em] text-[10px]"
                                    >
                                      {actionLoading === req.id ? <Loader2 className="w-5 h-5 animate-spin" /> : <X className="w-5 h-5" />} Reject Request
                                    </button>
                                    <button 
                                      onClick={() => handleAction(req.id, "approve")} 
                                      disabled={actionLoading === req.id} 
                                      className="btn-primary font-black px-12 py-4 rounded-xl shadow-[0_20px_40px_rgba(16,185,129,0.3)] active:scale-95 transition-all disabled:opacity-50 uppercase tracking-[0.15em] text-[10px]"
                                    >
                                      {actionLoading === req.id ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" />} Approve Now
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}

                          {req.status !== "PENDING" && (
                            <div className={`p-12 rounded-[3rem] border-2 text-center shadow-inner ${req.status === "APPROVED" ? "bg-emerald-50/50 border-emerald-100" : "bg-red-50/50 border-red-100"}`}>
                               <p className={`text-sm font-black uppercase tracking-[0.4em] ${req.status === "APPROVED" ? "text-emerald-700" : "text-red-700"}`}>
                                 PROCESS CONCLUDED: {req.status}
                               </p>
                               <p className="text-nuanu-gray-500 mt-4 font-bold uppercase tracking-widest text-[10px]">This requisition cycle is now archived.</p>
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
      </div>

      {/* NEW REQUISITION MODAL - ATS PRO EDITION */}
      <Portal>
        <AnimatePresence>
          {isModalOpen && (
            <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 md:p-8 overflow-hidden bg-nuanu-navy/90 backdrop-blur-2xl transition-all duration-700">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 cursor-zoom-out"
              onClick={() => !isSubmitting && setIsModalOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 100 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 100 }}
              className="bg-white rounded-[3rem] shadow-[0_0_0_1px_rgba(255,255,255,0.1),0_80px_160px_-40px_rgba(0,0,0,0.6)] w-full !max-w-7xl relative z-10 h-[92vh] flex flex-col overflow-hidden transition-all duration-700 border border-white/10"
            >
              {/* Pro Header - Dark, Sharp, Clean */}
              <div className="bg-nuanu-navy px-12 py-12 text-white flex justify-between items-center flex-shrink-0 border-b border-white/5 relative overflow-hidden">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(16,185,129,0.15),transparent_70%)] pointer-events-none" />
                <div className="relative z-10 flex items-center gap-8">
                  <div className="w-16 h-16 rounded-2xl bg-nuanu-emerald flex items-center justify-center shadow-[0_20px_50px_rgba(16,185,129,0.5)] ring-4 ring-nuanu-emerald/10">
                    <FileText className="w-8 h-8 text-white" />
                  </div>
                  <div>
                    <h2 className="text-3xl font-black tracking-tighter leading-none mb-3">JOB REQUISITION</h2>
                    <div className="flex items-center gap-4 text-nuanu-gray-400 font-black uppercase tracking-[0.4em] text-[8px]">
                      <span className="text-nuanu-emerald">INTERNAL REQUEST</span>
                      <div className="w-1.5 h-1.5 rounded-full bg-white/20" />
                      <span>STRATEGIC ALIGNMENT</span>
                      <div className="w-1.5 h-1.5 rounded-full bg-white/20" />
                      <span>{initialUser.roles?.[0] || "ADMIN"} PANEL</span>
                    </div>
                  </div>
                </div>
                <button 
                  onClick={() => setIsModalOpen(false)}
                  disabled={isSubmitting}
                  className="w-14 h-14 bg-white/5 hover:bg-white/10 rounded-2xl transition-all relative z-10 border border-white/10 flex items-center justify-center group active:scale-90"
                >
                  <X className="w-8 h-8 text-white group-hover:rotate-90 transition-transform duration-500" />
                </button>
              </div>

              {/* Pro Form Content - Multi-section vertical flow */}
              <div className="flex-1 overflow-y-auto p-12 md:p-16 space-y-16 custom-scrollbar bg-white w-full">
                <form id="reqForm" onSubmit={handleCreateRequisition} className="space-y-20 w-full max-w-[1200px] mx-auto">
                  
                  {/* Section 1: Core Details */}
                  <div className="space-y-6">
                    <div className="flex items-center justify-between border-b-2 border-nuanu-gray-50 pb-4">
                      <div className="flex items-center gap-4">
                        <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-black text-sm shadow-[0_10px_25px_rgba(79,70,229,0.3)]">01</div>
                        <h3 className="text-lg font-black text-nuanu-navy tracking-tight uppercase">Strategic Position Info</h3>
                      </div>
                      <span className="text-[8px] font-black text-nuanu-gray-300 uppercase tracking-[0.5em]">Phase One</span>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-[9px] font-black text-nuanu-gray-400 uppercase tracking-[0.25em] block ml-1">Proposed Job Title <span className="text-nuanu-emerald font-black">*</span></label>
                        <div className="relative group">
                          <Briefcase className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-nuanu-gray-300 group-focus-within:text-nuanu-emerald transition-colors" />
                          <input 
                            required type="text" placeholder="e.g. HEAD OF GROWTH DESIGN" 
                            value={formData.title} onChange={(e) => setFormData({...formData, title: e.target.value})}
                            className="input-field !pl-10 !h-12 !text-sm font-bold uppercase bg-nuanu-gray-50/30 border-nuanu-gray-200 focus:bg-white focus:border-nuanu-emerald focus:ring-8 focus:ring-emerald-500/5 placeholder:text-nuanu-gray-200"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-[9px] font-black text-nuanu-gray-400 uppercase tracking-[0.25em] block ml-1">Target Department <span className="text-nuanu-emerald font-black">*</span></label>
                        <div className="relative group">
                          <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-nuanu-gray-300 group-focus-within:text-nuanu-emerald transition-colors" />
                          <select 
                            required value={formData.departmentId} onChange={(e) => setFormData({...formData, departmentId: e.target.value})}
                            className="input-field !pl-10 !h-12 !text-sm font-bold uppercase appearance-none bg-nuanu-gray-50/30 border-nuanu-gray-200 focus:bg-white focus:border-nuanu-emerald focus:ring-8 focus:ring-emerald-500/5"
                          >
                            <option value="">SELECT DEPARTMENT</option>
                            {departments.map(d => <option key={d.id} value={d.id}>{d.name.toUpperCase()}</option>)}
                          </select>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-[9px] font-black text-nuanu-gray-400 uppercase tracking-[0.25em] block ml-1">Hierarchy Level</label>
                        <div className="relative group">
                          <Layers className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-nuanu-gray-300 group-focus-within:text-nuanu-emerald transition-colors" />
                          <select 
                            value={formData.positionLevel} onChange={(e) => setFormData({...formData, positionLevel: e.target.value})}
                            className="input-field !pl-10 !h-12 !text-sm font-bold uppercase appearance-none bg-nuanu-gray-50/30 border-nuanu-gray-200 focus:bg-white focus:border-nuanu-emerald focus:ring-8 focus:ring-emerald-500/5"
                          >
                            <option>JUNIOR</option>
                            <option>MID-LEVEL</option>
                            <option>SENIOR</option>
                            <option>LEAD / MANAGER</option>
                            <option>EXECUTIVE</option>
                          </select>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-[9px] font-black text-nuanu-gray-400 uppercase tracking-[0.25em] block ml-1">Engagement Type</label>
                        <div className="flex gap-2 h-12">
                          {["Full-Time", "Part-Time", "Contract", "Temporary"].map(type => (
                            <button
                              key={type} type="button" onClick={() => setFormData({...formData, employmentType: type})}
                              className={`flex-1 rounded-xl text-[8px] font-black uppercase tracking-[0.1em] border-2 transition-all duration-300 ${
                                formData.employmentType === type ? "bg-nuanu-navy text-white border-nuanu-navy shadow-lg scale-[1.02] z-10" : "bg-white text-nuanu-gray-400 border-nuanu-gray-100 hover:border-nuanu-navy/20"
                              }`}
                            >
                              {type}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-2 md:col-span-2">
                        <label className="text-[9px] font-black text-nuanu-gray-400 uppercase tracking-[0.25em] block ml-1">Budget Allocation (IDR Monthly)</label>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="relative group">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-nuanu-gray-300 text-base group-focus-within:text-nuanu-emerald transition-colors">Rp</span>
                            <input 
                              type="number" placeholder="MINIMUM" 
                              value={formData.salaryMin} onChange={(e) => setFormData({...formData, salaryMin: e.target.value})}
                              className="input-field !pl-10 !h-12 !text-sm font-black bg-nuanu-gray-50/30 border-nuanu-gray-200 focus:bg-white focus:ring-8 focus:ring-emerald-500/5"
                            />
                          </div>
                          <div className="relative group">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-nuanu-gray-300 text-base group-focus-within:text-nuanu-emerald transition-colors">Rp</span>
                            <input 
                              type="number" placeholder="MAXIMUM" 
                              value={formData.salaryMax} onChange={(e) => setFormData({...formData, salaryMax: e.target.value})}
                              className="input-field !pl-10 !h-12 !text-sm font-black bg-nuanu-gray-50/30 border-nuanu-gray-200 focus:bg-white focus:ring-8 focus:ring-emerald-500/5"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Section 2: Justification */}
                  <div className="space-y-6">
                    <div className="flex items-center justify-between border-b-2 border-nuanu-gray-50 pb-4">
                      <div className="flex items-center gap-4">
                        <div className="w-8 h-8 rounded-lg bg-amber-500 text-white flex items-center justify-center font-black text-sm shadow-[0_10px_25px_rgba(245,158,11,0.3)]">02</div>
                        <h3 className="text-lg font-black text-nuanu-navy tracking-tight uppercase">Strategic Justification</h3>
                      </div>
                      <span className="text-[8px] font-black text-nuanu-gray-300 uppercase tracking-[0.5em]">Phase Two</span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-[9px] font-black text-nuanu-gray-400 uppercase tracking-[0.25em] block ml-1">Request Driver</label>
                        <div className="flex gap-2 h-12">
                          {["New Position", "Replacement", "Expansion"].map(type => (
                            <button
                              key={type} type="button" onClick={() => setFormData({...formData, justificationType: type})}
                              className={`flex-1 rounded-xl text-[8px] font-black uppercase tracking-[0.1em] border-2 transition-all duration-300 ${
                                formData.justificationType === type ? "bg-nuanu-navy text-white border-nuanu-navy shadow-lg scale-[1.02] z-10" : "bg-white text-nuanu-gray-400 border-nuanu-gray-100 hover:border-nuanu-navy/20"
                              }`}
                            >
                              {type}
                            </button>
                          ))}
                        </div>
                      </div>

                      {formData.justificationType === "Replacement" && (
                        <div className="space-y-2 animate-in fade-in slide-in-from-top-4 duration-500">
                          <label className="text-[9px] font-black text-nuanu-gray-400 uppercase tracking-[0.25em] block ml-1">Legacy Personnel Name</label>
                          <input 
                            type="text" placeholder="WHO ARE WE REPLACING?" 
                            value={formData.replacing} onChange={(e) => setFormData({...formData, replacing: e.target.value})}
                            className="input-field !h-12 !text-sm font-bold uppercase bg-nuanu-gray-50/30 border-nuanu-gray-200 focus:bg-white"
                          />
                        </div>
                      )}

                      <div className="space-y-2 md:col-span-2">
                        <label className="text-[9px] font-black text-nuanu-gray-400 uppercase tracking-[0.25em] block ml-1">Business Impact & Justification <span className="text-nuanu-emerald font-black">*</span></label>
                        <textarea 
                          required placeholder="ELABORATE ON THE SPECIFIC BUSINESS NEED, PROJECT SCOPE, OR DEPARTMENTAL GAP THIS ROLE WILL ADDRESS..." 
                          value={formData.businessNeed} onChange={(e) => setFormData({...formData, businessNeed: e.target.value})}
                          className="input-field min-h-[100px] !text-sm p-5 font-bold uppercase bg-nuanu-gray-50/30 border-nuanu-gray-200 focus:bg-white focus:border-nuanu-emerald focus:ring-8 focus:ring-emerald-500/5 resize-none leading-relaxed placeholder:text-nuanu-gray-200"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Section 3: Responsibilities */}
                  <div className="space-y-6">
                    <div className="flex items-center justify-between border-b-2 border-nuanu-gray-50 pb-4">
                      <div className="flex items-center gap-4">
                        <div className="w-8 h-8 rounded-lg bg-nuanu-emerald text-white flex items-center justify-center font-black text-sm shadow-[0_10px_25px_rgba(16,185,129,0.3)]">03</div>
                        <h3 className="text-lg font-black text-nuanu-navy tracking-tight uppercase">Operational Scope</h3>
                      </div>
                      <span className="text-[8px] font-black text-nuanu-gray-300 uppercase tracking-[0.5em]">Phase Three</span>
                    </div>

                    <div className="space-y-3">
                      {formData.responsibilities.map((resp, index) => (
                        <div key={index} className="flex gap-4 animate-in fade-in slide-in-from-left-6 duration-500" style={{ animationDelay: `${index * 80}ms` }}>
                          <div className="flex-1 relative group">
                            <Target className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-nuanu-gray-300 group-focus-within:text-nuanu-emerald transition-colors" />
                            <input 
                              type="text" placeholder={`KEY RESPONSIBILITY PILLAR ${index + 1}`} 
                              value={resp} onChange={(e) => {
                                const newResp = [...formData.responsibilities];
                                newResp[index] = e.target.value;
                                setFormData({...formData, responsibilities: newResp});
                              }}
                              className="input-field !pl-10 !h-12 !text-sm font-bold uppercase bg-nuanu-gray-50/30 border-nuanu-gray-200 focus:bg-white"
                            />
                          </div>
                          {formData.responsibilities.length > 1 && (
                            <button 
                              type="button" onClick={() => {
                                const newResp = formData.responsibilities.filter((_, i) => i !== index);
                                setFormData({...formData, responsibilities: newResp});
                              }}
                              className="w-14 h-14 flex items-center justify-center text-red-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all border border-transparent hover:border-red-100 group shadow-sm active:scale-90"
                            >
                              <Trash2 className="w-5 h-5 group-hover:scale-110 transition-transform" />
                            </button>
                          )}
                        </div>
                      ))}
                      <button 
                        type="button" onClick={() => setFormData({...formData, responsibilities: [...formData.responsibilities, ""]})}
                        className="flex items-center gap-2 text-[9px] font-black text-nuanu-emerald hover:text-white hover:bg-nuanu-emerald transition-all px-6 h-10 rounded-lg border-2 border-dashed border-nuanu-emerald/30 w-fit uppercase tracking-[0.2em] shadow-sm active:scale-95"
                      >
                        <Plus className="w-4 h-4" /> Append Another Pillar
                      </button>
                    </div>
                  </div>

                  {/* Section 4: Qualifications */}
                  <div className="space-y-6">
                    <div className="flex items-center justify-between border-b-2 border-nuanu-gray-50 pb-4">
                      <div className="flex items-center gap-4">
                        <div className="w-8 h-8 rounded-lg bg-purple-600 text-white flex items-center justify-center font-black text-sm shadow-[0_10px_25px_rgba(147,51,234,0.3)]">04</div>
                        <h3 className="text-lg font-black text-nuanu-navy tracking-tight uppercase">Talent Matrix</h3>
                      </div>
                      <span className="text-[8px] font-black text-nuanu-gray-300 uppercase tracking-[0.5em]">Phase Four</span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-[9px] font-black text-nuanu-gray-400 uppercase tracking-[0.25em] block ml-1">Benchmark Education <span className="text-nuanu-emerald font-black">*</span></label>
                        <div className="relative group">
                          <GraduationCap className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-nuanu-gray-300 group-focus-within:text-nuanu-emerald transition-colors" />
                          <input 
                            required type="text" placeholder="e.g. BACHELOR'S IN COMPUTER SCIENCE" 
                            value={formData.education} onChange={(e) => setFormData({...formData, education: e.target.value})}
                            className="input-field !pl-10 !h-12 !text-sm font-bold uppercase bg-nuanu-gray-50/30 border-nuanu-gray-200 focus:bg-white"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-[9px] font-black text-nuanu-gray-400 uppercase tracking-[0.25em] block ml-1">Exp. Baseline (Years) <span className="text-nuanu-emerald font-black">*</span></label>
                        <div className="relative group">
                          <Clock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-nuanu-gray-300 group-focus-within:text-nuanu-emerald transition-colors" />
                          <input 
                            required type="number" placeholder="0" 
                            value={formData.experienceYears} onChange={(e) => setFormData({...formData, experienceYears: e.target.value})}
                            className="input-field !pl-10 !h-12 !text-sm font-black bg-nuanu-gray-50/30 border-nuanu-gray-200 focus:bg-white focus:ring-8 focus:ring-emerald-500/5"
                          />
                        </div>
                      </div>

                      <div className="space-y-4 md:col-span-2">
                        <label className="text-[9px] font-black text-nuanu-gray-400 uppercase tracking-[0.25em] block ml-1">Mandatory Technical Stack <span className="text-nuanu-emerald font-black">*</span></label>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {formData.requiredSkills.map((skill, index) => (
                            <div key={index} className="flex gap-2 animate-in fade-in slide-in-from-right-6 duration-500">
                              <div className="flex-1 relative group">
                                <Award className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-nuanu-gray-300 group-focus-within:text-nuanu-emerald transition-colors" />
                                <input 
                                  required type="text" placeholder={`CRITICAL COMPETENCY ${index + 1}`} 
                                  value={skill} onChange={(e) => {
                                    const newSkills = [...formData.requiredSkills];
                                    newSkills[index] = e.target.value;
                                    setFormData({...formData, requiredSkills: newSkills});
                                  }}
                                  className="input-field !pl-10 !h-12 !text-sm font-bold uppercase bg-nuanu-gray-50/30 border-nuanu-gray-200 focus:bg-white"
                                />
                              </div>
                              {formData.requiredSkills.length > 1 && (
                                <button 
                                  type="button" onClick={() => {
                                    const newSkills = formData.requiredSkills.filter((_, i) => i !== index);
                                    setFormData({...formData, requiredSkills: newSkills});
                                  }}
                                  className="w-14 h-14 flex items-center justify-center text-red-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all border border-transparent hover:border-red-100 active:scale-90"
                                >
                                  <X className="w-5 h-5" />
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                        <button 
                          type="button" onClick={() => setFormData({...formData, requiredSkills: [...formData.requiredSkills, ""]})}
                          className="flex items-center gap-2 text-[9px] font-black text-nuanu-emerald hover:text-white hover:bg-nuanu-emerald transition-all px-6 h-10 rounded-lg border-2 border-dashed border-nuanu-emerald/30 w-fit uppercase tracking-[0.2em] shadow-sm active:scale-95"
                        >
                          <Plus className="w-4 h-4" /> Append Skillset
                        </button>
                      </div>

                      <div className="space-y-2 md:col-span-2">
                        <label className="text-[9px] font-black text-nuanu-gray-400 uppercase tracking-[0.25em] block ml-1">Professional Certifications</label>
                        <div className="relative group">
                          <ListChecks className="absolute left-4 top-4 w-4 h-4 text-nuanu-gray-300 group-focus-within:text-nuanu-emerald transition-colors" />
                          <textarea 
                            placeholder="LIST ALL NECESSARY PROFESSIONAL ACCREDITATIONS (e.g. AWS, PMP, CPA)..." 
                            value={formData.certifications} onChange={(e) => setFormData({...formData, certifications: e.target.value})}
                            className="input-field !pl-10 min-h-[60px] !text-sm p-4 font-bold uppercase bg-nuanu-gray-50/30 border-nuanu-gray-200 focus:bg-white focus:border-nuanu-emerald focus:ring-8 focus:ring-emerald-500/5 resize-none leading-relaxed placeholder:text-nuanu-gray-200"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Pro Policy Notice */}
                  <div className="bg-nuanu-navy text-white p-6 rounded-3xl shadow-xl flex flex-col md:flex-row gap-6 items-center relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:rotate-12 transition-transform duration-700">
                      <Lock className="w-24 h-24" />
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-white/10 text-nuanu-emerald flex items-center justify-center flex-shrink-0 border border-white/20 shadow-inner backdrop-blur-xl">
                      <AlertCircle className="w-6 h-6" />
                    </div>
                    <div className="flex-1 text-center md:text-left">
                      <p className="text-sm font-black uppercase tracking-[0.4em] mb-1">Governance Protocol</p>
                      <p className="text-[10px] text-nuanu-gray-300 leading-relaxed font-bold uppercase tracking-widest">SUBMISSION INITIATES A FORMAL GOVERNANCE WORKFLOW ACROSS <span className="text-white">MANAGEMENT</span>, <span className="text-white">HRBP</span>, AND <span className="text-white">FINANCE CONTROL</span>.</p>
                    </div>
                  </div>
                </form>
              </div>

              {/* Pro Footer - Fixed, Sharp, Clean */}
              <div className="px-10 py-8 border-t-2 border-nuanu-gray-50 flex justify-end items-center gap-6 bg-white flex-shrink-0 relative z-20">
                <button 
                  type="button" onClick={() => setIsModalOpen(false)}
                  disabled={isSubmitting}
                  className="px-6 py-4 font-black text-nuanu-gray-400 hover:text-nuanu-navy hover:bg-nuanu-gray-50 rounded-xl transition-all uppercase tracking-[0.4em] text-[8px] active:scale-95"
                >
                  Terminate Request
                </button>
                <button 
                  type="submit" form="reqForm"
                  disabled={isSubmitting}
                  className="btn-primary min-w-[240px] font-black rounded-xl py-5 shadow-lg active:scale-95 hover:scale-[1.02] transition-all flex items-center justify-center gap-3 disabled:opacity-70 text-sm uppercase tracking-[0.3em]"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" /> EXECUTING...
                    </>
                  ) : (
                    <>
                      <Send className="w-5 h-5" /> INITIATE REQUISITION
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
        </AnimatePresence>
      </Portal>
    </div>
  );
}
