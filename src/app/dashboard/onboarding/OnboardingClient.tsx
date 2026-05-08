"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import {
  UserPlus,
  Search,
  Filter,
  CheckSquare,
  Clock,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  X,
  Loader2,
  Users,
  CheckCircle2,
  XCircle,
  Plus,
  Trash2,
  Award,
  Tag,
  Calendar,
  RotateCcw,
  Building2,
} from "lucide-react";
import { formatDate } from "@/lib/utils";
import {
  startOnboarding,
  completeTask,
  reopenTask,
  addOnboardingTask,
  deleteOnboardingTask,
  completeOnboarding,
} from "./actions";

// ─────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────

export type OnboardingTask = {
  id: string;
  title: string;
  category: string;
  priority: number;
  status: string;
  dueDate: string | null;
  completedAt: string | null;
  notes: string | null;
};

export type OnboardingData = {
  id: string;
  candidateName: string;
  position: string;
  department: string;
  startDate: string | Date;
  progress: number;
  status: string;
  tasksCompleted: number;
  tasksTotal: number;
  overdueTasks: number;
  tasks: OnboardingTask[];
};

type ActiveApp = {
  id: string;
  candidateName: string;
  vacancyTitle: string;
};

type Department = {
  id: string;
  name: string;
};

// ─────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────

function getCategoryColor(cat: string): string {
  const map: Record<string, string> = {
    documentation: "bg-blue-100 text-blue-700",
    training: "bg-purple-100 text-purple-700",
    it_setup: "bg-cyan-100 text-cyan-700",
    admin: "bg-amber-100 text-amber-700",
    general: "bg-gray-100 text-gray-600",
  };
  return map[cat] ?? "bg-gray-100 text-gray-600";
}

function getCategoryLabel(cat: string): string {
  const map: Record<string, string> = {
    documentation: "Docs",
    training: "Training",
    it_setup: "IT Setup",
    admin: "Admin",
    general: "General",
  };
  return map[cat] ?? cat;
}

function getStatusColor(status: string): string {
  switch (status) {
    case "Completed":
      return "text-emerald-700 bg-emerald-100";
    case "In Progress":
      return "text-blue-700 bg-blue-100";
    case "Pending":
      return "text-amber-700 bg-amber-100";
    default:
      return "text-gray-600 bg-gray-100";
  }
}

function recalcOnboarding(
  o: OnboardingData,
  updatedTasks: OnboardingTask[],
): OnboardingData {
  const done = updatedTasks.filter((t) => t.status === "completed").length;
  const total = updatedTasks.length;
  const progress = total > 0 ? Math.round((done / total) * 100) : 0;
  let status = "Pending";
  if (progress === 100) status = "Completed";
  else if (progress > 0) status = "In Progress";
  return {
    ...o,
    tasks: updatedTasks,
    tasksCompleted: done,
    tasksTotal: total,
    progress,
    status,
  };
}

// ─────────────────────────────────────────────────────────────
// COMPONENT
// ─────────────────────────────────────────────────────────────

