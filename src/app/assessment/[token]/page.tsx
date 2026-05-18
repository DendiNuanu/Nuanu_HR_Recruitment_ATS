"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle2,
  Clock,
  AlertCircle,
  ChevronRight,
  ChevronLeft,
  Loader2,
  Send,
} from "lucide-react";
import Image from "next/image";

// ── Types ──────────────────────────────────────────────────────────────────

interface Question {
  id: string;
  text: string;
  type: "multiple_choice" | "text" | "rating";
  options?: string[];
  points?: number;
}

interface AssessmentData {
  id: string;
  title: string;
  description: string | null;
  type: string;
  questions: Question[] | null;
  duration: number | null;
  candidateName: string;
  position: string;
  expiresAt: string;
}

type PageState = "loading" | "intro" | "active" | "submitting" | "done" | "error";

// ── Component ──────────────────────────────────────────────────────────────

export default function PublicAssessmentPage() {
  const { token } = useParams<{ token: string }>();

  const [pageState, setPageState] = useState<PageState>("loading");
  const [assessment, setAssessment] = useState<AssessmentData | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [currentQ, setCurrentQ] = useState(0);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [result, setResult] = useState<{ score: number | null; maxScore: number | null; isPassed: boolean | null } | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const submittedRef = useRef(false);

  // ── Fetch assessment ─────────────────────────────────────────────────────

  useEffect(() => {
    fetch(`/api/assessment/${token}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error === "already_completed") {
          setErrorMsg("This assessment has already been completed.");
          setPageState("error");
        } else if (data.error === "expired") {
          setErrorMsg("This assessment link has expired.");
          setPageState("error");
        } else if (data.error) {
          setErrorMsg("Invalid or expired assessment link.");
          setPageState("error");
        } else {
          setAssessment(data);
          if (data.duration) setTimeLeft(data.duration * 60);
          setPageState("intro");
        }
      })
      .catch(() => {
        setErrorMsg("Failed to load assessment. Please check your connection.");
        setPageState("error");
      });
  }, [token]);

  // ── Timer ────────────────────────────────────────────────────────────────

  const handleSubmit = useCallback(async () => {
    if (submittedRef.current) return;
    submittedRef.current = true;
    if (timerRef.current) clearInterval(timerRef.current);
    setPageState("submitting");

    try {
      const res = await fetch(`/api/assessment/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers }),
      });
      const data = await res.json();
      if (res.ok) {
        setResult(data);
        setPageState("done");
      } else {
        setErrorMsg(data.error === "already_completed"
          ? "This assessment was already submitted."
          : "Submission failed. Please try again.");
        setPageState("error");
      }
    } catch {
      setErrorMsg("Network error during submission.");
      setPageState("error");
    }
  }, [token, answers]);

  useEffect(() => {
    if (pageState !== "active" || timeLeft === null) return;

    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t === null || t <= 1) {
          handleSubmit();
          return 0;
        }
        return t - 1;
      });
    }, 1000);

    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [pageState, timeLeft, handleSubmit]);

  // ── Helpers ──────────────────────────────────────────────────────────────

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, "0");
    const s = (secs % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  const questions = assessment?.questions ?? [];
  const totalQ = questions.length;
  const answeredCount = Object.keys(answers).length;
  const progress = totalQ > 0 ? (answeredCount / totalQ) * 100 : 0;

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 50%, #f0fdf4 100%)",
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      padding: "24px",
    }}>
      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: "32px" }}>
        <Image src="/nuanu-logo.png" alt="Nuanu" width={48} height={48}
          style={{ borderRadius: "12px", marginBottom: "12px" }} />
        <p style={{ margin: 0, color: "#64748b", fontSize: "13px", fontWeight: 600,
          letterSpacing: "0.15em", textTransform: "uppercase" }}>
          Nuanu HR · Assessment Portal
        </p>
      </div>

      <div style={{
        width: "100%", maxWidth: "680px",
        background: "#ffffff", borderRadius: "20px",
        boxShadow: "0 8px 40px rgba(0,0,0,0.08)",
        overflow: "hidden",
      }}>
        <AnimatePresence mode="wait">

          {/* Loading */}
          {pageState === "loading" && (
            <motion.div key="loading"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              style={{ padding: "80px", textAlign: "center" }}>
              <Loader2 style={{ width: "40px", height: "40px", color: "#10B981",
                animation: "spin 1s linear infinite", margin: "0 auto 16px" }} />
              <p style={{ color: "#64748b", fontSize: "15px" }}>Loading assessment...</p>
            </motion.div>
          )}

          {/* Error */}
          {pageState === "error" && (
            <motion.div key="error"
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              style={{ padding: "60px 40px", textAlign: "center" }}>
              <div style={{ width: "64px", height: "64px", background: "#fef2f2",
                borderRadius: "50%", display: "flex", alignItems: "center",
                justifyContent: "center", margin: "0 auto 20px" }}>
                <AlertCircle style={{ width: "32px", height: "32px", color: "#ef4444" }} />
              </div>
              <h2 style={{ margin: "0 0 12px", color: "#0A1628", fontSize: "20px", fontWeight: 700 }}>
                Assessment Unavailable
              </h2>
              <p style={{ color: "#64748b", fontSize: "15px", lineHeight: 1.6 }}>{errorMsg}</p>
            </motion.div>
          )}

          {/* Intro */}
          {pageState === "intro" && assessment && (
            <motion.div key="intro"
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              style={{ padding: "48px 40px" }}>
              <div style={{ marginBottom: "32px" }}>
                <span style={{ display: "inline-block", background: "#ecfdf5",
                  color: "#059669", fontSize: "11px", fontWeight: 700,
                  letterSpacing: "0.1em", textTransform: "uppercase",
                  padding: "4px 12px", borderRadius: "20px", marginBottom: "16px" }}>
                  {assessment.type}
                </span>
                <h1 style={{ margin: "0 0 8px", color: "#0A1628", fontSize: "24px", fontWeight: 800 }}>
                  {assessment.title}
                </h1>
                <p style={{ margin: 0, color: "#64748b", fontSize: "15px" }}>
                  For: <strong>{assessment.position}</strong>
                </p>
              </div>

              {assessment.description && (
                <p style={{ color: "#475569", fontSize: "15px", lineHeight: 1.7,
                  marginBottom: "24px", padding: "16px", background: "#f8fafc",
                  borderRadius: "12px", border: "1px solid #e2e8f0" }}>
                  {assessment.description}
                </p>
              )}

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr",
                gap: "12px", marginBottom: "32px" }}>
                {[
                  { label: "Questions", value: `${totalQ}` },
                  { label: "Time Limit", value: assessment.duration ? `${assessment.duration} min` : "Untimed" },
                  { label: "Candidate", value: assessment.candidateName },
                  { label: "Expires", value: new Date(assessment.expiresAt).toLocaleDateString("en-GB") },
                ].map(({ label, value }) => (
                  <div key={label} style={{ padding: "16px", background: "#f8fafc",
                    borderRadius: "12px", border: "1px solid #e2e8f0" }}>
                    <p style={{ margin: "0 0 4px", fontSize: "11px", fontWeight: 700,
                      color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.1em" }}>
                      {label}
                    </p>
                    <p style={{ margin: 0, fontSize: "15px", fontWeight: 700, color: "#0A1628" }}>
                      {value}
                    </p>
                  </div>
                ))}
              </div>

              <div style={{ background: "#fffbeb", border: "1px solid #fde68a",
                borderRadius: "12px", padding: "16px", marginBottom: "32px",
                display: "flex", gap: "12px", alignItems: "flex-start" }}>
                <AlertCircle style={{ width: "18px", height: "18px", color: "#d97706",
                  flexShrink: 0, marginTop: "2px" }} />
                <p style={{ margin: 0, color: "#92400e", fontSize: "13px", lineHeight: 1.6 }}>
                  Once you start, do not refresh or close this page. Your progress may be lost.
                  {assessment.duration ? ` You have ${assessment.duration} minutes to complete this assessment.` : ""}
                </p>
              </div>

              <button
                onClick={() => setPageState("active")}
                style={{
                  width: "100%", background: "linear-gradient(135deg, #10B981, #059669)",
                  border: "none", borderRadius: "14px", padding: "16px",
                  color: "#ffffff", fontSize: "16px", fontWeight: 700,
                  cursor: "pointer", display: "flex", alignItems: "center",
                  justifyContent: "center", gap: "8px",
                }}>
                Start Assessment <ChevronRight style={{ width: "20px", height: "20px" }} />
              </button>
            </motion.div>
          )}

          {/* Active */}
          {pageState === "active" && assessment && questions.length > 0 && (
            <motion.div key="active"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              {/* Progress bar */}
              <div style={{ height: "4px", background: "#e2e8f0" }}>
                <div style={{ height: "100%", background: "#10B981",
                  width: `${progress}%`, transition: "width 0.3s" }} />
              </div>

              {/* Top bar */}
              <div style={{ padding: "16px 24px", display: "flex",
                alignItems: "center", justifyContent: "space-between",
                borderBottom: "1px solid #f1f5f9" }}>
                <span style={{ fontSize: "13px", color: "#64748b", fontWeight: 600 }}>
                  Question {currentQ + 1} of {totalQ}
                </span>
                {timeLeft !== null && (
                  <div style={{ display: "flex", alignItems: "center", gap: "6px",
                    color: timeLeft < 60 ? "#ef4444" : "#64748b",
                    fontWeight: 700, fontSize: "14px" }}>
                    <Clock style={{ width: "16px", height: "16px" }} />
                    {formatTime(timeLeft)}
                  </div>
                )}
              </div>

              {/* Question */}
              <div style={{ padding: "32px 40px" }}>
                <AnimatePresence mode="wait">
                  <motion.div key={currentQ}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.2 }}>
                    <p style={{ margin: "0 0 8px", fontSize: "12px", fontWeight: 700,
                      color: "#10B981", textTransform: "uppercase", letterSpacing: "0.1em" }}>
                      Question {currentQ + 1}
                    </p>
                    <h2 style={{ margin: "0 0 24px", color: "#0A1628", fontSize: "18px",
                      fontWeight: 700, lineHeight: 1.5 }}>
                      {questions[currentQ].text}
                    </h2>

                    {/* Multiple choice */}
                    {questions[currentQ].type === "multiple_choice" && questions[currentQ].options && (
                      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                        {questions[currentQ].options!.map((opt, i) => {
                          const selected = answers[questions[currentQ].id] === opt;
                          return (
                            <button key={i} onClick={() =>
                              setAnswers((prev) => ({ ...prev, [questions[currentQ].id]: opt }))}
                              style={{
                                textAlign: "left", padding: "14px 18px",
                                borderRadius: "12px", border: `2px solid ${selected ? "#10B981" : "#e2e8f0"}`,
                                background: selected ? "#ecfdf5" : "#f8fafc",
                                color: selected ? "#065f46" : "#334155",
                                fontSize: "15px", fontWeight: selected ? 700 : 400,
                                cursor: "pointer", transition: "all 0.15s",
                              }}>
                              <span style={{ marginRight: "10px", fontWeight: 700,
                                color: selected ? "#10B981" : "#94a3b8" }}>
                                {String.fromCharCode(65 + i)}.
                              </span>
                              {opt}
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {/* Text answer */}
                    {questions[currentQ].type === "text" && (
                      <textarea
                        value={answers[questions[currentQ].id] ?? ""}
                        onChange={(e) => setAnswers((prev) => ({
                          ...prev, [questions[currentQ].id]: e.target.value,
                        }))}
                        placeholder="Type your answer here..."
                        style={{
                          width: "100%", boxSizing: "border-box",
                          minHeight: "120px", padding: "14px",
                          border: "2px solid #e2e8f0", borderRadius: "12px",
                          fontSize: "15px", color: "#334155",
                          resize: "vertical", outline: "none",
                          fontFamily: "inherit",
                        }}
                      />
                    )}

                    {/* Rating */}
                    {questions[currentQ].type === "rating" && (
                      <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                        {[1, 2, 3, 4, 5].map((n) => {
                          const selected = answers[questions[currentQ].id] === String(n);
                          return (
                            <button key={n} onClick={() =>
                              setAnswers((prev) => ({ ...prev, [questions[currentQ].id]: String(n) }))}
                              style={{
                                width: "52px", height: "52px", borderRadius: "12px",
                                border: `2px solid ${selected ? "#10B981" : "#e2e8f0"}`,
                                background: selected ? "#10B981" : "#f8fafc",
                                color: selected ? "#ffffff" : "#334155",
                                fontSize: "18px", fontWeight: 700, cursor: "pointer",
                              }}>
                              {n}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </motion.div>
                </AnimatePresence>
              </div>

              {/* Navigation */}
              <div style={{ padding: "16px 40px 32px",
                display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <button
                  onClick={() => setCurrentQ((q) => Math.max(0, q - 1))}
                  disabled={currentQ === 0}
                  style={{
                    display: "flex", alignItems: "center", gap: "6px",
                    padding: "10px 20px", borderRadius: "10px",
                    border: "1px solid #e2e8f0", background: "#f8fafc",
                    color: currentQ === 0 ? "#cbd5e1" : "#334155",
                    fontSize: "14px", fontWeight: 600, cursor: currentQ === 0 ? "not-allowed" : "pointer",
                  }}>
                  <ChevronLeft style={{ width: "16px", height: "16px" }} /> Previous
                </button>

                {currentQ < totalQ - 1 ? (
                  <button
                    onClick={() => setCurrentQ((q) => Math.min(totalQ - 1, q + 1))}
                    style={{
                      display: "flex", alignItems: "center", gap: "6px",
                      padding: "10px 20px", borderRadius: "10px",
                      background: "linear-gradient(135deg, #10B981, #059669)",
                      border: "none", color: "#ffffff",
                      fontSize: "14px", fontWeight: 600, cursor: "pointer",
                    }}>
                    Next <ChevronRight style={{ width: "16px", height: "16px" }} />
                  </button>
                ) : (
                  <button
                    onClick={handleSubmit}
                    style={{
                      display: "flex", alignItems: "center", gap: "6px",
                      padding: "10px 24px", borderRadius: "10px",
                      background: "linear-gradient(135deg, #10B981, #059669)",
                      border: "none", color: "#ffffff",
                      fontSize: "14px", fontWeight: 700, cursor: "pointer",
                    }}>
                    <Send style={{ width: "16px", height: "16px" }} />
                    Submit Assessment
                  </button>
                )}
              </div>
            </motion.div>
          )}

          {/* No questions fallback */}
          {pageState === "active" && assessment && questions.length === 0 && (
            <motion.div key="no-q"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              style={{ padding: "60px 40px", textAlign: "center" }}>
              <p style={{ color: "#64748b", fontSize: "15px", marginBottom: "24px" }}>
                This assessment has no questions configured. Please contact HR.
              </p>
              <button onClick={handleSubmit} style={{
                padding: "12px 32px", background: "#10B981", border: "none",
                borderRadius: "10px", color: "#fff", fontWeight: 700, cursor: "pointer",
              }}>
                Submit
              </button>
            </motion.div>
          )}

          {/* Submitting */}
          {pageState === "submitting" && (
            <motion.div key="submitting"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              style={{ padding: "80px", textAlign: "center" }}>
              <Loader2 style={{ width: "40px", height: "40px", color: "#10B981",
                animation: "spin 1s linear infinite", margin: "0 auto 16px" }} />
              <p style={{ color: "#64748b", fontSize: "15px" }}>Submitting your answers...</p>
            </motion.div>
          )}

          {/* Done */}
          {pageState === "done" && (
            <motion.div key="done"
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
              style={{ padding: "60px 40px", textAlign: "center" }}>
              <div style={{ width: "80px", height: "80px", background: "#ecfdf5",
                borderRadius: "50%", display: "flex", alignItems: "center",
                justifyContent: "center", margin: "0 auto 24px" }}>
                <CheckCircle2 style={{ width: "40px", height: "40px", color: "#10B981" }} />
              </div>
              <h2 style={{ margin: "0 0 12px", color: "#0A1628", fontSize: "24px", fontWeight: 800 }}>
                Assessment Submitted!
              </h2>
              <p style={{ color: "#64748b", fontSize: "15px", lineHeight: 1.7, marginBottom: "24px" }}>
                Thank you for completing the assessment. Your responses have been recorded and the recruitment team will be in touch.
              </p>
              {result?.score !== null && result?.maxScore !== null && (
                <div style={{ display: "inline-block", padding: "16px 32px",
                  background: result?.isPassed ? "#ecfdf5" : "#fef2f2",
                  borderRadius: "12px", border: `1px solid ${result?.isPassed ? "#a7f3d0" : "#fecaca"}` }}>
                  <p style={{ margin: "0 0 4px", fontSize: "13px", fontWeight: 700,
                    color: result?.isPassed ? "#065f46" : "#991b1b",
                    textTransform: "uppercase", letterSpacing: "0.1em" }}>
                    {result?.isPassed ? "Passed ✓" : "Not Passed"}
                  </p>
                  <p style={{ margin: 0, fontSize: "28px", fontWeight: 800,
                    color: result?.isPassed ? "#10B981" : "#ef4444" }}>
                    {result?.score} / {result?.maxScore}
                  </p>
                </div>
              )}
            </motion.div>
          )}

        </AnimatePresence>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
