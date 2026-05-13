"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Copy,
  Check,
  ExternalLink,
  MapPin,
  Briefcase,
  DollarSign,
  GraduationCap,
  Clock,
  Wrench,
  FileText,
  ClipboardList,
  CheckSquare,
  Building2,
  ChevronRight,
  Star,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { markJobAsPostedToJobStreet } from "@/app/actions/jobstreet";
import Portal from "@/components/ui/Portal";

/* ─────────────────────────────────────────── types ────────── */

type Job = {
  id: string;
  title: string;
  code: string;
  description: string | null;
  requirements: string | null;
  responsibilities: string | null;
  location: string | null;
  employmentType: string;
  salaryMin: number | null;
  salaryMax: number | null;
  currency: string;
  experienceMin: number;
  educationLevel: string | null;
  skills: string[];
  department: { name: string };
};

type Props = {
  job: Job;
  isOpen: boolean;
  onClose: () => void;
  onMarkPosted: (jobId: string) => void;
};

/* ─────────────────────────────────────── helpers ───────────── */

function formatEmploymentType(raw: string): string {
  const map: Record<string, string> = {
    "full-time": "Full-Time",
    "part-time": "Part-Time",
    contract: "Contract",
    internship: "Internship",
    freelance: "Freelance",
  };
  return map[raw.toLowerCase()] ?? raw;
}

function formatSalary(
  min: number | null,
  max: number | null,
  currency: string,
): string {
  if (!min && !max) return "Competitive — Based on Experience";
  const fmt = (n: number) =>
    currency === "IDR"
      ? `Rp ${n.toLocaleString("id-ID")}`
      : `${currency} ${n.toLocaleString()}`;
  if (min && max) return `${fmt(min)} - ${fmt(max)} / month`;
  if (min) return `${fmt(min)}+ / month`;
  if (max) return `Up to ${fmt(max)} / month`;
  return "Competitive — Based on Experience";
}

function buildFullDescription(job: Job): string {
  const lines: string[] = [];

  lines.push("📌 JOB TITLE");
  lines.push(job.title);
  lines.push("");

  lines.push("🏢 COMPANY");
  lines.push("Nuanu Creative City");
  lines.push("");

  lines.push("📍 LOCATION");
  lines.push(`${job.location ?? "Nuanu Creative City"} — Bali, Indonesia`);
  lines.push("");

  lines.push("💼 EMPLOYMENT TYPE");
  lines.push(formatEmploymentType(job.employmentType));
  lines.push("");

  lines.push("💰 SALARY RANGE");
  lines.push(formatSalary(job.salaryMin, job.salaryMax, job.currency));
  lines.push("");

  if (job.educationLevel) {
    lines.push("🎓 EDUCATION");
    lines.push(job.educationLevel);
    lines.push("");
  }

  lines.push("⏱ EXPERIENCE REQUIRED");
  lines.push(`${job.experienceMin}+ years`);
  lines.push("");

  if (job.skills.length > 0) {
    lines.push("🔧 SKILLS REQUIRED");
    job.skills.forEach((s) => lines.push(`• ${s}`));
    lines.push("");
  }

  if (job.description) {
    lines.push("📝 ABOUT THE ROLE");
    lines.push(job.description);
    lines.push("");
  }

  if (job.responsibilities) {
    lines.push("📋 RESPONSIBILITIES");
    lines.push(job.responsibilities);
    lines.push("");
  }

  if (job.requirements) {
    lines.push("✅ REQUIREMENTS");
    lines.push(job.requirements);
    lines.push("");
  }

  return lines.join("\n");
}

/* ───────────────────────── CopyButton (single-field) ─────── */

function CopyButton({
  text,
  small = false,
}: {
  text: string;
  small?: boolean;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success("Copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy");
    }
  }, [text]);

  return (
    <button
      onClick={handleCopy}
      className={`shrink-0 flex items-center gap-1 rounded-md font-semibold transition-all ${
        small ? "px-2 py-1 text-[10px]" : "px-2.5 py-1 text-xs"
      } ${
        copied
          ? "bg-emerald-100 text-emerald-700"
          : "bg-nuanu-gray-100 text-nuanu-gray-500 hover:bg-rose-50 hover:text-[#E60278]"
      }`}
    >
      {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
      {copied ? "Copied!" : "Copy"}
    </button>
  );
}

/* ───────────────────────── Section Block ─────────────────── */

