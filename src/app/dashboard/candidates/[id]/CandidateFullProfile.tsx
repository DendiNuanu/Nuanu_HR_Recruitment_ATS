"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import {
  ArrowLeft,
  Briefcase,
  Calendar,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  CircleDollarSign,
  Clock,
  ClipboardList,
  Download,
  Edit,
  ExternalLink,
  FileText,
  GraduationCap,
  LayoutGrid,
  Link2,
  Loader2,
  Mail,
  MapPin,
  MessageSquare,
  Phone,
  Plus,
  Save,
  Send,
  Share2,
  Star,
  StickyNote,
  Trash2,
  UploadCloud,
  User,
  UserCheck,
  X,
} from "lucide-react";
import { formatDate, formatDateTime, SOURCE_PRESET_OPTIONS } from "@/lib/utils";
import { useBreadcrumb } from "@/lib/breadcrumb-context";
import { toast } from "sonner";
import DatePickerField from "@/components/ui/DatePickerField";
import {
  updateCandidateOverviewDetails,
  addNote,
  editNote,
  deleteNote,
  uploadCandidateResume,
} from "../actions";
import ReferenceCheckTab from "../ReferenceCheckTab";

/* -------------------------------------------------------------------------- */
/*  Types                                                                     */
/* -------------------------------------------------------------------------- */

type SerializedApplication = {
  id: string;
  candidateId: string;
  currentStage: string;
  appliedAt: string;
  createdAt: string;
  source: string;
  coverLetter: string | null;
  emailSentAt: string | null;
  emailSentSubject: string | null;
  candidate: {
    id: string;
    name: string;
    email: string;
    phone: string | null;
    activityLogs: {
      id: string;
      action: string;
      resource: string;
      resourceId: string | null;
      createdAt: string;
      metadata: unknown;
    }[];
  };
  vacancy: {
    id: string;
    title: string;
    location: string | null;
    department: { name: string } | null;
  };
  candidateScore: {
    overallScore: number;
    hardSkillsScore: number;
    softSkillsScore: number;
    experienceScore: number;
    educationScore: number;
    recommendations: string[];
    strengths: string[];
    skillGaps: string[];
    matchedKeywords: string[];
    missingKeywords: string[];
  } | null;
  assessments: {
    id: string;
    title: string;
    type: string;
    status: string;
    score: number | null;
    maxScore: number | null;
    passThreshold: number | null;
    isPassed: boolean | null;
    completedAt: string | null;
    createdAt: string;
  }[];
  referenceChecks: {
    id: string;
    referenceNo: number;
    agencyName: string | null;
    telephone: string | null;
    cityState: string | null;
    jobTitle: string | null;
    employmentFrom: string | null;
    employmentTo: string | null;
    reasonForLeaving: string | null;
    overallRating: number | null;
    recommendation: string | null;
    conductedAt: string | null;
    conductor: { id: string; name: string } | null;
  }[];
  documents: {
    id: string;
    name: string;
    type: string;
    fileUrl: string;
    fileSize: number;
    mimeType: string;
    createdAt: string;
  }[];
  notes: {
    id: string;
    content: string;
    createdAt: string;
    updatedAt: string;
    author: { id: string; name: string; avatar: string | null };
  }[];
  interviewComments: {
    id: string;
    content: string;
    createdAt: string;
    updatedAt: string;
    author: { id: string; name: string; avatar: string | null };
  }[];
};

type SerializedCandidateProfile = {
  userId: string;
  headline: string | null;
  summary: string | null;
  skills: string[];
  experienceYears: number;
  currentTitle: string | null;
  currentCompany: string | null;
  education: string | null;
  linkedinUrl: string | null;
  portfolioUrl: string | null;
  resumeUrl: string | null;
  resumeText: string | null;
  location: string | null;
  domicile: string | null;
  referPosition: string | null;
  salaryExpectation: string | null;
  emailSeek: string | null;
  locationSeek: string | null;
  willingToRelocate: boolean;
  expectedSalary: number | null;
  noticePeriod: string | null;
  gender: string | null;
  dateOfBirth: string | null;
  seekCareerHistory: unknown | null;
  seekEducation: unknown | null;
  seekLicencesAndCertifications: unknown | null;
  seekApplicationQuestions: unknown | null;
  seekSkills: unknown | null;
};

type ReviewerType = "HR" | "USER_1" | "USER_2";

type InterviewFeedbackItem = {
  id: string;
  reviewerType: ReviewerType;
  rating: number | null;
  recommendation: string | null;
  comments: string;
  updatedAt: string;
  authorName: string;
};

type FeedbackGroup = {
  hr: InterviewFeedbackItem | null;
  user1: InterviewFeedbackItem | null;
  user2: InterviewFeedbackItem | null;
};

type FeedbackPermissions = {
  canViewHR: boolean;
  canViewUser1: boolean;
  canViewUser2: boolean;
  canEditHR: boolean;
  canEditUser1: boolean;
  canEditUser2: boolean;
  canAssignReviewers: boolean;
};

type FeedbackAssignments = {
  user1ReviewerId: string | null;
  user2ReviewerId: string | null;
  user1ReviewerName: string | null;
  user2ReviewerName: string | null;
  assignmentsAvailable: boolean;
};

type AssignableReviewer = {
  id: string;
  name: string;
  email: string;
  roleLabel: string;
};

type LocalNote = {
  id: string;
  content: string;
  authorName: string;
  authorId: string;
  createdAt: string;
  updatedAt: string;
};

type Tab =
  | "overview"
  | "resume"
  | "interview_results"
  | "references"
  | "assessments"
  | "notes"
  | "timeline";

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                   */
/* -------------------------------------------------------------------------- */

const STAGE_PILL: Record<string, string> = {
  new: "bg-blue-50 text-blue-700 border-blue-100",
  screening: "bg-indigo-50 text-indigo-700 border-indigo-100",
  interview: "bg-amber-50 text-amber-700 border-amber-100",
  assessment: "bg-purple-50 text-purple-700 border-purple-100",
  offer: "bg-emerald-50 text-emerald-700 border-emerald-100",
  hired: "bg-emerald-100 text-emerald-800 border-emerald-200",
  rejected: "bg-red-50 text-red-700 border-red-100",
  talent_bank: "bg-slate-50 text-slate-700 border-slate-100",
};

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700",
  completed: "bg-emerald-100 text-emerald-700",
  started: "bg-blue-100 text-blue-700",
  cancelled: "bg-red-100 text-red-700",
};

const SOURCE_ALIASES: Record<string, string> = {
  seek: "seek",
  jobstreet: "seek",
  "hr upload": "other",
  "careers page": "career_page",
  "career page": "career_page",
  "nuanu career page": "career_page",
  "nuanu careers": "career_page",
  linkedin: "linkedin",
  "linked-in": "linkedin",
  "linked.in": "linkedin",
  job_board: "other",
  "job board": "other",
  "job-board": "other",
};

function normalizeSourcePreset(source: string | null | undefined) {
  const src = (source || "direct").toLowerCase().trim();
  const key = SOURCE_ALIASES[src] ?? src;
  const preset = SOURCE_PRESET_OPTIONS.find((p) => p.value === key);
  return preset ? preset.value : "other";
}

function ratingLabel(v: number): string {
  if (v >= 80) return "Strong";
  if (v >= 60) return "Good";
  if (v >= 40) return "Fair";
  if (v > 0) return "Weak";
  return "—";
}

function displayEmail(
  userEmail: string,
  emailSeek: string | null | undefined,
): string {
  const isSynthetic =
    userEmail.includes("@import.nuanu.local") ||
    userEmail.includes("@noemail");
  return isSynthetic ? (emailSeek?.trim() || "—") : userEmail;
}

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: "overview", label: "Profile Overview", icon: User },
  { id: "resume", label: "Resume / CV", icon: FileText },
  { id: "interview_results", label: "Interview Results", icon: MessageSquare },
  { id: "references", label: "Reference Checks", icon: UserCheck },
  { id: "assessments", label: "Assessments", icon: ClipboardList },
  { id: "notes", label: "Notes", icon: StickyNote },
  { id: "timeline", label: "Activity Timeline", icon: Clock },
];

/* -------------------------------------------------------------------------- */
/*  InterviewShareLinkCard (inline from old modal)                            */
/* -------------------------------------------------------------------------- */

