"use client";

import { useState, useMemo, useEffect, useDeferredValue } from "react";
import dynamic from "next/dynamic";
import {
  Search,
  Filter,
  Eye,
  Mail,
  MoreVertical,
  Users,
  X,
  Check,
  Loader2,
  Send,
  FileText,
  Download,
  User,
  ExternalLink,
  AlertCircle,
  StickyNote,
  Plus,
  Trash2,
  UploadCloud,
  CheckCircle2,
  Edit,
  LayoutGrid,
  MessageSquare,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  updateCandidateStage,
  sendCandidateEmail,
  addNote,
  editNote,
  deleteNote,
  addInterviewComment,
  deleteInterviewComment,
  uploadCandidateResume,
  updateCandidateOverviewDetails,
  getNotes,
  getInterviewComments,
} from "./actions";
import {
  formatDate,
  PIPELINE_STAGES,
  SOURCE_PRESET_OPTIONS,
  normalizePipelineStage,
  resolvePipelineColumn,
} from "@/lib/utils";
import { toast } from "sonner";
import Portal from "@/components/ui/Portal";

import DatePickerField from "@/components/ui/DatePickerField";

const PAGE_SIZE = 50;

const CandidateProfile360 = dynamic(() => import("./CandidateProfile360"), {
  loading: () => null,
});

