"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Download,
  Loader2,
  Plus,
  Save,
  Send,
  Share2,
  Star,
} from "lucide-react";
import { toast } from "sonner";
import { formatDateTime } from "@/lib/utils";

type ReferenceCheck = {
  id: string;
  referenceNo: number;
  agencyName: string | null;
  telephone: string | null;
  cityState: string | null;
  jobTitle: string | null;
  employmentFrom: string | null;
  employmentTo: string | null;
  reasonForLeaving: string | null;
  eligibleForRehire: string | null;
  rehireRemarks: string | null;
  personProvidingInfo: string | null;
  personTitle: string | null;
  workPerformance: string | null;
  strengths: string | null;
  areasToImprove: string | null;
  additionalNotes: string | null;
  overallRating: number | null;
  recommendation: string | null;
  conductedAt: string | null;
  updatedAt: string;
  conductor?: { id: string; name: string; email: string } | null;
};

type ShareableUser = {
  id: string;
  name: string;
  email: string;
  roleLabel: string;
};

type SharedStatus = {
  sharedAt: string;
  sharedWith: {
    id: string;
    name: string;
    email: string;
  };
};

type ReferenceDraft = Omit<ReferenceCheck, "id" | "updatedAt" | "conductor"> & {
  id?: string;
  updatedAt?: string;
};

const DEFAULT_REFERENCE_COUNT = 3;
const MAX_REFERENCE_COUNT = 5;

const INPUT_CLASS =
  "w-full border-0 border-b border-gray-300 bg-transparent px-0 py-2 text-sm text-nuanu-navy placeholder:text-gray-400 focus:border-emerald-500 focus:outline-none focus:ring-0";
const TEXTAREA_CLASS =
  "w-full border-0 border-b border-gray-300 bg-transparent px-0 py-2 text-sm text-nuanu-navy placeholder:text-gray-400 focus:border-emerald-500 focus:outline-none focus:ring-0 resize-none";
const LABEL_CLASS =
  "mb-1 block text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-400";

function createEmptyReference(referenceNo: number): ReferenceDraft {
  return {
    referenceNo,
    agencyName: "",
    telephone: "",
    cityState: "",
    jobTitle: "",
    employmentFrom: "",
    employmentTo: "",
    reasonForLeaving: "",
    eligibleForRehire: "",
    rehireRemarks: "",
    personProvidingInfo: "",
    personTitle: "",
    workPerformance: "",
    strengths: "",
    areasToImprove: "",
    additionalNotes: "",
    overallRating: null,
    recommendation: "",
    conductedAt: null,
  };
}

function sanitizeReference(reference: ReferenceDraft) {
  return {
    referenceNo: reference.referenceNo,
    agencyName: reference.agencyName?.trim() || null,
    telephone: reference.telephone?.trim() || null,
    cityState: reference.cityState?.trim() || null,
    jobTitle: reference.jobTitle?.trim() || null,
    employmentFrom: reference.employmentFrom || null,
    employmentTo: reference.employmentTo || null,
    reasonForLeaving: reference.reasonForLeaving?.trim() || null,
    eligibleForRehire: reference.eligibleForRehire?.trim() || null,
    rehireRemarks: reference.rehireRemarks?.trim() || null,
    personProvidingInfo: reference.personProvidingInfo?.trim() || null,
    personTitle: reference.personTitle?.trim() || null,
    workPerformance: reference.workPerformance?.trim() || null,
    strengths: reference.strengths?.trim() || null,
    areasToImprove: reference.areasToImprove?.trim() || null,
    additionalNotes: reference.additionalNotes?.trim() || null,
    overallRating: reference.overallRating ?? null,
    recommendation: reference.recommendation?.trim() || null,
  };
}

function isReferenceEmpty(reference: ReferenceDraft | undefined) {
  if (!reference) return true;
  const payload = sanitizeReference(reference);
  return Object.entries(payload).every(([key, value]) => {
    if (key === "referenceNo") return true;
    return value === null || value === "";
  });
}

