"use client";

import { useState } from "react";
import {
  Search,
  Filter,
  FileSpreadsheet,
  Brain,
  Users,
  PlayCircle,
  MoreVertical,
  X,
  Loader2,
  CheckCircle2,
  XCircle,
  Award,
  TrendingUp,
  Edit2,
  Send,
  Bell,
  ToggleLeft,
  ToggleRight,
  ClipboardList,
  BarChart2,
  Clock,
  Target,
  Plus,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  createAssessment,
  remindAssessment,
  cancelAssessment,
  createTemplate,
  deleteTemplate,
  submitAssessmentResult,
  updateAssessmentStatus,
  updateTemplate,
  toggleTemplateStatus,
} from "./actions";

export type AssessmentData = {
  id: string;
  title: string;
  type: string;
  duration: string;
  candidates: number;
  avgScore: number;
  status: string;
};

export type RecentAssessment = {
  id: string;
  candidateName: string;
  vacancyTitle: string;
  title: string;
  type: string;
  status: string;
  score: number | null;
  maxScore: number;
  passThreshold: number;
  isPassed: boolean | null;
  description: string;
  completedAt: string | null;
  createdAt: string;
};

export type ActiveApp = {
  id: string;
  candidateName: string;
  vacancyTitle: string;
};

// ── helpers ──────────────────────────────────────────────────────────────────
const pct = (score: number | null, maxScore: number) =>
  score !== null ? Math.round((score / maxScore) * 100) : null;

