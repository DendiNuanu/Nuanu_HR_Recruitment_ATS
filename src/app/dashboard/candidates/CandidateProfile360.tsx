"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Activity,
  ClipboardList,
  Clock,
  Loader2,
  UserCheck,
  X,
} from "lucide-react";
import { motion } from "framer-motion";
import { formatDate } from "@/lib/utils";
import type { Candidate } from "./CandidatesTable";
import ReferenceCheckTab from "./ReferenceCheckTab";

interface AssessmentResult {
  id: string;
  title: string;
  type: string;
  status: string;
  score: number | null;
  maxScore: number;
  passThreshold: number;
  isPassed: boolean | null;
  completedAt: string | null; 
  createdAt: string;
}

type Tab = "assessments" | "references" | "timeline";

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: "assessments", label: "Assessments", icon: ClipboardList },
  { id: "references", label: "Reference Check", icon: UserCheck },
  { id: "timeline", label: "Activity Timeline", icon: Activity },
];

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700",
  contacted: "bg-blue-100 text-blue-700",
  verified: "bg-emerald-100 text-emerald-700",
  failed: "bg-red-100 text-red-700",
  completed: "bg-emerald-100 text-emerald-700",
  started: "bg-blue-100 text-blue-700",
  cancelled: "bg-red-100 text-red-700",
};