function getReferenceStatus(reference: ReferenceDraft | undefined) {
  if (!reference || isReferenceEmpty(reference)) return "Not Started";

  const completedFields = [
    reference.agencyName,
    reference.telephone,
    reference.cityState,
    reference.jobTitle,
    reference.employmentFrom,
    reference.employmentTo,
    reference.eligibleForRehire,
    reference.personProvidingInfo,
    reference.personTitle,
    reference.workPerformance,
    reference.overallRating,
    reference.recommendation,
  ];

  const isCompleted = completedFields.every(
    (value) => value !== null && value !== undefined && value !== "",
  );

  return isCompleted ? "Completed" : "In Progress";
}

function statusBadgeClass(status: string) {
  if (status === "Completed") return "bg-emerald-100 text-emerald-700";
  if (status === "In Progress") return "bg-amber-100 text-amber-700";
  return "bg-gray-100 text-gray-500";
}

function formatLastSaved(timestamp: string | null) {
  if (!timestamp) return "Not saved yet";
  const date = new Date(timestamp);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  const time = date.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });
  if (isToday) return `Today at ${time}`;
  return formatDateTime(date);
}

export default function ReferenceCheckTab({
  applicationId,
  candidateName,
  positionLabel,
}: {
  applicationId: string;
  candidateName: string;
  positionLabel: string;
}) {
  const [loading, setLoading] = useState(true);
  const [savingAll, setSavingAll] = useState(false);
  const [savingMap, setSavingMap] = useState<Record<number, boolean>>({});
  const [references, setReferences] = useState<ReferenceCheck[]>([]);
  const [drafts, setDrafts] = useState<Record<number, ReferenceDraft>>({});
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});
  const [referenceCount, setReferenceCount] = useState(DEFAULT_REFERENCE_COUNT);
  const [shareableUsers, setShareableUsers] = useState<ShareableUser[]>([]);
  const [sharedStatus, setSharedStatus] = useState<SharedStatus | null>(null);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [selectedShareUserId, setSelectedShareUserId] = useState("");
  const [sharing, setSharing] = useState(false);

  const loadReferenceChecks = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/candidates/${applicationId}/reference-check`,
      );
      const payload = (await res.json().catch(() => ({}))) as {
        referenceChecks?: ReferenceCheck[];
        shareableUsers?: ShareableUser[];
        sharedStatus?: SharedStatus | null;
        error?: string;
      };

      if (!res.ok) {
        toast.error(payload.error || "Failed to load reference checks");
        return;
      }

      const nextReferences = payload.referenceChecks ?? [];
      const maxRefNo = nextReferences.reduce(
        (max, item) => Math.max(max, item.referenceNo),
        DEFAULT_REFERENCE_COUNT,
      );

      const nextDrafts: Record<number, ReferenceDraft> = {};
      const nextExpanded: Record<number, boolean> = {};

      for (let refNo = 1; refNo <= maxRefNo; refNo += 1) {
        const existing = nextReferences.find(
          (item) => item.referenceNo === refNo,
        );
        nextDrafts[refNo] = existing
          ? {
              id: existing.id,
              referenceNo: existing.referenceNo,
              agencyName: existing.agencyName,
              telephone: existing.telephone,
              cityState: existing.cityState,
              jobTitle: existing.jobTitle,
              employmentFrom: existing.employmentFrom,
              employmentTo: existing.employmentTo,
              reasonForLeaving: existing.reasonForLeaving,
              eligibleForRehire: existing.eligibleForRehire,
              rehireRemarks: existing.rehireRemarks,
              personProvidingInfo: existing.personProvidingInfo,
              personTitle: existing.personTitle,
              workPerformance: existing.workPerformance,
              strengths: existing.strengths,
              areasToImprove: existing.areasToImprove,
              additionalNotes: existing.additionalNotes,
              overallRating: existing.overallRating,
              recommendation: existing.recommendation,
              conductedAt: existing.conductedAt,
              updatedAt: existing.updatedAt,
            }
          : createEmptyReference(refNo);
        nextExpanded[refNo] = false;
      }

      setReferences(nextReferences);
      setDrafts(nextDrafts);
      setExpanded(nextExpanded);
      setReferenceCount(maxRefNo);
      setShareableUsers(payload.shareableUsers ?? []);
      setSharedStatus(payload.sharedStatus ?? null);
    } finally {
      setLoading(false);
    }
  }, [applicationId]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadReferenceChecks();
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, [loadReferenceChecks]);

  const lastSavedAt = useMemo(() => {
    const timestamps = references
      .map((item) => item.updatedAt)
      .filter(Boolean)
      .sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
    return timestamps[0] ?? null;
  }, [references]);

  const handleDraftChange = (
    referenceNo: number,
    key: keyof ReferenceDraft,
    value: string | number | null,
  ) => {
    setDrafts((prev) => ({
      ...prev,
      [referenceNo]: {
        ...(prev[referenceNo] ?? createEmptyReference(referenceNo)),
        [key]: value,
      },
    }));
  };

  const saveReference = async (referenceNo: number) => {
    const draft = drafts[referenceNo] ?? createEmptyReference(referenceNo);
    if (isReferenceEmpty(draft)) {
      toast.info(`Reference ${referenceNo} has no data to save yet.`);
      return true;
    }

    setSavingMap((prev) => ({ ...prev, [referenceNo]: true }));
    try {
      const res = await fetch(
        `/api/candidates/${applicationId}/reference-check`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(sanitizeReference(draft)),
        },
      );
      const payload = (await res.json().catch(() => ({}))) as {
        referenceCheck?: ReferenceCheck;
        error?: string;
      };

      if (!res.ok || !payload.referenceCheck) {
        toast.error(payload.error || `Failed to save Reference ${referenceNo}`);
        return false;
      }

      setReferences((prev) => {
        const others = prev.filter((item) => item.referenceNo !== referenceNo);
        return [...others, payload.referenceCheck!].sort(
          (a, b) => a.referenceNo - b.referenceNo,
        );
      });
      setDrafts((prev) => ({
        ...prev,
        [referenceNo]: {
          ...prev[referenceNo],
          ...payload.referenceCheck,
        },
      }));
      toast.success(`Reference ${referenceNo} saved`);
      return true;
    } finally {
      setSavingMap((prev) => ({ ...prev, [referenceNo]: false }));
    }
  };

  const saveAll = async () => {
    const refNos = Array.from(
      { length: referenceCount },
      (_, index) => index + 1,
    ).filter((refNo) => !isReferenceEmpty(drafts[refNo]));

    if (refNos.length === 0) {
      toast.info("Add some reference data before saving.");
      return;
    }

    setSavingAll(true);
    let failed = false;
    for (const refNo of refNos) {
      const ok = await saveReference(refNo);
      if (!ok) failed = true;
    }
    setSavingAll(false);

    if (!failed) {
      toast.success("All reference checks saved");
    }
  };

  const handleAddReference = () => {
    if (referenceCount >= MAX_REFERENCE_COUNT) {
      toast.info("You can add up to 5 references only.");
      return;
    }
    const next = referenceCount + 1;
    setReferenceCount(next);
    setDrafts((prev) => ({ ...prev, [next]: createEmptyReference(next) }));
    setExpanded((prev) => ({ ...prev, [next]: true }));
  };

  const handleShare = async () => {
    if (!selectedShareUserId) {
      toast.error("Please select a user to share with.");
      return;
    }

    setSharing(true);
    try {
      const res = await fetch(
        `/api/candidates/${applicationId}/reference-check/share`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: selectedShareUserId }),
        },
      );
      const payload = (await res.json().catch(() => ({}))) as {
        sharedStatus?: SharedStatus;
        error?: string;
      };

      if (!res.ok || !payload.sharedStatus) {
        toast.error(payload.error || "Failed to share reference check");
        return;
      }

      setSharedStatus(payload.sharedStatus);
      setShareModalOpen(false);
      setSelectedShareUserId("");
      toast.success(
        `Reference check shared with ${payload.sharedStatus.sharedWith.name}`,
      );
    } finally {
      setSharing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  return (
    <div className="flex min-h-0 w-full flex-1 flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="space-y-5 p-6 pb-4">
      <div className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
        <div className="flex flex-col flex-wrap gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-emerald-600">
              Reference Check
            </p>
            <h3 className="mt-2 text-xl font-bold text-nuanu-navy">
              Reference Check & Employment Verification
            </h3>
            <p className="mt-1 text-sm text-nuanu-gray-500">
              {candidateName} · {positionLabel}
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-nuanu-gray-400">
              <span>Last saved: {formatLastSaved(lastSavedAt)}</span>
              {sharedStatus && (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 font-medium text-emerald-700">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Shared with {sharedStatus.sharedWith.name} on{" "}
                  {formatLastSaved(sharedStatus.sharedAt)}
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-shrink-0 flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={saveAll}
              disabled={savingAll}
              className="inline-flex items-center gap-2 rounded-xl bg-[#00C896] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#00b384] disabled:opacity-60"
            >
              {savingAll ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Save Reference Check
            </button>
            <button
              type="button"
              onClick={() => setShareModalOpen(true)}
              className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-nuanu-navy transition hover:bg-gray-50"
            >
              <Share2 className="h-4 w-4" />
              Send to User
            </button>
            <button
              type="button"
              onClick={() =>
                window.open(
                  `/api/candidates/${applicationId}/reference-check/pdf`,
                  "_blank",
                )
              }
              className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-nuanu-navy transition hover:bg-gray-50"
            >
              <Download className="h-4 w-4" />
              Export PDF
            </button>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {Array.from({ length: referenceCount }, (_, index) => index + 1).map(
          (referenceNo) => {
            const draft =
              drafts[referenceNo] ?? createEmptyReference(referenceNo);
            const status = getReferenceStatus(draft);
            const isExpanded = expanded[referenceNo] ?? false;

            return (
              <div
                key={referenceNo}
                className="w-full rounded-3xl border border-gray-100 bg-white shadow-sm"
              >
                <button
                  type="button"
                  onClick={() =>
                    setExpanded((prev) => ({
                      ...prev,
                      [referenceNo]: !isExpanded,
                    }))
                  }
                  className="flex w-full items-start justify-between gap-4 px-6 py-5 text-left"
                >
                  <div className="min-w-0 flex-1 pr-2">
                    <div className="flex flex-wrap items-center gap-3">
                      <h4 className="text-base font-bold text-nuanu-navy">
                        Reference {referenceNo}
                      </h4>
                      <span
                        className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${statusBadgeClass(status)}`}
                      >
                        {status}
                      </span>
                    </div>
                    <p className="mt-1 break-words text-sm text-nuanu-gray-500">
                      {draft.agencyName?.trim() ||
                        "Employment verification details"}
                    </p>
                  </div>
                  {isExpanded ? (
                    <ChevronUp className="h-5 w-5 flex-shrink-0 text-gray-400" />
                  ) : (
                    <ChevronDown className="h-5 w-5 flex-shrink-0 text-gray-400" />
                  )}
                </button>

                {isExpanded && (
                  <div className="border-t border-gray-100 px-6 pb-6 pt-5">
                    <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                      <div className="rounded-2xl border border-gray-100 bg-gray-50/50 p-4">
                        <p className="mb-4 text-xs font-bold uppercase tracking-[0.18em] text-nuanu-gray-400">
                          Section I — Employment History Verification
                        </p>

                        <div className="space-y-4">
                          <InlineField label="Agency / Organization">
                            <input
                              value={draft.agencyName ?? ""}
                              onChange={(e) =>
                                handleDraftChange(
                                  referenceNo,
                                  "agencyName",
                                  e.target.value,
                                )
                              }
                              className={INPUT_CLASS}
                              placeholder="Agency / organization"
                            />
                          </InlineField>

                          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            <InlineField label="Telephone">
                              <input
                                type="tel"
                                value={draft.telephone ?? ""}
                                onChange={(e) =>
                                  handleDraftChange(
                                    referenceNo,
                                    "telephone",
                                    e.target.value,
                                  )
                                }
                                className={INPUT_CLASS}
                                placeholder="Telephone"
                              />
                            </InlineField>
                            <InlineField label="City / State">
                              <input
                                value={draft.cityState ?? ""}
                                onChange={(e) =>
                                  handleDraftChange(
                                    referenceNo,
                                    "cityState",
                                    e.target.value,
                                  )
                                }
                                className={INPUT_CLASS}
                                placeholder="City / state"
                              />
                            </InlineField>
                          </div>

                          <InlineField label="Job Title">
                            <input
                              value={draft.jobTitle ?? ""}
                              onChange={(e) =>
                                handleDraftChange(
                                  referenceNo,
                                  "jobTitle",
                                  e.target.value,
                                )
                              }
                              className={INPUT_CLASS}
                              placeholder="Job title"
                            />
                          </InlineField>

                          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            <InlineField label="Employment Date(s) From">
                              <input
                                type="date"
                                value={draft.employmentFrom ?? ""}
                                onChange={(e) =>
                                  handleDraftChange(
                                    referenceNo,
                                    "employmentFrom",
                                    e.target.value,
                                  )
                                }
                                className={INPUT_CLASS}
                              />
                            </InlineField>
                            <InlineField label="Employment Date(s) To">
                              <input
                                type="date"
                                value={draft.employmentTo ?? ""}
                                onChange={(e) =>
                                  handleDraftChange(
                                    referenceNo,
                                    "employmentTo",
                                    e.target.value,
                                  )
                                }
                                className={INPUT_CLASS}
                              />
                            </InlineField>
                          </div>

                          <InlineField label="Reason(s) for Leaving">
                            <input
                              value={draft.reasonForLeaving ?? ""}
                              onChange={(e) =>
                                handleDraftChange(
                                  referenceNo,
                                  "reasonForLeaving",
                                  e.target.value,
                                )
                              }
                              className={INPUT_CLASS}
                              placeholder="Reason for leaving"
                            />
                          </InlineField>

                          <InlineField label="Eligible for Rehire">
                            <select
                              value={draft.eligibleForRehire ?? ""}
                              onChange={(e) =>
                                handleDraftChange(
                                  referenceNo,
                                  "eligibleForRehire",
                                  e.target.value,
                                )
                              }
                              className={INPUT_CLASS}
                            >
                              <option value="">Select</option>
                              <option value="Yes">Yes</option>
                              <option value="No">No</option>
                              <option value="Policy restricts rehire">
                                Policy restricts rehire
                              </option>
                            </select>
                          </InlineField>

                          <InlineField label="Remarks">
                            <textarea
                              value={draft.rehireRemarks ?? ""}
                              onChange={(e) =>
                                handleDraftChange(
                                  referenceNo,
                                  "rehireRemarks",
                                  e.target.value,
                                )
                              }
                              rows={2}
                              className={TEXTAREA_CLASS}
                              placeholder="Remarks"
                            />
                          </InlineField>

                          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            <InlineField label="Person Providing Information">
                              <input
                                value={draft.personProvidingInfo ?? ""}
                                onChange={(e) =>
                                  handleDraftChange(
                                    referenceNo,
                                    "personProvidingInfo",
                                    e.target.value,
                                  )
                                }
                                className={INPUT_CLASS}
                                placeholder="Full name"
                              />
                            </InlineField>
                            <InlineField label="Title">
                              <input
                                value={draft.personTitle ?? ""}
                                onChange={(e) =>
                                  handleDraftChange(
                                    referenceNo,
                                    "personTitle",
                                    e.target.value,
                                  )
                                }
                                className={INPUT_CLASS}
                                placeholder="Title"
                              />
                            </InlineField>
                          </div>
                        </div>
                      </div>

                      <div className="rounded-2xl border border-gray-100 bg-gray-50/50 p-4">
                        <p className="mb-4 text-xs font-bold uppercase tracking-[0.18em] text-nuanu-gray-400">
                          Section II — Additional Notes (HR Internal)
                        </p>

                        <div className="space-y-4">
                          <InlineField label="How would you describe their work performance?">
                            <textarea
                              value={draft.workPerformance ?? ""}
                              onChange={(e) =>
                                handleDraftChange(
                                  referenceNo,
                                  "workPerformance",
                                  e.target.value,
                                )
                              }
                              rows={3}
                              className={TEXTAREA_CLASS}
                              placeholder="Work performance"
                            />
                          </InlineField>

                          <InlineField label="Key Strengths">
                            <textarea
                              value={draft.strengths ?? ""}
                              onChange={(e) =>
                                handleDraftChange(
                                  referenceNo,
                                  "strengths",
                                  e.target.value,
                                )
                              }
                              rows={3}
                              className={TEXTAREA_CLASS}
                              placeholder="Key strengths"
                            />
                          </InlineField>

                          <InlineField label="Areas for Improvement">
                            <textarea
                              value={draft.areasToImprove ?? ""}
                              onChange={(e) =>
                                handleDraftChange(
                                  referenceNo,
                                  "areasToImprove",
                                  e.target.value,
                                )
                              }
                              rows={3}
                              className={TEXTAREA_CLASS}
                              placeholder="Areas for improvement"
                            />
                          </InlineField>

                          <InlineField label="Additional Notes">
                            <textarea
                              value={draft.additionalNotes ?? ""}
                              onChange={(e) =>
                                handleDraftChange(
                                  referenceNo,
                                  "additionalNotes",
                                  e.target.value,
                                )
                              }
                              rows={3}
                              className={TEXTAREA_CLASS}
                              placeholder="Additional notes"
                            />
                          </InlineField>

                          <div>
                            <label className={LABEL_CLASS}>
                              Overall Rating
                            </label>
                            <div className="flex items-center gap-1">
                              {[1, 2, 3, 4, 5].map((star) => {
                                const active =
                                  (draft.overallRating ?? 0) >= star;
                                return (
                                  <button
                                    key={star}
                                    type="button"
                                    onClick={() =>
                                      handleDraftChange(
                                        referenceNo,
                                        "overallRating",
                                        star,
                                      )
                                    }
                                    className="rounded-full p-1"
                                  >
                                    <Star
                                      className={`h-5 w-5 ${
                                        active
                                          ? "fill-amber-400 text-amber-400"
                                          : "text-gray-300"
                                      }`}
                                    />
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          <div>
                            <label className={LABEL_CLASS}>
                              HR Recommendation
                            </label>
                            <div className="flex flex-wrap gap-2">
                              {[
                                ["RECOMMEND", "Recommend"],
                                [
                                  "RECOMMEND_WITH_RESERVATION",
                                  "With Reservation",
                                ],
                                ["NOT_RECOMMEND", "Do Not Recommend"],
                              ].map(([value, label]) => {
                                const active = draft.recommendation === value;
                                return (
                                  <button
                                    key={value}
                                    type="button"
                                    onClick={() =>
                                      handleDraftChange(
                                        referenceNo,
                                        "recommendation",
                                        value,
                                      )
                                    }
                                    className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                                      active
                                        ? "border-emerald-500 bg-emerald-500 text-white"
                                        : "border-gray-200 bg-white text-nuanu-navy hover:bg-gray-50"
                                    }`}
                                  >
                                    {label}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="mt-5 flex flex-col gap-3 border-t border-gray-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
                      <p className="text-xs text-nuanu-gray-400">
                        Last saved: {formatLastSaved(draft.updatedAt ?? null)}
                      </p>
                      <button
                        type="button"
                        onClick={() => void saveReference(referenceNo)}
                        disabled={savingMap[referenceNo]}
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#00C896] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#00b384] disabled:opacity-60"
                      >
                        {savingMap[referenceNo] ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Save className="h-4 w-4" />
                        )}
                        Save Reference {referenceNo}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          },
        )}
      </div>
        </div>
      </div>

      <div className="flex flex-shrink-0 flex-col gap-3 border-t border-gray-100 bg-white px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
        <button
          type="button"
          onClick={handleAddReference}
          disabled={referenceCount >= MAX_REFERENCE_COUNT}
          className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-nuanu-navy transition hover:bg-gray-50 disabled:opacity-50"
        >
          <Plus className="h-4 w-4" />
          Add Reference
        </button>
        <button
          type="button"
          onClick={saveAll}
          disabled={savingAll}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#00C896] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#00b384] disabled:opacity-60"
        >
          {savingAll ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          Save All
        </button>
      </div>

      {shareModalOpen && (
        <div className="fixed inset-0 z-[140] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setShareModalOpen(false)}
          />
          <div className="relative z-10 w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
            <h4 className="text-lg font-bold text-nuanu-navy">Send to User</h4>
            <p className="mt-1 text-sm text-nuanu-gray-500">
              Select a hiring manager or internal user to receive a read-only
              link.
            </p>

            <div className="mt-5">
              <label className={LABEL_CLASS}>Select User</label>
              <select
                value={selectedShareUserId}
                onChange={(e) => setSelectedShareUserId(e.target.value)}
                className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm text-nuanu-navy outline-none transition focus:border-emerald-500"
              >
                <option value="">Choose a user</option>
                {shareableUsers.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.name} ({user.roleLabel})
                  </option>
                ))}
              </select>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShareModalOpen(false)}
                className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-nuanu-navy hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleShare}
                disabled={sharing}
                className="inline-flex items-center gap-2 rounded-xl bg-[#00C896] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#00b384] disabled:opacity-60"
              >
                {sharing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                Share Results
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function InlineField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className={LABEL_CLASS}>{label}</label>
      {children}
    </div>
  );
}
