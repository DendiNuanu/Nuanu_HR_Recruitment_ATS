"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, User, FileText, DollarSign, FileCheck, Monitor, History, Loader2, CheckCircle2, Clock, AlertCircle, Edit2, Download, ClipboardList } from "lucide-react";
import { toast } from "sonner";
import { formatDate } from "@/lib/utils";
import Link from "next/link";

interface EmployeeDetailModalProps {
  employeeId: string;
  onClose: () => void;
}

export default function EmployeeDetailModal({ employeeId, onClose }: EmployeeDetailModalProps) {
  const [activeTab, setActiveTab] = useState("profile");
  const [loading, setLoading] = useState(true);

  const [employee, setEmployee] = useState<any>(null);
  const [contract, setContract] = useState<any>(null);
  const [documents, setDocuments] = useState<any[]>([]);
  const [assets, setAssets] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [probationRecord, setProbationRecord] = useState<any>(null);

  // Edit Profile state
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editForm, setEditForm] = useState({ phone: "", department: "", position: "" });
  const [savingProfile, setSavingProfile] = useState(false);

  // Probation state
  const [showAddEval, setShowAddEval] = useState(false);
  const [evalForm, setEvalForm] = useState({ evaluated_by: "", score: "good", notes: "", recommendation: "continue" });

  useEffect(() => {
    fetchData();
  }, [employeeId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [empRes, contractRes, docsRes, assetsRes, historyRes, probRes] = await Promise.all([
        fetch(`/api/employees/${employeeId}`),
        fetch(`/api/employees/${employeeId}/contract`),
        fetch(`/api/employees/${employeeId}/documents`),
        fetch(`/api/employees/${employeeId}/assets`),
        fetch(`/api/employees/${employeeId}/history`),
        fetch(`/api/probation-records/${employeeId}`)
      ]);

      const empData = await empRes.json();
      const contractData = await contractRes.json();
      const docsData = await docsRes.json();
      const assetsData = await assetsRes.json();
      const historyData = await historyRes.json();
      const probData = await probRes.json();

      setEmployee(empData.employee);
      setEditForm({
        phone: empData.employee?.user?.phone || "",
        department: empData.employee?.department || "",
        position: empData.employee?.position || ""
      });
      setContract(contractData.contract);
      setDocuments(docsData.documents || []);
      setAssets(assetsData.assets || []);
      setHistory(historyData.events || []);
      setProbationRecord(probData.record);
    } catch (err) {
      toast.error("Failed to load employee details");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    setSavingProfile(true);
    try {
      const res = await fetch(`/api/employees/${employeeId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm)
      });
      if (res.ok) {
        toast.success("Profile updated");
        setIsEditingProfile(false);
        fetchData();
      } else {
        toast.error("Failed to update profile");
      }
    } catch (err) {
      toast.error("Error updating profile");
    } finally {
      setSavingProfile(false);
    }
  };

  // Logic for documents (Tab 4) - reusing verify logic
  const handleVerifyDoc = async (docId: string, status: string, rejectionReason = "") => {
    try {
      const res = await fetch(`/api/employee-documents/${docId}/verify`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, rejectionReason })
      });
      if (res.ok) {
        toast.success(status === "verified" ? "Document Verified" : "Document Rejected");
        fetchData();
      } else {
        toast.error("Failed to verify document");
      }
    } catch {
      toast.error("Error verifying document");
    }
  };

  // Logic for assets (Tab 5)
  const handleQuickAssetStatus = async (assetId: string, newStatus: "received" | "returned") => {
    try {
      const body: Record<string, any> = { status: newStatus };
      if (newStatus === "received") body.received_date = new Date().toISOString();
      if (newStatus === "returned") body.returned_date = new Date().toISOString();
      const res = await fetch(`/api/employee-assets/${assetId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        toast.success(newStatus === "received" ? "Marked as Received!" : "Marked as Returned!");
        fetchData();
      } else {
        toast.error("Failed to update status");
      }
    } catch {
      toast.error("An error occurred");
    }
  };

  const handleSaveEval = async () => {
    try {
      const res = await fetch(`/api/probation-evaluations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employee_id: employeeId,
          evaluation_date: new Date().toISOString(),
          evaluated_by: evalForm.evaluated_by,
          score: evalForm.score,
          notes: evalForm.notes,
          recommendation: evalForm.recommendation
        }),
      });
      if (res.ok) {
        toast.success("Evaluation saved");
        setShowAddEval(false);
        setEvalForm({ evaluated_by: "", score: "good", notes: "", recommendation: "continue" });
        fetchData();
      } else {
        toast.error("Failed to save evaluation");
      }
    } catch {
      toast.error("Error saving evaluation");
    }
  };

  const handleDecision = async (decision: string) => {
    let extend_months = null;
    let reason = null;

    if (decision === "extend") {
      const input = window.prompt("Extend by how many months? (1, 2, or 3)");
      if (!input || !["1", "2", "3"].includes(input)) {
        toast.error("Invalid extension months");
        return;
      }
      extend_months = parseInt(input);
    } else if (decision === "terminate") {
      reason = window.prompt("Reason for termination:");
      if (!reason) {
        toast.error("Reason is required");
        return;
      }
    } else if (decision === "pass") {
      if (!window.confirm(`Are you sure? This will mark ${employee?.user?.name} as a permanent employee.`)) return;
    }

    try {
      const res = await fetch(`/api/probation-records/${probationRecord?.id}/decision`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision, reason, extend_months })
      });
      if (res.ok) {
        toast.success("Probation decision updated");
        fetchData();
      } else {
        toast.error("Failed to update decision");
      }
    } catch {
      toast.error("Error updating decision");
    }
  };

  const tabs = [
    { id: "profile", label: "Profile", icon: User },
    { id: "contract", label: "Contract", icon: FileText },
    { id: "compensation", label: "Compensation", icon: DollarSign },
    { id: "documents", label: "Documents", icon: FileCheck },
    { id: "assets", label: "Assets", icon: Monitor },
    { id: "history", label: "History", icon: History }
  ];

  if (employee?.status === "probation" || probationRecord) {
    tabs.splice(1, 0, { id: "probation", label: "Probation", icon: ClipboardList });
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-nuanu-navy/40 backdrop-blur-sm">
      <motion.div
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ type: "spring", damping: 25, stiffness: 200 }}
        className="w-full max-w-4xl bg-gray-50 h-full shadow-2xl flex flex-col"
      >
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-4">
            <button onClick={onClose} className="p-2 -ml-2 rounded-full hover:bg-gray-100 text-gray-500 transition-colors">
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-xl font-bold text-nuanu-navy">Employee Details</h2>
          </div>
        </div>

        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
          </div>
        ) : !employee ? (
          <div className="flex-1 flex items-center justify-center text-gray-500">Employee not found</div>
        ) : (
          <div className="flex-1 overflow-y-auto">
            {/* Tabs Header */}
            <div className="bg-white border-b border-gray-200 px-6 pt-4 sticky top-0 z-10">
              <div className="flex items-center gap-6 overflow-x-auto hide-scrollbar">
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`flex items-center gap-2 pb-3 px-1 border-b-2 font-medium text-sm transition-colors whitespace-nowrap ${
                        activeTab === tab.id ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700"
                      }`}
                    >
                      <Icon className="w-4 h-4" /> {tab.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Tab Content */}
            <div className="p-6">
              {/* TAB 1: PROFILE */}
              {activeTab === "profile" && (
                <div className="space-y-6">
                  <div className="card flex items-start justify-between">
                    <div className="flex items-center gap-6">
                      <div className="w-20 h-20 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-2xl font-bold">
                        {employee.user.name.split(" ").map((n: string) => n[0]).join("").substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <h3 className="text-2xl font-bold text-nuanu-navy">{employee.user.name}</h3>
                        <p className="text-gray-500 mt-1">{employee.position} · {employee.department} · {employee.entity}</p>
                        <div className="flex items-center gap-3 mt-3">
                          <span className="badge bg-gray-100 text-gray-700 font-mono text-xs">{employee.employeeCode}</span>
                          <span className={`badge text-xs font-bold uppercase ${
                            employee.status === "active" ? "bg-emerald-100 text-emerald-700" :
                            employee.status === "probation" ? "bg-amber-100 text-amber-700" : "bg-gray-100 text-gray-600"
                          }`}>
                            {employee.status}
                          </span>
                        </div>
                      </div>
                    </div>
                    {!isEditingProfile && (
                      <button onClick={() => setIsEditingProfile(true)} className="btn-secondary text-sm gap-2">
                        <Edit2 className="w-4 h-4" /> Edit Profile
                      </button>
                    )}
                  </div>

                  {isEditingProfile && (
                    <div className="card">
                      <h4 className="font-bold text-nuanu-navy mb-4">Edit Profile Info</h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-semibold text-gray-600 mb-1">Phone</label>
                          <input type="text" value={editForm.phone} onChange={e => setEditForm(p => ({ ...p, phone: e.target.value }))} className="input-field" />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-gray-600 mb-1">Department</label>
                          <input type="text" value={editForm.department} onChange={e => setEditForm(p => ({ ...p, department: e.target.value }))} className="input-field" />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-gray-600 mb-1">Position</label>
                          <input type="text" value={editForm.position} onChange={e => setEditForm(p => ({ ...p, position: e.target.value }))} className="input-field" />
                        </div>
                      </div>
                      <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-gray-100">
                        <button onClick={() => setIsEditingProfile(false)} className="btn-secondary text-sm">Cancel</button>
                        <button onClick={handleSaveProfile} disabled={savingProfile} className="btn-primary text-sm">
                          {savingProfile ? "Saving..." : "Save Changes"}
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="card">
                    <h4 className="font-bold text-nuanu-navy mb-4">Contact & Details</h4>
                    <div className="grid grid-cols-2 gap-y-4 text-sm">
                      <div><span className="text-gray-500 block text-xs">Email</span><span className="font-medium">{employee.user.email}</span></div>
                      <div><span className="text-gray-500 block text-xs">Phone</span><span className="font-medium">{employee.user.phone || "—"}</span></div>
                      <div><span className="text-gray-500 block text-xs">Join Date</span><span className="font-medium">{formatDate(employee.startDate)}</span></div>
                      <div><span className="text-gray-500 block text-xs">Probation End Date</span><span className="font-medium">{employee.probationEndDate ? formatDate(employee.probationEndDate) : "—"}</span></div>
                    </div>
                  </div>
                </div>
              )}

              {/* PROBATION TAB */}
              {activeTab === "probation" && probationRecord && (
                <div className="space-y-6">
                  {/* Summary Card */}
                  <div className="card">
                    <h3 className="font-bold text-lg text-nuanu-navy mb-4">Probation Overview</h3>
                    <div className="grid grid-cols-3 gap-4 mb-4 text-sm">
                      <div><span className="text-gray-500 block text-xs">Start Date</span><span className="font-medium">{formatDate(probationRecord.probationStart)}</span></div>
                      <div><span className="text-gray-500 block text-xs">End Date</span><span className="font-medium">{formatDate(probationRecord.probationEndDate)}</span></div>
                      <div>
                        <span className="text-gray-500 block text-xs">Days Remaining</span>
                        <span className={`font-bold ${
                          Math.ceil((new Date(probationRecord.probationEndDate).getTime() - new Date().getTime()) / 86400000) <= 14 ? 'text-red-600' :
                          Math.ceil((new Date(probationRecord.probationEndDate).getTime() - new Date().getTime()) / 86400000) <= 30 ? 'text-amber-600' :
                          'text-emerald-600'
                        }`}>
                          {Math.max(0, Math.ceil((new Date(probationRecord.probationEndDate).getTime() - new Date().getTime()) / 86400000))} Days
                        </span>
                      </div>
                    </div>
                    {/* Progress Bar */}
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full" 
                        style={{ width: `${Math.min(100, Math.max(0, ((new Date().getTime() - new Date(probationRecord.probationStart).getTime()) / (new Date(probationRecord.probationEndDate).getTime() - new Date(probationRecord.probationStart).getTime())) * 100))}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* Evaluations List */}
                  <div className="card">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-bold text-nuanu-navy">Evaluations</h3>
                      {probationRecord.outcome === null && !showAddEval && (
                        <button onClick={() => setShowAddEval(true)} className="btn-primary text-xs py-1.5 px-3">
                          + Add Evaluation
                        </button>
                      )}
                    </div>

                    {showAddEval && (
                      <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 mb-6">
                        <h4 className="font-bold text-sm text-nuanu-navy mb-4">New Evaluation</h4>
                        <div className="grid grid-cols-2 gap-4 mb-4">
                          <div>
                            <label className="block text-xs font-semibold text-gray-600 mb-1">Evaluated By (Manager/HR)</label>
                            <input type="text" value={evalForm.evaluated_by} onChange={e => setEvalForm({...evalForm, evaluated_by: e.target.value})} className="input-field" placeholder="John Doe" />
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-gray-600 mb-1">Score</label>
                            <select value={evalForm.score} onChange={e => setEvalForm({...evalForm, score: e.target.value})} className="input-field">
                              <option value="excellent">Excellent</option>
                              <option value="good">Good</option>
                              <option value="needs_improvement">Needs Improvement</option>
                              <option value="poor">Poor</option>
                            </select>
                          </div>
                        </div>
                        <div className="mb-4">
                          <label className="block text-xs font-semibold text-gray-600 mb-1">Notes / Comments</label>
                          <textarea value={evalForm.notes} onChange={e => setEvalForm({...evalForm, notes: e.target.value})} className="input-field min-h-[80px]" placeholder="Evaluation notes..."></textarea>
                        </div>
                        <div className="mb-4">
                          <label className="block text-xs font-semibold text-gray-600 mb-1">Recommendation</label>
                          <select value={evalForm.recommendation} onChange={e => setEvalForm({...evalForm, recommendation: e.target.value})} className="input-field">
                            <option value="continue">Continue Probation</option>
                            <option value="extend">Extend Probation</option>
                            <option value="terminate">Terminate Employment</option>
                          </select>
                        </div>
                        <div className="flex justify-end gap-2 pt-4 border-t border-gray-200">
                          <button onClick={() => setShowAddEval(false)} className="btn-secondary text-sm">Cancel</button>
                          <button onClick={handleSaveEval} disabled={!evalForm.evaluated_by} className="btn-primary text-sm">Save Evaluation</button>
                        </div>
                      </div>
                    )}

                    {probationRecord.evaluations && probationRecord.evaluations.length > 0 ? (
                      <div className="space-y-4">
                        {probationRecord.evaluations.map((ev: any) => (
                          <div key={ev.id} className="border border-gray-100 p-4 rounded-lg">
                            <div className="flex justify-between items-start mb-2">
                              <div>
                                <p className="font-semibold text-sm text-nuanu-navy">{formatDate(ev.evaluationDate)}</p>
                                <p className="text-xs text-gray-500">By: {ev.evaluatedBy}</p>
                              </div>
                              <span className={`badge text-[10px] uppercase font-bold tracking-wider ${
                                ev.score === 'excellent' ? 'bg-emerald-100 text-emerald-700' :
                                ev.score === 'good' ? 'bg-blue-100 text-blue-700' :
                                ev.score === 'needs_improvement' ? 'bg-amber-100 text-amber-700' :
                                'bg-red-100 text-red-700'
                              }`}>
                                {ev.score.replace('_', ' ')}
                              </span>
                            </div>
                            {ev.notes && <p className="text-sm text-gray-600 mt-2 bg-gray-50 p-2 rounded">{ev.notes}</p>}
                            <div className="mt-3">
                              <span className="text-xs text-gray-500 mr-2">Recommendation:</span>
                              <span className="text-xs font-semibold text-gray-700 capitalize">{ev.recommendation}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <p className="text-gray-500 text-sm">No evaluations submitted yet.</p>
                      </div>
                    )}
                  </div>

                  {/* Final Decision Section */}
                  {probationRecord.outcome === null && probationRecord.evaluations?.length > 0 && (
                    <div className="card bg-gray-50 border border-gray-200 shadow-inner">
                      <h3 className="font-bold text-nuanu-navy mb-2">Final Probation Decision</h3>
                      <p className="text-sm text-gray-500 mb-6">Make a final decision to conclude this probation period. This action is permanent.</p>
                      <div className="flex flex-wrap gap-3">
                        <button onClick={() => handleDecision('pass')} className="btn-primary bg-emerald-600 border-emerald-600 hover:bg-emerald-700">
                          Pass Probation → Convert to Permanent
                        </button>
                        <button onClick={() => handleDecision('extend')} className="btn-secondary text-amber-600 border-amber-200 hover:bg-amber-50">
                          Extend Probation
                        </button>
                        <button onClick={() => handleDecision('terminate')} className="btn-secondary text-red-600 border-red-200 hover:bg-red-50">
                          Terminate
                        </button>
                      </div>
                    </div>
                  )}

                  {probationRecord.outcome !== null && (
                    <div className="card bg-blue-50 border-blue-100">
                      <h3 className="font-bold text-blue-900 mb-1">Probation Concluded</h3>
                      <p className="text-sm text-blue-700">Outcome: <strong className="uppercase">{probationRecord.outcome}</strong></p>
                      {probationRecord.outcomeReason && <p className="text-sm text-blue-700 mt-2">Reason: {probationRecord.outcomeReason}</p>}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: CONTRACT */}
              {activeTab === "contract" && (
                <div className="space-y-6">
                  {contract ? (
                    <div className="card">
                      <div className="flex items-center justify-between mb-6">
                        <h3 className="font-bold text-lg text-nuanu-navy">Contract Details</h3>
                        <div className="flex items-center gap-2">
                          {contract.status === "draft" && (
                            <Link href="/dashboard/onboarding" className="btn-secondary text-sm gap-2">
                              <Edit2 className="w-4 h-4" /> Edit Contract
                            </Link>
                          )}
                          {/* If memo hires exists, handled below or can be checked here if we fetch memos */}
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-6 text-sm">
                        <div><span className="text-gray-500 block text-xs mb-1">Employment Type</span><span className="font-medium">{contract.employmentType}</span></div>
                        <div><span className="text-gray-500 block text-xs mb-1">Work Location</span><span className="font-medium capitalize">{contract.workLocation}</span></div>
                        <div><span className="text-gray-500 block text-xs mb-1">Working Hours</span><span className="font-medium">{contract.workingHours}</span></div>
                        <div><span className="text-gray-500 block text-xs mb-1">Reporting To</span><span className="font-medium">{contract.reportingTo}</span></div>
                        <div><span className="text-gray-500 block text-xs mb-1">Contract Start Date</span><span className="font-medium">{formatDate(contract.contractStart)}</span></div>
                        <div><span className="text-gray-500 block text-xs mb-1">Contract End Date</span><span className="font-medium">{contract.isPermanent ? "Permanent" : formatDate(contract.contractEnd)}</span></div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-16 card">
                      <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                      <p className="text-gray-500 font-medium">No contract found.</p>
                      <Link href="/dashboard/onboarding" className="text-blue-500 hover:underline text-sm font-medium mt-2 block">Go to Onboarding →</Link>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: COMPENSATION */}
              {activeTab === "compensation" && (
                <div className="space-y-6">
                  {contract ? (
                    <div className="card max-w-lg mx-auto">
                      <div className="flex items-center justify-between mb-6">
                        <h3 className="font-bold text-lg text-nuanu-navy">Compensation Breakdown</h3>
                        <span className="badge bg-blue-100 text-blue-700 uppercase font-bold text-xs">{contract.salaryType}</span>
                      </div>
                      <div className="space-y-3 font-mono text-sm">
                        <div className="flex justify-between items-center"><span className="text-gray-600 font-sans">Basic Salary</span><span>Rp {Number(contract.basicSalary).toLocaleString()}</span></div>
                        {Number(contract.mealAllowance) > 0 && <div className="flex justify-between items-center"><span className="text-gray-600 font-sans">+ Meal Allowance</span><span>Rp {Number(contract.mealAllowance).toLocaleString()}</span></div>}
                        {Number(contract.transportAllowance) > 0 && <div className="flex justify-between items-center"><span className="text-gray-600 font-sans">+ Transport Allowance</span><span>Rp {Number(contract.transportAllowance).toLocaleString()}</span></div>}
                        {Number(contract.healthAllowance) > 0 && <div className="flex justify-between items-center"><span className="text-gray-600 font-sans">+ Health Allowance</span><span>Rp {Number(contract.healthAllowance).toLocaleString()}</span></div>}
                        {Number(contract.otherAllowanceAmount) > 0 && <div className="flex justify-between items-center"><span className="text-gray-600 font-sans">+ {contract.otherAllowanceLabel || "Other Allowance"}</span><span>Rp {Number(contract.otherAllowanceAmount).toLocaleString()}</span></div>}
                        
                        <div className="border-t border-gray-200 my-2 pt-2"></div>
                        
                        <div className="flex justify-between items-center text-base font-bold text-nuanu-navy">
                          <span className="font-sans">Total Package</span>
                          <span>
                            Rp {(Number(contract.basicSalary) + Number(contract.mealAllowance) + Number(contract.transportAllowance) + Number(contract.healthAllowance) + Number(contract.otherAllowanceAmount)).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-16 card">
                      <DollarSign className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                      <p className="text-gray-500 font-medium">No compensation data found.</p>
                      <p className="text-sm text-gray-400 mt-1">Please complete the New Hire Confirmation form.</p>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 4: DOCUMENTS */}
              {activeTab === "documents" && (
                <div className="space-y-6">
                  {documents.length > 0 ? (
                    <div className="card">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="font-bold text-nuanu-navy">Required Documents</h3>
                        <span className="text-xs font-semibold text-gray-500">
                          {documents.filter(d => d.verificationStatus === "verified").length} / {documents.length} Verified
                        </span>
                      </div>
                      <div className="overflow-x-auto rounded-lg border border-gray-200">
                        <table className="w-full text-sm">
                          <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                              <th className="text-left px-4 py-3 font-semibold text-gray-600">Document Type</th>
                              <th className="text-left px-4 py-3 font-semibold text-gray-600">Status</th>
                              <th className="text-left px-4 py-3 font-semibold text-gray-600">File</th>
                              <th className="text-right px-4 py-3 font-semibold text-gray-600">Action</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {documents.map((doc) => {
                              const docConfig: any = {
                                missing: { label: "Missing", cls: "bg-red-50 text-red-600 border-red-200" },
                                uploaded: { label: "Uploaded", cls: "bg-blue-50 text-blue-600 border-blue-200" },
                                pending_review: { label: "Pending Review", cls: "bg-amber-50 text-amber-600 border-amber-200" },
                                verified: { label: "Verified", cls: "bg-emerald-50 text-emerald-600 border-emerald-200" },
                                rejected: { label: "Rejected", cls: "bg-gray-100 text-gray-600 border-gray-200" }
                              };
                              const sc = docConfig[doc.verificationStatus];
                              return (
                                <tr key={doc.id}>
                                  <td className="px-4 py-3 font-medium text-gray-900 capitalize">{doc.documentType.replace(/_/g, " ")}</td>
                                  <td className="px-4 py-3">
                                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border uppercase tracking-wider ${sc.cls}`}>
                                      {sc.label}
                                    </span>
                                    {doc.rejectionReason && <p className="text-[10px] text-red-500 mt-1 max-w-[200px] truncate" title={doc.rejectionReason}>Reason: {doc.rejectionReason}</p>}
                                  </td>
                                  <td className="px-4 py-3">
                                    {doc.fileUrl ? (
                                      <a href={doc.fileUrl} target="_blank" rel="noreferrer" className="text-blue-500 hover:underline text-xs flex items-center gap-1">
                                        <FileText className="w-3 h-3" /> View File
                                      </a>
                                    ) : <span className="text-gray-400 text-xs">—</span>}
                                  </td>
                                  <td className="px-4 py-3 text-right">
                                    {(doc.verificationStatus === "uploaded" || doc.verificationStatus === "pending_review") && (
                                      <div className="flex items-center justify-end gap-2">
                                        <button onClick={() => handleVerifyDoc(doc.id, "verified")} className="btn-primary py-1 px-2 text-[10px] bg-emerald-600 border-emerald-600">Approve</button>
                                        <button onClick={() => {
                                          const reason = window.prompt("Reason for rejection:");
                                          if (reason) handleVerifyDoc(doc.id, "rejected", reason);
                                        }} className="btn-secondary py-1 px-2 text-[10px] text-red-600 border-red-200 hover:bg-red-50">Reject</button>
                                      </div>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-16 card">
                      <FileCheck className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                      <p className="text-gray-500 font-medium">No documents uploaded yet.</p>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 5: ASSETS */}
              {activeTab === "assets" && (
                <div className="space-y-6">
                  {assets.length > 0 ? (
                    <div className="card">
                      <h3 className="font-bold text-nuanu-navy mb-4">Assigned Assets</h3>
                      <div className="overflow-x-auto rounded-lg border border-gray-200">
                        <table className="w-full text-sm">
                          <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                              <th className="text-left px-4 py-3 font-semibold text-gray-600">Asset Type</th>
                              <th className="text-left px-4 py-3 font-semibold text-gray-600">Details</th>
                              <th className="text-left px-4 py-3 font-semibold text-gray-600">Status</th>
                              <th className="text-right px-4 py-3 font-semibold text-gray-600">Action</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {assets.map((asset) => {
                               const statusConfig: any = {
                                pending: { label: "Pending", cls: "bg-gray-100 text-gray-600 border-gray-200" },
                                assigned: { label: "Assigned", cls: "bg-blue-50 text-blue-600 border-blue-200" },
                                received: { label: "Received", cls: "bg-emerald-50 text-emerald-600 border-emerald-200" },
                                returned: { label: "Returned", cls: "bg-gray-100 text-gray-500 border-gray-200" },
                              };
                              const sc = statusConfig[asset.status];
                              return (
                                <tr key={asset.id}>
                                  <td className="px-4 py-3 font-medium text-gray-900 capitalize">{asset.assetType.replace(/_/g, " ")}</td>
                                  <td className="px-4 py-3 text-xs text-gray-600">
                                    <div>{asset.assetName}</div>
                                    {asset.serialNumber && <div className="text-gray-400">S/N: {asset.serialNumber}</div>}
                                  </td>
                                  <td className="px-4 py-3">
                                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border uppercase tracking-wider ${sc.cls}`}>{sc.label}</span>
                                  </td>
                                  <td className="px-4 py-3 text-right">
                                    <div className="flex items-center justify-end gap-2">
                                      {asset.status === "assigned" && (
                                        <button onClick={() => handleQuickAssetStatus(asset.id, "received")} className="btn-primary py-1 px-2 text-[10px] bg-emerald-600 border-emerald-600">Mark Received</button>
                                      )}
                                      {asset.status === "received" && (
                                        <button onClick={() => handleQuickAssetStatus(asset.id, "returned")} className="btn-secondary py-1 px-2 text-[10px]">Mark Returned</button>
                                      )}
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-16 card">
                      <Monitor className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                      <p className="text-gray-500 font-medium">No assets assigned yet.</p>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 6: HISTORY */}
              {activeTab === "history" && (
                <div className="space-y-6">
                  {history.length > 0 ? (
                    <div className="card">
                      <h3 className="font-bold text-nuanu-navy mb-6">Activity Timeline</h3>
                      <div className="relative border-l-2 border-gray-200 ml-4 space-y-8 pb-4">
                        {history.map((event, i) => {
                           // Mapping generic icons
                           let EventIcon = Clock;
                           if (event.icon === "user_plus") EventIcon = User;
                           if (event.icon === "file_signature") EventIcon = FileText;
                           if (event.icon === "file_text") EventIcon = FileText;
                           if (event.icon === "check_circle") EventIcon = CheckCircle2;
                           if (event.icon === "monitor") EventIcon = Monitor;
                           if (event.icon === "calendar") EventIcon = Clock;

                           return (
                            <div key={i} className="relative pl-6">
                              <div className="absolute -left-[9px] top-1 bg-white p-0.5 rounded-full border border-gray-200 text-blue-500">
                                <EventIcon className="w-3 h-3" />
                              </div>
                              <div className="text-sm">
                                <p className="font-medium text-nuanu-navy">{event.description}</p>
                                <p className="text-xs text-gray-400 mt-1">{new Date(event.date).toLocaleString()}</p>
                              </div>
                            </div>
                           );
                        })}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-16 card">
                      <History className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                      <p className="text-gray-500 font-medium">No history available yet.</p>
                    </div>
                  )}
                </div>
              )}

            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