function normalizeRecommendations(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

function normalizeCandidate(candidate: Candidate): Candidate {
  return {
    ...candidate,
    notes: candidate.notes ?? [],
    interviewComments: candidate.interviewComments ?? [],
    skills: Array.isArray(candidate.skills) ? candidate.skills : [],
    recommendations: normalizeRecommendations(candidate.recommendations),
  };
}

export type Candidate = {
  id: string;
  userId: string;
  name: string;
  email: string;
  vacancyTitle: string;
  stage: string;
  score: number;
  experienceYears: number;
  location: string;
  appliedAt: string;
  phone?: string;
  skills?: string[];
  coverLetter?: string;
  resumeUrl?: string;
  resumeText?: string;
  // New fields
  source?: string;
  domicile?: string;
  referPosition?: string;
  emailSentAt?: string;
  emailSentSubject?: string;
  recommendations?: string[];
  notes: {
    id: string;
    content: string;
    authorName: string;
    authorId: string;
    createdAt: string;
    updatedAt: string;
  }[];
  interviewComments: {
    id: string;
    content: string;
    authorName: string;
    authorId: string;
    createdAt: string;
    updatedAt: string;
  }[];
};

type StageNotice = {
  type: "success" | "error";
  title: string;
  message: string;
};

function stageLabel(stageId: string) {
  const canonical = resolvePipelineColumn(stageId);
  return (
    PIPELINE_STAGES.find((s) => s.id === canonical)?.label ??
    canonical.replace(/_/g, " ")
  );
}

function appliedAtMs(iso: string) {
  const t = new Date(iso).getTime();
  return Number.isNaN(t) ? 0 : t;
}

export default function CandidatesTable({
  candidates,
}: {
  candidates: Candidate[];
}) {
  const [localCandidates, setLocalCandidates] = useState(candidates);
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [stageFilter, setStageFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [loadingActionId, setLoadingActionId] = useState<string | null>(null);
  const [stageNotice, setStageNotice] = useState<StageNotice | null>(null);
  const [loadingProfileDetails, setLoadingProfileDetails] = useState(false);

  useEffect(() => {
    setLocalCandidates(candidates);
  }, [candidates]);

  useEffect(() => {
    setPage(1);
  }, [deferredSearch, stageFilter]);

  // Profile tab
  const [profileTab, setProfileTab] = useState<
    "overview" | "resume" | "interview_results" | "notes"
  >("overview");

  // Modals state
  const [selectedProfile, setSelectedProfile] = useState<Candidate | null>(
    null,
  );
  const [selectedEmail, setSelectedEmail] = useState<Candidate | null>(null);

  // Email form state
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  // Notes state
  const [noteText, setNoteText] = useState("");
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editNoteText, setEditNoteText] = useState("");
  const [savingNote, setSavingNote] = useState(false);

  // Interview comments state
  const [interviewCommentText, setInterviewCommentText] = useState("");
  const [savingInterviewComment, setSavingInterviewComment] = useState(false);

  // Source field state
  const [sourcePreset, setSourcePreset] = useState("direct");
  const [savingSource, setSavingSource] = useState(false);

  // Refer As / Domicile field state
  const [referAsDraft, setReferAsDraft] = useState("");
  const [domicileDraft, setDomicileDraft] = useState("");
  const [savingReferAs, setSavingReferAs] = useState(false);
  const [savingDomicile, setSavingDomicile] = useState(false);

  // CV Upload state
  const [uploadingCv, setUploadingCv] = useState(false);
  const [cvFile, setCvFile] = useState<File | null>(null);

  // 360° profile state
  const [show360, setShow360] = useState(false);

  // Change 2: stage selector state
  const [stageSelectorId, setStageSelectorId] = useState<string | null>(null);

  // Change 3: email template state
  const [emailTemplate, setEmailTemplate] = useState("");

  // Optimistic email sent tracking (candidateId → ISO timestamp)
  const [emailSentMap, setEmailSentMap] = useState<Record<string, string>>(() => {
    // Pre-populate from initial candidate data
    const map: Record<string, string> = {};
    return map;
  });

  // Local state for live notes/comments (so UI updates without full reload)
  const [localNotes, setLocalNotes] = useState<Candidate["notes"]>([]);
  const [localInterviewComments, setLocalInterviewComments] = useState<
    Candidate["interviewComments"]
  >([]);

  const filteredCandidates = useMemo(() => {
    const q = deferredSearch.trim().toLowerCase();
    return localCandidates
      .filter((c) => {
        const matchSearch =
          !q ||
          c.name.toLowerCase().includes(q) ||
          c.email.toLowerCase().includes(q) ||
          c.vacancyTitle.toLowerCase().includes(q);
        const canonical = normalizePipelineStage(c.stage);
        const matchStage =
          stageFilter === "all" || canonical === stageFilter;
        return matchSearch && matchStage;
      })
      .sort((a, b) => appliedAtMs(b.appliedAt) - appliedAtMs(a.appliedAt));
  }, [localCandidates, deferredSearch, stageFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredCandidates.length / PAGE_SIZE));
  const paginatedCandidates = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filteredCandidates.slice(start, start + PAGE_SIZE);
  }, [filteredCandidates, page]);

  const showStageNotice = (notice: StageNotice) => {
    setStageNotice(notice);
    if (notice.type === "success") {
      window.setTimeout(() => setStageNotice(null), 2800);
    }
  };

  const applyStageUpdateResult = (
    applicationId: string,
    result: Awaited<ReturnType<typeof updateCandidateStage>>,
    candidateName: string,
    targetStageId: string,
    previousStage: string,
  ) => {
    if (result.success && result.newStage) {
      setLocalCandidates((prev) =>
        prev.map((c) =>
          c.id === applicationId ? { ...c, stage: result.newStage! } : c,
        ),
      );
      showStageNotice({
        type: "success",
        title: "Stage updated",
        message: `${candidateName} moved to ${stageLabel(result.newStage)}.`,
      });
      return;
    }

    setLocalCandidates((prev) =>
      prev.map((c) =>
        c.id === applicationId ? { ...c, stage: previousStage } : c,
      ),
    );
    showStageNotice({
      type: "error",
      title: "Stage update failed",
      message:
        result.error ??
        `Could not move ${candidateName} to ${stageLabel(targetStageId)}.`,
    });
  };

  const handleStageAction = async (id: string, action: "next" | "reject") => {
    const candidate = localCandidates.find((c) => c.id === id);
    if (!candidate) return;
    const previousStage = candidate.stage;
    const targetStage = action === "reject" ? "rejected" : "assessment";

    setLoadingActionId(id);
    setActiveMenuId(null);
    setLocalCandidates((prev) =>
      prev.map((c) => (c.id === id ? { ...c, stage: targetStage } : c)),
    );
    try {
      const result = await updateCandidateStage(id, action);
      applyStageUpdateResult(id, result, candidate.name, targetStage, previousStage);
    } catch (error) {
      console.error(error);
      setLocalCandidates((prev) =>
        prev.map((c) => (c.id === id ? { ...c, stage: previousStage } : c)),
      );
      showStageNotice({
        type: "error",
        title: "Stage update failed",
        message: `Could not update stage for ${candidate.name}. Please try again.`,
      });
    } finally {
      setLoadingActionId(null);
    }
  };

  const handleStageSelect = async (
    applicationId: string,
    stageId: string,
    previousStage: string,
  ) => {
    const candidate = localCandidates.find((c) => c.id === applicationId);
    if (!candidate || stageId === previousStage) return;

    setStageSelectorId(null);
    setLoadingActionId(applicationId);
    setLocalCandidates((prev) =>
      prev.map((c) =>
        c.id === applicationId ? { ...c, stage: stageId } : c,
      ),
    );
    try {
      const result = await updateCandidateStage(applicationId, stageId);
      applyStageUpdateResult(
        applicationId,
        result,
        candidate.name,
        stageId,
        previousStage,
      );
    } catch (error) {
      console.error(error);
      setLocalCandidates((prev) =>
        prev.map((c) =>
          c.id === applicationId ? { ...c, stage: previousStage } : c,
        ),
      );
      showStageNotice({
        type: "error",
        title: "Stage update failed",
        message: `Could not move ${candidate.name} to ${stageLabel(stageId)}.`,
      });
    } finally {
      setLoadingActionId(null);
    }
  };

  // Change 3: email templates
  const EMAIL_TEMPLATES: Record<string, { subject: string; body: string }> = {
    rejected: {
      subject: `Update on your application at Nuanu`,
      body: `Hi {{name}},\n\nThank you for your interest in joining Nuanu and for taking the time to go through our recruitment process.\n\nAfter careful consideration, we regret to inform you that we will not be moving forward with your application at this time.\n\nWe appreciate your effort and encourage you to apply for future openings that match your profile.\n\nBest regards,\nNuanu Recruitment Team`,
    },
    on_hold: {
      subject: `Your application is on hold — Nuanu`,
      body: `Hi {{name}},\n\nThank you for applying to Nuanu. We wanted to let you know that your application is currently on hold while we complete our review process.\n\nWe will be in touch with an update as soon as possible.\n\nBest regards,\nNuanu Recruitment Team`,
    },
    not_open: {
      subject: `Position no longer available — Nuanu`,
      body: `Hi {{name}},\n\nThank you for your interest in the {{position}} role at Nuanu.\n\nUnfortunately, this position is no longer open. We will keep your profile on file and reach out if a suitable opportunity arises.\n\nBest regards,\nNuanu Recruitment Team`,
    },
    process_slow: {
      subject: `Update on your application process — Nuanu`,
      body: `Hi {{name}},\n\nWe wanted to reach out and let you know that our recruitment process is taking a bit longer than expected. We appreciate your patience.\n\nWe are still reviewing your application and will be in touch with next steps shortly.\n\nBest regards,\nNuanu Recruitment Team`,
    },
    been_fulfilled: {
      subject: `Position has been filled — Nuanu`,
      body: `Hi {{name}},\n\nThank you for your application for the {{position}} position at Nuanu.\n\nWe are pleased to inform you that this position has been filled. We will keep your details on file for future opportunities.\n\nBest regards,\nNuanu Recruitment Team`,
    },
  };

  const openMailtoFallback = (to: string, subject: string, body: string) => {
    const mailto = `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.open(mailto, "_blank");
  };

  const handleSendEmail = async () => {
    if (!selectedEmail) return;

    setIsSendingEmail(true);
    try {
      const result = await sendCandidateEmail({
        candidateId: selectedEmail.userId,
        applicationId: selectedEmail.id,
        to: selectedEmail.email,
        subject: emailSubject,
        body: emailBody,
      });

      if (result.success) {
        setEmailSent(true);
        // Optimistic update — show badge immediately without page reload
        const now = new Date().toISOString();
        setEmailSentMap((prev) => ({ ...prev, [selectedEmail.id]: now }));
        toast.success("Email sent successfully!", {
          description: `Message delivered to ${selectedEmail.email}`,
        });
        setTimeout(() => {
          setEmailSent(false);
          setSelectedEmail(null);
        }, 2000);
      } else {
        const errMsg = (result as { error?: string }).error || "Unknown error";
        const isBrevoIp =
          errMsg.includes("authorised_ips") ||
          errMsg.includes("unrecognised IP");

        if (isBrevoIp) {
          toast.error("Brevo is blocking Vercel — 1 click to fix", {
            description:
              "Your Brevo account has an IP restriction. Remove it so Vercel can send emails.",
            action: {
              label: "Fix in Brevo →",
              onClick: () =>
                window.open(
                  "https://app.brevo.com/security/authorised_ips",
                  "_blank",
                ),
            },
            duration: 30000,
          });
        } else {
          toast.error("Failed to send email", {
            description: errMsg,
            action: {
              label: "Use Email Client",
              onClick: () =>
                openMailtoFallback(
                  selectedEmail.email,
                  emailSubject,
                  emailBody,
                ),
            },
            duration: 10000,
          });
        }
      }
    } catch (error) {
      toast.error("An unexpected error occurred.");
      console.error(error);
    } finally {
      setIsSendingEmail(false);
    }
  };

  const SOURCE_ALIASES: Record<string, string> = {
    seek: "seek",
    jobstreet: "seek",
    "hr upload": "other",
    "careers page": "career_page",
    "career page": "career_page",
    "nuanu career page": "career_page",
    "nuanu careers": "career_page",
  };

  const normalizeSourcePreset = (source: string | null | undefined) => {
    const src = (source || "direct").toLowerCase().trim();
    const key = SOURCE_ALIASES[src] ?? src;
    const preset = SOURCE_PRESET_OPTIONS.find((p) => p.value === key);
    return preset ? preset.value : "other";
  };

  const resetSourceFields = (source: string | null | undefined) => {
    setSourcePreset(normalizeSourcePreset(source));
  };

  const openProfile = async (c: Candidate) => {
    const normalized = normalizeCandidate(c);
    setSelectedProfile(normalized);
    setProfileTab("overview");
    setLocalNotes([]);
    setLocalInterviewComments([]);
    setNoteText("");
    setInterviewCommentText("");
    resetSourceFields(normalized.source);
    setReferAsDraft(normalized.referPosition || "");
    setDomicileDraft(normalized.domicile || "");
    setCvFile(null);
    setShow360(false);
    setLoadingProfileDetails(true);
    try {
      const [notes, comments] = await Promise.all([
        getNotes(c.id),
        getInterviewComments(c.id),
      ]);
      const mappedNotes = notes.map((n) => ({
        id: n.id,
        content: n.content,
        authorName: n.author.name,
        authorId: n.authorId,
        createdAt: n.createdAt.toISOString(),
        updatedAt: n.updatedAt.toISOString(),
      }));
      const mappedComments = comments.map((comment) => ({
        id: comment.id,
        content: comment.content,
        authorName: comment.author.name,
        authorId: comment.authorId,
        createdAt: comment.createdAt.toISOString(),
        updatedAt: comment.updatedAt.toISOString(),
      }));
      setLocalNotes(mappedNotes);
      setLocalInterviewComments(mappedComments);
      setSelectedProfile((prev) =>
        prev?.id === c.id
          ? {
              ...prev,
              notes: mappedNotes,
              interviewComments: mappedComments,
            }
          : prev,
      );
    } catch (error) {
      console.error("Failed to load profile details:", error);
      toast.error("Could not load notes and interview comments");
    } finally {
      setLoadingProfileDetails(false);
    }
  };

  const handleSaveReferAs = async () => {
    if (!selectedProfile) return;
    const val = referAsDraft.trim();
    if (!val || val === (selectedProfile.referPosition || "")) return;
    setSavingReferAs(true);
    try {
      const res = await updateCandidateOverviewDetails(
        selectedProfile.id,
        selectedProfile.userId,
        { referPosition: val },
      );
      if (res.success) {
        setSelectedProfile({ ...selectedProfile, referPosition: val });
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
    if (!selectedProfile) return;
    const val = domicileDraft.trim();
    if (!val || val === (selectedProfile.domicile || "")) return;
    setSavingDomicile(true);
    try {
      const res = await updateCandidateOverviewDetails(
        selectedProfile.id,
        selectedProfile.userId,
        { domicile: val },
      );
      if (res.success) {
        setSelectedProfile({ ...selectedProfile, domicile: val });
        setDomicileDraft(val);
        toast.success("Domicile updated");
      } else {
        toast.error(res.error || "Failed to update Domicile");
      }
    } finally {
      setSavingDomicile(false);
    }
  };

  const handleSaveSource = async () => {
    if (!selectedProfile) return;
    const value = sourcePreset || "direct";
    setSavingSource(true);
    try {
      const res = await updateCandidateOverviewDetails(
        selectedProfile.id,
        selectedProfile.userId,
        { source: value },
      );
      if (res.success) {
        setSelectedProfile({ ...selectedProfile, source: value });
        resetSourceFields(value);
        toast.success("Source updated");
      } else {
        toast.error(res.error || "Failed to update Source");
      }
    } finally {
      setSavingSource(false);
    }
  };

  const openEmailModal = (c: Candidate) => {
    setSelectedEmail(c);
    setEmailTemplate("");
    setEmailSubject(
      `Update regarding your application for ${c.vacancyTitle} at Nuanu`,
    );
    setEmailBody(
      `Hi ${c.name},\n\nThank you for applying for the ${c.vacancyTitle} position. We wanted to reach out regarding the next steps in our process.\n\nBest regards,\nNuanu Recruitment Team`,
    );
    setEmailSent(false);
  };

  // ── Notes handlers ─────────────────────────────────────────
  const handleAddNote = async () => {
    if (!selectedProfile || !noteText.trim()) return;
    setSavingNote(true);
    const res = await addNote(selectedProfile.id, noteText.trim());
    if (res.success && res.note) {
      const newNote = {
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

  // ── Interview comment handlers ──────────────────────────────
  const handleAddInterviewComment = async () => {
    if (!selectedProfile || !interviewCommentText.trim()) return;
    setSavingInterviewComment(true);
    const res = await addInterviewComment(
      selectedProfile.id,
      interviewCommentText.trim(),
    );
    if (res.success && res.comment) {
      const newComment = {
        id: res.comment.id,
        content: res.comment.content,
        authorName: res.comment.author.name,
        authorId: res.comment.authorId,
        createdAt: res.comment.createdAt.toString(),
        updatedAt: res.comment.updatedAt.toString(),
      };
      setLocalInterviewComments([newComment, ...localInterviewComments]);
      setInterviewCommentText("");
      toast.success("Comment posted");
    } else {
      toast.error(res.error || "Failed to post comment");
    }
    setSavingInterviewComment(false);
  };

  const handleDeleteInterviewComment = async (commentId: string) => {
    if (!confirm("Delete this comment?")) return;
    const res = await deleteInterviewComment(commentId);
    if (res.success) {
      setLocalInterviewComments(
        localInterviewComments.filter((c) => c.id !== commentId),
      );
      toast.success("Comment deleted");
    } else {
      toast.error("Failed to delete comment");
    }
  };

  // ── CV Upload handler ───────────────────────────────────────
  const handleCvUpload = async () => {
    if (!selectedProfile || !cvFile) return;
    setUploadingCv(true);
    const fd = new FormData();
    fd.append("resume", cvFile);
    const res = await uploadCandidateResume(selectedProfile.id, fd);
    if (res.success) {
      toast.success("CV uploaded successfully!");
      if (res.resumeUrl && selectedProfile) {
        setSelectedProfile({ ...selectedProfile, resumeUrl: res.resumeUrl });
      }
      setCvFile(null);
    } else {
      toast.error(res.error || "Upload failed");
    }
    setUploadingCv(false);
  };

  return (
    <div className="card pb-32">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6 border-b border-nuanu-gray-100 pb-6">
        <div className="relative flex-1 group">
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-nuanu-gray-400 group-focus-within:text-emerald-500 transition-colors pointer-events-none z-10">
            <Search className="w-5 h-5" />
          </div>
          <input
            type="text"
            placeholder="Search by name, email, or role..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-field !pl-14 h-12 transition-all"
          />
        </div>
        <div className="relative min-w-[200px]">
          <select
            value={stageFilter}
            onChange={(e) => setStageFilter(e.target.value)}
            className="input-field appearance-none"
          >
            <option value="all">All Stages</option>
            {PIPELINE_STAGES.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
          <Filter className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-nuanu-gray-400 pointer-events-none" />
        </div>
      </div>

      {/* Table Wrapper with horizontal scroll and padding for dropdowns */}
      <div className="overflow-x-auto pb-4 custom-scrollbar">
        <table className="data-table min-w-full">
          <thead>
            <tr>
              <th className="pl-6">Candidate</th>
              <th>Applied For</th>
              <th>Stage</th>
              <th>AI Match</th>
              <th>Applied Date</th>
              <th className="text-right pr-8">Actions</th>
            </tr>
          </thead>
          <tbody>
            {paginatedCandidates.map((candidate) => (
              <tr key={candidate.id}>
                <td className="pl-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-100 to-teal-100 text-emerald-700 flex items-center justify-center font-bold text-sm shadow-sm border border-emerald-200">
                      {candidate.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")
                        .substring(0, 2)
                        .toUpperCase()}
                    </div>
                    <div>
                      <p className="font-semibold text-nuanu-navy leading-tight">
                        {candidate.name}
                      </p>
                      <p className="text-xs text-nuanu-gray-500">
                        {candidate.email}
                      </p>
                      {candidate.source?.toLowerCase() === "seek" && (
                        <span className="inline-block mt-1 text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-100">
                          SEEK
                        </span>
                      )}
                    </div>
                  </div>
                </td>
                <td>
                  <p className="font-medium text-nuanu-navy leading-tight">
                    {candidate.vacancyTitle}
                  </p>
                  <p className="text-[11px] text-nuanu-gray-400 mt-0.5">
                    {candidate.experienceYears} yrs exp • {candidate.location}
                  </p>
                </td>
                <td>
                  <span
                    className={`badge ${
                      resolvePipelineColumn(candidate.stage) === "hired"
                        ? "bg-emerald-100 text-emerald-700 border-emerald-200"
                        : resolvePipelineColumn(candidate.stage) === "rejected"
                          ? "bg-red-100 text-red-700 border-red-200"
                          : resolvePipelineColumn(candidate.stage) ===
                              "talent_bank"
                            ? "bg-slate-100 text-slate-700 border-slate-200"
                            : "bg-blue-50 text-blue-700 border-blue-100"
                    } border uppercase tracking-wider text-[9px] font-bold px-2 py-1`}
                  >
                    {stageLabel(candidate.stage)}
                  </span>
                </td>
                <td>
                  <div className="flex items-center gap-2">
                    <div className="w-full max-w-[80px] h-1.5 bg-nuanu-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${candidate.score >= 80 ? "bg-nuanu-emerald shadow-[0_0_8px_rgba(16,185,129,0.3)]" : candidate.score >= 60 ? "bg-nuanu-warning" : "bg-nuanu-error"}`}
                        style={{ width: `${candidate.score}%` }}
                      />
                    </div>
                    <span className="text-xs font-bold text-nuanu-navy min-w-[30px]">
                      {Math.round(candidate.score)}%
                    </span>
                  </div>
                </td>
                <td>
                  <span className="text-sm text-nuanu-gray-500 font-medium">
                    {formatDate(candidate.appliedAt)}
                  </span>
                </td>
                <td className="text-right pr-8">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        openProfile(candidate);
                      }}
                      className="p-2 text-nuanu-gray-400 hover:text-nuanu-emerald bg-nuanu-gray-50 hover:bg-emerald-50 rounded-lg transition-all hover:scale-110"
                      title="View Profile"
                      aria-label={`View profile for ${candidate.name}`}
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    {/* Email button + persistent "Email Sent" badge */}
                    {(() => {
                      const sentAt = emailSentMap[candidate.id] ?? candidate.emailSentAt;
                      const sentDate = sentAt ? new Date(sentAt) : null;
                      const shortTs = sentDate
                        ? `${String(sentDate.getDate()).padStart(2, "0")}/${String(sentDate.getMonth() + 1).padStart(2, "0")} · ${String(sentDate.getHours()).padStart(2, "0")}:${String(sentDate.getMinutes()).padStart(2, "0")}`
                        : null;
                      const fullTs = sentDate
                        ? sentDate.toLocaleString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })
                        : null;

                      return (
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => openEmailModal(candidate)}
                            className={`p-2 rounded-lg transition-all hover:scale-110 flex-shrink-0 ${
                              sentAt
                                ? "text-emerald-700 bg-emerald-50 hover:bg-emerald-100"
                                : "text-nuanu-gray-400 hover:text-blue-600 bg-nuanu-gray-50 hover:bg-blue-50"
                            }`}
                            title={sentAt ? `Email sent on ${fullTs}. Click to send another.` : "Send Email"}
                          >
                            {sentAt ? (
                              <CheckCircle2 className="w-4 h-4" />
                            ) : (
                              <Mail className="w-4 h-4" />
                            )}
                          </button>

                          {sentAt && (
                            <div
                              className="flex items-center gap-1 flex-shrink-0"
                              title={`Email sent on ${fullTs}. Click icon to send another.`}
                            >
                              {/* Pill badge */}
                              <span
                                className="flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[11px] font-medium"
                                style={{
                                  background: "#E1F5EE",
                                  border: "0.5px solid #5DCAA5",
                                  color: "#085041",
                                }}
                              >
                                <Check className="w-2.5 h-2.5 flex-shrink-0" />
                                Email Sent
                              </span>
                              {/* Timestamp — hidden on very narrow screens */}
                              {shortTs && (
                                <span className="hidden sm:inline text-[11px] text-nuanu-gray-400 whitespace-nowrap">
                                  {shortTs}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })()}
                    <div className="relative">
                      {loadingActionId === candidate.id ? (
                        <div className="p-2 text-nuanu-emerald">
                          <Loader2 className="w-4 h-4 animate-spin" />
                        </div>
                      ) : (
                        <select
                          className="py-2 px-3 text-xs font-semibold bg-nuanu-gray-50 hover:bg-nuanu-gray-100 border border-nuanu-gray-200 text-nuanu-navy rounded-lg cursor-pointer outline-none transition-colors"
                          value={resolvePipelineColumn(candidate.stage)}
                          onChange={(e) =>
                            handleStageSelect(
                              candidate.id,
                              e.target.value,
                              resolvePipelineColumn(candidate.stage),
                            )
                          }
                          title="Change Stage"
                        >
                          {PIPELINE_STAGES.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.label}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredCandidates.length > PAGE_SIZE && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-nuanu-gray-100">
            <p className="text-sm text-nuanu-gray-500">
              Showing {(page - 1) * PAGE_SIZE + 1}–
              {Math.min(page * PAGE_SIZE, filteredCandidates.length)} of{" "}
              {filteredCandidates.length}
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1.5 text-sm font-medium rounded-lg border border-nuanu-gray-200 disabled:opacity-40 hover:bg-nuanu-gray-50"
              >
                Previous
              </button>
              <span className="text-sm text-nuanu-gray-600">
                Page {page} of {totalPages}
              </span>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="px-3 py-1.5 text-sm font-medium rounded-lg border border-nuanu-gray-200 disabled:opacity-40 hover:bg-nuanu-gray-50"
              >
                Next
              </button>
            </div>
          </div>
        )}

        {filteredCandidates.length === 0 && (
          <div className="text-center py-12">
            <Users className="w-12 h-12 text-nuanu-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-nuanu-navy">
              No candidates found
            </h3>
            <p className="text-nuanu-gray-500 mt-1">
              Try adjusting your search or filters, or submit an application
              from the /careers page.
            </p>
          </div>
        )}
      </div>

      {/* Centered stage update notification */}
      <Portal>
        <AnimatePresence>
          {stageNotice && (
            <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-black/45 backdrop-blur-sm"
                onClick={() => setStageNotice(null)}
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.92, y: 12 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.92, y: 12 }}
                role="alertdialog"
                aria-labelledby="stage-notice-title"
                aria-describedby="stage-notice-message"
                className="relative z-10 w-full max-w-md rounded-3xl bg-white p-8 text-center shadow-2xl"
              >
                <div
                  className={`mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full ${
                    stageNotice.type === "success"
                      ? "bg-emerald-100 text-emerald-600"
                      : "bg-red-100 text-red-600"
                  }`}
                >
                  {stageNotice.type === "success" ? (
                    <CheckCircle2 className="h-8 w-8" />
                  ) : (
                    <AlertCircle className="h-8 w-8" />
                  )}
                </div>
                <h3
                  id="stage-notice-title"
                  className="text-xl font-bold text-nuanu-navy"
                >
                  {stageNotice.title}
                </h3>
                <p
                  id="stage-notice-message"
                  className="mt-2 text-sm text-nuanu-gray-500"
                >
                  {stageNotice.message}
                </p>
                <button
                  type="button"
                  onClick={() => setStageNotice(null)}
                  className={`mt-6 w-full rounded-xl px-6 py-3 text-sm font-semibold transition-colors ${
                    stageNotice.type === "success"
                      ? "bg-emerald-600 text-white hover:bg-emerald-700"
                      : "bg-nuanu-navy text-white hover:bg-nuanu-navy/90"
                  }`}
                >
                  OK
                </button>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </Portal>

      {/* Profile Modal — portaled above sidebar (z-50) */}
      <Portal>
      <AnimatePresence>
        {selectedProfile && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              onClick={() => setSelectedProfile(null)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl overflow-hidden relative z-10 max-h-[95vh] flex flex-col"
            >
              <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-emerald-100 to-teal-100 text-emerald-700 flex items-center justify-center font-bold text-lg shadow-sm">
                    {selectedProfile.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")
                      .substring(0, 2)
                      .toUpperCase()}
                  </div>
                  <div>
                    <h2 className="text-3xl font-extrabold text-nuanu-navy leading-tight">
                      {selectedProfile.name}
                    </h2>
                    <p className="text-base text-nuanu-gray-500 font-medium">
                      {selectedProfile.email}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedProfile(null)}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* ── Tab Navigation ─────────────────────────────────────── */}
              <div className="flex border-b border-gray-100 bg-gray-50/50">
                <button
                  onClick={() => setProfileTab("overview")}
                  className={`flex items-center gap-2 px-6 py-4 text-sm font-bold transition-all border-b-2 ${
                    profileTab === "overview"
                      ? "border-emerald-500 text-emerald-700 bg-white"
                      : "border-transparent text-nuanu-gray-400 hover:text-nuanu-navy hover:bg-white/60"
                  }`}
                >
                  <User className="w-4 h-4" /> Profile Overview
                </button>
                <button
                  onClick={() => setProfileTab("resume")}
                  className={`flex items-center gap-2 px-6 py-4 text-sm font-bold transition-all border-b-2 ${
                    profileTab === "resume"
                      ? "border-emerald-500 text-emerald-700 bg-white"
                      : "border-transparent text-nuanu-gray-400 hover:text-nuanu-navy hover:bg-white/60"
                  }`}
                >
                  <FileText className="w-4 h-4" /> Resume / CV
                  {(selectedProfile.resumeUrl ||
                    selectedProfile.resumeText) && (
                    <span className="ml-1 w-2 h-2 rounded-full bg-emerald-500" />
                  )}
                </button>
                <button
                  onClick={() => setProfileTab("interview_results")}
                  className={`flex items-center gap-2 px-6 py-4 text-sm font-bold transition-all border-b-2 ${
                    profileTab === "interview_results"
                      ? "border-emerald-500 text-emerald-700 bg-white"
                      : "border-transparent text-nuanu-gray-400 hover:text-nuanu-navy hover:bg-white/60"
                  }`}
                >
                  <MessageSquare className="w-4 h-4" /> Interview Results
                  {localInterviewComments.length > 0 && (
                    <span className="ml-1 bg-blue-500 text-white text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                      {localInterviewComments.length}
                    </span>
                  )}
                </button>
                <button
                  onClick={() => setProfileTab("notes")}
                  className={`flex items-center gap-2 px-6 py-4 text-sm font-bold transition-all border-b-2 ${
                    profileTab === "notes"
                      ? "border-emerald-500 text-emerald-700 bg-white"
                      : "border-transparent text-nuanu-gray-400 hover:text-nuanu-navy hover:bg-white/60"
                  }`}
                >
                  <StickyNote className="w-4 h-4" /> Notes
                  {localNotes.length > 0 && (
                    <span className="ml-1 bg-emerald-500 text-white text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                      {localNotes.length}
                    </span>
                  )}
                </button>
              </div>

              {/* ── Tab: Profile Overview ──────────────────────────────── */}
              {profileTab === "overview" && (
                <div className="p-6 overflow-y-auto flex-1">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-10">
                    <div>
                      <p className="text-[11px] font-bold text-nuanu-gray-400 uppercase tracking-[0.1em] mb-2">
                        Applied For
                      </p>
                      <p className="text-lg font-bold text-nuanu-navy leading-snug">
                        {selectedProfile.vacancyTitle}
                      </p>
                    </div>
                    {/* Change 1: Refer As */}
                    <div>
                      <p className="text-[11px] font-bold text-nuanu-gray-400 uppercase tracking-[0.1em] mb-2">
                        Refer As
                      </p>
                      <div className="flex gap-2 -ml-2">
                        <input
                          type="text"
                          value={referAsDraft}
                          onChange={(e) => setReferAsDraft(e.target.value)}
                          onKeyDown={(e) =>
                            e.key === "Enter" && handleSaveReferAs()
                          }
                          placeholder={selectedProfile.vacancyTitle}
                          className="flex-1 input-field text-lg font-bold text-nuanu-navy leading-snug py-1 px-2"
                        />
                        <button
                          onClick={handleSaveReferAs}
                          disabled={
                            savingReferAs ||
                            !referAsDraft.trim() ||
                            referAsDraft.trim() ===
                              (selectedProfile.referPosition || "")
                          }
                          className="btn-primary px-3 py-1.5 text-xs flex items-center gap-1.5 shrink-0"
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
                    <div>
                      <p className="text-[11px] font-bold text-nuanu-gray-400 uppercase tracking-[0.1em] mb-2">
                        Current Stage
                      </p>
                      <span className="badge bg-blue-100 text-blue-700 px-3 py-1.5 text-xs font-bold uppercase tracking-wider">
                        {selectedProfile.stage.replace(/_/g, " ")}
                      </span>
                    </div>
                    <div>
                      <p className="text-[11px] font-bold text-nuanu-gray-400 uppercase tracking-[0.1em] mb-2">
                        Applied Date
                      </p>
                      <DatePickerField
                        value={
                          selectedProfile.appliedAt
                            ? new Date(selectedProfile.appliedAt)
                                .toISOString()
                                .split("T")[0]
                            : ""
                        }
                        onChange={async (val) => {
                          if (!val) return;
                          const appliedIso = new Date(val).toISOString();
                          setSelectedProfile({
                            ...selectedProfile,
                            appliedAt: appliedIso,
                          });
                          const res = await updateCandidateOverviewDetails(
                            selectedProfile.id,
                            selectedProfile.userId,
                            { appliedAt: appliedIso },
                          );
                          if (res.success) toast.success("Applied date updated");
                          else
                            toast.error(
                              res.error || "Failed to update applied date",
                            );
                        }}
                        placeholder="dd/mm/yyyy"
                      />
                    </div>
                    <div>
                      <p className="text-[11px] font-bold text-nuanu-gray-400 uppercase tracking-[0.1em] mb-2">
                        Location
                      </p>
                      <p className="text-lg font-bold text-nuanu-navy">
                        {selectedProfile.location}
                      </p>
                    </div>
                    {/* Change 1: Domicile */}
                    <div>
                      <p className="text-[11px] font-bold text-nuanu-gray-400 uppercase tracking-[0.1em] mb-2">
                        Domicile
                      </p>
                      <div className="flex gap-2 -ml-2">
                        <input
                          type="text"
                          value={domicileDraft}
                          onChange={(e) => setDomicileDraft(e.target.value)}
                          onKeyDown={(e) =>
                            e.key === "Enter" && handleSaveDomicile()
                          }
                          placeholder={
                            selectedProfile.location || "Enter city/region..."
                          }
                          className="flex-1 input-field text-lg font-bold text-nuanu-navy py-1 px-2"
                        />
                        <button
                          onClick={handleSaveDomicile}
                          disabled={
                            savingDomicile ||
                            !domicileDraft.trim() ||
                            domicileDraft.trim() ===
                              (selectedProfile.domicile || "")
                          }
                          className="btn-primary px-3 py-1.5 text-xs flex items-center gap-1.5 shrink-0"
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
                    <div>
                      <p className="text-[11px] font-bold text-nuanu-gray-400 uppercase tracking-[0.1em] mb-2">
                        Phone Number
                      </p>
                      <p className="text-lg font-bold text-nuanu-navy">
                        {selectedProfile.phone || "Not provided"}
                      </p>
                    </div>
                    {/* Source — preset dropdown + Apply */}
                    <div>
                      <p className="text-[11px] font-bold text-nuanu-gray-400 uppercase tracking-[0.1em] mb-2">
                        Source
                      </p>
                      <div className="flex gap-2 -ml-2">
                        <select
                          className="flex-1 input-field py-1.5 px-2 text-xs font-bold bg-nuanu-gray-50 text-nuanu-gray-600 cursor-pointer"
                          value={sourcePreset}
                          onChange={(e) => setSourcePreset(e.target.value)}
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
                              normalizeSourcePreset(selectedProfile.source)
                          }
                          className="btn-primary px-3 py-1.5 text-xs flex items-center gap-1.5 shrink-0"
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
                    {/* Email sent indicator */}
                    {selectedProfile.emailSentAt && (
                      <div>
                        <p className="text-[11px] font-bold text-nuanu-gray-400 uppercase tracking-[0.1em] mb-2">
                          Last Email Sent
                        </p>
                        <p className="text-sm font-semibold text-emerald-600">
                          {formatDate(selectedProfile.emailSentAt)}
                        </p>
                        {selectedProfile.emailSentSubject && (
                          <p className="text-xs text-nuanu-gray-400 mt-0.5 truncate max-w-[180px]">
                            {selectedProfile.emailSentSubject}
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="mb-8">
                    <div className="flex items-center gap-2 mb-3">
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                        AI Match Analysis
                      </p>
                      {normalizeRecommendations(selectedProfile.recommendations).includes(
                        "Fallback Mode: CV Only Analysis",
                      ) && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700 uppercase tracking-widest">
                          Fallback: CV Only
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-4 bg-gray-50 p-4 rounded-xl border border-gray-100">
                      <div className="relative w-16 h-16 flex-shrink-0">
                        <svg className="w-full h-full -rotate-90">
                          <circle
                            cx="32"
                            cy="32"
                            r="28"
                            fill="none"
                            stroke="#E2E8F0"
                            strokeWidth="6"
                          />
                          <circle
                            cx="32"
                            cy="32"
                            r="28"
                            fill="none"
                            stroke={
                              selectedProfile.score >= 80
                                ? "#10B981"
                                : selectedProfile.score >= 60
                                  ? "#F59E0B"
                                  : "#EF4444"
                            }
                            strokeWidth="6"
                            strokeDasharray="175.9"
                            strokeDashoffset={
                              175.9 - (selectedProfile.score / 100) * 175.9
                            }
                            strokeLinecap="round"
                          />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-sm font-bold text-nuanu-navy">
                            {Math.round(selectedProfile.score)}%
                          </span>
                        </div>
                      </div>
                      <div>
                        <p className="font-medium text-nuanu-navy mb-1">
                          {selectedProfile.score >= 80
                            ? "Strong Match"
                            : selectedProfile.score >= 60
                              ? "Potential Match"
                              : "Weak Match"}
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {selectedProfile.skills?.map((skill) => (
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

                  {selectedProfile.coverLetter && (
                    <div>
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                        Cover Letter
                      </p>
                      <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 text-sm text-gray-700 whitespace-pre-wrap">
                        {selectedProfile.coverLetter}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ── Tab: Resume / CV ───────────────────────────────────── */}
              {profileTab === "resume" && (
                <div className="flex-1 flex flex-col overflow-hidden">
                  {/* Action bar */}
                  <div className="flex items-center justify-between px-6 py-3 border-b border-gray-100 bg-white">
                    <p className="text-sm text-nuanu-gray-500 font-medium">
                      {selectedProfile.resumeUrl
                        ? "Resume file attached — view or download below"
                        : selectedProfile.resumeText
                          ? "Extracted resume text from uploaded document"
                          : "No resume on file for this candidate"}
                    </p>
                    <div className="flex items-center gap-2">
                      {selectedProfile.resumeUrl && (
                        <>
                          <a
                            href={selectedProfile.resumeUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn-secondary py-1.5 px-4 text-xs flex items-center gap-1.5"
                          >
                            <ExternalLink className="w-3.5 h-3.5" /> Open in new
                            tab
                          </a>
                          <a
                            href={selectedProfile.resumeUrl}
                            download
                            className="btn-primary py-1.5 px-4 text-xs flex items-center gap-1.5"
                          >
                            <Download className="w-3.5 h-3.5" /> Download
                          </a>
                        </>
                      )}
                    </div>
                  </div>

                  {/* PDF embed — shown only when a file URL exists */}
                  {selectedProfile.resumeUrl && (
                    <div className="flex-1 min-h-0 bg-gray-100">
                      <iframe
                        src={`${selectedProfile.resumeUrl}#toolbar=1&view=FitH`}
                        className="w-full h-full min-h-[460px]"
                        title={`Resume — ${selectedProfile.name}`}
                        style={{ border: "none" }}
                      />
                    </div>
                  )}

                  {/* Extracted text — shown when no direct URL but text was parsed */}
                  {!selectedProfile.resumeUrl && selectedProfile.resumeText && (
                    <div className="flex-1 overflow-y-auto p-6">
                      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
                        {/* Fake document header */}
                        <div className="bg-gradient-to-r from-nuanu-navy to-[#0D2040] px-8 py-5 flex items-center gap-3">
                          <FileText className="w-6 h-6 text-emerald-400" />
                          <div>
                            <p className="text-white font-bold text-base leading-tight">
                              {selectedProfile.name}
                            </p>
                            <p className="text-emerald-400/70 text-xs font-medium mt-0.5">
                              Resume / Curriculum Vitae
                            </p>
                          </div>
                        </div>
                        {/* Text content */}
                        <div className="p-8">
                          <pre className="font-sans text-sm text-gray-700 leading-relaxed whitespace-pre-wrap break-words">
                            {selectedProfile.resumeText}
                          </pre>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Empty state — no resume at all, show upload option */}
                  {!selectedProfile.resumeUrl &&
                    !selectedProfile.resumeText && (
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

                        <div className="flex items-center gap-2 text-xs text-amber-600 bg-amber-50 border border-amber-100 rounded-xl px-4 py-2.5">
                          <AlertCircle className="w-4 h-4 shrink-0" />
                          Resume storage requires Supabase to be configured
                          (NEXT_PUBLIC_SUPABASE_URL).
                        </div>
                      </div>
                    )}
                </div>
              )}

              {/* ── Tab: Interview Results ──────────────────────────────── */}
              {profileTab === "interview_results" && (
                <div className="flex-1 flex flex-col overflow-hidden">
                  {loadingProfileDetails && (
                    <div className="flex items-center justify-center gap-2 border-b border-gray-100 bg-white px-6 py-3 text-sm text-nuanu-gray-500">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Loading interview comments...
                    </div>
                  )}
                  <div className="p-6 border-b border-gray-100 bg-white">
                    <div className="flex gap-3">
                      <input
                        type="text"
                        value={interviewCommentText}
                        onChange={(e) => setInterviewCommentText(e.target.value)}
                        onKeyDown={(e) =>
                          e.key === "Enter" && handleAddInterviewComment()
                        }
                        placeholder="Add interview feedback..."
                        className="flex-1 input-field"
                      />
                      <button
                        onClick={handleAddInterviewComment}
                        disabled={
                          !interviewCommentText.trim() || savingInterviewComment
                        }
                        className="btn-primary px-4 py-2 flex items-center gap-2"
                      >
                        {savingInterviewComment ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Check className="w-4 h-4" />
                        )}
                        Apply
                      </button>
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto p-6 space-y-4">
                    {localInterviewComments.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-12 text-center">
                        <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center mb-4">
                          <MessageSquare className="w-8 h-8 text-blue-400" />
                        </div>
                        <p className="text-lg font-bold text-nuanu-navy mb-1">
                          No Interview Comments Yet
                        </p>
                        <p className="text-sm text-nuanu-gray-400 max-w-xs">
                          Post interview feedback and notes from HR and
                          interviewers.
                        </p>
                      </div>
                    ) : (
                      localInterviewComments.map((comment) => (
                        <div
                          key={comment.id}
                          className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm"
                        >
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold">
                                {comment.authorName
                                  .split(" ")
                                  .map((n) => n[0])
                                  .join("")
                                  .substring(0, 2)
                                  .toUpperCase()}
                              </div>
                              <div>
                                <p className="text-sm font-bold text-nuanu-navy">
                                  {comment.authorName}
                                </p>
                                <p className="text-xs text-nuanu-gray-400">
                                  {formatDate(comment.createdAt)}
                                </p>
                              </div>
                            </div>
                            <button
                              onClick={() =>
                                handleDeleteInterviewComment(comment.id)
                              }
                              className="p-1.5 text-nuanu-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                          <div className="text-sm text-nuanu-gray-700 whitespace-pre-wrap">
                            {comment.content}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* ── Tab: Notes ──────────────────────────────────────────── */}
              {profileTab === "notes" && (
                <div className="flex-1 flex flex-col overflow-hidden">
                  {loadingProfileDetails && (
                    <div className="flex items-center justify-center gap-2 border-b border-gray-100 bg-white px-6 py-3 text-sm text-nuanu-gray-500">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Loading notes...
                    </div>
                  )}
                  <div className="p-6 border-b border-gray-100 bg-white">
                    <div className="flex gap-3">
                      <input
                        type="text"
                        value={noteText}
                        onChange={(e) => setNoteText(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleAddNote()}
                        placeholder="Add a new note..."
                        className="flex-1 input-field"
                      />
                      <button
                        onClick={handleAddNote}
                        disabled={!noteText.trim() || savingNote}
                        className="btn-primary px-4 py-2 flex items-center gap-2"
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

                  <div className="flex-1 overflow-y-auto p-6 space-y-4">
                    {localNotes.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-12 text-center">
                        <div className="w-16 h-16 rounded-full bg-amber-50 flex items-center justify-center mb-4">
                          <StickyNote className="w-8 h-8 text-amber-400" />
                        </div>
                        <p className="text-lg font-bold text-nuanu-navy mb-1">
                          No Notes Yet
                        </p>
                        <p className="text-sm text-nuanu-gray-400 max-w-xs">
                          Add notes to keep track of important information about
                          this candidate.
                        </p>
                      </div>
                    ) : (
                      localNotes.map((note) => (
                        <div
                          key={note.id}
                          className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm"
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
                                  disabled={savingNote || !editNoteText.trim()}
                                  className="btn-primary px-3 py-1.5 text-xs"
                                >
                                  {savingNote ? "Saving..." : "Save"}
                                </button>
                                <button
                                  onClick={() => {
                                    setEditingNoteId(null);
                                    setEditNoteText("");
                                  }}
                                  className="btn-secondary px-3 py-1.5 text-xs"
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
                                    onClick={() => handleDeleteNote(note.id)}
                                    className="p-1.5 text-nuanu-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>
                              <div className="text-sm text-nuanu-gray-700 whitespace-pre-wrap">
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

              <div className="p-5 border-t border-gray-100 flex justify-end gap-3 bg-gray-50/50">
                <button
                  onClick={() => setSelectedProfile(null)}
                  className="btn-secondary px-6 py-2.5 text-sm"
                >
                  Close
                </button>
                <button
                  onClick={() => setShow360(true)}
                  className="btn-secondary px-6 py-2.5 text-sm flex items-center gap-2"
                >
                  <LayoutGrid className="w-4 h-4" /> Full Profile
                </button>
                <button
                  onClick={() => {
                    setSelectedProfile(null);
                    openEmailModal(selectedProfile);
                  }}
                  className="btn-primary px-6 py-2.5 text-sm shadow-lg shadow-emerald-500/20"
                >
                  <Mail className="w-4 h-4" /> Message Candidate
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      </Portal>

      {/* Draft Email Modal */}
      <Portal>
      <AnimatePresence>
        {selectedEmail && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              onClick={() => !isSendingEmail && setSelectedEmail(null)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden relative z-10"
            >
              <div className="p-8 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                <h2 className="text-xl font-bold text-nuanu-navy flex items-center gap-2">
                  <Mail className="w-6 h-6 text-nuanu-emerald" /> New Message
                </h2>
                <button
                  onClick={() => !isSendingEmail && setSelectedEmail(null)}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
                  disabled={isSendingEmail}
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {emailSent ? (
                <div className="p-12 flex flex-col items-center justify-center text-center">
                  <div className="w-16 h-16 bg-emerald-100 text-emerald-500 rounded-full flex items-center justify-center mb-4">
                    <Check className="w-8 h-8" />
                  </div>
                  <h3 className="text-xl font-bold text-nuanu-navy mb-2">
                    Message Sent!
                  </h3>
                  <p className="text-gray-500">
                    Your email has been sent to {selectedEmail.email}
                  </p>
                </div>
              ) : (
                <>
                  <div className="p-8 space-y-5">
                    {/* To */}
                    <div>
                      <label className="block text-xs font-bold text-nuanu-gray-400 uppercase tracking-widest mb-2">To:</label>
                      <div className="input-field bg-gray-50 text-nuanu-navy font-bold text-lg py-3 px-4">
                        {selectedEmail.name} &lt;{selectedEmail.email}&gt;
                      </div>
                    </div>
                    {/* Change 3: Template selector */}
                    <div>
                      <label className="block text-xs font-bold text-nuanu-gray-400 uppercase tracking-widest mb-2">Template:</label>
                      <select
                        value={emailTemplate}
                        onChange={(e) => {
                          const key = e.target.value;
                          setEmailTemplate(key);
                          if (key && EMAIL_TEMPLATES[key]) {
                            const tpl = EMAIL_TEMPLATES[key];
                            setEmailSubject(tpl.subject);
                            setEmailBody(
                              tpl.body
                                .replace(/\{\{name\}\}/g, selectedEmail.name)
                                .replace(/\{\{position\}\}/g, selectedEmail.vacancyTitle)
                            );
                          }
                        }}
                        className="input-field py-2.5"
                      >
                        <option value="">— Select a template (optional) —</option>
                        <option value="rejected">Rejected</option>
                        <option value="on_hold">On Hold</option>
                        <option value="not_open">Not Open</option>
                        <option value="process_slow">Process Slow</option>
                        <option value="been_fulfilled">Been Fulfilled</option>
                      </select>
                    </div>
                    {/* Subject */}
                    <div>
                      <label className="block text-xs font-bold text-nuanu-gray-400 uppercase tracking-widest mb-2">Subject:</label>
                      <input
                        type="text"
                        value={emailSubject}
                        onChange={(e) => setEmailSubject(e.target.value)}
                        className="input-field text-lg font-medium py-3 px-4"
                        placeholder="Email subject"
                      />
                    </div>
                    {/* Body */}
                    <div>
                      <label className="block text-xs font-bold text-nuanu-gray-400 uppercase tracking-widest mb-2">Message:</label>
                      <textarea
                        value={emailBody}
                        onChange={(e) => setEmailBody(e.target.value)}
                        className="input-field min-h-[220px] resize-y text-base leading-relaxed py-3 px-4"
                        placeholder="Type your message here..."
                      />
                    </div>
                  </div>
                  <div className="p-8 border-t border-gray-100 flex justify-end gap-4 bg-gray-50/50">
                    <button
                      onClick={() => setSelectedEmail(null)}
                      className="btn-secondary px-8 py-3 text-base"
                      disabled={isSendingEmail}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSendEmail}
                      className="btn-primary px-8 py-3 text-base shadow-lg shadow-emerald-500/20"
                      disabled={isSendingEmail}
                    >
                      {isSendingEmail ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />{" "}
                          Sending...
                        </>
                      ) : (
                        <>
                          <Send className="w-5 h-5" /> Send Email
                        </>
                      )}
                    </button>
                  </div>
                </>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      </Portal>

      {/* 360° Profile Modal */}
      <Portal>
      <AnimatePresence>
        {show360 && selectedProfile && (
          <CandidateProfile360
            candidate={selectedProfile}
            onClose={() => setShow360(false)}
          />
        )}
      </AnimatePresence>
      </Portal>
    </div>
  );
}