function SectionBlock({
  icon,
  label,
  children,
  copyText,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
  copyText: string;
}) {
  return (
    <div className="group relative">
      <div className="flex items-start justify-between gap-2 mb-1">
        <div className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-widest text-nuanu-gray-400">
          {icon}
          {label}
        </div>
        <CopyButton text={copyText} small />
      </div>
      <div className="pl-5 text-sm text-nuanu-navy leading-relaxed">
        {children}
      </div>
    </div>
  );
}

/* ─────────────────────── Step checklist items ─────────────── */

const fillChecklist = [
  "Job Title (use copied title above)",
  'Job Category — select "Information Technology" or relevant department',
  'Location — select "Bali" / "Denpasar"',
  "Job Description (paste full description above)",
  "Salary Range (enter min & max above)",
  "Employment Type (Full-Time / Part-Time / Contract)",
  "Work Experience required (years)",
];

/* ═══════════════════════════════ MAIN COMPONENT ═══════════ */

export default function JobStreetPoster({
  job,
  isOpen,
  onClose,
  onMarkPosted,
}: Props) {
  const [jobStreetUrl, setJobStreetUrl] = useState("");
  const [isMarking, setIsMarking] = useState(false);
  const [markedSuccess, setMarkedSuccess] = useState(false);
  const [fullCopied, setFullCopied] = useState(false);

  const fullDescription = buildFullDescription(job);
  const salary = formatSalary(job.salaryMin, job.salaryMax, job.currency);
  const employmentTypeFmt = formatEmploymentType(job.employmentType);

  const handleCopyFull = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(fullDescription);
      setFullCopied(true);
      toast.success("Full job description copied!");
      setTimeout(() => setFullCopied(false), 3000);
    } catch {
      toast.error("Failed to copy");
    }
  }, [fullDescription]);

  const handleMarkPosted = async () => {
    setIsMarking(true);
    try {
      await markJobAsPostedToJobStreet(job.id, jobStreetUrl || undefined);
      setMarkedSuccess(true);
      onMarkPosted(job.id);
      toast.success("🎉 Job marked as posted on JobStreet!", {
        description: "This vacancy is now tracked as live on JobStreet.",
        duration: 5000,
      });
    } catch {
      toast.error("Failed to mark job as posted");
    } finally {
      setIsMarking(false);
    }
  };

  return (
    <Portal>
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            {/* ── Backdrop ── */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
              className="absolute inset-0 bg-nuanu-navy/80 backdrop-blur-xl"
            />

            {/* ── Modal Shell ── */}
            <motion.div
              initial={{ opacity: 0, scale: 0.93, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.93, y: 30 }}
              transition={{ type: "spring", stiffness: 320, damping: 28 }}
              className="relative w-full max-w-[1400px] max-h-[92vh] bg-nuanu-gray-50 rounded-3xl shadow-[0_40px_100px_rgba(0,0,0,0.5)] overflow-hidden flex flex-col"
            >
              {/* ════════════════ HEADER ════════════════ */}
              <div className="relative flex-none bg-gradient-to-br from-[#1E2A3B] via-[#0A1628] to-[#1a1030] px-8 py-5 overflow-hidden">
                {/* decorative blobs */}
                <div className="absolute -top-10 -right-10 w-52 h-52 bg-[#E60278]/20 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute bottom-0 left-20 w-40 h-24 bg-[#E60278]/10 rounded-full blur-2xl pointer-events-none" />

                <div className="relative flex items-center justify-between gap-4">
                  {/* Brand + title */}
                  <div className="flex items-center gap-5">
                    {/* SEEK logo badge */}
                    <div className="relative shrink-0">
                      <div className="w-14 h-14 rounded-2xl bg-[#E60278] flex items-center justify-center shadow-lg shadow-[#E60278]/30">
                        <span className="text-white font-black text-sm tracking-tight italic">
                          SEEK
                        </span>
                      </div>
                      <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-400 rounded-full border-2 border-[#0A1628] flex items-center justify-center">
                        <Star className="w-2.5 h-2.5 text-white fill-white" />
                      </div>
                    </div>

                    <div>
                      <h2 className="text-xl font-black text-white leading-none">
                        Post to JobStreet
                      </h2>
                      <p className="text-[#E60278]/80 text-xs font-semibold mt-1">
                        SEEK Partner Smart-Post Integration
                      </p>
                      <p className="text-white/40 text-[11px] mt-0.5">
                        {job.title} · {job.code}
                      </p>
                    </div>
                  </div>

                  {/* Step indicator + close */}
                  <div className="flex items-center gap-6">
                    {/* Steps */}
                    <div className="hidden md:flex items-center gap-2">
                      {[
                        "Review & Format",
                        "Copy Details",
                        "Paste on JobStreet",
                      ].map((step, i) => (
                        <div key={step} className="flex items-center gap-2">
                          <div className="flex items-center gap-1.5">
                            <div className="w-6 h-6 rounded-full bg-[#E60278]/20 border border-[#E60278]/40 flex items-center justify-center text-[10px] font-black text-[#E60278]">
                              {i + 1}
                            </div>
                            <span className="text-white/60 text-[11px] font-medium whitespace-nowrap">
                              {step}
                            </span>
                          </div>
                          {i < 2 && (
                            <ChevronRight className="w-3.5 h-3.5 text-white/20" />
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Close button */}
                    <button
                      onClick={onClose}
                      className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white/70 hover:text-white transition-all border border-white/10"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>

              {/* ════════════════ BODY (2-column) ════════════════ */}
              <div className="flex-1 overflow-hidden flex flex-col lg:flex-row min-h-0">
                {/* ── LEFT: Formatted Job Preview ── */}
                <div className="lg:w-[55%] flex flex-col overflow-hidden border-r border-nuanu-gray-200">
                  {/* sub-header */}
                  <div className="flex-none flex items-center justify-between px-6 py-3 bg-white border-b border-nuanu-gray-100">
                    <div>
                      <p className="text-[11px] font-black uppercase tracking-widest text-nuanu-gray-400">
                        📋 Formatted Job Preview
                      </p>
                      <p className="text-[10px] text-nuanu-gray-400 mt-0.5">
                        Copy individual sections or the full description
                      </p>
                    </div>
                    <button
                      onClick={handleCopyFull}
                      className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-xs border transition-all ${
                        fullCopied
                          ? "bg-emerald-500 text-white border-emerald-500 shadow-lg shadow-emerald-500/25"
                          : "bg-[#E60278] text-white border-[#E60278] hover:bg-[#cc026b] shadow-lg shadow-[#E60278]/25"
                      }`}
                    >
                      {fullCopied ? (
                        <>
                          <Check className="w-3.5 h-3.5" /> Copied!
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" /> Copy Full Description
                        </>
                      )}
                    </button>
                  </div>

                  {/* scrollable preview */}
                  <div className="flex-1 overflow-y-auto p-6 space-y-5">
                    {/* Title */}
                    <SectionBlock
                      icon={<FileText className="w-3 h-3" />}
                      label="Job Title"
                      copyText={job.title}
                    >
                      <p className="font-black text-lg text-nuanu-navy">
                        {job.title}
                      </p>
                    </SectionBlock>

                    {/* Company */}
                    <SectionBlock
                      icon={<Building2 className="w-3 h-3" />}
                      label="Company"
                      copyText="Nuanu Creative City"
                    >
                      <p>Nuanu Creative City</p>
                    </SectionBlock>

                    {/* Location */}
                    <SectionBlock
                      icon={<MapPin className="w-3 h-3" />}
                      label="Location"
                      copyText={`${job.location ?? "Nuanu Creative City"} — Bali, Indonesia`}
                    >
                      <p>
                        {job.location ?? "Nuanu Creative City"} — Bali,
                        Indonesia
                      </p>
                    </SectionBlock>

                    {/* Employment Type */}
                    <SectionBlock
                      icon={<Briefcase className="w-3 h-3" />}
                      label="Employment Type"
                      copyText={employmentTypeFmt}
                    >
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-bold border border-blue-100">
                        {employmentTypeFmt}
                      </span>
                    </SectionBlock>

                    {/* Salary */}
                    <SectionBlock
                      icon={<DollarSign className="w-3 h-3" />}
                      label="Salary Range"
                      copyText={salary}
                    >
                      <span
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${
                          job.salaryMin || job.salaryMax
                            ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                            : "bg-nuanu-gray-100 text-nuanu-gray-500 border-nuanu-gray-200"
                        }`}
                      >
                        {salary}
                      </span>
                    </SectionBlock>

                    {/* Education */}
                    {job.educationLevel && (
                      <SectionBlock
                        icon={<GraduationCap className="w-3 h-3" />}
                        label="Education"
                        copyText={job.educationLevel}
                      >
                        <p>{job.educationLevel}</p>
                      </SectionBlock>
                    )}

                    {/* Experience */}
                    <SectionBlock
                      icon={<Clock className="w-3 h-3" />}
                      label="Experience Required"
                      copyText={`${job.experienceMin}+ years`}
                    >
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 text-amber-700 text-xs font-bold border border-amber-100">
                        {job.experienceMin}+ years
                      </span>
                    </SectionBlock>

                    {/* Skills */}
                    {job.skills.length > 0 && (
                      <SectionBlock
                        icon={<Wrench className="w-3 h-3" />}
                        label="Skills Required"
                        copyText={job.skills.map((s) => `• ${s}`).join("\n")}
                      >
                        <div className="flex flex-wrap gap-2 mt-1">
                          {job.skills.map((skill) => (
                            <span
                              key={skill}
                              className="px-2.5 py-1 rounded-lg bg-nuanu-gray-100 text-nuanu-navy text-xs font-semibold border border-nuanu-gray-200"
                            >
                              {skill}
                            </span>
                          ))}
                        </div>
                      </SectionBlock>
                    )}

                    {/* Description */}
                    {job.description && (
                      <SectionBlock
                        icon={<FileText className="w-3 h-3" />}
                        label="About the Role"
                        copyText={job.description}
                      >
                        <p className="whitespace-pre-wrap text-nuanu-gray-600">
                          {job.description}
                        </p>
                      </SectionBlock>
                    )}

                    {/* Responsibilities */}
                    {job.responsibilities && (
                      <SectionBlock
                        icon={<ClipboardList className="w-3 h-3" />}
                        label="Responsibilities"
                        copyText={job.responsibilities}
                      >
                        <p className="whitespace-pre-wrap text-nuanu-gray-600">
                          {job.responsibilities}
                        </p>
                      </SectionBlock>
                    )}

                    {/* Requirements */}
                    {job.requirements && (
                      <SectionBlock
                        icon={<CheckSquare className="w-3 h-3" />}
                        label="Requirements"
                        copyText={job.requirements}
                      >
                        <p className="whitespace-pre-wrap text-nuanu-gray-600">
                          {job.requirements}
                        </p>
                      </SectionBlock>
                    )}
                  </div>
                </div>

                {/* ── RIGHT: Step-by-Step Guide ── */}
                <div className="lg:w-[45%] flex flex-col overflow-hidden">
                  <div className="flex-none flex items-center px-6 py-3 bg-white border-b border-nuanu-gray-100">
                    <p className="text-[11px] font-black uppercase tracking-widest text-nuanu-gray-400">
                      🚀 Step-by-Step Posting Guide
                    </p>
                  </div>

                  <div className="flex-1 overflow-y-auto p-5 space-y-4">
                    {/* ── STEP 1: Open JobStreet ── */}
                    <div className="bg-white rounded-2xl border border-nuanu-gray-100 shadow-sm overflow-hidden">
                      <div className="flex items-center gap-3 px-5 py-3 bg-gradient-to-r from-[#E60278]/5 to-transparent border-b border-nuanu-gray-100">
                        <div className="w-7 h-7 rounded-full bg-[#E60278] text-white text-xs font-black flex items-center justify-center shrink-0">
                          1
                        </div>
                        <div>
                          <p className="text-sm font-bold text-nuanu-navy">
                            Open JobStreet Employer
                          </p>
                          <p className="text-[10px] text-nuanu-gray-400">
                            Open your employer dashboard to post a new job
                          </p>
                        </div>
                      </div>
                      <div className="p-5 space-y-3">
                        <a
                          href="https://id.employer.seek.com/job/managejob/express/create/classify?referrer=createJob"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-center gap-2.5 w-full py-3 rounded-xl font-bold text-sm text-white bg-gradient-to-r from-[#E60278] to-[#cc026b] hover:from-[#cc026b] hover:to-[#b50260] shadow-lg shadow-[#E60278]/25 transition-all hover:-translate-y-0.5 active:translate-y-0"
                        >
                          <ExternalLink className="w-4 h-4" />
                          Open JobStreet Dashboard
                        </a>
                        <p className="text-[10px] text-nuanu-gray-400 text-center leading-relaxed">
                          Need an account?{" "}
                          <a
                            href="https://id.employer.seek.com"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[#E60278] font-semibold hover:underline"
                          >
                            Sign up free at id.employer.seek.com
                          </a>
                        </p>
                      </div>
                    </div>

                    {/* ── STEP 2: Fill in Details ── */}
                    <div className="bg-white rounded-2xl border border-nuanu-gray-100 shadow-sm overflow-hidden">
                      <div className="flex items-center gap-3 px-5 py-3 bg-gradient-to-r from-blue-50/50 to-transparent border-b border-nuanu-gray-100">
                        <div className="w-7 h-7 rounded-full bg-blue-600 text-white text-xs font-black flex items-center justify-center shrink-0">
                          2
                        </div>
                        <div>
                          <p className="text-sm font-bold text-nuanu-navy">
                            Fill in Job Details
                          </p>
                          <p className="text-[10px] text-nuanu-gray-400">
                            Paste the copied content into each field
                          </p>
                        </div>
                      </div>
                      <div className="p-5">
                        <p className="text-[10px] font-black uppercase tracking-widest text-nuanu-gray-400 mb-3">
                          Checklist
                        </p>
                        <ul className="space-y-2">
                          {fillChecklist.map((item) => (
                            <li
                              key={item}
                              className="flex items-start gap-2.5 text-xs text-nuanu-gray-600"
                            >
                              <div className="w-4 h-4 rounded-md bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0 mt-0.5">
                                <Check className="w-2.5 h-2.5 text-blue-500" />
                              </div>
                              {item}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    {/* ── STEP 3: Confirm & Track ── */}
                    <div className="bg-white rounded-2xl border border-nuanu-gray-100 shadow-sm overflow-hidden">
                      <div className="flex items-center gap-3 px-5 py-3 bg-gradient-to-r from-emerald-50/50 to-transparent border-b border-nuanu-gray-100">
                        <div className="w-7 h-7 rounded-full bg-emerald-600 text-white text-xs font-black flex items-center justify-center shrink-0">
                          3
                        </div>
                        <div>
                          <p className="text-sm font-bold text-nuanu-navy">
                            Confirm & Track
                          </p>
                          <p className="text-[10px] text-nuanu-gray-400">
                            After posting, mark it as live in your ATS
                          </p>
                        </div>
                      </div>

                      <div className="p-5 space-y-4">
                        <p className="text-xs text-nuanu-gray-500 leading-relaxed">
                          After posting on JobStreet, click below to mark this
                          job as posted so your team knows it's live.
                        </p>

                        {/* URL input */}
                        <div>
                          <label className="block text-[10px] font-black uppercase tracking-widest text-nuanu-gray-400 mb-1.5">
                            JobStreet Job URL{" "}
                            <span className="normal-case font-normal text-nuanu-gray-300">
                              (optional)
                            </span>
                          </label>
                          <input
                            type="url"
                            value={jobStreetUrl}
                            onChange={(e) => setJobStreetUrl(e.target.value)}
                            placeholder="https://www.jobstreet.co.id/job/..."
                            className="input-field text-xs py-2.5"
                          />
                        </div>

                        {/* Mark as posted button */}
                        {markedSuccess ? (
                          <motion.div
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="w-full py-4 rounded-xl bg-emerald-50 border-2 border-emerald-200 flex items-center justify-center gap-2.5"
                          >
                            <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/30">
                              <Check className="w-5 h-5 text-white" />
                            </div>
                            <div className="text-left">
                              <p className="text-sm font-bold text-emerald-700">
                                Posted on JobStreet ✓
                              </p>
                              <p className="text-[10px] text-emerald-600">
                                Tracked successfully in your ATS
                              </p>
                            </div>
                          </motion.div>
                        ) : (
                          <button
                            onClick={handleMarkPosted}
                            disabled={isMarking}
                            className="w-full py-3.5 rounded-xl font-bold text-sm text-white bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 shadow-lg shadow-emerald-500/25 transition-all hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                          >
                            {isMarking ? (
                              <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Saving…
                              </>
                            ) : (
                              <>
                                <Check className="w-4 h-4" />
                                Mark as Posted on JobStreet
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    </div>

                    {/* ── Partnership Banner ── */}
                    <div className="rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-100 p-5">
                      <div className="flex items-start gap-3 mb-3">
                        <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                        <div>
                          <p className="text-xs font-bold text-amber-800 mb-1">
                            Want Automatic Posting?
                          </p>
                          <p className="text-[11px] text-amber-700 leading-relaxed">
                            SEEK API partnership enables one-click automatic job
                            posting. The approval process takes 4–8 weeks. Once
                            approved, we'll integrate it automatically!
                          </p>
                        </div>
                      </div>
                      <a
                        href="https://talent.seek.com.au/partners/how-to-integrate"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center gap-1.5 w-full py-2 rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-800 text-[11px] font-bold border border-amber-200 transition-colors"
                      >
                        Apply for SEEK Partnership{" "}
                        <ChevronRight className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </Portal>
  );
}