export default function ScreeningClient({
  templates,
  recentAssessments,
  activeApplications = [],
  stats,
}: {
  templates: AssessmentData[];
  recentAssessments: RecentAssessment[];
  activeApplications?: ActiveApp[];
  stats: {
    totalSent: number;
    pending: number;
    completed: number;
    avgScore: number;
  };
}) {
  const [activeTab, setActiveTab] = useState<"overview" | "templates">(
    "overview",
  );
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [openActionId, setOpenActionId] = useState<string | null>(null);
  const [openTemplateId, setOpenTemplateId] = useState<string | null>(null);

  // Send Assessment Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    applicationId: "",
    type: "skill_test",
    title: "",
    description: "",
    maxScore: 100,
    passThreshold: 70,
  });

  // Create / Edit Template Modal
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<null | {
    id: string;
    title: string;
    type: string;
    description: string;
    duration: number;
    passThreshold: number;
  }>(null);
  const [templateData, setTemplateData] = useState({
    title: "",
    type: "skill_test",
    description: "",
    duration: 60,
    passThreshold: 70,
  });

  // Score / Result Modal
  const [isResultModalOpen, setIsResultModalOpen] = useState(false);
  const [selectedAssessment, setSelectedAssessment] =
    useState<RecentAssessment | null>(null);
  const [resultData, setResultData] = useState({ score: 0, notes: "" });

  // ── derived lists ──────────────────────────────────────────────────────────
  const filteredTemplates = templates.filter((a) => {
    const matchSearch = a.title.toLowerCase().includes(search.toLowerCase());
    const matchType = typeFilter === "all" || a.type === typeFilter;
    return matchSearch && matchType;
  });

  const filteredRecent = recentAssessments.filter((a) => {
    const matchSearch =
      a.candidateName.toLowerCase().includes(search.toLowerCase()) ||
      a.title.toLowerCase().includes(search.toLowerCase());
    const matchType = typeFilter === "all" || a.type === typeFilter;
    const matchStatus = statusFilter === "all" || a.status === statusFilter;
    return matchSearch && matchType && matchStatus;
  });

  // ── ui helpers ─────────────────────────────────────────────────────────────
  const getTypeIcon = (type: string) => {
    switch (type) {
      case "cognitive":
        return <Brain className="w-5 h-5 text-purple-500" />;
      case "personality":
        return <ClipboardList className="w-5 h-5 text-pink-500" />;
      default:
        return <FileSpreadsheet className="w-5 h-5 text-blue-500" />;
    }
  };

  const getTypeLabel = (type: string) =>
    type === "skill_test"
      ? "Skill Test"
      : type === "cognitive"
        ? "Cognitive"
        : "Personality";

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case "completed":
        return (
          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-green-100 text-green-700 uppercase tracking-wide">
            Completed
          </span>
        );
      case "pending":
        return (
          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700 uppercase tracking-wide">
            Pending
          </span>
        );
      case "started":
        return (
          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-blue-100 text-blue-700 uppercase tracking-wide">
            In Progress
          </span>
        );
      case "cancelled":
        return (
          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-gray-100 text-gray-500 uppercase tracking-wide">
            Cancelled
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-gray-100 text-gray-700 uppercase tracking-wide">
            {status}
          </span>
        );
    }
  };

  const getPassFailBadge = (a: RecentAssessment) => {
    if (a.isPassed === true)
      return (
        <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700">
          <CheckCircle2 className="w-3 h-3" /> PASSED
        </span>
      );
    if (a.isPassed === false)
      return (
        <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-red-100 text-red-700">
          <XCircle className="w-3 h-3" /> FAILED
        </span>
      );
    return null;
  };

  // ── handlers ───────────────────────────────────────────────────────────────
  const handleSendAssessment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.applicationId || !formData.title) return;
    setIsSubmitting(true);
    try {
      const res = await createAssessment(formData);
      if (res.success) {
        toast.success("Assessment sent to candidate!");
        setIsModalOpen(false);
        setFormData({
          applicationId: "",
          type: "skill_test",
          title: "",
          description: "",
          maxScore: 100,
          passThreshold: 70,
        });
      } else {
        toast.error(res.error || "Failed to send assessment");
      }
    } catch {
      toast.error("Unexpected error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = editingTemplate
        ? await updateTemplate({ id: editingTemplate.id, ...templateData })
        : await createTemplate(templateData);
      if (res.success) {
        toast.success(
          editingTemplate ? "Template updated!" : "Template created!",
        );
        setIsTemplateModalOpen(false);
        setEditingTemplate(null);
        setTemplateData({
          title: "",
          type: "skill_test",
          description: "",
          duration: 60,
          passThreshold: 70,
        });
      } else {
        toast.error("Failed to save template");
      }
    } catch {
      toast.error("Unexpected error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const openEditTemplate = (t: AssessmentData) => {
    setEditingTemplate({
      id: t.id,
      title: t.title,
      type: t.type,
      description: "",
      duration: parseInt(t.duration) || 60,
      passThreshold: 70,
    });
    setTemplateData({
      title: t.title,
      type: t.type,
      description: "",
      duration: parseInt(t.duration) || 60,
      passThreshold: 70,
    });
    setIsTemplateModalOpen(true);
  };

  const openResultModal = (a: RecentAssessment) => {
    setSelectedAssessment(a);
    setResultData({ score: a.score ?? 0, notes: "" });
    setIsResultModalOpen(true);
    setOpenActionId(null);
  };

  const handleSubmitResult = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAssessment) return;
    setIsSubmitting(true);
    try {
      const res = await submitAssessmentResult({
        assessmentId: selectedAssessment.id,
        score: resultData.score,
        notes: resultData.notes,
      });
      if (res.success) {
        toast.success(
          `Score saved! ${res.isPassed ? "✅ PASSED" : "❌ FAILED"} — ${res.pct}%`,
        );
        setIsResultModalOpen(false);
        setSelectedAssessment(null);
      } else {
        toast.error(res.error || "Failed to save result");
      }
    } catch {
      toast.error("Unexpected error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStatusChange = async (
    id: string,
    status: "pending" | "started" | "completed" | "cancelled",
  ) => {
    const res = await updateAssessmentStatus(id, status);
    if (res.success) toast.success(`Status updated to "${status}"`);
    else toast.error("Failed to update status");
    setOpenActionId(null);
  };

  const handleRemind = async (id: string) => {
    const res = await remindAssessment(id);
    if (res.success) {
      toast.success("Reminder email sent to candidate!");
      setOpenActionId(null);
    } else toast.error("Failed to send reminder");
  };

  const handleCancel = async (id: string) => {
    if (
      !confirm(
        "Revoke this candidate's assessment access? This cannot be undone.",
      )
    )
      return;
    const res = await cancelAssessment(id);
    if (res.success) {
      toast.success("Assessment revoked.");
      setOpenActionId(null);
    } else toast.error("Failed to revoke assessment");
  };

  const handleDeleteTemplate = async (id: string) => {
    if (!confirm("Delete this template permanently?")) return;
    const res = await deleteTemplate(id);
    if (res.success) {
      toast.success("Template deleted.");
      setOpenTemplateId(null);
    } else toast.error("Failed to delete template");
  };

  const handleToggleTemplate = async (id: string, current: boolean) => {
    const res = await toggleTemplateStatus(id, !current);
    if (res.success)
      toast.success(`Template ${!current ? "activated" : "deactivated"}.`);
    else toast.error("Failed to toggle template");
    setOpenTemplateId(null);
  };

  // ── render ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-nuanu-navy">Assessment</h1>
          <p className="text-sm text-nuanu-gray-500 mt-1">
            Manage and track candidate assessment tests and results
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => {
              setEditingTemplate(null);
              setTemplateData({
                title: "",
                type: "skill_test",
                description: "",
                duration: 60,
                passThreshold: 70,
              });
              setIsTemplateModalOpen(true);
            }}
            className="btn-secondary gap-2"
          >
            <Plus className="w-4 h-4" /> Create Template
          </button>
          <button
            onClick={() => setIsModalOpen(true)}
            className="btn-primary shadow-lg shadow-nuanu-emerald/20 gap-2"
          >
            <Send className="w-4 h-4" /> Send Assessment
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          {
            label: "Total Sent",
            value: stats.totalSent,
            icon: Send,
            color: "text-blue-600",
            bg: "bg-blue-50",
            border: "border-l-blue-500",
          },
          {
            label: "Pending",
            value: stats.pending,
            icon: Clock,
            color: "text-amber-600",
            bg: "bg-amber-50",
            border: "border-l-amber-500",
          },
          {
            label: "Completed",
            value: stats.completed,
            icon: CheckCircle2,
            color: "text-green-600",
            bg: "bg-green-50",
            border: "border-l-green-500",
          },
          {
            label: "Avg. Score",
            value: `${stats.avgScore}%`,
            icon: BarChart2,
            color: "text-purple-600",
            bg: "bg-purple-50",
            border: "border-l-purple-500",
          },
        ].map((stat, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
            className={`card p-5 flex items-center gap-4 border-l-4 ${stat.border} hover:shadow-lg transition-shadow`}
          >
            <div
              className={`w-12 h-12 rounded-xl ${stat.bg} flex items-center justify-center flex-shrink-0`}
            >
              <stat.icon className={`w-6 h-6 ${stat.color}`} />
            </div>
            <div>
              <p className="text-xs text-nuanu-gray-500 font-bold uppercase tracking-wider">
                {stat.label}
              </p>
              <p className="text-2xl font-black text-nuanu-navy">
                {stat.value}
              </p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-nuanu-gray-200">
        {[
          {
            key: "overview",
            label: "Assessment Activity",
            icon: ClipboardList,
          },
          {
            key: "templates",
            label: "Template Library",
            icon: FileSpreadsheet,
          },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            className={`flex items-center gap-2 px-8 py-4 text-sm font-bold transition-all ${
              activeTab === tab.key
                ? "text-nuanu-emerald border-b-2 border-nuanu-emerald"
                : "text-nuanu-gray-400 hover:text-nuanu-navy"
            }`}
          >
            <tab.icon className="w-4 h-4" /> {tab.label}
          </button>
        ))}
      </div>

      <div className="card min-h-[500px] overflow-visible relative">
        {/* Shared Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6 border-b border-nuanu-gray-100 pb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-nuanu-gray-400" />
            <input
              type="text"
              placeholder={
                activeTab === "overview"
                  ? "Search candidates or tests..."
                  : "Search templates..."
              }
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input-field pl-10"
            />
          </div>
          <div className="relative min-w-[160px]">
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="input-field appearance-none"
            >
              <option value="all">All Types</option>
              <option value="skill_test">Skill Test</option>
              <option value="cognitive">Cognitive</option>
              <option value="personality">Personality</option>
            </select>
            <Filter className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-nuanu-gray-400 pointer-events-none" />
          </div>
          {activeTab === "overview" && (
            <div className="relative min-w-[160px]">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="input-field appearance-none"
              >
                <option value="all">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="started">In Progress</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
              <Filter className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-nuanu-gray-400 pointer-events-none" />
            </div>
          )}
        </div>

        {/* ── OVERVIEW TAB ── */}
        {activeTab === "overview" && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-nuanu-gray-50/60">
                  {[
                    "Candidate",
                    "Assessment",
                    "Status",
                    "Score",
                    "Pass/Fail",
                    "Date Sent",
                    "Actions",
                  ].map((h) => (
                    <th
                      key={h}
                      className={`px-5 py-4 text-[10px] font-black text-nuanu-navy uppercase tracking-widest ${h === "Score" || h === "Pass/Fail" ? "text-center" : h === "Actions" ? "text-right" : ""}`}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-nuanu-gray-100">
                {filteredRecent.map((a, i) => {
                  const scorePct = pct(a.score, a.maxScore);
                  return (
                    <motion.tr
                      key={a.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.04 }}
                      className="hover:bg-nuanu-gray-50/50 transition-colors"
                    >
                      <td className="px-5 py-4">
                        <p className="font-bold text-nuanu-navy text-sm">
                          {a.candidateName}
                        </p>
                        <p className="text-[11px] text-nuanu-gray-400">
                          {a.vacancyTitle}
                        </p>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-nuanu-gray-50 flex items-center justify-center flex-shrink-0">
                            {getTypeIcon(a.type)}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-nuanu-navy">
                              {a.title}
                            </p>
                            <p className="text-[10px] text-nuanu-gray-400 uppercase font-bold">
                              {getTypeLabel(a.type)}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4">{getStatusBadge(a.status)}</td>
                      <td className="px-5 py-4 text-center">
                        {scorePct !== null ? (
                          <div className="flex flex-col items-center gap-1">
                            <span
                              className={`text-sm font-black ${scorePct >= a.passThreshold ? "text-emerald-600" : "text-red-500"}`}
                            >
                              {a.score}/{a.maxScore}
                            </span>
                            <div className="w-20 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${scorePct >= a.passThreshold ? "bg-emerald-500" : "bg-red-500"}`}
                                style={{ width: `${scorePct}%` }}
                              />
                            </div>
                            <span className="text-[10px] text-nuanu-gray-400">
                              {scorePct}%
                            </span>
                          </div>
                        ) : (
                          <span className="text-nuanu-gray-300 font-bold text-lg">
                            —
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-4 text-center">
                        {getPassFailBadge(a)}
                      </td>
                      <td className="px-5 py-4 text-[12px] text-nuanu-gray-500">
                        {new Date(a.createdAt).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </td>
                      <td className="px-5 py-4 text-right relative overflow-visible">
                        <button
                          onClick={() =>
                            setOpenActionId(openActionId === a.id ? null : a.id)
                          }
                          className="p-2 text-nuanu-gray-400 hover:text-nuanu-navy hover:bg-nuanu-gray-100 rounded-lg transition-all"
                        >
                          <MoreVertical className="w-5 h-5" />
                        </button>
                        <AnimatePresence>
                          {openActionId === a.id && (
                            <>
                              <div
                                className="fixed inset-0 z-[60]"
                                onClick={() => setOpenActionId(null)}
                              />
                              <motion.div
                                initial={{ opacity: 0, scale: 0.95, y: -8 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95, y: -8 }}
                                className="absolute right-0 top-full mt-1 w-60 bg-white rounded-xl shadow-2xl border border-nuanu-gray-100 z-[70] overflow-hidden"
                                style={{ transformOrigin: "top right" }}
                              >
                                <div className="p-2 space-y-0.5 text-left">
                                  <p className="px-3 py-1 text-[9px] font-black text-nuanu-gray-400 uppercase tracking-widest">
                                    Results
                                  </p>
                                  <button
                                    onClick={() => openResultModal(a)}
                                    className="w-full text-left px-3 py-2.5 text-sm font-semibold text-nuanu-navy hover:bg-emerald-50 rounded-lg flex items-center gap-3 transition-colors"
                                  >
                                    <Award className="w-4 h-4 text-emerald-500" />{" "}
                                    {a.score !== null
                                      ? "Update Score"
                                      : "Enter Score"}
                                  </button>
                                  <div className="h-px bg-nuanu-gray-100 my-1" />
                                  <p className="px-3 py-1 text-[9px] font-black text-nuanu-gray-400 uppercase tracking-widest">
                                    Status
                                  </p>
                                  {a.status !== "started" &&
                                    a.status !== "completed" && (
                                      <button
                                        onClick={() =>
                                          handleStatusChange(a.id, "started")
                                        }
                                        className="w-full text-left px-3 py-2.5 text-sm font-semibold text-nuanu-navy hover:bg-blue-50 rounded-lg flex items-center gap-3 transition-colors"
                                      >
                                        <PlayCircle className="w-4 h-4 text-blue-500" />{" "}
                                        Mark as Started
                                      </button>
                                    )}
                                  {a.status !== "completed" && (
                                    <button
                                      onClick={() =>
                                        handleStatusChange(a.id, "completed")
                                      }
                                      className="w-full text-left px-3 py-2.5 text-sm font-semibold text-nuanu-navy hover:bg-green-50 rounded-lg flex items-center gap-3 transition-colors"
                                    >
                                      <CheckCircle2 className="w-4 h-4 text-green-500" />{" "}
                                      Mark as Completed
                                    </button>
                                  )}
                                  <div className="h-px bg-nuanu-gray-100 my-1" />
                                  <p className="px-3 py-1 text-[9px] font-black text-nuanu-gray-400 uppercase tracking-widest">
                                    Actions
                                  </p>
                                  <button
                                    onClick={() => handleRemind(a.id)}
                                    className="w-full text-left px-3 py-2.5 text-sm font-semibold text-nuanu-navy hover:bg-nuanu-gray-50 rounded-lg flex items-center gap-3 transition-colors"
                                  >
                                    <Bell className="w-4 h-4 text-amber-500" />{" "}
                                    Send Reminder
                                  </button>
                                  <div className="h-px bg-nuanu-gray-100 my-1" />
                                  <button
                                    onClick={() => handleCancel(a.id)}
                                    className="w-full text-left px-3 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-50 rounded-lg flex items-center gap-3 transition-colors"
                                  >
                                    <XCircle className="w-4 h-4" /> Revoke
                                    Access
                                  </button>
                                </div>
                              </motion.div>
                            </>
                          )}
                        </AnimatePresence>
                      </td>
                    </motion.tr>
                  );
                })}
                {filteredRecent.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-24 text-center">
                      <div className="flex flex-col items-center">
                        <div className="w-16 h-16 rounded-full bg-nuanu-gray-50 flex items-center justify-center mb-4">
                          <ClipboardList className="w-8 h-8 text-nuanu-gray-300" />
                        </div>
                        <h3 className="text-lg font-bold text-nuanu-navy">
                          No assessment activity
                        </h3>
                        <p className="text-nuanu-gray-500 max-w-xs mx-auto mt-1">
                          Send an assessment to a candidate to get started.
                        </p>
                        <button
                          onClick={() => setIsModalOpen(true)}
                          className="btn-primary mt-6 text-sm gap-2"
                        >
                          <Send className="w-4 h-4" /> Send Assessment
                        </button>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* ── TEMPLATES TAB ── */}
        {activeTab === "templates" && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {filteredTemplates.map((t, i) => (
              <motion.div
                key={t.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.05 }}
                className="border border-nuanu-gray-200 rounded-2xl p-6 hover:border-nuanu-emerald hover:shadow-xl transition-all bg-white relative group"
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="w-12 h-12 rounded-xl bg-nuanu-gray-50 flex items-center justify-center">
                    {getTypeIcon(t.type)}
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[10px] font-black px-2 py-1 rounded-full ${t.status === "Active" ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-500"}`}
                    >
                      {t.status}
                    </span>
                    <div className="relative overflow-visible">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenTemplateId(
                            openTemplateId === t.id ? null : t.id,
                          );
                        }}
                        className="p-1.5 rounded-lg text-nuanu-gray-400 hover:text-nuanu-navy hover:bg-nuanu-gray-100 transition-all"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>
                      <AnimatePresence>
                        {openTemplateId === t.id && (
                          <>
                            <div
                              className="fixed inset-0 z-[60]"
                              onClick={() => setOpenTemplateId(null)}
                            />
                            <motion.div
                              initial={{ opacity: 0, scale: 0.95, y: -8 }}
                              animate={{ opacity: 1, scale: 1, y: 0 }}
                              exit={{ opacity: 0, scale: 0.95, y: -8 }}
                              className="absolute right-0 top-full mt-1 w-52 bg-white rounded-xl shadow-2xl border border-nuanu-gray-100 z-[70] overflow-hidden"
                              style={{ transformOrigin: "top right" }}
                            >
                              <div className="p-2 space-y-0.5">
                                <button
                                  onClick={() => {
                                    openEditTemplate(t);
                                    setOpenTemplateId(null);
                                  }}
                                  className="w-full text-left px-3 py-2.5 text-sm font-semibold text-nuanu-navy hover:bg-nuanu-gray-50 rounded-lg flex items-center gap-3"
                                >
                                  <Edit2 className="w-4 h-4 text-blue-500" />{" "}
                                  Edit Template
                                </button>
                                <button
                                  onClick={() => {
                                    setFormData((p) => ({
                                      ...p,
                                      title: t.title,
                                      type: t.type,
                                    }));
                                    setIsModalOpen(true);
                                    setOpenTemplateId(null);
                                  }}
                                  className="w-full text-left px-3 py-2.5 text-sm font-semibold text-nuanu-navy hover:bg-emerald-50 rounded-lg flex items-center gap-3"
                                >
                                  <Send className="w-4 h-4 text-emerald-500" />{" "}
                                  Use Template
                                </button>
                                <button
                                  onClick={() =>
                                    handleToggleTemplate(
                                      t.id,
                                      t.status === "Active",
                                    )
                                  }
                                  className="w-full text-left px-3 py-2.5 text-sm font-semibold text-nuanu-navy hover:bg-nuanu-gray-50 rounded-lg flex items-center gap-3"
                                >
                                  {t.status === "Active" ? (
                                    <ToggleRight className="w-4 h-4 text-emerald-500" />
                                  ) : (
                                    <ToggleLeft className="w-4 h-4 text-gray-400" />
                                  )}
                                  {t.status === "Active"
                                    ? "Deactivate"
                                    : "Activate"}
                                </button>
                                <div className="h-px bg-nuanu-gray-100 my-1" />
                                <button
                                  onClick={() => handleDeleteTemplate(t.id)}
                                  className="w-full text-left px-3 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-50 rounded-lg flex items-center gap-3"
                                >
                                  <X className="w-4 h-4" /> Delete
                                </button>
                              </div>
                            </motion.div>
                          </>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                </div>

                <h3 className="text-base font-black text-nuanu-navy mb-1 truncate">
                  {t.title}
                </h3>
                <div className="flex items-center gap-2 mb-5">
                  <span className="text-[10px] font-bold text-nuanu-gray-400 uppercase tracking-wider">
                    {getTypeLabel(t.type)}
                  </span>
                  <span className="w-1 h-1 rounded-full bg-nuanu-gray-300" />
                  <span className="text-[11px] font-bold text-nuanu-gray-500">
                    {t.duration}
                  </span>
                </div>
                <div className="flex items-center justify-between p-4 bg-nuanu-gray-50 rounded-xl mb-5">
                  <div className="text-center flex-1 border-r border-nuanu-gray-200">
                    <p className="text-[10px] font-bold text-nuanu-gray-400 uppercase mb-1">
                      Used
                    </p>
                    <p className="font-black text-nuanu-navy flex items-center justify-center gap-1">
                      <Users className="w-3.5 h-3.5" /> {t.candidates}
                    </p>
                  </div>
                  <div className="text-center flex-1">
                    <p className="text-[10px] font-bold text-nuanu-gray-400 uppercase mb-1">
                      Avg Score
                    </p>
                    <p className="font-black text-nuanu-emerald">
                      {t.avgScore}%
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setFormData((p) => ({
                      ...p,
                      title: t.title,
                      type: t.type,
                    }));
                    setIsModalOpen(true);
                  }}
                  className="w-full py-3 bg-nuanu-navy text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-nuanu-navy/90 transition-all shadow-md"
                >
                  <Send className="w-4 h-4" /> Send to Candidate
                </button>
              </motion.div>
            ))}
            {filteredTemplates.length === 0 && (
              <div className="col-span-full py-24 text-center">
                <FileSpreadsheet className="w-12 h-12 text-nuanu-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-bold text-nuanu-navy">
                  No templates found
                </h3>
                <p className="text-nuanu-gray-500 max-w-xs mx-auto mt-1">
                  Create your first assessment template.
                </p>
                <button
                  onClick={() => {
                    setEditingTemplate(null);
                    setIsTemplateModalOpen(true);
                  }}
                  className="btn-primary mt-6 text-sm gap-2"
                >
                  <Plus className="w-4 h-4" /> Create Template
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── MODALS ── */}
      <AnimatePresence>
        {/* Score / Result Modal */}
        {isResultModalOpen && selectedAssessment && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              onClick={() => !isSubmitting && setIsResultModalOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-lg relative z-10 overflow-hidden"
            >
              {/* Header */}
              <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-nuanu-navy to-nuanu-navy/90 text-white flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
                    {getTypeIcon(selectedAssessment.type)}
                  </div>
                  <div>
                    <h2 className="font-black text-base">
                      {selectedAssessment.score !== null
                        ? "Update Score"
                        : "Enter Score"}
                    </h2>
                    <p className="text-[11px] text-white/60">
                      {selectedAssessment.candidateName} ·{" "}
                      {selectedAssessment.title}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsResultModalOpen(false)}
                  className="p-2 hover:bg-white/10 rounded-full transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmitResult} className="p-6 space-y-5">
                {/* Assessment info */}
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="bg-nuanu-gray-50 rounded-xl p-3">
                    <p className="text-[9px] font-black text-nuanu-gray-400 uppercase tracking-widest mb-1">
                      Max Score
                    </p>
                    <p className="font-black text-nuanu-navy text-lg">
                      {selectedAssessment.maxScore}
                    </p>
                  </div>
                  <div className="bg-nuanu-gray-50 rounded-xl p-3">
                    <p className="text-[9px] font-black text-nuanu-gray-400 uppercase tracking-widest mb-1">
                      Pass Threshold
                    </p>
                    <p className="font-black text-amber-600 text-lg">
                      {selectedAssessment.passThreshold}%
                    </p>
                  </div>
                  <div
                    className={`rounded-xl p-3 ${resultData.score > 0 ? ((resultData.score / selectedAssessment.maxScore) * 100 >= selectedAssessment.passThreshold ? "bg-emerald-50" : "bg-red-50") : "bg-nuanu-gray-50"}`}
                  >
                    <p className="text-[9px] font-black text-nuanu-gray-400 uppercase tracking-widest mb-1">
                      Result
                    </p>
                    <p
                      className={`font-black text-lg ${resultData.score > 0 ? ((resultData.score / selectedAssessment.maxScore) * 100 >= selectedAssessment.passThreshold ? "text-emerald-600" : "text-red-600") : "text-nuanu-gray-300"}`}
                    >
                      {resultData.score > 0
                        ? (resultData.score / selectedAssessment.maxScore) *
                            100 >=
                          selectedAssessment.passThreshold
                          ? "PASS ✓"
                          : "FAIL ✗"
                        : "—"}
                    </p>
                  </div>
                </div>

                {/* Score Input */}
                <div>
                  <label className="block text-xs font-bold text-nuanu-gray-600 mb-3 uppercase tracking-wider">
                    Score <span className="text-nuanu-emerald">*</span>
                    <span className="ml-2 text-nuanu-navy font-black text-base">
                      {resultData.score} / {selectedAssessment.maxScore}
                    </span>
                    <span className="ml-1 text-nuanu-gray-400">
                      ({pct(resultData.score, selectedAssessment.maxScore)}%)
                    </span>
                  </label>
                  <input
                    type="range"
                    min={0}
                    max={selectedAssessment.maxScore}
                    step={1}
                    value={resultData.score}
                    onChange={(e) =>
                      setResultData((p) => ({
                        ...p,
                        score: parseInt(e.target.value),
                      }))
                    }
                    className="w-full h-3 rounded-full appearance-none cursor-pointer accent-nuanu-navy mb-2"
                  />
                  <div className="flex justify-between text-[10px] text-nuanu-gray-400 font-bold">
                    <span>0</span>
                    <span className="text-amber-500">
                      Pass:{" "}
                      {Math.round(
                        (selectedAssessment.maxScore *
                          selectedAssessment.passThreshold) /
                          100,
                      )}
                    </span>
                    <span>{selectedAssessment.maxScore}</span>
                  </div>
                  <div className="mt-3 flex items-center gap-3">
                    <input
                      type="number"
                      min={0}
                      max={selectedAssessment.maxScore}
                      value={resultData.score}
                      onChange={(e) =>
                        setResultData((p) => ({
                          ...p,
                          score: Math.min(
                            selectedAssessment.maxScore,
                            Math.max(0, parseInt(e.target.value) || 0),
                          ),
                        }))
                      }
                      className="input-field py-2 w-28 text-center font-black text-lg"
                    />
                    <span className="text-nuanu-gray-400 font-bold">
                      / {selectedAssessment.maxScore} points
                    </span>
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-xs font-bold text-nuanu-gray-600 mb-1 uppercase tracking-wider">
                    Evaluator Notes
                  </label>
                  <textarea
                    value={resultData.notes}
                    onChange={(e) =>
                      setResultData((p) => ({ ...p, notes: e.target.value }))
                    }
                    className="input-field py-2 text-sm resize-none"
                    rows={3}
                    placeholder="Observations, comments, feedback for candidate..."
                  />
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsResultModalOpen(false)}
                    className="btn-secondary"
                    disabled={isSubmitting}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn-primary px-8"
                    disabled={isSubmitting || resultData.score === 0}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" /> Saving...
                      </>
                    ) : (
                      <>
                        <Award className="w-4 h-4" /> Save Result
                      </>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {/* Create / Edit Template Modal */}
        {isTemplateModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              onClick={() => !isSubmitting && setIsTemplateModalOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-lg relative z-10 overflow-hidden"
            >
              <div className="p-6 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
                <h2 className="text-lg font-bold text-nuanu-navy flex items-center gap-2">
                  <FileSpreadsheet className="w-5 h-5 text-nuanu-emerald" />
                  {editingTemplate
                    ? "Edit Template"
                    : "Create Assessment Template"}
                </h2>
                <button
                  onClick={() => setIsTemplateModalOpen(false)}
                  className="p-2 text-gray-400 hover:bg-gray-200 rounded-full"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <form onSubmit={handleSaveTemplate} className="p-6 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">
                    Template Title *
                  </label>
                  <input
                    required
                    type="text"
                    value={templateData.title}
                    onChange={(e) =>
                      setTemplateData((p) => ({ ...p, title: e.target.value }))
                    }
                    className="input-field py-2.5"
                    placeholder="e.g. Senior Backend Engineering Assessment"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">
                      Type
                    </label>
                    <select
                      value={templateData.type}
                      onChange={(e) =>
                        setTemplateData((p) => ({ ...p, type: e.target.value }))
                      }
                      className="input-field py-2.5 appearance-none"
                    >
                      <option value="skill_test">Skill Test</option>
                      <option value="cognitive">Cognitive</option>
                      <option value="personality">Personality</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">
                      Duration (minutes)
                    </label>
                    <input
                      type="number"
                      min={5}
                      value={templateData.duration}
                      onChange={(e) =>
                        setTemplateData((p) => ({
                          ...p,
                          duration: parseInt(e.target.value),
                        }))
                      }
                      className="input-field py-2.5"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">
                    Pass Threshold (%)
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={templateData.passThreshold}
                      onChange={(e) =>
                        setTemplateData((p) => ({
                          ...p,
                          passThreshold: parseInt(e.target.value),
                        }))
                      }
                      className="flex-1 accent-nuanu-emerald"
                    />
                    <span className="font-black text-nuanu-navy w-12 text-right">
                      {templateData.passThreshold}%
                    </span>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">
                    Description / Instructions
                  </label>
                  <textarea
                    value={templateData.description}
                    onChange={(e) =>
                      setTemplateData((p) => ({
                        ...p,
                        description: e.target.value,
                      }))
                    }
                    className="input-field py-2 text-sm resize-none"
                    rows={3}
                    placeholder="Instructions for the candidate..."
                  />
                </div>
                <div className="pt-2 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setIsTemplateModalOpen(false)}
                    className="btn-secondary"
                    disabled={isSubmitting}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn-primary px-8"
                    disabled={isSubmitting || !templateData.title}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" /> Saving...
                      </>
                    ) : editingTemplate ? (
                      "Save Changes"
                    ) : (
                      "Create Template"
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {/* Send Assessment Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              onClick={() => !isSubmitting && setIsModalOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-lg relative z-10 overflow-hidden"
            >
              <div className="p-6 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
                <h2 className="text-lg font-bold text-nuanu-navy flex items-center gap-2">
                  <Send className="w-5 h-5 text-nuanu-emerald" /> Send New
                  Assessment
                </h2>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="p-2 text-gray-400 hover:bg-gray-200 rounded-full"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <form onSubmit={handleSendAssessment} className="p-6 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">
                    Candidate *
                  </label>
                  <select
                    required
                    value={formData.applicationId}
                    onChange={(e) =>
                      setFormData((p) => ({
                        ...p,
                        applicationId: e.target.value,
                      }))
                    }
                    className="input-field py-2.5"
                  >
                    <option value="" disabled>
                      Select candidate...
                    </option>
                    {activeApplications.map((app) => (
                      <option key={app.id} value={app.id}>
                        {app.candidateName} — {app.vacancyTitle}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">
                      Assessment Type
                    </label>
                    <select
                      value={formData.type}
                      onChange={(e) =>
                        setFormData((p) => ({ ...p, type: e.target.value }))
                      }
                      className="input-field py-2.5 appearance-none"
                    >
                      <option value="skill_test">Skill Test</option>
                      <option value="cognitive">Cognitive</option>
                      <option value="personality">Personality</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">
                      Max Score
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={formData.maxScore}
                      onChange={(e) =>
                        setFormData((p) => ({
                          ...p,
                          maxScore: parseInt(e.target.value),
                        }))
                      }
                      className="input-field py-2.5"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">
                    Assessment Title *
                  </label>
                  <input
                    required
                    type="text"
                    value={formData.title}
                    onChange={(e) =>
                      setFormData((p) => ({ ...p, title: e.target.value }))
                    }
                    className="input-field py-2.5"
                    placeholder="e.g. Backend Engineering Assessment"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">
                    Pass Threshold (%)
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={formData.passThreshold}
                      onChange={(e) =>
                        setFormData((p) => ({
                          ...p,
                          passThreshold: parseInt(e.target.value),
                        }))
                      }
                      className="flex-1 accent-nuanu-emerald"
                    />
                    <span className="font-black text-nuanu-navy w-10 text-right">
                      {formData.passThreshold}%
                    </span>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">
                    Instructions / Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) =>
                      setFormData((p) => ({
                        ...p,
                        description: e.target.value,
                      }))
                    }
                    className="input-field py-2 text-sm resize-none"
                    rows={3}
                    placeholder="Describe the assessment tasks..."
                  />
                </div>
                <div className="pt-2 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="btn-secondary"
                    disabled={isSubmitting}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn-primary px-8"
                    disabled={
                      isSubmitting || !formData.applicationId || !formData.title
                    }
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" /> Sending...
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" /> Send Assessment
                      </>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
