"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Mail, ArrowLeft, CheckCircle2, Loader2 } from "lucide-react";
import Link from "next/link";
import Image from "next/image";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (res.ok) {
        setSent(true);
      } else {
        const data = await res.json();
        setError(data.error || "Something went wrong. Please try again.");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #0A1628 0%, #0D1B2A 50%, #0A1628 100%)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Background glow */}
      <div style={{ position: "absolute", inset: 0, zIndex: 0, pointerEvents: "none" }}>
        <div style={{
          position: "absolute", top: "20%", left: "50%",
          transform: "translate(-50%, -50%)",
          width: "600px", height: "600px",
          background: "radial-gradient(circle, rgba(16,185,129,0.08) 0%, transparent 70%)",
          borderRadius: "50%",
        }} />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        style={{
          width: "100%", maxWidth: "440px",
          background: "rgba(255,255,255,0.04)",
          backdropFilter: "blur(20px)",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: "24px",
          padding: "40px",
          position: "relative", zIndex: 1,
        }}
      >
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          <div style={{
            display: "inline-flex", alignItems: "center", justifyContent: "center",
            width: "64px", height: "64px",
            background: "rgba(255,255,255,0.06)",
            borderRadius: "16px", marginBottom: "16px",
            border: "1px solid rgba(255,255,255,0.1)",
          }}>
            <Image src="/nuanu-logo.png" alt="Nuanu" width={40} height={40} style={{ borderRadius: "10px" }} />
          </div>
          <h1 style={{ margin: 0, color: "#ffffff", fontSize: "22px", fontWeight: 800 }}>
            {sent ? "Check Your Email" : "Forgot Password?"}
          </h1>
          <p style={{ margin: "8px 0 0", color: "rgba(255,255,255,0.4)", fontSize: "13px" }}>
            {sent
              ? "We've sent a reset link to your email"
              : "Enter your email and we'll send you a reset link"}
          </p>
        </div>

        {sent ? (
          <div style={{ textAlign: "center" }}>
            <div style={{
              width: "64px", height: "64px",
              background: "rgba(16,185,129,0.15)",
              borderRadius: "50%",
              display: "flex", alignItems: "center", justifyContent: "center",
              margin: "0 auto 24px",
            }}>
              <CheckCircle2 style={{ width: "32px", height: "32px", color: "#10B981" }} />
            </div>
            <p style={{ color: "rgba(255,255,255,0.6)", fontSize: "14px", lineHeight: 1.7, marginBottom: "32px" }}>
              If <strong style={{ color: "#fff" }}>{email}</strong> is registered,
              you'll receive a password reset link within a few minutes.
              Check your spam folder if you don't see it.
            </p>
            <Link
              href="/login"
              style={{
                display: "inline-flex", alignItems: "center", gap: "8px",
                color: "#10B981", fontSize: "14px", fontWeight: 600,
                textDecoration: "none",
              }}
            >
              <ArrowLeft style={{ width: "16px", height: "16px" }} />
              Back to Login
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            {error && (
              <div style={{
                background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)",
                borderRadius: "10px", padding: "12px 16px",
                color: "#fca5a5", fontSize: "13px", marginBottom: "20px",
              }}>
                {error}
              </div>
            )}

            <div style={{ marginBottom: "20px" }}>
              <label style={{
                display: "block", color: "rgba(255,255,255,0.5)",
                fontSize: "11px", fontWeight: 700,
                letterSpacing: "0.1em", textTransform: "uppercase",
                marginBottom: "8px",
              }}>
                Email Address
              </label>
              <div style={{ position: "relative" }}>
                <Mail style={{
                  position: "absolute", left: "14px", top: "50%",
                  transform: "translateY(-50%)",
                  width: "16px", height: "16px", color: "rgba(255,255,255,0.3)",
                }} />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  style={{
                    width: "100%", boxSizing: "border-box",
                    background: "rgba(255,255,255,0.06)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: "12px",
                    padding: "14px 14px 14px 42px",
                    color: "#ffffff", fontSize: "14px",
                    outline: "none",
                  }}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              style={{
                width: "100%",
                background: isLoading
                  ? "rgba(16,185,129,0.5)"
                  : "linear-gradient(135deg, #10B981, #059669)",
                border: "none", borderRadius: "12px",
                padding: "14px", color: "#ffffff",
                fontSize: "14px", fontWeight: 700,
                cursor: isLoading ? "not-allowed" : "pointer",
                display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
                marginBottom: "20px",
              }}
            >
              {isLoading ? (
                <>
                  <Loader2 style={{ width: "16px", height: "16px", animation: "spin 1s linear infinite" }} />
                  Sending...
                </>
              ) : "Send Reset Link"}
            </button>

            <div style={{ textAlign: "center" }}>
              <Link
                href="/login"
                style={{
                  display: "inline-flex", alignItems: "center", gap: "6px",
                  color: "rgba(255,255,255,0.4)", fontSize: "13px",
                  textDecoration: "none",
                }}
              >
                <ArrowLeft style={{ width: "14px", height: "14px" }} />
                Back to Login
              </Link>
            </div>
          </form>
        )}
      </motion.div>
    </div>
  );
}