export default function CandidateProfile360({
  candidate,
  vacancyTitle,
  onCloseAction,
}: {
  candidate: Candidate;
  vacancyTitle?: string;
  onCloseAction: () => void;
}) {
  const appliedFor =
    candidate.referPosition ||
    candidate.vacancyTitle ||
    vacancyTitle ||
    "Role not specified";

  const [activeTab, setActiveTab] = useState<Tab>("assessments");
  const [assessments, setAssessments] = useState<AssessmentResult[]>([]);
  const [timeline, setTimeline] = useState<
    { action: string; createdAt: string }[]
  >([]);
  const [loading, setLoading] = useState(false);

  const fetchTabData = useCallback(
    async (tab: Tab) => {
      if (tab === "references") return;
      setLoading(true);
      try {
        if (tab === "assessments") {
          const res = await fetch(
            `/api/candidates/${candidate.id}/assessments`,
          );
          if (res.ok) setAssessments(await res.json());
        } else if (tab === "timeline") {
          const res = await fetch(`/api/candidates/${candidate.id}/timeline`);
          if (res.ok) setTimeline(await res.json());
        }
      } catch {
        // Non-fatal
      } finally {
        setLoading(false);
      }
    },
    [candidate.id],
  );

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void fetchTabData(activeTab);
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, [activeTab, fetchTabData]);

  return (
    <div className="fixed inset-0 z-[110]">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onCloseAction}
      />
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 z-10 flex flex-col overflow-hidden bg-white"
      >
        <div className="flex flex-shrink-0 items-center justify-between border-b border-gray-100 bg-gradient-to-r from-nuanu-navy to-[#0D2040] p-6">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/20 text-lg font-bold text-emerald-300">
              {candidate.name
                .split(" ")
                .map((n) => n[0])
                .join("")
                .substring(0, 2)
                .toUpperCase()}
            </div>
            <div>
              <h2 className="text-xl font-extrabold text-white">
                {candidate.name}
              </h2>
              <p className="text-sm text-white/60">
                {appliedFor} · 360° Profile
              </p>
            </div>
          </div>
          <button
            onClick={onCloseAction}
            className="rounded-full p-2 text-white/50 transition-colors hover:bg-white/10 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex flex-shrink-0 overflow-x-auto border-b border-gray-100 bg-gray-50/50">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex items-center gap-2 whitespace-nowrap border-b-2 px-5 py-4 text-sm font-bold transition-all ${
                activeTab === id
                  ? "border-emerald-500 bg-white text-emerald-700"
                  : "border-transparent text-nuanu-gray-400 hover:bg-white/60 hover:text-nuanu-navy"
              }`}
            >
              <Icon className="h-4 w-4" /> {label}
            </button>
          ))}
        </div>

        <div
          className={`min-h-0 flex-1 bg-gray-50/30 ${
            activeTab === "references"
              ? "flex flex-col overflow-hidden"
              : "overflow-y-auto"
          }`}
        >
          {activeTab !== "references" && loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
            </div>
          ) : (
            <>
              {activeTab === "assessments" && (
                <div className="space-y-4 p-6">
                  {assessments.length === 0 ? (
                    <EmptyState
                      icon={ClipboardList}
                      title="No Assessments"
                      message="No assessments have been assigned to this candidate yet."
                    />
                  ) : (
                    assessments.map((assessment) => (
                      <div
                        key={assessment.id}
                        className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm"
                      >
                        <div className="mb-3 flex items-start justify-between">
                          <div>
                            <p className="font-bold text-nuanu-navy">
                              {assessment.title}
                            </p>
                            <p className="mt-0.5 text-xs text-nuanu-gray-400">
                              {assessment.type} ·{" "}
                              {formatDate(assessment.createdAt)}
                            </p>
                          </div>
                          <span
                            className={`rounded-full px-2.5 py-1 text-xs font-bold uppercase tracking-wide ${STATUS_COLORS[assessment.status] ?? "bg-gray-100 text-gray-600"}`}
                          >
                            {assessment.status}
                          </span>
                        </div>
                        {assessment.status === "completed" &&
                          assessment.score !== null && (
                            <div className="mt-3 flex items-center gap-4 border-t border-gray-50 pt-3">
                              <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-100">
                                <div
                                  className={`h-full rounded-full ${assessment.isPassed ? "bg-emerald-500" : "bg-red-400"}`}
                                  style={{
                                    width: `${(assessment.score / assessment.maxScore) * 100}%`,
                                  }}
                                />
                              </div>
                              <span
                                className={`text-sm font-bold ${assessment.isPassed ? "text-emerald-600" : "text-red-500"}`}
                              >
                                {assessment.score}/{assessment.maxScore}{" "}
                                {assessment.isPassed ? "✓ Passed" : "✗ Failed"}
                              </span>
                            </div>
                          )}
                      </div>
                    ))
                  )}
                </div>
              )}

              {activeTab === "references" && (
                <ReferenceCheckTab
                  applicationId={candidate.id}
                  candidateName={candidate.name}
                  positionLabel={appliedFor}
                />
              )}

              {activeTab === "timeline" && (
                <div className="p-6">
                  {timeline.length === 0 ? (
                    <EmptyState
                      icon={Activity}
                      title="No Activity Yet"
                      message="Activity events will appear here as the candidate progresses through the pipeline."
                    />
                  ) : (
                    <div className="relative">
                      <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-gray-100" />
                      <div className="space-y-4">
                        {timeline.map((event, index) => (
                          <div
                            key={`${event.createdAt}-${index}`}
                            className="relative flex gap-4"
                          >
                            <div className="z-10 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full border-2 border-white bg-emerald-100 text-emerald-600">
                              <Activity className="h-4 w-4" />
                            </div>
                            <div className="flex-1 rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
                              <p className="text-sm font-medium text-nuanu-navy">
                                {event.action}
                              </p>
                              <p className="mt-1 flex items-center gap-1 text-xs text-nuanu-gray-400">
                                <Clock className="h-3 w-3" />{" "}
                                {formatDate(event.createdAt)}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
}

function EmptyState({
  icon: Icon,
  title,
  message,
}: {
  icon: React.ElementType;
  title: string;
  message: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-50">
        <Icon className="h-8 w-8 text-nuanu-gray-300" />
      </div>
      <p className="mb-1 text-lg font-bold text-nuanu-navy">{title}</p>
      <p className="max-w-xs text-sm text-nuanu-gray-400">{message}</p>
    </div>
  );
}