export default function OnboardingClient({
  onboardings,
  stats,
  activeApplications = [],
  departments = [],
}: {
  onboardings: OnboardingData[];
  stats: {
    total: number;
    completed: number;
    inProgress: number;
    overdue: number;
  };
  activeApplications?: ActiveApp[];
  departments?: Department[];
}) {
  const router = useRouter();

  // ── Core state ──────────────────────────────────────────────
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [isStartModalOpen, setIsStartModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadingTaskId, setLoadingTaskId] = useState<string | null>(null);

  // Local optimistic state
  const [localOnboardings, setLocalOnboardings] =
    useState<OnboardingData[]>(onboardings);

  // Add task form (per expanded row)
  const [showAddTask, setShowAddTask] = useState(false);
  const [newTaskData, setNewTaskData] = useState({
    title: "",
    category: "general",
    dueDate: "",
  });

  // Start onboarding form
  const [startFormData, setStartFormData] = useState({
    applicationId: "",
    departmentId: "",
  });

  // ── Sync when server data changes ───────────────────────────
  useEffect(() => {
    setLocalOnboardings(onboardings);
  }, [onboardings]);

  // Reset add-task form when a different row is expanded
  useEffect(() => {
    setShowAddTask(false);
    setNewTaskData({ title: "", category: "general", dueDate: "" });
  }, [expandedId]);

  // ── Task handlers ────────────────────────────────────────────

  const handleToggleTask = useCallback(
    async (onboardingId: string, task: OnboardingTask) => {
      setLoadingTaskId(task.id);
      const isCompleting = task.status !== "completed";

      // Optimistic update
      setLocalOnboardings((prev) =>
        prev.map((o) => {
          if (o.id !== onboardingId) return o;
          const updatedTasks = o.tasks.map((t) =>
            t.id === task.id
              ? {
                  ...t,
                  status: isCompleting ? "completed" : "pending",
                  completedAt: isCompleting ? new Date().toISOString() : null,
                }
              : t,
          );
          return recalcOnboarding(o, updatedTasks);
        }),
      );

      try {
        const res = isCompleting
          ? await completeTask(task.id)
          : await reopenTask(task.id);
        if (res.success) {
          toast.success(isCompleting ? "Task completed!" : "Task reopened.");
          router.refresh();
        } else {
          toast.error(res.error ?? "Failed to update task");
          setLocalOnboardings(onboardings);
        }
      } catch {
        toast.error("Unexpected error");
        setLocalOnboardings(onboardings);
      } finally {
        setLoadingTaskId(null);
      }
    },
    [onboardings, router],
  );

  const handleAddTask = useCallback(
    async (onboardingId: string) => {
      if (!newTaskData.title.trim()) return;
      setIsSubmitting(true);
      try {
        const res = await addOnboardingTask({
          employeeId: onboardingId,
          title: newTaskData.title,
          category: newTaskData.category,
          dueDate: newTaskData.dueDate || undefined,
        });
        if (res.success) {
          toast.success("Task added!");
          setNewTaskData({ title: "", category: "general", dueDate: "" });
          setShowAddTask(false);
          router.refresh();
        } else {
          toast.error(res.error ?? "Failed to add task");
        }
      } catch {
        toast.error("Unexpected error");
      } finally {
        setIsSubmitting(false);
      }
    },
    [newTaskData, router],
  );

  const handleDeleteTask = useCallback(
    async (onboardingId: string, taskId: string) => {
      if (!confirm("Delete this task?")) return;
      const res = await deleteOnboardingTask(taskId);
      if (res.success) {
        toast.success("Task deleted.");
        setLocalOnboardings((prev) =>
          prev.map((o) => {
            if (o.id !== onboardingId) return o;
            const updatedTasks = o.tasks.filter((t) => t.id !== taskId);
            return recalcOnboarding(o, updatedTasks);
          }),
        );
        router.refresh();
      } else {
        toast.error("Failed to delete task");
      }
    },
    [router],
  );

  const handleCompleteOnboarding = useCallback(
    async (onboardingId: string, candidateName: string) => {
      if (
        !confirm(
          `Mark all tasks complete and finalize ${candidateName}'s onboarding?`,
        )
      )
        return;
      setIsSubmitting(true);
      try {
        const res = await completeOnboarding(onboardingId);
        if (res.success) {
          toast.success(`${candidateName}'s onboarding is complete! 🎉`);
          setLocalOnboardings((prev) =>
            prev.map((o) => {
              if (o.id !== onboardingId) return o;
              const updatedTasks = o.tasks.map((t) => ({
                ...t,
                status: "completed",
                completedAt: new Date().toISOString(),
              }));
              return recalcOnboarding(o, updatedTasks);
            }),
          );
          router.refresh();
        } else {
          toast.error("Failed to complete onboarding");
        }
      } catch {
        toast.error("Unexpected error");
      } finally {
        setIsSubmitting(false);
      }
    },
    [router],
  );

  const handleStartOnboarding = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!startFormData.applicationId) return;
      setIsSubmitting(true);
      try {
        const res = await startOnboarding(startFormData);
        if (res.success) {
          toast.success("Onboarding started successfully!");
          setIsStartModalOpen(false);
          setStartFormData({ applicationId: "", departmentId: "" });
          router.refresh();
        } else {
          toast.error(res.error ?? "Failed to start onboarding");
        }
      } catch {
        toast.error("Unexpected error");
      } finally {
        setIsSubmitting(false);
      }
    },
    [startFormData, router],
  );

  // ── Filtered list ────────────────────────────────────────────
  const filtered = localOnboardings.filter((o) => {
    const matchSearch =
      o.candidateName.toLowerCase().includes(search.toLowerCase()) ||
      o.position.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || o.status === statusFilter;
    return matchSearch && matchStatus;
  });

  // ── Stats cards config ───────────────────────────────────────
  const statsCards = [
    {
      icon: Users,
      label: "Total Employees",
      value: stats.total,
      sub: "in onboarding pipeline",
      bg: "bg-blue-50",
      iconBg: "bg-blue-100",
      iconColor: "text-blue-600",
      border: "border-blue-100",
    },
    {
      icon: Clock,
      label: "In Progress",
      value: stats.inProgress,
      sub: "currently onboarding",
      bg: "bg-amber-50",
      iconBg: "bg-amber-100",
      iconColor: "text-amber-600",
      border: "border-amber-100",
    },
    {
      icon: CheckCircle2,
      label: "Completed",
      value: stats.completed,
      sub: "fully onboarded",
      bg: "bg-emerald-50",
      iconBg: "bg-emerald-100",
      iconColor: "text-emerald-600",
      border: "border-emerald-100",
    },
    {
      icon: AlertTriangle,
      label: "Overdue Tasks",
      value: stats.overdue,
      sub: "need immediate action",
      bg: "bg-red-50",
      iconBg: "bg-red-100",
      iconColor: "text-red-600",
      border: "border-red-100",
    },
  ] as const;

  // ─────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-nuanu-navy">
            Employee Onboarding
          </h1>
          <p className="text-sm text-nuanu-gray-500 mt-1">
            Track new hire progress and onboarding checklists
          </p>
        </div>
        <button
          onClick={() => setIsStartModalOpen(true)}
          className="btn-primary gap-2"
        >
          <UserPlus className="w-5 h-5" /> Start Onboarding
        </button>
      </div>

      {/* ── Stats ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statsCards.map((card) => (
          <div
            key={card.label}
            className={`card p-5 border ${card.border} ${card.bg}`}
          >
            <div className="flex items-center gap-3 mb-3">
              <div className={`p-2 ${card.iconBg} rounded-xl`}>
                <card.icon className={`w-5 h-5 ${card.iconColor}`} />
              </div>
              <span className="text-xs font-semibold text-nuanu-gray-600 leading-tight">
                {card.label}
              </span>
            </div>
            <p className="text-3xl font-bold text-nuanu-navy">{card.value}</p>
            <p className="text-[11px] text-nuanu-gray-400 mt-1">{card.sub}</p>
          </div>
        ))}
      </div>

      {/* ── Main card ── */}
      <div className="card">
        {/* Search + filter bar */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6 border-b border-nuanu-gray-100 pb-6">
          <div className="relative flex-1 group">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-nuanu-gray-400 group-focus-within:text-emerald-500 transition-colors pointer-events-none z-10">
              <Search className="w-5 h-5" />
            </div>
            <input
              type="text"
              placeholder="Search by name or position..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input-field !pl-14 h-12 transition-all"
            />
          </div>
          <div className="relative min-w-[180px]">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="input-field appearance-none"
            >
              <option value="all">All Statuses</option>
              <option value="In Progress">In Progress</option>
              <option value="Pending">Pending</option>
              <option value="Completed">Completed</option>
            </select>
            <Filter className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-nuanu-gray-400 pointer-events-none" />
          </div>
        </div>

        {/* ── List or empty state ── */}
        {filtered.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-20 h-20 rounded-2xl bg-nuanu-gray-50 flex items-center justify-center mx-auto mb-4">
              <Users className="w-10 h-10 text-nuanu-gray-300" />
            </div>
            <h3 className="text-lg font-bold text-nuanu-navy">
              No onboarding records
            </h3>
            <p className="text-nuanu-gray-500 max-w-xs mx-auto mt-1">
              Start onboarding for a hired candidate to get started.
            </p>
            <button
              onClick={() => setIsStartModalOpen(true)}
              className="btn-primary mt-6 gap-2"
            >
              <UserPlus className="w-4 h-4" /> Start Onboarding
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((item, i) => {
              const isExpanded = expandedId === item.id;

              return (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="border border-nuanu-gray-200 rounded-2xl overflow-hidden bg-white hover:shadow-md transition-shadow"
                >
                  {/* ── Row header ── */}
                  <div
                    className="flex flex-col md:flex-row md:items-center gap-4 p-5 cursor-pointer select-none"
                    onClick={() => setExpandedId(isExpanded ? null : item.id)}
                  >
                    {/* Avatar + name/position */}
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                      <div className="w-11 h-11 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-sm flex-shrink-0">
                        {item.candidateName.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-bold text-nuanu-navy truncate">
                          {item.candidateName}
                        </h3>
                        <div className="flex items-center gap-1.5 text-xs text-nuanu-gray-500 mt-0.5 flex-wrap">
                          <span className="truncate max-w-[140px]">
                            {item.position}
                          </span>
                          <span className="text-nuanu-gray-300">•</span>
                          <Building2 className="w-3 h-3 flex-shrink-0" />
                          <span>{item.department}</span>
                        </div>
                      </div>
                    </div>

                    {/* Progress bar */}
                    <div className="flex-1 max-w-xs w-full">
                      <div className="flex justify-between text-xs font-medium text-nuanu-gray-600 mb-1.5">
                        <span>
                          {item.tasksCompleted}/{item.tasksTotal} tasks
                        </span>
                        <span className="font-bold text-nuanu-navy">
                          {item.progress}%
                        </span>
                      </div>
                      <div className="h-2 bg-nuanu-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-nuanu-emerald to-nuanu-teal transition-all duration-500"
                          style={{ width: `${item.progress}%` }}
                        />
                      </div>
                    </div>

                    {/* Status + overdue badge + date */}
                    <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
                      <span
                        className={`text-xs font-semibold px-2.5 py-1 rounded-full ${getStatusColor(item.status)}`}
                      >
                        {item.status}
                      </span>
                      {item.overdueTasks > 0 && (
                        <span className="text-xs font-bold text-red-600 bg-red-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" />
                          {item.overdueTasks} overdue
                        </span>
                      )}
                      <span className="text-xs text-nuanu-gray-400 hidden lg:block">
                        {formatDate(item.startDate)}
                      </span>
                    </div>

                    {/* Expand/collapse chevron */}
                    <button
                      className="p-2 text-nuanu-gray-400 hover:text-nuanu-navy hover:bg-nuanu-gray-50 rounded-lg transition-all flex-shrink-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        setExpandedId(isExpanded ? null : item.id);
                      }}
                      aria-label={isExpanded ? "Collapse" : "Expand"}
                    >
                      <ChevronDown
                        className={`w-5 h-5 transition-transform duration-200 ${
                          isExpanded ? "rotate-180" : ""
                        }`}
                      />
                    </button>
                  </div>

                  {/* ── Accordion task panel ── */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        key="tasks-panel"
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.22, ease: "easeInOut" }}
                        className="overflow-hidden"
                      >
                        <div className="px-5 pb-5 border-t border-nuanu-gray-100 bg-nuanu-gray-50/40">
                          {/* Panel header */}
                          <div className="flex items-center justify-between mb-4 pt-4">
                            <h4 className="font-bold text-nuanu-navy text-sm flex items-center gap-2">
                              <CheckSquare className="w-4 h-4 text-nuanu-emerald" />
                              Onboarding Checklist
                              <span className="text-xs font-normal text-nuanu-gray-400">
                                ({item.tasksCompleted}/{item.tasksTotal})
                              </span>
                            </h4>
                            {item.progress === 100 ? (
                              <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full flex items-center gap-1.5">
                                <Award className="w-3.5 h-3.5" />
                                All tasks complete!
                              </span>
                            ) : (
                              <button
                                onClick={() =>
                                  handleCompleteOnboarding(
                                    item.id,
                                    item.candidateName,
                                  )
                                }
                                disabled={isSubmitting}
                                className="text-xs font-bold text-nuanu-emerald hover:text-white hover:bg-nuanu-emerald px-3 py-1.5 rounded-lg border border-nuanu-emerald/30 transition-all disabled:opacity-50"
                              >
                                ✓ Complete All
                              </button>
                            )}
                          </div>

                          {/* Task list */}
                          <div className="space-y-1.5">
                            {item.tasks.map((task) => {
                              const isOverdue = !!(
                                task.status !== "completed" &&
                                task.dueDate &&
                                new Date(task.dueDate) < new Date()
                              );
                              const isDone = task.status === "completed";

                              return (
                                <div
                                  key={task.id}
                                  className={`flex items-center gap-3 p-3 rounded-xl group transition-colors ${
                                    isDone
                                      ? "bg-emerald-50/50"
                                      : isOverdue
                                        ? "bg-red-50/50"
                                        : "bg-white/60"
                                  }`}
                                >
                                  {/* Checkbox toggle */}
                                  <button
                                    onClick={() =>
                                      handleToggleTask(item.id, task)
                                    }
                                    disabled={loadingTaskId === task.id}
                                    title={
                                      isDone
                                        ? "Click to reopen"
                                        : "Mark complete"
                                    }
                                    className={`w-5 h-5 rounded flex-shrink-0 border-2 flex items-center justify-center transition-all ${
                                      isDone
                                        ? "bg-emerald-500 border-emerald-500 hover:bg-emerald-600"
                                        : "border-nuanu-gray-300 hover:border-nuanu-emerald"
                                    }`}
                                  >
                                    {loadingTaskId === task.id ? (
                                      <Loader2 className="w-3 h-3 animate-spin text-white" />
                                    ) : isDone ? (
                                      <CheckCircle2 className="w-3 h-3 text-white" />
                                    ) : null}
                                  </button>

                                  {/* Title + meta */}
                                  <div className="flex-1 min-w-0">
                                    <span
                                      className={`text-sm font-medium ${
                                        isDone
                                          ? "line-through text-nuanu-gray-400"
                                          : "text-nuanu-navy"
                                      }`}
                                    >
                                      {task.title}
                                    </span>
                                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                      <span
                                        className={`text-[10px] font-bold px-1.5 py-0.5 rounded inline-flex items-center gap-1 ${getCategoryColor(task.category)}`}
                                      >
                                        <Tag className="w-2.5 h-2.5" />
                                        {getCategoryLabel(task.category)}
                                      </span>
                                      {task.dueDate && !isDone && (
                                        <span
                                          className={`text-[10px] font-medium flex items-center gap-1 ${
                                            isOverdue
                                              ? "text-red-600"
                                              : "text-nuanu-gray-400"
                                          }`}
                                        >
                                          <Calendar className="w-3 h-3" />
                                          {isOverdue ? "Overdue: " : "Due: "}
                                          {new Date(
                                            task.dueDate,
                                          ).toLocaleDateString("en-US", {
                                            month: "short",
                                            day: "numeric",
                                          })}
                                        </span>
                                      )}
                                      {isDone && task.completedAt && (
                                        <span className="text-[10px] text-emerald-600 flex items-center gap-1">
                                          <CheckCircle2 className="w-3 h-3" />
                                          Done{" "}
                                          {new Date(
                                            task.completedAt,
                                          ).toLocaleDateString("en-US", {
                                            month: "short",
                                            day: "numeric",
                                          })}
                                        </span>
                                      )}
                                    </div>
                                  </div>

                                  {/* Reopen hint (visible on hover for done tasks) */}
                                  {isDone && (
                                    <span
                                      title="Click checkbox to reopen"
                                      className="opacity-0 group-hover:opacity-60 flex items-center gap-1 text-[10px] text-nuanu-gray-400 transition-opacity flex-shrink-0"
                                    >
                                      <RotateCcw className="w-3 h-3" />
                                    </span>
                                  )}

                                  {/* Delete */}
                                  <button
                                    onClick={() =>
                                      handleDeleteTask(item.id, task.id)
                                    }
                                    className="opacity-0 group-hover:opacity-100 p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition-all flex-shrink-0"
                                    title="Delete task"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              );
                            })}
                          </div>

                          {/* Add task section */}
                          {showAddTask && expandedId === item.id ? (
                            <div className="mt-3 flex flex-wrap gap-2 p-3 bg-white border border-nuanu-gray-200 rounded-xl">
                              <input
                                type="text"
                                value={newTaskData.title}
                                onChange={(e) =>
                                  setNewTaskData((p) => ({
                                    ...p,
                                    title: e.target.value,
                                  }))
                                }
                                placeholder="Task title..."
                                className="input-field py-1.5 text-sm flex-1 min-w-[160px]"
                                autoFocus
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") handleAddTask(item.id);
                                  if (e.key === "Escape") setShowAddTask(false);
                                }}
                              />
                              <select
                                value={newTaskData.category}
                                onChange={(e) =>
                                  setNewTaskData((p) => ({
                                    ...p,
                                    category: e.target.value,
                                  }))
                                }
                                className="input-field py-1.5 text-sm w-32 appearance-none"
                              >
                                <option value="general">General</option>
                                <option value="documentation">Docs</option>
                                <option value="training">Training</option>
                                <option value="it_setup">IT Setup</option>
                                <option value="admin">Admin</option>
                              </select>
                              <input
                                type="date"
                                value={newTaskData.dueDate}
                                onChange={(e) =>
                                  setNewTaskData((p) => ({
                                    ...p,
                                    dueDate: e.target.value,
                                  }))
                                }
                                className="input-field py-1.5 text-sm w-36"
                              />
                              <button
                                onClick={() => handleAddTask(item.id)}
                                disabled={
                                  isSubmitting || !newTaskData.title.trim()
                                }
                                className="btn-primary py-1.5 px-4 text-sm"
                              >
                                {isSubmitting ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  "Add"
                                )}
                              </button>
                              <button
                                onClick={() => setShowAddTask(false)}
                                className="p-1.5 text-nuanu-gray-400 hover:bg-nuanu-gray-100 rounded-lg transition-colors"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setShowAddTask(true)}
                              className="mt-3 flex items-center gap-2 text-xs font-bold text-nuanu-emerald hover:text-white hover:bg-nuanu-emerald px-4 py-2 rounded-lg border border-dashed border-nuanu-emerald/40 transition-all w-fit"
                            >
                              <Plus className="w-3.5 h-3.5" /> Add Custom Task
                            </button>
                          )}
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

      {/* ── Start Onboarding Modal ── */}
      <AnimatePresence>
        {isStartModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              onClick={() => !isSubmitting && setIsStartModalOpen(false)}
            />

            {/* Modal */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.18 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden relative z-10"
            >
              {/* Modal header */}
              <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50">
                <h2 className="text-lg font-bold text-nuanu-navy flex items-center gap-2">
                  <UserPlus className="w-5 h-5 text-nuanu-emerald" />
                  Start Onboarding
                </h2>
                <button
                  onClick={() => !isSubmitting && setIsStartModalOpen(false)}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded-full transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleStartOnboarding} className="p-6 space-y-4">
                {/* Candidate select */}
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                    New Hire / Candidate *
                  </label>
                  <select
                    required
                    value={startFormData.applicationId}
                    onChange={(e) =>
                      setStartFormData({
                        ...startFormData,
                        applicationId: e.target.value,
                      })
                    }
                    className="input-field py-2.5"
                  >
                    <option value="" disabled>
                      Select a hire...
                    </option>
                    {activeApplications.map((app) => (
                      <option key={app.id} value={app.id}>
                        {app.candidateName} — {app.vacancyTitle}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Department select */}
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                    Assigned Department
                  </label>
                  <select
                    value={startFormData.departmentId}
                    onChange={(e) =>
                      setStartFormData({
                        ...startFormData,
                        departmentId: e.target.value,
                      })
                    }
                    className="input-field py-2.5"
                  >
                    <option value="">Same as job requisition</option>
                    {departments.map((dept) => (
                      <option key={dept.id} value={dept.id}>
                        {dept.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Info banner */}
                <div className="p-4 bg-blue-50 rounded-xl flex gap-3">
                  <div className="p-2 bg-white rounded-lg h-fit">
                    <CheckSquare className="w-4 h-4 text-blue-500" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-blue-900">
                      Automated Checklist
                    </p>
                    <p className="text-[10px] text-blue-700 mt-0.5">
                      7 default onboarding tasks will be automatically assigned
                      to this hire — covering docs, IT setup, training & admin.
                    </p>
                  </div>
                </div>

                {/* Actions */}
                <div className="pt-4 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setIsStartModalOpen(false)}
                    className="btn-secondary"
                    disabled={isSubmitting}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn-primary px-8"
                    disabled={isSubmitting || !startFormData.applicationId}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Starting...
                      </>
                    ) : (
                      "Start Onboarding"
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
