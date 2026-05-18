"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Lock, Eye, EyeOff, CheckCircle2, Loader2, ArrowLeft } from "lucide-react";
import Link from "next/link";
import Image from "next/image";

export default function ResetPasswordPage() {
  const params = useParams();
  const router = useRouter();
  const token = params.token as string;

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });

      const data = await res.json();

      if (res.ok) {
        setSuccess(true);
        setTimeout(() => router.push("/login"), 3000);
      } else {
        setError(data.error || "Something went wrong.");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const strength = password.length === 0 ? 0
    : password.length < 8 ? 1
    : password.length < 12 ? 2
    : 3;

  const strengthColor = ["transparent", "#ef4444", "#f59e0b", "#10B981"][strength];
  const strengthLabel = ["", "Weak", "Good", "Strong"][strength];

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(135deg, #0A1628 0%, #0D1B2A 50%, #0A1628 100%)",
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      padding: "24px", position: "relative", overflow: "hidden",
    }}>
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
          borderRadius: "24px", padding: "40px",
          position: "relative", zIndex: 1,
        }}
      >
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
            {success ? "Password Updated!" : "Set New Password"}
          </h1>
          <p style={{ margin: "8px 0 0", color: "rgba(255,255,255,0.4)", fontSize: "13px" }}>
            {success ? "Redirecting to login..." : "Choose a strong password for your account"}
          </p>
        </div>

        {success ? (
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
            <p style={{ color: "rgba(255,255,255,0.6)", fontSize: "14px", lineHeight: 1.7, marginBottom: "24px" }}>
              Your password has been reset successfully. You'll be redirected to the login page in a moment.
            </p>
            <Link href="/login" style={{
              display: "inline-flex", alignItems: "center", gap: "8px",
              color: "#10B981", fontSize: "14px", fontWeight: 600, textDecoration: "none",
            }}>
              <ArrowLeft style={{ width: "16px", height: "16px" }} />
              Go to Login
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

            {/* New Password */}
            <div style={{ marginBottom: "16px" }}>
              <label style={{
                display: "block", color: "rgba(255,255,255,0.5)",
                fontSize: "11px", fontWeight: 700,
                letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "8px",
              }}>New Password</label>
              <div style={{ position: "relative" }}>
                <Lock style={{
                  position: "absolute", left: "14px", top: "50%",
                  transform: "translateY(-50%)",
                  width: "16px", height: "16px", color: "rgba(255,255,255,0.3)",
                }} />
                <input
                  type={showPw ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min. 8 characters"
                  style={{
                    width: "100%", boxSizing: "border-box",
                    background: "rgba(255,255,255,0.06)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: "12px",
                    padding: "14px 42px 14px 42px",
                    color: "#ffffff", fontSize: "14px", outline: "none",
                  }}
                />
                <button type="button" onClick={() => setShowPw(!showPw)} style={{
                  position: "absolute", right: "14px", top: "50%",
                  transform: "translateY(-50%)",
                  background: "none", border: "none", cursor: "pointer",
                  color: "rgba(255,255,255,0.3)", padding: 0,
                }}>
                  {showPw
                    ? <EyeOff style={{ width: "16px", height: "16px" }} />
                    : <Eye style={{ width: "16px", height: "16px" }} />}
                </button>
              </div>
              {/* Strength bar */}
              {password.length > 0 && (
                <div style={{ marginTop: "8px" }}>
                  <div style={{ display: "flex", gap: "4px", marginBottom: "4px" }}>
                    {[1, 2, 3].map((i) => (
                      <div key={i} style={{
                        flex: 1, height: "3px", borderRadius: "2px",
                        background: i <= strength ? strengthColor : "rgba(255,255,255,0.1)",
                        transition: "background 0.3s",
                      }} />
                    ))}
                  </div>
                  <p style={{ margin: 0, fontSize: "11px", color: strengthColor }}>{strengthLabel}</p>
                </div>
              )}
            </div>

            {/* Confirm Password */}
            <div style={{ marginBottom: "24px" }}>
              <label style={{
                display: "block", color: "rgba(255,255,255,0.5)",
                fontSize: "11px", fontWeight: 700,
                letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "8px",
              }}>Confirm Password</label>
              <div style={{ position: "relative" }}>
                <Lock style={{
                  position: "absolute", left: "14px", top: "50%",
                  transform: "translateY(-50%)",
                  width: "16px", height: "16px", color: "rgba(255,255,255,0.3)",
                }} />
                <input
                  type={showConfirm ? "text" : "password"}
                  required
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="Repeat your password"
                  style={{
                    width: "100%", boxSizing: "border-box",
                    background: "rgba(255,255,255,0.06)",
                    border: `1px solid ${confirm && confirm !== password ? "rgba(239,68,68,0.4)" : "rgba(255,255,255,0.1)"}`,
                    borderRadius: "12px",
                    padding: "14px 42px 14px 42px",
                    color: "#ffffff", fontSize: "14px", outline: "none",
                  }}
                />
                <button type="button" onClick={() => setShowConfirm(!showConfirm)} style={{
                  position: "absolute", right: "14px", top: "50%",
                  transform: "translateY(-50%)",
                  background: "none", border: "none", cursor: "pointer",
                  color: "rgba(255,255,255,0.3)", padding: 0,
                }}>
                  {showConfirm
                    ? <EyeOff style={{ width: "16px", height: "16px" }} />
                    : <Eye style={{ width: "16px", height: "16px" }} />}
                </button>
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
                  <Loader2 style={{ width: "16px", height: "16px" }} />
                  Updating...
                </>
              ) : "Update Password"}
            </button>

            <div style={{ textAlign: "center" }}>
              <Link href="/login" style={{
                display: "inline-flex", alignItems: "center", gap: "6px",
                color: "rgba(255,255,255,0.4)", fontSize: "13px", textDecoration: "none",
              }}>
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
