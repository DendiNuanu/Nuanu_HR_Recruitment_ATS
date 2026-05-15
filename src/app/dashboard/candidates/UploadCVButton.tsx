"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import {
  Upload,
  X,
  FileText,
  Loader2,
  CheckCircle2,
  AlertCircle,
  UploadCloud,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

// ── Types ──────────────────────────────────────────────────────────────────

interface Vacancy {
  id: string;
  title: string;
  status: string;
}

interface ParsedData {
  fullName: string | null;
  email: string | null;
  phone: string | null;
  location: string | null;
  yearsOfExperience: number | null;
  currentRole: string | null;
  skills: string[];
  summary: string | null;
}

type UploadStep = "idle" | "uploading" | "parsing" | "form" | "submitting" | "success";

const STAGES = [
  { value: "applied", label: "Applied" },
  { value: "screening", label: "Screening" },
  { value: "hr_interview", label: "HR Interview" },
  { value: "user_interview", label: "User Interview" },
  { value: "final_interview", label: "Final Interview" },
  { value: "offer", label: "Offer" },
  { value: "hired", label: "Hired" },
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

// ── Component ──────────────────────────────────────────────────────────────

export default function UploadCVButton({
  vacancies,
}: {
  vacancies: Vacancy[];
}) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState<UploadStep>("idle");
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [parseWarning, setParseWarning] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Uploaded CV URL from backend
  const [cvUrl, setCvUrl] = useState("");
  const [cvText, setCvText] = useState("");

  // Form fields
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    vacancyId: "",
    location: "",
    yearsOfExperience: "",
    stage: "applied",
  });

  // Reset everything when modal closes
  const handleClose = useCallback(() => {
    if (step === "uploading" || step === "submitting") return; // block close during ops
    setIsOpen(false);
    setTimeout(() => {
      setStep("idle");
      setFile(null);
      setUploadProgress(0);
      setParseWarning(false);
      setCvUrl("");
      setCvText("");
      setForm({
        fullName: "",
        email: "",
        phone: "",
        vacancyId: "",
        location: "",
        yearsOfExperience: "",
        stage: "applied",
      });
    }, 300);
  }, [step]);

  // Close on Escape key
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
    };
    if (isOpen) document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [isOpen, handleClose]);

  // ── File validation ──────────────────────────────────────────────────────

  const validateFile = (f: File): string | null => {
    const name = f.name.toLowerCase();
    const isPdf = f.type === "application/pdf" || name.endsWith(".pdf");
    const isDocx =
      f.type ===
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
      name.endsWith(".docx");

    if (!isPdf && !isDocx) {
      return "Only PDF and DOCX files are supported";
    }
    if (f.size > MAX_FILE_SIZE) {
      return "File size must be under 10MB";
    }
    return null;
  };

  // ── Drag & Drop handlers ─────────────────────────────────────────────────

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) processFile(dropped);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) processFile(selected);
    // Reset input so same file can be re-selected
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // ── Upload & Parse ───────────────────────────────────────────────────────

  const processFile = async (f: File) => {
    const error = validateFile(f);
    if (error) {
      toast.error(error);
      return;
    }

    setFile(f);
    setStep("uploading");
    setUploadProgress(0);

    // Simulate progress while uploading
    const progressInterval = setInterval(() => {
      setUploadProgress((p) => Math.min(p + 12, 85));
    }, 200);

    try {
      const fd = new FormData();
      fd.append("cv", f);

      const res = await fetch("/api/candidates/upload-cv", {
        method: "POST",
        body: fd,
      });

      clearInterval(progressInterval);
      setUploadProgress(100);

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Upload failed");
      }

      const data = await res.json();
      setCvUrl(data.cvUrl || "");
      setCvText(data.cvText || "");

      setStep("parsing");

      // Pre-fill form from AI parsed data
      if (data.parsedData) {
        const p: ParsedData = data.parsedData;
        setForm((prev) => ({
          ...prev,
          fullName: p.fullName || "",
          email: p.email || "",
          phone: p.phone || "",
          location: p.location || "",
          yearsOfExperience:
            p.yearsOfExperience != null
              ? String(p.yearsOfExperience)
              : "",
        }));
        setParseWarning(false);
      } else {
        setParseWarning(true);
      }

      // Brief pause to show "Analysing CV..." state
      await new Promise((r) => setTimeout(r, 600));
      setStep("form");
    } catch (err: unknown) {
      clearInterval(progressInterval);
      setUploadProgress(0);
      setStep("idle");
      setFile(null);
      const msg = err instanceof Error ? err.message : "Upload failed";
      toast.error(msg);
    }
  };

  // ── Submit candidate ─────────────────────────────────────────────────────

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.fullName.trim() || !form.email.trim()) {
      toast.error("Full name and email are required");
      return;
    }

    setStep("submitting");

    try {
      const res = await fetch("/api/candidates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: form.fullName.trim(),
          email: form.email.trim(),
          phone: form.phone.trim() || undefined,
          vacancyId: form.vacancyId || undefined,
          location: form.location.trim() || undefined,
          yearsOfExperience: form.yearsOfExperience
            ? Number(form.yearsOfExperience)
            : undefined,
          stage: form.stage,
          cvUrl: cvUrl || undefined,
          cvText: cvText || undefined,
          aiMatch: 50,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to create candidate");
      }

      setStep("success");

      toast.success(
        `Candidate ${data.candidateName} has been added successfully!`,
      );

      // Refresh the page data after a short delay
      setTimeout(() => {
        handleClose();
        router.refresh();
      }, 1500);
    } catch (err: unknown) {
      setStep("form");
      const msg =
        err instanceof Error ? err.message : "Failed to create candidate";
      toast.error(msg, { duration: 6000 });
    }
  };

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="btn-primary py-1.5 text-sm flex items-center gap-2"
      >
        <Upload className="w-4 h-4" />
        Upload CV
      </button>

      {/* Modal */}
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              onClick={handleClose}
            />

            {/* Modal Panel */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden relative z-10 max-h-[95vh] flex flex-col"
            >
              {/* Header */}
              <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50 flex-shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
                    <UploadCloud className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-nuanu-navy">
                      Upload Candidate CV
                    </h2>
                    <p className="text-sm text-nuanu-gray-500">
                      Upload a resume to automatically create a candidate
                      profile
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleClose}
                  disabled={step === "uploading" || step === "submitting"}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors disabled:opacity-40"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Body */}
              <div className="overflow-y-auto flex-1">
                {/* ── Step: idle / uploading / parsing ── */}
                {(step === "idle" ||
                  step === "uploading" ||
                  step === "parsing") && (
                  <div className="p-6 space-y-4">
                    {/* Dropzone */}
                    <div
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                      onClick={() =>
                        step === "idle" && fileInputRef.current?.click()
                      }
                      className={`relative border-2 border-dashed rounded-2xl p-10 text-center transition-all ${
                        step === "idle"
                          ? isDragging
                            ? "border-emerald-500 bg-emerald-50 cursor-pointer"
                            : "border-emerald-300 bg-emerald-50/40 hover:bg-emerald-50/80 hover:border-emerald-400 cursor-pointer"
                          : "border-emerald-300 bg-emerald-50/40 cursor-default"
                      }`}
                    >
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".pdf,.docx"
                        onChange={handleFileInput}
                        className="hidden"
                      />

                      {step === "idle" && !file && (
                        <>
                          <UploadCloud className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
                          <p className="text-base font-bold text-nuanu-navy mb-1">
                            Drag & drop your CV here
                          </p>
                          <p className="text-sm text-nuanu-gray-500 mb-3">
                            or click to browse files
                          </p>
                          <p className="text-xs text-nuanu-gray-400">
                            Accepts PDF or DOCX · Max 10 MB
                          </p>
                        </>
                      )}

                      {step === "uploading" && file && (
                        <div className="space-y-4">
                          <div className="w-14 h-14 rounded-2xl bg-emerald-100 flex items-center justify-center mx-auto">
                            <FileText className="w-7 h-7 text-emerald-600" />
                          </div>
                          <div>
                            <p className="font-bold text-nuanu-navy text-sm mb-1 truncate max-w-xs mx-auto">
                              {file.name}
                            </p>
                            <p className="text-xs text-nuanu-gray-500 mb-3">
                              Uploading...
                            </p>
                          </div>
                          {/* Progress bar */}
                          <div className="w-full max-w-xs mx-auto h-2 bg-gray-100 rounded-full overflow-hidden">
                            <motion.div
                              className="h-full bg-emerald-500 rounded-full"
                              initial={{ width: "0%" }}
                              animate={{ width: `${uploadProgress}%` }}
                              transition={{ ease: "easeOut" }}
                            />
                          </div>
                          <p className="text-xs text-emerald-600 font-medium">
                            {uploadProgress}%
                          </p>
                        </div>
                      )}

                      {step === "parsing" && file && (
                        <div className="space-y-3">
                          <div className="w-14 h-14 rounded-2xl bg-blue-100 flex items-center justify-center mx-auto">
                            <Loader2 className="w-7 h-7 text-blue-600 animate-spin" />
                          </div>
                          <p className="font-bold text-nuanu-navy text-sm">
                            Analysing CV with AI...
                          </p>
                          <p className="text-xs text-nuanu-gray-500">
                            Extracting candidate information
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* ── Step: form ── */}
                {step === "form" && (
                  <form
                    id="cv-upload-form"
                    onSubmit={handleSubmit}
                    className="p-6 space-y-5"
                  >
                    {/* File indicator */}
                    {file && (
                      <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-3">
                        <FileText className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                        <span className="text-sm font-medium text-emerald-700 truncate flex-1">
                          {file.name}
                        </span>
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                      </div>
                    )}

                    {/* Parse warning */}
                    {parseWarning && (
                      <div className="flex items-start gap-3 bg-amber-50 border border-amber-100 rounded-xl px-4 py-3">
                        <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                        <p className="text-sm text-amber-700">
                          Could not auto-extract data. Please fill in the
                          details manually.
                        </p>
                      </div>
                    )}

                    {/* Full Name + Email */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-nuanu-gray-600 mb-1.5">
                          Full Name <span className="text-red-500">*</span>
                        </label>
                        <input
                          required
                          type="text"
                          className="input-field py-2.5 text-sm"
                          placeholder="e.g. Jane Smith"
                          value={form.fullName}
                          onChange={(e) =>
                            setForm({ ...form, fullName: e.target.value })
                          }
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-nuanu-gray-600 mb-1.5">
                          Email <span className="text-red-500">*</span>
                        </label>
                        <input
                          required
                          type="email"
                          className="input-field py-2.5 text-sm"
                          placeholder="jane@example.com"
                          value={form.email}
                          onChange={(e) =>
                            setForm({ ...form, email: e.target.value })
                          }
                        />
                      </div>
                    </div>

                    {/* Phone + Location */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-nuanu-gray-600 mb-1.5">
                          Phone
                        </label>
                        <input
                          type="tel"
                          className="input-field py-2.5 text-sm"
                          placeholder="+62 812 3456 7890"
                          value={form.phone}
                          onChange={(e) =>
                            setForm({ ...form, phone: e.target.value })
                          }
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-nuanu-gray-600 mb-1.5">
                          Location
                        </label>
                        <input
                          type="text"
                          className="input-field py-2.5 text-sm"
                          placeholder="e.g. Bali, Indonesia"
                          value={form.location}
                          onChange={(e) =>
                            setForm({ ...form, location: e.target.value })
                          }
                        />
                      </div>
                    </div>

                    {/* Applied For + Years of Experience */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-nuanu-gray-600 mb-1.5">
                          Applied For (Job Role)
                        </label>
                        <select
                          className="input-field py-2.5 text-sm"
                          value={form.vacancyId}
                          onChange={(e) =>
                            setForm({ ...form, vacancyId: e.target.value })
                          }
                        >
                          <option value="">— Select a vacancy —</option>
                          {vacancies.map((v) => (
                            <option key={v.id} value={v.id}>
                              {v.title}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-nuanu-gray-600 mb-1.5">
                          Years of Experience
                        </label>
                        <input
                          type="number"
                          min="0"
                          max="50"
                          className="input-field py-2.5 text-sm"
                          placeholder="e.g. 3"
                          value={form.yearsOfExperience}
                          onChange={(e) =>
                            setForm({
                              ...form,
                              yearsOfExperience: e.target.value,
                            })
                          }
                        />
                      </div>
                    </div>

                    {/* Current Stage */}
                    <div>
                      <label className="block text-xs font-semibold text-nuanu-gray-600 mb-1.5">
                        Current Stage
                      </label>
                      <select
                        className="input-field py-2.5 text-sm"
                        value={form.stage}
                        onChange={(e) =>
                          setForm({ ...form, stage: e.target.value })
                        }
                      >
                        {STAGES.map((s) => (
                          <option key={s.value} value={s.value}>
                            {s.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </form>
                )}

                {/* ── Step: success ── */}
                {step === "success" && (
                  <div className="p-12 flex flex-col items-center justify-center text-center">
                    <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mb-5">
                      <CheckCircle2 className="w-10 h-10 text-emerald-600" />
                    </div>
                    <h3 className="text-2xl font-extrabold text-nuanu-navy mb-2">
                      Candidate Added!
                    </h3>
                    <p className="text-nuanu-gray-500 text-sm">
                      The candidate profile has been created successfully.
                    </p>
                  </div>
                )}
              </div>

              {/* Footer */}
              {(step === "form" || step === "submitting") && (
                <div className="p-5 border-t border-gray-100 flex justify-end gap-3 bg-gray-50/50 flex-shrink-0">
                  <button
                    type="button"
                    onClick={handleClose}
                    disabled={step === "submitting"}
                    className="btn-secondary px-6 py-2.5 text-sm disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    form="cv-upload-form"
                    disabled={step === "submitting"}
                    className="btn-primary px-6 py-2.5 text-sm shadow-lg shadow-emerald-500/20 flex items-center gap-2 disabled:opacity-60"
                  >
                    {step === "submitting" ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Creating Candidate...
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4" />
                        Upload &amp; Create Candidate
                      </>
                    )}
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