function InterviewShareLinkCard({ slug }: { slug: string | null }) {
  const [copied, setCopied] = useState(false);

  const shareUrl =
    typeof window !== "undefined" && slug
      ? `${window.location.origin}/interview-result/${slug}`
      : slug
        ? `/interview-result/${slug}`
        : null;

  const handleCopy = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast.success("Link copied!");
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      toast.error("Could not copy link");
    }
  };

  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm space-y-4">
      <div className="flex items-center gap-2">
        <Link2 className="w-4 h-4 text-nuanu-navy" />
        <p className="font-bold text-nuanu-navy">Share Interview Result</p>
      </div>
      {shareUrl ? (
        <>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopy}
              className="btn-primary px-5 py-2.5 text-sm inline-flex items-center gap-2"
            >
              {copied ? (
                <Check className="w-4 h-4" />
              ) : (
                <Link2 className="w-4 h-4" />
              )}
              {copied ? "Copied!" : "Copy Interview Link"}
            </button>
          </div>
          <p className="text-[11px] font-mono text-nuanu-gray-400 break-all">
            {shareUrl}
          </p>
        </>
      ) : (
        <p className="text-xs text-nuanu-gray-400 italic">
          Generating a shareable link… open this tab again in a moment, or
          re-save the interviewer assignments to retry.
        </p>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Main Component                                                             */
/* -------------------------------------------------------------------------- */

export default function CandidateFullProfile({
  application,
  candidateProfile,
}: {
  application: SerializedApplication;
  candidateProfile: SerializedCandidateProfile | null;
}) {
  /* ---- Tab state ---- */
  const [activeTab, setActiveTab] = useState<Tab>("overview");

  /* ---- Breadcrumb ---- */
  const { overrideLabel } = useBreadcrumb();

  useEffect(() => {
    const name = application.candidate.name;
    if (!name) return;
    document.title = `${name} - Nuanu HR Recruitment ATS`;
    overrideLabel(application.id, name);
  }, [application.candidate.name, application.id, overrideLabel]);

  /* ---- Edit fields state ---- */
  const [referAsDraft, setReferAsDraft] = useState(
    candidateProfile?.referPosition || "",
  );
  const [domicileDraft, setDomicileDraft] = useState(
    candidateProfile?.domicile || "",
  );
  const [salaryExpectationDraft, setSalaryExpectationDraft] = useState(
    candidateProfile?.salaryExpectation || "",
  );
  const [savingReferAs, setSavingReferAs] = useState(false);
  const [savingDomicile, setSavingDomicile] = useState(false);
  const [savingSalaryExpectation, setSavingSalaryExpectation] = useState(false);

  const [sourcePreset, setSourcePreset] = useState(
    normalizeSourcePreset(application.source),
  );
  const [savingSource, setSavingSource] = useState(false);

  /* ---- Notes state ---- */
  const [localNotes, setLocalNotes] = useState<LocalNote[]>(
    application.notes.map((n) => ({
      id: n.id,
      content: n.content,
      authorName: n.author.name,
      authorId: n.author.id,
      createdAt: n.createdAt,
      updatedAt: n.updatedAt,
    })),
  );
  const [noteText, setNoteText] = useState("");
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editNoteText, setEditNoteText] = useState("");
  const [savingNote, setSavingNote] = useState(false);

  /* ---- Interview feedback state ---- */
  const [interviewFeedback, setInterviewFeedback] = useState<FeedbackGroup>({
    hr: null,
    user1: null,
    user2: null,
  });
  const [feedbackDrafts, setFeedbackDrafts] = useState<
    Record<ReviewerType, { comments: string }>
  >({
    HR: { comments: "" },
    USER_1: { comments: "" },
    USER_2: { comments: "" },
  });
  const [savingFeedbackType, setSavingFeedbackType] =
    useState<ReviewerType | null>(null);
  const [feedbackPermissions, setFeedbackPermissions] =
    useState<FeedbackPermissions>({
      canViewHR: false,
      canViewUser1: false,
      canViewUser2: false,
      canEditHR: false,
      canEditUser1: false,
      canEditUser2: false,
      canAssignReviewers: false,
    });
  const [feedbackAssignments, setFeedbackAssignments] =
    useState<FeedbackAssignments>({
      user1ReviewerId: null,
      user2ReviewerId: null,
      user1ReviewerName: null,
      user2ReviewerName: null,
      assignmentsAvailable: false,
    });
  const [assignableReviewers, setAssignableReviewers] = useState<
    AssignableReviewer[]
  >([]);
  const [reviewerAssignmentDraft, setReviewerAssignmentDraft] = useState({
    user1ReviewerId: "",
    user2ReviewerId: "",
  });
  const [savingReviewerAssignments, setSavingReviewerAssignments] =
    useState(false);
  const [feedbackLoadError, setFeedbackLoadError] = useState<string | null>(
    null,
  );
  const [interviewSlug, setInterviewSlug] = useState<string | null>(null);
  const [loadingInterviewFeedback, setLoadingInterviewFeedback] =
    useState(false);

  /* ---- CV Upload state ---- */
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [uploadingCv, setUploadingCv] = useState(false);

  /* ---- Derived data ---- */
  const profile = candidateProfile;
  const candidate = application.candidate;
  const score = application.candidateScore;
  const vacancy = application.vacancy;

  const appliedFor =
    profile?.referPosition || vacancy.title || "Role not specified";

  const email = displayEmail(candidate.email, profile?.emailSeek);

  const initials = candidate.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .substring(0, 2)
    .toUpperCase();

  const aiScore = Math.round(score?.overallScore ?? 0);

  /* ---- Interview feedback: load on tab change ---- */
  const mapFeedbackToDrafts = useCallback((group: FeedbackGroup) => {
    setFeedbackDrafts({
      HR: { comments: group.hr?.comments ?? "" },
      USER_1: { comments: group.user1?.comments ?? "" },
      USER_2: { comments: group.user2?.comments ?? "" },
    });
  }, []);

  const loadInterviewFeedback = useCallback(
    async (appId: string) => {
      setLoadingInterviewFeedback(true);
      setFeedbackLoadError(null);
      try {
        const res = await fetch(`/api/candidates/${appId}/feedback`);
        const payload = (await res.json().catch(() => ({}))) as {
          hr?: InterviewFeedbackItem | null;
          user1?: InterviewFeedbackItem | null;
          user2?: InterviewFeedbackItem | null;
          permissions?: FeedbackPermissions;
          assignments?: FeedbackAssignments;
          assignableUsers?: AssignableReviewer[];
          error?: string;
          warning?: string;
          interviewSlug?: string | null;
        };
        if (!res.ok) {
          setFeedbackLoadError(
            payload.error || "Failed to load interview feedback",
          );
          return;
        }
        setFeedbackLoadError(payload.warning ?? null);
        const normalized: FeedbackGroup = {
          hr: payload.hr ?? null,
          user1: payload.user1 ?? null,
          user2: payload.user2 ?? null,
        };
        setInterviewFeedback(normalized);
        mapFeedbackToDrafts(normalized);
        const assignments = payload.assignments ?? {
          user1ReviewerId: null,
          user2ReviewerId: null,
          user1ReviewerName: null,
          user2ReviewerName: null,
          assignmentsAvailable: false,
        };
        setFeedbackAssignments(assignments);
        setReviewerAssignmentDraft({
          user1ReviewerId: assignments.user1ReviewerId ?? "",
          user2ReviewerId: assignments.user2ReviewerId ?? "",
        });
        setFeedbackPermissions(
          payload.permissions ?? {
            canViewHR: false,
            canViewUser1: false,
            canViewUser2: false,
            canEditHR: false,
            canEditUser1: false,
            canEditUser2: false,
            canAssignReviewers: false,
          },
        );
        setAssignableReviewers(payload.assignableUsers ?? []);
        setInterviewSlug(payload.interviewSlug ?? null);
      } catch {
        setFeedbackLoadError("Network error loading interview feedback");
      } finally {
        setLoadingInterviewFeedback(false);
      }
    },
    [mapFeedbackToDrafts],
  );

  useEffect(() => {
    if (activeTab !== "interview_results" || !application.id) return;
    void loadInterviewFeedback(application.id);
  }, [activeTab, application.id, loadInterviewFeedback]);

  /* ---- Handlers: Profile Overview edits ---- */
  const handleSaveReferAs = async () => {
    const val = referAsDraft.trim();
    if (!val || val === (profile?.referPosition || "")) return;
    setSavingReferAs(true);
    try {
      const res = await updateCandidateOverviewDetails(
        application.id,
        application.candidateId,
        { referPosition: val },
      );
      if (res.success) {
        setReferAsDraft(val);
        toast.success("Refer As updated");
      } else {
        toast.error(res.error || "Failed to update Refer As");
      }
    } finally {
      setSavingReferAs(false);
    }
  };

  const handleSaveDomicile = async () => {
    const val = domicileDraft.trim();
    if (!val || val === (profile?.domicile || "")) return;
    setSavingDomicile(true);
    try {
      const res = await updateCandidateOverviewDetails(
        application.id,
        application.candidateId,
        { domicile: val },
      );
      if (res.success) {
        setDomicileDraft(val);
        toast.success("Domicile updated");
      } else {
        toast.error(res.error || "Failed to update Domicile");
      }
    } finally {
      setSavingDomicile(false);
    }
  };

  const handleSaveSalaryExpectation = async () => {
    const val = salaryExpectationDraft.trim();
    if (!val || val === (profile?.salaryExpectation || "")) return;
    setSavingSalaryExpectation(true);
    try {
      const res = await updateCandidateOverviewDetails(
        application.id,
        application.candidateId,
        { salaryExpectation: val },
      );
      if (res.success) {
        setSalaryExpectationDraft(val);
        toast.success("Salary expectation updated");
      } else {
        toast.error(res.error || "Failed to update salary expectation");
      }
    } finally {
      setSavingSalaryExpectation(false);
    }
  };

  const handleSaveSource = async () => {
    const value = sourcePreset || "direct";
    setSavingSource(true);
    try {
      const res = await updateCandidateOverviewDetails(
        application.id,
        application.candidateId,
        { source: value },
      );
      if (res.success) {
        setSourcePreset(value);
        toast.success("Source updated");
        if (value === "seek") {
          void autoFillSalaryFromSeek();
        }
      } else {
        toast.error(res.error || "Failed to update Source");
      }
    } finally {
      setSavingSource(false);
    }
  };

  const autoFillSalaryFromSeek = async () => {
    try {
      const res = await fetch("/api/seek/salary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          candidateId: application.candidateId,
          name: candidate.name,
          email: candidate.email,
          phone: candidate.phone,
        }),
      });
      if (!res.ok) return;
      const payload = (await res.json().catch(() => null)) as {
        salaryExpectation?: string | null;
        matched?: boolean;
      } | null;
      const next = payload?.salaryExpectation?.trim();
      if (!next) {
        toast.info("No cached SEEK salary found for this candidate");
        return;
      }
      if (next === (profile?.salaryExpectation ?? "").trim()) return;
      setSalaryExpectationDraft(next);
      toast.success(`SEEK salary auto-filled: ${next}`);
    } catch (err) {
      console.warn("[autoFillSalaryFromSeek] request failed:", err);
    }
  };

  const handleAppliedDateChange = async (val: string) => {
    if (!val) return;
    const appliedIso = new Date(val).toISOString();
    const res = await updateCandidateOverviewDetails(
      application.id,
      application.candidateId,
      { appliedAt: appliedIso },
    );
    if (res.success) toast.success("Applied date updated");
    else toast.error(res.error || "Failed to update applied date");
  };

  /* ---- Handlers: Notes ---- */
  const handleAddNote = async () => {
    if (!noteText.trim()) return;
    setSavingNote(true);
    const res = await addNote(application.id, noteText.trim());
    if (res.success && res.note) {
      const newNote: LocalNote = {
        id: res.note.id,
        content: res.note.content,
        authorName: res.note.author.name,
        authorId: res.note.authorId,
        createdAt: res.note.createdAt.toString(),
        updatedAt: res.note.updatedAt.toString(),
      };
      setLocalNotes([newNote, ...localNotes]);
      setNoteText("");
      toast.success("Note added");
    } else {
      toast.error(res.error || "Failed to add note");
    }
    setSavingNote(false);
  };

  const handleEditNote = async (noteId: string) => {
    if (!editNoteText.trim()) return;
    setSavingNote(true);
    const res = await editNote(noteId, editNoteText.trim());
    if (res.success && res.note) {
      setLocalNotes(
        localNotes.map((n) =>
          n.id === noteId
            ? {
                ...n,
                content: res.note!.content,
                updatedAt: res.note!.updatedAt.toString(),
              }
            : n,
        ),
      );
      setEditingNoteId(null);
      setEditNoteText("");
      toast.success("Note updated");
    } else {
      toast.error(res.error || "Failed to edit note");
    }
    setSavingNote(false);
  };

  const handleDeleteNote = async (noteId: string) => {
    if (!confirm("Delete this note?")) return;
    const res = await deleteNote(noteId);
    if (res.success) {
      setLocalNotes(localNotes.filter((n) => n.id !== noteId));
      toast.success("Note deleted");
    } else {
      toast.error("Failed to delete note");
    }
  };

  /* ---- Handlers: Interview feedback ---- */
  const saveReviewerAssignments = async () => {
    const user1ReviewerId = reviewerAssignmentDraft.user1ReviewerId || null;
    const user2ReviewerId = reviewerAssignmentDraft.user2ReviewerId || null;
    if (
      user1ReviewerId &&
      user2ReviewerId &&
      user1ReviewerId === user2ReviewerId
    ) {
      toast.error("User 1 and User 2 reviewers must be different people");
      return;
    }
    setSavingReviewerAssignments(true);
    try {
      const res = await fetch(`/api/candidates/${application.id}/feedback`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user1ReviewerId, user2ReviewerId }),
      });
      const payload = (await res.json().catch(() => ({}))) as {
        error?: string;
        assignments?: FeedbackAssignments;
      };
      if (!res.ok) {
        toast.error(payload.error || "Failed to save reviewer assignments");
        return;
      }
      if (payload.assignments) {
        setFeedbackAssignments(payload.assignments);
        setReviewerAssignmentDraft({
          user1ReviewerId: payload.assignments.user1ReviewerId ?? "",
          user2ReviewerId: payload.assignments.user2ReviewerId ?? "",
        });
      }
      await loadInterviewFeedback(application.id);
      toast.success("Reviewer assignments saved");
    } catch {
      toast.error("Network error while saving reviewer assignments");
    } finally {
      setSavingReviewerAssignments(false);
    }
  };

  const saveStructuredFeedback = async (reviewerType: ReviewerType) => {
    const draft = feedbackDrafts[reviewerType];
    if (!draft.comments.trim()) {
      toast.error("Comments are required");
      return;
    }
    setSavingFeedbackType(reviewerType);
    try {
      const res = await fetch(`/api/candidates/${application.id}/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reviewerType,
          rating: null,
          recommendation: null,
          comments: draft.comments.trim(),
        }),
      });
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        toast.error(payload.error || "Failed to save feedback");
        return;
      }
      await loadInterviewFeedback(application.id);
      toast.success("Interview feedback saved");
    } catch {
      toast.error("Network error while saving feedback");
    } finally {
      setSavingFeedbackType(null);
    }
  };

  /* ---- Handlers: CV Upload ---- */
  const handleCvUpload = async () => {
    if (!cvFile) return;
    setUploadingCv(true);
    const fd = new FormData();
    fd.append("resume", cvFile);
    const res = await uploadCandidateResume(application.id, fd);
    if (res.success) {
      toast.success("CV uploaded successfully!");
      setCvFile(null);
    } else {
      toast.error(res.error || "Upload failed");
    }
    setUploadingCv(false);
  };

  /* ---- Resume data ---- */
  const resumeDocs = application.documents.filter((d) => d.type === "resume");
  const hasResume =
    (profile?.resumeUrl || profile?.resumeText) && resumeDocs.length === 0;

  /* ====================================================================== */
  /*  RENDER                                                                 */
  /* ====================================================================== */

  return (
    <div className="flex flex-col min-h-[calc(100vh-80px)]">
      {/* ── Sticky Header ────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 bg-[#f8f9ff] border-b border-[#c0c8c7]">
        <div className="px-6 sm:px-8 lg:px-12 xl:px-16 2xl:px-24 py-5 space-y-4">
          {/* Breadcrumbs & Actions */}
          <div className="flex items-center justify-between">
            <nav className="flex items-center gap-2 text-[13px] text-[#404848] font-medium">
              <Link href="/dashboard" className="hover:text-[#006b57] transition-colors">
                Dashboard
              </Link>
              <span className="text-[14px]">›</span>
              <Link href="/dashboard/candidates" className="hover:text-[#006b57] transition-colors">
                Candidates
              </Link>
              <span className="text-[14px]">›</span>
              <span className="font-semibold text-[#0b1c30]">{candidate.name}</span>
            </nav>
            <div className="flex items-center gap-3">
              <Link
                href="/dashboard/candidates"
                className="inline-flex items-center gap-2 text-sm font-medium text-[#404848] hover:text-[#0b1c30] transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </Link>
            </div>
          </div>
          {/* Profile Header */}
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-5">
              <div className="w-16 h-16 rounded-2xl bg-[#d3e4fe] flex items-center justify-center text-[#002626] text-[24px] font-bold border border-[#c0c8c7] shadow-sm flex-shrink-0">
                {initials}
              </div>
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-[24px] font-semibold text-[#0b1c30] leading-8">
                    {candidate.name}
                  </h1>
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                    application.currentStage === "new" ? "bg-[#64fbd5] text-[#00725d]" :
                    application.currentStage === "interview" ? "bg-amber-100 text-amber-700" :
                    application.currentStage === "offer" ? "bg-emerald-100 text-emerald-700" :
                    application.currentStage === "hired" ? "bg-emerald-200 text-emerald-800" :
                    application.currentStage === "rejected" ? "bg-red-100 text-red-700" :
                    "bg-[#e5eeff] text-[#006b57]"
                  }`}>
                    {(application.currentStage || "new").replace(/_/g, " ")}
                  </span>
                </div>
                <p className="text-[#404848] text-sm mt-1">{appliedFor}</p>
              </div>
            </div>
            <div className="flex items-center gap-6 text-[#404848] text-sm">
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-[#002626]" />
                <a href={`mailto:${email}`} className="font-medium text-[#0b1c30] hover:text-[#006b57] transition-colors">
                  {email}
                </a>
              </div>
              {candidate.phone && (
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-[#002626]" />
                  <a href={`tel:${candidate.phone}`} className="font-medium text-[#0b1c30] hover:text-[#006b57] transition-colors">
                    {candidate.phone}
                  </a>
                </div>
              )}
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-[#002626]" />
                <span className="font-medium text-[#0b1c30]">
                  {profile?.domicile?.trim() ||
                    profile?.location?.trim() ||
                    profile?.locationSeek?.trim() ||
                    "—"}
                </span>
              </div>
            </div>
          </div>
          {/* Navigation Tabs */}
          <div className="flex items-center gap-8 mt-2 overflow-x-auto">
            {TABS.map(({ id, label, icon: Icon }) => {
              const active = activeTab === id;
              return (
                <button
                  key={id}
                  onClick={() => setActiveTab(id)}
                  className={`flex items-center gap-2 pb-3 whitespace-nowrap text-sm font-bold transition-all ${
                    active
                      ? "text-[#006b57] border-b-2 border-[#006b57]"
                      : "text-[#404848] hover:text-[#0b1c30]"
                  }`}
                >
                  <Icon className="h-4 w-4" /> {label}
                  {/* Badge counts */}
                  {id === "assessments" &&
                    application.assessments.length > 0 && (
                      <span className="ml-1 rounded-full bg-[#e5eeff] px-1.5 text-[10px] font-bold text-[#006b57]">
                        {application.assessments.length}
                      </span>
                    )}
                  {id === "references" &&
                    application.referenceChecks.length > 0 && (
                      <span className="ml-1 rounded-full bg-[#e5eeff] px-1.5 text-[10px] font-bold text-[#006b57]">
                        {application.referenceChecks.length}
                      </span>
                    )}
                  {id === "notes" && localNotes.length > 0 && (
                    <span className="ml-1 rounded-full bg-[#e5eeff] px-1.5 text-[10px] font-bold text-[#006b57]">
                      {localNotes.length}
                    </span>
                  )}
                  {id === "interview_results" && (
                    (() => {
                      const count = [
                        interviewFeedback.hr,
                        interviewFeedback.user1,
                        interviewFeedback.user2,
                      ].filter(Boolean).length;
                      return count > 0 ? (
                        <span className="ml-1 bg-[#006b57] text-white text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                          {count}
                        </span>
                      ) : null;
                    })()
                  )}
                  {id === "resume" &&
                    (resumeDocs.length > 0 || hasResume) && (
                      <span className="ml-1 w-2 h-2 rounded-full bg-[#006b57]" />
                    )}
                </button>
              );
            })}
          </div>
        </div>
      </header>

      {/* ── Tab Content ──────────────────────────────────────────────────── */}
      <div className="flex-1 min-h-0 flex flex-col">
        {/* ── Tab: Profile Overview ──────────────────────────────────────── */}
        {activeTab === "overview" && (
          <div className="w-full px-6 sm:px-8 lg:px-12 xl:px-16 2xl:px-24 py-8 lg:py-10">
            <div className="grid grid-cols-12 gap-6 lg:gap-8 xl:gap-10">
              {/* LEFT COLUMN */}
              <div className="col-span-8 space-y-6 lg:space-y-8">
                {/* Editable fields grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 lg:gap-x-16 gap-y-8 lg:gap-y-10">
              {/* Applied For */}
              <div className="space-y-2">
                <p className="text-[11px] font-bold text-[#404848] uppercase tracking-widest">
                  Applied For
                </p>
                <p className="text-base font-bold text-[#0b1c30] leading-snug">
                  {appliedFor}
                </p>
              </div>

              {/* Refer As */}
              <div className="space-y-2">
                <p className="text-[11px] font-bold text-[#404848] uppercase tracking-widest">
                  Refer As
                </p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={referAsDraft}
                    onChange={(e) => setReferAsDraft(e.target.value)}
                    onKeyDown={(e) =>
                      e.key === "Enter" && handleSaveReferAs()
                    }
                    placeholder={vacancy.title}
                    className="flex-1 bg-white border border-[#c0c8c7] rounded-lg px-4 py-2.5 text-base font-bold text-[#0b1c30] focus:ring-2 focus:ring-[#006b57] focus:border-[#006b57] outline-none"
                  />
                  <button
                    onClick={handleSaveReferAs}
                    disabled={
                      savingReferAs ||
                      !referAsDraft.trim() ||
                      referAsDraft.trim() === (profile?.referPosition || "")
                    }
                    className="bg-[#00C3A0] text-white px-4 py-2.5 rounded-lg font-bold text-xs hover:bg-[#00a88a] transition-all shadow-sm flex items-center gap-1.5 shrink-0 disabled:opacity-50"
                  >
                    {savingReferAs ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Check className="w-3.5 h-3.5" />
                    )}
                    Apply
                  </button>
                </div>
              </div>

              {/* Applied Date */}
              <div className="space-y-2">
                <p className="text-[11px] font-bold text-[#404848] uppercase tracking-widest">
                  Applied Date
                </p>
                <DatePickerField
                  value={
                    application.appliedAt
                      ? new Date(application.appliedAt)
                          .toISOString()
                          .split("T")[0]
                      : ""
                  }
                  onChange={handleAppliedDateChange}
                  placeholder="dd/mm/yyyy"
                />
              </div>

              {/* Location (static) */}
              <div className="space-y-2">
                <p className="text-[11px] font-bold text-[#404848] uppercase tracking-widest">
                  Location
                </p>
                <p className="text-base font-bold text-[#0b1c30]">
                  {profile?.location?.trim() ||
                    vacancy.location?.trim() ||
                    "—"}
                </p>
              </div>

              {/* Expected Monthly Salary */}
              <div className="space-y-2">
                <p className="text-[11px] font-bold text-[#404848] uppercase tracking-widest">
                  Expected Monthly Salary
                </p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={salaryExpectationDraft}
                    onChange={(e) =>
                      setSalaryExpectationDraft(e.target.value)
                    }
                    onKeyDown={(e) =>
                      e.key === "Enter" && handleSaveSalaryExpectation()
                    }
                    placeholder="e.g. Rp 10.000.000 / month"
                    className="flex-1 bg-white border border-[#c0c8c7] rounded-lg px-4 py-2.5 text-base font-bold text-[#0b1c30] focus:ring-2 focus:ring-[#006b57] focus:border-[#006b57] outline-none"
                  />
                  <button
                    onClick={handleSaveSalaryExpectation}
                    disabled={
                      savingSalaryExpectation ||
                      !salaryExpectationDraft.trim() ||
                      salaryExpectationDraft.trim() ===
                        (profile?.salaryExpectation || "")
                    }
                    className="bg-[#00C3A0] text-white px-4 py-2.5 rounded-lg font-bold text-xs hover:bg-[#00a88a] transition-all shadow-sm flex items-center gap-1.5 shrink-0 disabled:opacity-50"
                  >
                    {savingSalaryExpectation ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Check className="w-3.5 h-3.5" />
                    )}
                    Apply
                  </button>
                </div>
              </div>

              {/* Phone Number */}
              <div className="space-y-2">
                <p className="text-[11px] font-bold text-[#404848] uppercase tracking-widest">
                  Phone Number
                </p>
                <p className="text-base font-bold text-[#0b1c30]">
                  {candidate.phone || "Not provided"}
                </p>
              </div>

              {/* Last Email Sent */}
              {application.emailSentAt && (
                <div className="space-y-2">
                  <p className="text-[11px] font-bold text-[#404848] uppercase tracking-widest">
                    Last Email Sent
                  </p>
                  <p className="text-sm font-semibold text-[#006b57]">
                    {formatDate(application.emailSentAt)}
                  </p>
                  {application.emailSentSubject && (
                    <p className="text-xs text-[#404848] mt-1 truncate max-w-[180px]">
                      {application.emailSentSubject}
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* AI Match Analysis card */}
            <div className="bg-white rounded-xl border border-[#c0c8c7] shadow-sm overflow-hidden">
              <div className="bg-[#eff4ff] px-6 py-3 border-b border-[#c0c8c7]">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold uppercase tracking-widest text-[#404848]">
                    AI Match Analysis
                  </span>
                  {score?.recommendations?.includes(
                    "Fallback Mode: CV Only Analysis",
                  ) && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700 uppercase tracking-widest">
                      Fallback: CV Only
                    </span>
                  )}
                </div>
              </div>
              <div className="p-6 flex items-center gap-6">
                <div className="relative w-32 h-32 flex-shrink-0">
                  <svg viewBox="0 0 128 128" className="w-full h-full -rotate-90">
                    <circle cx="64" cy="64" r="58" fill="transparent" stroke="#e5eeff" strokeWidth="8"/>
                    <circle
                      cx="64" cy="64" r="58" fill="transparent"
                      stroke={
                        aiScore >= 80
                          ? "#10B981"
                          : aiScore >= 60
                            ? "#F59E0B"
                            : "#EF4444"
                      }
                      strokeWidth="8"
                      strokeDasharray="364.4"
                      strokeDashoffset={364.4 - (aiScore / 100) * 364.4}
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-2xl font-bold text-[#0b1c30]">
                      {aiScore}%
                    </span>
                  </div>
                </div>
                <div>
                  <h3 className="text-[18px] font-semibold mb-2" style={{ color: aiScore >= 80 ? "#10B981" : aiScore >= 60 ? "#F59E0B" : "#EF4444" }}>
                    {aiScore >= 80
                      ? "Strong Match"
                      : aiScore >= 60
                        ? "Potential Match"
                        : "Weak Match"}
                  </h3>
                  <div className="flex flex-wrap gap-1.5">
                    {profile?.skills?.map((skill) => (
                      <span
                        key={skill}
                        className="px-2 py-0.5 bg-emerald-50 text-emerald-700 text-xs rounded border border-emerald-100"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Cover Letter */}
            {application.coverLetter && (
              <div className="bg-white rounded-xl border border-[#c0c8c7] shadow-sm overflow-hidden">
                <div className="bg-[#eff4ff] px-6 py-3 border-b border-[#c0c8c7]">
                  <span className="text-[11px] font-bold uppercase tracking-widest text-[#404848]">Cover Letter</span>
                </div>
                <div className="p-6">
                  <div className="text-sm text-[#404848] leading-relaxed whitespace-pre-wrap">
                    {application.coverLetter}
                  </div>
                </div>
              </div>
            )}

            {/* Strengths, Gaps, Recommendations, Keywords */}
            {score && (
              <div className="bg-white rounded-xl border border-[#c0c8c7] shadow-sm overflow-hidden">
                <div className="bg-[#eff4ff] px-6 py-3 border-b border-[#c0c8c7]">
                  <span className="text-[11px] font-bold uppercase tracking-widest text-[#404848]">AI Insights</span>
                </div>
                <div className="p-6 space-y-6">
                  {score.strengths.length > 0 && (
                    <div>
                      <p className="text-xs font-bold text-[#006b57] uppercase tracking-widest mb-2">
                        Strengths
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {score.strengths.map((s) => (
                          <span
                            key={s}
                            className="rounded-full bg-[#e5eeff] px-2 py-0.5 text-[11px] font-medium text-[#006b57] border border-[#d3e4fe]"
                          >
                            {s}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {score.skillGaps.length > 0 && (
                    <div>
                      <p className="text-xs font-bold text-amber-700 uppercase tracking-widest mb-2">
                        Skill Gaps
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {score.skillGaps.map((g) => (
                          <span
                            key={g}
                            className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700 border border-amber-100"
                          >
                            {g}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {score.recommendations.length > 0 && (
                    <div>
                      <p className="text-xs font-bold text-[#404848] uppercase tracking-widest mb-2">
                        Recommendations
                      </p>
                      <ul className="list-disc list-inside space-y-1">
                        {score.recommendations.map((r, i) => (
                          <li key={i} className="text-xs text-[#404848]">
                            {r}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {score.matchedKeywords.length > 0 && (
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-widest text-[#404848] mb-3">
                        Matched Keywords
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {score.matchedKeywords.map((kw) => (
                          <span
                            key={kw}
                            className="rounded-full bg-[#e5eeff] px-2.5 py-1 text-[11px] font-medium text-[#006b57] border border-[#d3e4fe]"
                          >
                            {kw}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {score.missingKeywords.length > 0 && (
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-widest text-[#404848] mb-3">
                        Missing Keywords
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {score.missingKeywords.map((kw) => (
                          <span
                            key={kw}
                            className="rounded-full bg-red-50 px-2.5 py-1 text-[11px] font-medium text-red-700 border border-red-100"
                          >
                            {kw}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ── SEEK Education ─────────────────────────────────────────── */}
            {Array.isArray(profile?.seekEducation) &&
              (profile!.seekEducation as any[]).length > 0 && (
              <div className="bg-white rounded-xl border border-[#c0c8c7] shadow-sm overflow-hidden">
                <div className="bg-[#eff4ff] px-6 py-3 border-b border-[#c0c8c7]">
                  <span className="text-[11px] font-bold uppercase tracking-widest text-[#404848]">Education</span>
                </div>
                <div className="p-6 space-y-6">
                  {(profile!.seekEducation as any[]).map(
                    (edu: any, i: number) => (
                      <div key={i} className="flex gap-4">
                        <div className="w-12 h-12 bg-[#beebea] rounded-xl flex items-center justify-center text-[#002626] flex-shrink-0">
                          <GraduationCap className="w-6 h-6" />
                        </div>
                        <div>
                          <p className="text-base font-bold text-[#0b1c30]">
                            {edu.degree || "N/A"}
                          </p>
                          {edu.institution && (
                            <p className="text-sm text-[#404848] mt-1 font-medium">
                              {edu.institution}
                            </p>
                          )}
                          {edu.status && (
                            <span className="inline-block mt-1.5 px-2 py-0.5 rounded-full bg-[#e5eeff] text-[#006b57] text-[10px] font-bold">
                              {edu.status}
                            </span>
                          )}
                          {edu.description && (
                            <p className="text-sm text-[#404848] mt-2 leading-relaxed max-w-3xl">
                              {edu.description}
                            </p>
                          )}
                        </div>
                      </div>
                    ),
                  )}
                </div>
              </div>
            )}

            {/* ── SEEK Career History ────────────────────────────────────── */}
            {Array.isArray(profile?.seekCareerHistory) &&
              (profile!.seekCareerHistory as any[]).length > 0 && (
              <div className="bg-white rounded-xl border border-[#c0c8c7] shadow-sm overflow-hidden">
                <div className="bg-[#eff4ff] px-6 py-3 border-b border-[#c0c8c7]">
                  <span className="text-[11px] font-bold uppercase tracking-widest text-[#404848]">Career History</span>
                </div>
                <div className="p-6 space-y-4">
                  {(profile!.seekCareerHistory as any[]).map(
                    (job: any, i: number) => (
                      <div key={i} className="bg-white rounded-xl border border-[#c0c8c7] p-5 shadow-sm">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <p className="text-base font-bold text-[#0b1c30]">
                              {job.title || "N/A"}
                            </p>
                            {job.company && (
                              <p className="text-sm font-semibold text-[#006b57] mt-0.5">
                                {job.company}
                              </p>
                            )}
                          </div>
                          {job.dateRange && (
                            <span className="text-xs font-medium text-[#404848] bg-[#eff4ff] px-3 py-1 rounded-full">
                              {job.dateRange}
                            </span>
                          )}
                        </div>
                        {job.description && (
                          <p className="text-sm text-[#404848] leading-relaxed">
                            {job.description}
                          </p>
                        )}
                      </div>
                    ),
                  )}
                </div>
              </div>
            )}

            {/* ── SEEK Licences & Certifications ─────────────────────────── */}
            {Array.isArray(profile?.seekLicencesAndCertifications) &&
              (profile!.seekLicencesAndCertifications as any[]).length > 0 ? (
              <div className="bg-white rounded-xl border border-[#c0c8c7] shadow-sm overflow-hidden">
                <div className="bg-[#eff4ff] px-6 py-3 border-b border-[#c0c8c7]">
                  <span className="text-[11px] font-bold uppercase tracking-widest text-[#404848]">Licences & Certifications</span>
                </div>
                <div className="p-6 space-y-6">
                  {(profile!.seekLicencesAndCertifications as any[]).map(
                    (lic: any, i: number) => (
                      <div key={i} className="flex gap-4">
                        <div className="w-12 h-12 bg-[#beebea] rounded-xl flex items-center justify-center text-[#002626] flex-shrink-0">
                          <ClipboardList className="w-6 h-6" />
                        </div>
                        <div>
                          <p className="text-base font-bold text-[#0b1c30]">
                            {lic.name || "N/A"}
                          </p>
                          {lic.organization && (
                            <p className="text-sm text-[#404848] mt-1 font-medium">
                              {lic.organization}
                            </p>
                          )}
                          {lic.dateRange && (
                            <p className="text-sm text-[#006b57] font-bold mt-1">
                              {lic.dateRange}
                            </p>
                          )}
                          {lic.description && (
                            <p className="text-sm text-[#404848] mt-2 leading-relaxed max-w-3xl">
                              {lic.description}
                            </p>
                          )}
                        </div>
                      </div>
                    ),
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-[#c0c8c7] shadow-sm overflow-hidden">
                <div className="bg-[#eff4ff] px-6 py-3 border-b border-[#c0c8c7]">
                  <span className="text-[11px] font-bold uppercase tracking-widest text-[#404848]">Licences & Certifications</span>
                </div>
                <div className="p-8 flex items-center justify-center text-[#404848] py-12">
                  <div className="text-center">
                    <ClipboardList className="w-10 h-10 mx-auto mb-3 text-[#c0c8c7]" />
                    <p className="text-sm font-medium">No licences or certifications on file</p>
                  </div>
                </div>
              </div>
            )}

            {/* ── SEEK Application Questions ─────────────────────────────── */}
            {Array.isArray(profile?.seekApplicationQuestions) &&
              (profile!.seekApplicationQuestions as any[]).length > 0 && (
              <div className="bg-white rounded-xl border border-[#c0c8c7] shadow-sm overflow-hidden">
                <div className="bg-[#eff4ff] px-6 py-3 border-b border-[#c0c8c7]">
                  <span className="text-[11px] font-bold uppercase tracking-widest text-[#404848]">Application Questions</span>
                </div>
                <div className="p-6 space-y-4">
                  {(profile!.seekApplicationQuestions as any[]).map(
                    (qa: any, i: number) => (
                      <div key={i}>
                        <p className="text-[11px] font-bold uppercase tracking-widest text-[#707978]">
                          {qa.question || "N/A"}
                        </p>
                        {qa.answer && (
                          <p className="text-sm font-medium text-[#0b1c30] mt-1 leading-relaxed">
                            {qa.answer}
                          </p>
                        )}
                      </div>
                    ),
                  )}
                </div>
              </div>
            )}

            {/* ── SEEK Skills ────────────────────────────────────────────── */}
            {Array.isArray(profile?.seekSkills) &&
              (profile!.seekSkills as any[]).length > 0 && (
              <div className="bg-white rounded-xl border border-[#c0c8c7] shadow-sm overflow-hidden">
                <div className="bg-[#eff4ff] px-6 py-3 border-b border-[#c0c8c7]">
                  <span className="text-[11px] font-bold uppercase tracking-widest text-[#404848]">Skills</span>
                </div>
                <div className="p-6">
                  <div className="flex flex-wrap gap-2">
                    {(profile!.seekSkills as any[]).map((skill: any, i: number) => (
                      <span
                        key={i}
                        className="rounded-full bg-[#e5eeff] px-3 py-1 text-sm font-medium text-[#006b57] border border-[#d3e4fe]"
                      >
                        {String(skill)}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}
              </div>             {/* close left col-span-8 */}

              {/* RIGHT COLUMN */}
              <div className="col-span-4 space-y-6 lg:space-y-8">
                {/* Current Stage card */}
                <div className="bg-white rounded-xl border border-[#c0c8c7] shadow-sm overflow-hidden">
                  <div className="bg-[#eff4ff] px-6 py-3 border-b border-[#c0c8c7]">
                    <span className="text-[11px] font-bold uppercase tracking-widest text-[#404848]">Current Stage</span>
                  </div>
                  <div className="p-6">
                    <span className="inline-flex items-center rounded-full bg-blue-100 text-blue-700 px-3 py-1.5 text-xs font-bold uppercase tracking-wider">
                      {application.currentStage.replace(/_/g, " ")}
                    </span>
                  </div>
                </div>

                {/* Domicile card */}
                <div className="bg-white rounded-xl border border-[#c0c8c7] shadow-sm overflow-hidden">
                  <div className="bg-[#eff4ff] px-6 py-3 border-b border-[#c0c8c7]">
                    <span className="text-[11px] font-bold uppercase tracking-widest text-[#404848]">Domicile</span>
                  </div>
                  <div className="p-6">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={domicileDraft}
                        onChange={(e) => setDomicileDraft(e.target.value)}
                        onKeyDown={(e) =>
                          e.key === "Enter" && handleSaveDomicile()
                        }
                        placeholder={profile?.location || "Enter city/region..."}
                        className="flex-1 bg-white border border-[#c0c8c7] rounded-lg px-4 py-2.5 text-sm font-bold text-[#0b1c30] focus:ring-2 focus:ring-[#006b57] focus:border-[#006b57] outline-none"
                      />
                      <button
                        onClick={handleSaveDomicile}
                        disabled={
                          savingDomicile ||
                          !domicileDraft.trim() ||
                          domicileDraft.trim() === (profile?.domicile || "")
                        }
                        className="bg-[#00C3A0] text-white px-4 py-2.5 rounded-lg font-bold text-xs hover:bg-[#00a88a] transition-all shadow-sm flex items-center gap-1.5 shrink-0 disabled:opacity-50"
                      >
                        {savingDomicile ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Check className="w-3.5 h-3.5" />
                        )}
                        Apply
                      </button>
                    </div>
                  </div>
                </div>

                {/* Source card */}
                <div className="bg-white rounded-xl border border-[#c0c8c7] shadow-sm overflow-hidden">
                  <div className="bg-[#eff4ff] px-6 py-3 border-b border-[#c0c8c7]">
                    <span className="text-[11px] font-bold uppercase tracking-widest text-[#404848]">Source</span>
                  </div>
                  <div className="p-6">
                    <div className="flex gap-2">
                      <select
                        className="flex-1 bg-white border border-[#c0c8c7] rounded-lg px-4 py-2.5 text-sm font-bold text-[#0b1c30] cursor-pointer focus:ring-2 focus:ring-[#006b57] focus:border-[#006b57] outline-none appearance-none"
                        value={sourcePreset}
                        onChange={(e) => setSourcePreset(e.target.value as typeof sourcePreset)}
                      >
                        {SOURCE_PRESET_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                      <button
                        onClick={handleSaveSource}
                        disabled={
                          savingSource ||
                          sourcePreset ===
                            normalizeSourcePreset(application.source)
                        }
                        className="bg-[#00C3A0] text-white px-4 py-2.5 rounded-lg font-bold text-xs hover:bg-[#00a88a] transition-all shadow-sm flex items-center gap-1.5 shrink-0 disabled:opacity-50"
                      >
                        {savingSource ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Check className="w-3.5 h-3.5" />
                        )}
                        Apply
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Tab: Resume / CV ───────────────────────────────────────────── */}
        {activeTab === "resume" && (
          <div className="flex flex-col flex-1 min-h-0">
            {/* Action bar */}
            <div className="flex items-center justify-between px-6 sm:px-8 lg:px-12 xl:px-16 2xl:px-24 py-4 border-b border-gray-100 bg-white">
              <p className="text-sm text-nuanu-gray-500 font-medium">
                {resumeDocs.length > 0
                  ? "Resume file attached — view or download below"
                  : hasResume
                    ? "Extracted resume text from uploaded document"
                    : "No resume on file for this candidate"}
              </p>
              <div className="flex items-center gap-2">
                {profile?.resumeUrl && (
                  <>
                    <a
                      href={profile.resumeUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-secondary py-1.5 px-4 text-xs flex items-center gap-1.5"
                    >
                      <ExternalLink className="w-3.5 h-3.5" /> Open in new tab
                    </a>
                    <a
                      href={profile.resumeUrl}
                      download
                      className="btn-primary py-1.5 px-4 text-xs flex items-center gap-1.5"
                    >
                      <Download className="w-3.5 h-3.5" /> Download
                    </a>
                  </>
                )}
              </div>
            </div>

            {/* PDF Viewer using react-pdf (client-only, loaded dynamically) */}
            {(() => {
              const pdfUrl =
                resumeDocs.length > 0 &&
                resumeDocs[0].fileUrl &&
                resumeDocs[0].fileUrl !== "pending"
                  ? resumeDocs[0].fileUrl
                  : profile?.resumeUrl || null;

              if (!pdfUrl) return null;

              const PdfViewer = dynamic(() => import("./PdfViewer"), { ssr: false });

              return <PdfViewer pdfUrl={pdfUrl} />;
            })()}

            {/* Extracted text */}
            {resumeDocs.length === 0 &&
              !profile?.resumeUrl &&
              profile?.resumeText && (
                <div className="flex-1 overflow-y-auto px-6 sm:px-8 lg:px-12 xl:px-16 2xl:px-24 py-8">
                  <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
                    <div className="bg-gradient-to-r from-nuanu-navy to-[#0D2040] px-8 py-5 flex items-center gap-3">
                      <FileText className="w-6 h-6 text-emerald-400" />
                      <div>
                        <p className="text-white font-bold text-base leading-tight">
                          {candidate.name}
                        </p>
                        <p className="text-emerald-400/70 text-xs font-medium mt-0.5">
                          Resume / Curriculum Vitae
                        </p>
                      </div>
                    </div>
                    <div className="p-8">
                      <pre className="font-sans text-sm text-gray-700 leading-relaxed whitespace-pre-wrap break-words p-4">
                        {profile.resumeText}
                      </pre>
                    </div>
                  </div>
                </div>
              )}

            {/* Empty state + upload */}
            {!profile?.resumeUrl &&
              !profile?.resumeText &&
              resumeDocs.length === 0 && (
                <div className="flex-1 flex flex-col items-center justify-center gap-4 p-12 text-center">
                  <div className="w-20 h-20 rounded-2xl bg-nuanu-gray-50 border-2 border-dashed border-nuanu-gray-200 flex items-center justify-center">
                    <FileText className="w-9 h-9 text-nuanu-gray-300" />
                  </div>
                  <div>
                    <p className="text-lg font-bold text-nuanu-navy mb-1">
                      No Resume on File
                    </p>
                    <p className="text-sm text-nuanu-gray-400 max-w-xs">
                      This candidate did not attach a resume during their
                      application, or the file could not be processed.
                    </p>
                  </div>

                  {/* CV Upload UI */}
                  <div className="mt-2">
                    {cvFile ? (
                      <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-3">
                        <FileText className="w-5 h-5 text-emerald-600" />
                        <span className="text-sm font-medium text-emerald-700">
                          {cvFile.name}
                        </span>
                        <button
                          onClick={() => setCvFile(null)}
                          className="p-1 text-emerald-500 hover:text-emerald-700"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <label className="cursor-pointer btn-primary px-6 py-3 flex items-center gap-2">
                        <UploadCloud className="w-5 h-5" />
                        <span>Upload CV / Resume</span>
                        <input
                          type="file"
                          accept=".pdf,.doc,.docx"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) setCvFile(file);
                          }}
                          className="hidden"
                        />
                      </label>
                    )}
                    {cvFile && (
                      <button
                        onClick={handleCvUpload}
                        disabled={uploadingCv}
                        className="btn-primary w-full mt-3 flex items-center justify-center gap-2"
                      >
                        {uploadingCv ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Uploading...
                          </>
                        ) : (
                          <>
                            <UploadCloud className="w-4 h-4" />
                            Upload Resume
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              )}
          </div>
        )}

        {/* ── Tab: Interview Results ──────────────────────────────────────── */}
        {activeTab === "interview_results" && (
          <div className="flex flex-col flex-1 min-h-0">
            {loadingInterviewFeedback && (
              <div className="flex items-center justify-center gap-2 border-b border-gray-100 bg-white px-6 py-3 text-sm text-nuanu-gray-500">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading interview results...
              </div>
            )}
            <div className="flex-1 overflow-y-auto px-6 sm:px-8 lg:px-12 xl:px-16 2xl:px-24 py-8 space-y-5 bg-gray-50/40">
              {/* Reviewer assignment */}
              {feedbackPermissions.canAssignReviewers && (
                <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm space-y-5">
                  <div>
                    <p className="font-bold text-nuanu-navy break-words">
                      Assign interview reviewers
                    </p>
                    <p className="text-xs text-nuanu-gray-400 mt-1 break-words">
                      Choose who can fill User 1 and User 2 comments for this
                      candidate. HR can always fill these sections on behalf of
                      the assigned reviewer.
                    </p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="text-xs text-nuanu-gray-400 mb-1 block">
                        User 1 reviewer
                      </label>
                      <select
                        value={reviewerAssignmentDraft.user1ReviewerId}
                        onChange={(e) =>
                          setReviewerAssignmentDraft((prev) => ({
                            ...prev,
                            user1ReviewerId: e.target.value,
                          }))
                        }
                        className="w-full input-field py-2 text-sm"
                      >
                        <option value="">Unassigned</option>
                        {assignableReviewers
                          .filter(
                            (user) =>
                              user.id !==
                              reviewerAssignmentDraft.user2ReviewerId,
                          )
                          .map((user) => (
                            <option key={`u1-${user.id}`} value={user.id}>
                              {user.name} ({user.roleLabel})
                            </option>
                          ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-nuanu-gray-400 mb-1 block">
                        User 2 reviewer
                      </label>
                      <select
                        value={reviewerAssignmentDraft.user2ReviewerId}
                        onChange={(e) =>
                          setReviewerAssignmentDraft((prev) => ({
                            ...prev,
                            user2ReviewerId: e.target.value,
                          }))
                        }
                        className="w-full input-field py-2 text-sm"
                      >
                        <option value="">Unassigned</option>
                        {assignableReviewers
                          .filter(
                            (user) =>
                              user.id !==
                              reviewerAssignmentDraft.user1ReviewerId,
                          )
                          .map((user) => (
                            <option key={`u2-${user.id}`} value={user.id}>
                              {user.name} ({user.roleLabel})
                            </option>
                          ))}
                      </select>
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={saveReviewerAssignments}
                      disabled={savingReviewerAssignments}
                      className="btn-primary px-5 py-2.5 text-sm"
                    >
                      {savingReviewerAssignments
                        ? "Saving..."
                        : "Save assignments"}
                    </button>
                  </div>
                </div>
              )}

              {/* Share link */}
              {feedbackPermissions.canAssignReviewers && (
                <InterviewShareLinkCard slug={interviewSlug} />
              )}

              {/* Comment sections */}
              {(() => {
                const sections = [
                  {
                    key: "HR" as ReviewerType,
                    title: "HR Manager Comment",
                    assignedTo: null as string | null,
                    data: interviewFeedback.hr,
                    canEdit: feedbackPermissions.canEditHR,
                    canView: feedbackPermissions.canViewHR,
                  },
                  {
                    key: "USER_1" as ReviewerType,
                    title: "User 1 Comment",
                    assignedTo: feedbackAssignments.user1ReviewerName,
                    data: interviewFeedback.user1,
                    canEdit: feedbackPermissions.canEditUser1,
                    canView: feedbackPermissions.canViewUser1,
                  },
                  {
                    key: "USER_2" as ReviewerType,
                    title: "User 2 Comment",
                    assignedTo: feedbackAssignments.user2ReviewerName,
                    data: interviewFeedback.user2,
                    canEdit: feedbackPermissions.canEditUser2,
                    canView: feedbackPermissions.canViewUser2,
                  },
                ].filter((s) => s.canView);

                if (sections.length === 0) {
                  return (
                    <div className="bg-white border border-gray-100 rounded-2xl p-6 text-center text-sm text-nuanu-gray-500 space-y-2">
                      {feedbackLoadError ? (
                        <>
                          <p className="font-medium text-amber-700">
                            Could not load interview results
                          </p>
                          <p>{feedbackLoadError}</p>
                        </>
                      ) : (
                        <p className="text-sm text-gray-500 italic">
                          No interview comments available.
                        </p>
                      )}
                    </div>
                  );
                }

                return sections.map((section) => {
                  const readOnly = !section.canEdit;
                  return (
                    <div
                      key={section.key}
                      className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm space-y-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="font-bold text-nuanu-navy break-words">
                            {section.title}
                          </p>
                          {section.key !== "HR" && (
                            <p className="text-xs text-nuanu-gray-400 mt-1 break-words">
                              {section.assignedTo
                                ? `Assigned to ${section.assignedTo}`
                                : "No reviewer assigned yet"}
                            </p>
                          )}
                        </div>
                        {readOnly && (
                          <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wide text-nuanu-gray-400 border border-gray-200 rounded-full px-2 py-0.5">
                            Read only
                          </span>
                        )}
                      </div>

                      {readOnly ? (
                        <div className="rounded-xl border border-gray-100 bg-gray-50/60 p-4 min-h-[88px] break-words whitespace-pre-wrap text-sm text-nuanu-gray-700 leading-relaxed [overflow-wrap:break-word]">
                          {feedbackDrafts[section.key].comments.trim() ||
                            "No comment yet for this section."}
                        </div>
                      ) : (
                        <div>
                          <p className="text-xs text-nuanu-gray-400 mb-2">
                            Comment
                          </p>
                          <textarea
                            value={feedbackDrafts[section.key].comments}
                            onChange={(e) =>
                              setFeedbackDrafts((prev) => ({
                                ...prev,
                                [section.key]: {
                                  ...prev[section.key],
                                  comments: e.target.value,
                                },
                              }))
                            }
                            rows={5}
                            className="w-full min-h-[120px] text-sm border border-gray-200 rounded-xl px-4 py-3 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 focus:outline-none transition-colors"
                            placeholder="Write comment"
                          />
                        </div>
                      )}

                      {section.data && (
                        <p className="text-xs text-nuanu-gray-400 break-words">
                          <span className="font-semibold text-nuanu-gray-500">
                            {section.data.authorName}
                          </span>{" "}
                          · {formatDate(section.data.updatedAt)}
                        </p>
                      )}

                      <div className="flex justify-end">
                        <button
                          type="button"
                          onClick={() =>
                            saveStructuredFeedback(section.key)
                          }
                          disabled={readOnly}
                          className="btn-primary px-5 py-2.5 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {savingFeedbackType === section.key
                            ? "Saving..."
                            : "Save Comment"}
                        </button>
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          </div>
        )}

        {/* ── Tab: Reference Checks ───────────────────────────────────────── */}
        {activeTab === "references" && (
          <div className="min-h-[400px]">
            <ReferenceCheckTab
              applicationId={application.id}
              candidateName={candidate.name}
              positionLabel={appliedFor}
            />
          </div>
        )}

        {/* ── Tab: Assessments ────────────────────────────────────────────── */}
        {activeTab === "assessments" && (
          <div className="px-6 sm:px-8 lg:px-12 xl:px-16 2xl:px-24 py-8 space-y-5">
            {application.assessments.length === 0 ? (
              <EmptyState
                icon={ClipboardList}
                title="No Assessments"
                message="No assessments have been assigned to this candidate yet."
              />
            ) : (
              <>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">
                  Assessments ({application.assessments.length})
                </p>
                {application.assessments.map((assessment) => (
                  <div
                    key={assessment.id}
                    className="rounded-xl border border-gray-100 bg-white p-5"
                  >
                    <div className="mb-3 flex items-start justify-between">
                      <div>
                        <p className="font-bold text-nuanu-navy text-base">
                          {assessment.title}
                        </p>
                        <p className="mt-1 text-xs text-nuanu-gray-400">
                          {assessment.type} ·{" "}
                          {formatDate(assessment.createdAt)}
                        </p>
                      </div>
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-bold uppercase tracking-wide ${
                          STATUS_COLORS[assessment.status] ??
                          "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {assessment.status}
                      </span>
                    </div>
                    {assessment.status === "completed" &&
                      assessment.score !== null &&
                      assessment.maxScore !== null && (
                        <div className="mt-4 flex items-center gap-4 border-t border-gray-50 pt-4">
                          <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-100">
                            <div
                              className={`h-full rounded-full ${
                                assessment.isPassed
                                  ? "bg-emerald-500"
                                  : "bg-red-400"
                              }`}
                              style={{
                                width: `${
                                  (assessment.score / assessment.maxScore) *
                                  100
                                }%`,
                              }}
                            />
                          </div>
                          <span
                            className={`text-sm font-bold ${
                              assessment.isPassed
                                ? "text-emerald-600"
                                : "text-red-500"
                            }`}
                          >
                            {assessment.score}/{assessment.maxScore}{" "}
                            {assessment.isPassed ? "✓ Passed" : "✗ Failed"}
                          </span>
                        </div>
                      )}
                  </div>
                ))}
              </>
            )}
          </div>
        )}

        {/* ── Tab: Notes ──────────────────────────────────────────────────── */}
        {activeTab === "notes" && (
          <div className="flex flex-col min-h-[400px]">
            <div className="px-6 sm:px-8 lg:px-12 xl:px-16 2xl:px-24 py-8 border-b border-gray-100 bg-white">
              <div className="flex gap-3">
                <input
                  type="text"
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAddNote()}
                  placeholder="Add a new note..."
                  className="flex-1 input-field py-3"
                />
                <button
                  onClick={handleAddNote}
                  disabled={!noteText.trim() || savingNote}
                  className="btn-primary px-5 py-2.5 flex items-center gap-2"
                >
                  {savingNote ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Plus className="w-4 h-4" />
                  )}
                  Add Note
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-6 sm:px-8 lg:px-12 xl:px-16 2xl:px-24 py-8 space-y-5">
              {localNotes.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="w-16 h-16 rounded-full bg-amber-50 flex items-center justify-center mb-4">
                    <StickyNote className="w-8 h-8 text-amber-400" />
                  </div>
                  <p className="text-lg font-bold text-nuanu-navy mb-1">
                    No Notes Yet
                  </p>
                  <p className="text-sm text-nuanu-gray-400 max-w-xs">
                    Add notes to keep track of important information about this
                    candidate.
                  </p>
                </div>
              ) : (
                localNotes.map((note) => (
                  <div
                    key={note.id}
                    className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm"
                  >
                    {editingNoteId === note.id ? (
                      <div className="space-y-3">
                        <textarea
                          value={editNoteText}
                          onChange={(e) =>
                            setEditNoteText(e.target.value)
                          }
                          className="w-full input-field min-h-[100px]"
                          autoFocus
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleEditNote(note.id)}
                            disabled={
                              savingNote || !editNoteText.trim()
                            }
                            className="btn-primary px-4 py-2 text-xs"
                          >
                            {savingNote ? "Saving..." : "Save"}
                          </button>
                          <button
                            onClick={() => {
                              setEditingNoteId(null);
                              setEditNoteText("");
                            }}
                            className="btn-secondary px-4 py-2 text-xs"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-xs font-bold">
                              {note.authorName
                                .split(" ")
                                .map((n) => n[0])
                                .join("")
                                .substring(0, 2)
                                .toUpperCase()}
                            </div>
                            <div>
                              <p className="text-sm font-bold text-nuanu-navy">
                                {note.authorName}
                              </p>
                              <p className="text-xs text-nuanu-gray-400">
                                {formatDate(note.createdAt)}
                                {note.updatedAt !== note.createdAt &&
                                  ` (edited ${formatDate(note.updatedAt)})`}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => {
                                setEditingNoteId(note.id);
                                setEditNoteText(note.content);
                              }}
                              className="p-1.5 text-nuanu-gray-400 hover:text-nuanu-navy hover:bg-gray-100 rounded-lg transition-colors"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() =>
                                handleDeleteNote(note.id)
                              }
                              className="p-1.5 text-nuanu-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                        <div className="text-sm text-nuanu-gray-700 leading-relaxed whitespace-pre-wrap">
                          {note.content}
                        </div>
                      </>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* ── Tab: Activity Timeline ──────────────────────────────────────── */}
        {activeTab === "timeline" && (
          <div className="px-6 sm:px-8 lg:px-12 xl:px-16 2xl:px-24 py-8">
            {candidate.activityLogs.length === 0 ? (
              <EmptyState
                icon={Clock}
                title="No Activity Yet"
                message="Activity events will appear here as the candidate progresses through the pipeline."
              />
            ) : (
              <div className="space-y-5">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">
                  Activity Timeline
                </p>
                <div className="relative">
                  <div className="absolute top-0 bottom-0 left-5 w-0.5 bg-gray-100" />
                  <div className="space-y-5">
                    {candidate.activityLogs.map((event) => (
                      <div
                        key={event.id}
                        className="relative flex gap-4"
                      >
                        <div className="z-10 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full border-2 border-white bg-emerald-100 text-emerald-600">
                          <Clock className="h-4 w-4" />
                        </div>
                        <div className="flex-1 rounded-xl border border-gray-100 bg-white p-5">
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
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Shared sub-components                                                      */
/* -------------------------------------------------------------------------- */

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
      <p className="mb-1 text-base font-bold text-nuanu-navy">{title}</p>
      <p className="max-w-xs text-sm text-nuanu-gray-400">{message}</p>
    </div>
  );
}