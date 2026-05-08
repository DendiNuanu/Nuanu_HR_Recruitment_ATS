"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Mail, Lock, Eye, EyeOff, ArrowRight } from "lucide-react";
import Image from "next/image";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("admin@nuanu.com");
  const [password, setPassword] = useState("admin123");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    router.prefetch("/dashboard");
  }, [router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Login failed");
        setIsLoading(false);
        return;
      }

      localStorage.setItem("nuanu_user", JSON.stringify(data.user));
      router.push("/dashboard");
    } catch {
      setError("Network error. Please try again.");
      setIsLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background:
          "linear-gradient(135deg, #0A1628 0%, #0D1B2A 50%, #0A1628 100%)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Background Glow */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          zIndex: 0,
          pointerEvents: "none",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: "20%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: "600px",
            height: "600px",
            background: "rgba(16,185,129,0.07)",
            filter: "blur(120px)",
            borderRadius: "50%",
          }}
        />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: "easeOut" }}
        style={{
          width: "100%",
          maxWidth: "460px",
          position: "relative",
          zIndex: 10,
        }}
      >
        {/* Logo + Brand */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            textAlign: "center",
            marginBottom: "48px",
          }}
        >
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.15, type: "spring", stiffness: 200 }}
          >
            <Image
              src="/nuanu-logo.png"
              alt="Nuanu"
              width={80}
              height={80}
              style={{
                borderRadius: "16px",
                boxShadow: "0 20px 40px rgba(16,185,129,0.2)",
              }}
              priority
            />
          </motion.div>

          <h1
            style={{
              fontSize: "40px",
              fontWeight: 800,
              color: "#FFFFFF",
              marginTop: "24px",
              letterSpacing: "-0.02em",
            }}
          >
            Nuanu
          </h1>
          <p
            style={{
              color: "rgba(16,185,129,0.6)",
              fontWeight: 600,
              fontSize: "12px",
              letterSpacing: "0.25em",
              textTransform: "uppercase",
              marginTop: "8px",
            }}
          >
            HR Recruitment ATS
          </p>
        </div>

        {/* Login Card */}
        <div
          style={{
            background: "#FFFFFF",
            borderRadius: "20px",
            boxShadow: "0 25px 60px rgba(0,0,0,0.3)",
            overflow: "hidden",
          }}
        >
          {/* Card Header */}
          <div
            style={{
              padding: "32px 36px 24px",
              textAlign: "center",
              borderBottom: "1px solid #F1F5F9",
            }}
          >
            <h2 style={{ fontSize: "24px", fontWeight: 700, color: "#0A1628" }}>
              Welcome Back
            </h2>
            <p style={{ color: "#64748B", marginTop: "6px", fontSize: "15px" }}>
              Sign in to access your dashboard
            </p>
          </div>

          {/* Card Body */}
          <div style={{ padding: "32px 36px" }}>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                style={{
                  marginBottom: "24px",
                  padding: "14px 16px",
                  background: "#FEF2F2",
                  border: "1px solid #FECACA",
                  borderRadius: "12px",
                }}
              >
                <p
                  style={{
                    color: "#DC2626",
                    fontSize: "14px",
                    fontWeight: 500,
                  }}
                >
                  {error}
                </p>
              </motion.div>
            )}

            <form onSubmit={handleLogin}>
              {/* Email Field */}
              <div style={{ marginBottom: "24px" }}>
                <label
                  htmlFor="email"
                  style={{
                    display: "block",
                    fontSize: "15px",
                    fontWeight: 600,
                    color: "#334155",
                    marginBottom: "10px",
                  }}
                >
                  Email Address
                </label>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    background: "#F8FAFC",
                    border: "1.5px solid #E2E8F0",
                    borderRadius: "12px",
                    transition: "border-color 0.2s",
                    overflow: "hidden",
                  }}
                  onFocusCapture={(e) => {
                    e.currentTarget.style.borderColor = "#10B981";
                    e.currentTarget.style.background = "#FFFFFF";
                  }}
                  onBlurCapture={(e) => {
                    e.currentTarget.style.borderColor = "#E2E8F0";
                    e.currentTarget.style.background = "#F8FAFC";
                  }}
                >
                  <div
                    style={{
                      padding: "0 0 0 16px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Mail
                      style={{
                        width: "22px",
                        height: "22px",
                        color: "#94A3B8",
                      }}
                    />
                  </div>
                  <input
                    type="email"
                    id="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    style={{
                      flex: 1,
                      background: "transparent",
                      border: "none",
                      padding: "16px 16px 16px 12px",
                      fontSize: "16px",
                      color: "#0A1628",
                      outline: "none",
                      boxSizing: "border-box",
                      width: "100%",
                    }}
                    placeholder="name@company.com"
                    required
                  />
                </div>
              </div>

              {/* Password Field */}
              <div style={{ marginBottom: "24px" }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: "10px",
                  }}
                >
                  <label
                    htmlFor="password"
                    style={{
                      fontSize: "15px",
                      fontWeight: 600,
                      color: "#334155",
                    }}
                  >
                    Password
                  </label>
                  <a
                    href="#"
                    style={{
                      fontSize: "14px",
                      fontWeight: 600,
                      color: "#10B981",
                      textDecoration: "none",
                    }}
                  >
                    Forgot password?
                  </a>
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    background: "#F8FAFC",
                    border: "1.5px solid #E2E8F0",
                    borderRadius: "12px",
                    transition: "border-color 0.2s",
                    overflow: "hidden",
                  }}
                  onFocusCapture={(e) => {
                    e.currentTarget.style.borderColor = "#10B981";
                    e.currentTarget.style.background = "#FFFFFF";
                  }}
                  onBlurCapture={(e) => {
                    e.currentTarget.style.borderColor = "#E2E8F0";
                    e.currentTarget.style.background = "#F8FAFC";
                  }}
                >
                  <div
                    style={{
                      padding: "0 0 0 16px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Lock
                      style={{
                        width: "22px",
                        height: "22px",
                        color: "#94A3B8",
                      }}
                    />
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    id="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    style={{
                      flex: 1,
                      background: "transparent",
                      border: "none",
                      padding: "16px 12px",
                      fontSize: "16px",
                      color: "#0A1628",
                      outline: "none",
                      boxSizing: "border-box",
                      width: "100%",
                    }}
                    placeholder="Enter your password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      padding: "0 16px 0 0",
                    }}
                  >
                    {showPassword ? (
                      <EyeOff
                        style={{
                          width: "22px",
                          height: "22px",
                          color: "#94A3B8",
                        }}
                      />
                    ) : (
                      <Eye
                        style={{
                          width: "22px",
                          height: "22px",
                          color: "#94A3B8",
                        }}
                      />
                    )}
                  </button>
                </div>
              </div>

              {/* Keep signed in */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  marginBottom: "28px",
                }}
              >
                <label
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    cursor: "pointer",
                  }}
                >
                  <input
                    type="checkbox"
                    defaultChecked
                    style={{
                      width: "18px",
                      height: "18px",
                      accentColor: "#10B981",
                      borderRadius: "4px",
                      cursor: "pointer",
                    }}
                  />
                  <span style={{ fontSize: "14px", color: "#475569" }}>
                    Keep me signed in
                  </span>
                </label>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                style={{
                  width: "100%",
                  background: "linear-gradient(135deg, #10B981, #14B8A6)",
                  borderRadius: "14px",
                  padding: "18px 24px",
                  border: "none",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "12px",
                  boxShadow: "0 8px 24px rgba(16,185,129,0.3)",
                  transition: "all 0.2s",
                  opacity: isLoading ? 0.6 : 1,
                }}
                onMouseEnter={(e) => {
                  if (!isLoading)
                    (e.target as HTMLElement).style.boxShadow =
                      "0 12px 32px rgba(16,185,129,0.45)";
                }}
                onMouseLeave={(e) => {
                  (e.target as HTMLElement).style.boxShadow =
                    "0 8px 24px rgba(16,185,129,0.3)";
                }}
              >
                {isLoading ? (
                  <div
                    style={{
                      width: "24px",
                      height: "24px",
                      border: "3px solid rgba(255,255,255,0.3)",
                      borderTopColor: "#FFFFFF",
                      borderRadius: "50%",
                      animation: "spin 0.8s linear infinite",
                    }}
                  />
                ) : (
                  <>
                    <span
                      style={{
                        color: "#FFFFFF",
                        fontWeight: 700,
                        fontSize: "18px",
                      }}
                    >
                      Access Dashboard
                    </span>
                    <ArrowRight
                      style={{
                        width: "22px",
                        height: "22px",
                        color: "#FFFFFF",
                      }}
                    />
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Demo Credentials */}
          <div style={{ padding: "0 36px 32px" }}>
            <div
              style={{
                background: "#F8FAFC",
                borderRadius: "14px",
                padding: "18px 20px",
                textAlign: "center",
                border: "1px solid #F1F5F9",
              }}
            >
              <p
                style={{
                  fontSize: "10px",
                  fontWeight: 700,
                  color: "#94A3B8",
                  textTransform: "uppercase",
                  letterSpacing: "0.15em",
                  marginBottom: "10px",
                }}
              >
                Demo Credentials
              </p>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "12px",
                  flexWrap: "wrap",
                }}
              >
                <code
                  style={{
                    fontSize: "13px",
                    color: "#0A1628",
                    fontFamily: "monospace",
                    background: "#FFFFFF",
                    padding: "6px 14px",
                    borderRadius: "8px",
                    border: "1px solid #E2E8F0",
                  }}
                >
                  admin@nuanu.com
                </code>
                <span style={{ color: "#CBD5E1", fontSize: "14px" }}>/</span>
                <code
                  style={{
                    fontSize: "13px",
                    color: "#0A1628",
                    fontFamily: "monospace",
                    background: "#FFFFFF",
                    padding: "6px 14px",
                    borderRadius: "8px",
                    border: "1px solid #E2E8F0",
                  }}
                >
                  admin123
                </code>
              </div>
            </div>
          </div>
        </div>

        <p
          style={{
            marginTop: "32px",
            textAlign: "center",
            color: "rgba(255,255,255,0.2)",
            fontSize: "13px",
            fontWeight: 500,
          }}
        >
          &copy; {new Date().getFullYear()} Nuanu &middot; Enterprise HR
          Platform
        </p>
      </motion.div>

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
