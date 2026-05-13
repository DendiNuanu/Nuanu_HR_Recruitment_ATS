"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  User,
  KeyRound,
  Mail,
  Shield,
  Building2,
  Eye,
  EyeOff,
  Check,
  Loader2,
  Save,
} from "lucide-react";
import { changeUserPassword } from "@/app/actions/settings";

export default function ProfilePage() {
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<"info" | "password">(
    searchParams.get("tab") === "password" ? "password" : "info",
  );
  const [currentUser, setCurrentUser] = useState<any>(null);

  // Password form state
  const [newPass, setNewPass] = useState("");
  const [confirmPass, setConfirmPass] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("nuanu_user");
      if (raw) setCurrentUser(JSON.parse(raw));
    } catch {}
  }, []);

  const getInitials = (name: string) =>
    name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0].toUpperCase())
      .join("");

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPass.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    if (newPass !== confirmPass) {
      toast.error("Passwords do not match");
      return;
    }
    if (!currentUser?.id) {
      toast.error("Could not identify current user");
      return;
    }

    setIsSaving(true);
    const res = await changeUserPassword(currentUser.id, newPass);
    setIsSaving(false);

    if (res.success) {
      toast.success("Password changed successfully!", {
        description: "Your new password is active immediately.",
      });
      setNewPass("");
      setConfirmPass("");
    } else {
      toast.error("Failed to change password", { description: res.error });
    }
  };

  const passwordStrength = (pass: string) => {
    if (!pass) return { label: "", color: "", width: "0%" };
    if (pass.length < 6) return { label: "Too short", color: "bg-red-500", width: "20%" };
    if (pass.length < 8) return { label: "Weak", color: "bg-orange-400", width: "40%" };
    if (!/[A-Z]/.test(pass) || !/[0-9]/.test(pass)) return { label: "Fair", color: "bg-yellow-400", width: "60%" };
    if (pass.length >= 10) return { label: "Strong", color: "bg-emerald-500", width: "100%" };
    return { label: "Good", color: "bg-emerald-400", width: "80%" };
  };

  const strength = passwordStrength(newPass);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-nuanu-emerald to-nuanu-teal flex items-center justify-center text-white text-xl font-black shadow-lg shadow-emerald-500/20">
          {currentUser?.name ? getInitials(currentUser.name) : "??"}
        </div>
        <div>
          <h1 className="text-2xl font-black text-nuanu-navy">
            {currentUser?.name || "Loading..."}
          </h1>
          <p className="text-sm text-nuanu-gray-500 capitalize">
            {currentUser?.roles?.[0]?.replace(/-/g, " ") || "User"} &bull;{" "}
            {currentUser?.email}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-nuanu-gray-100 rounded-xl w-fit">
        {[
          { id: "info", label: "Profile Info", icon: User },
          { id: "password", label: "Change Password", icon: KeyRound },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              activeTab === tab.id
                ? "bg-white text-nuanu-navy shadow-sm"
                : "text-nuanu-gray-500 hover:text-nuanu-navy"
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {/* ── Profile Info Tab ── */}
        {activeTab === "info" && (
          <motion.div
            key="info"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="card space-y-5"
          >
            <div className="border-b border-nuanu-gray-100 pb-4">
              <h2 className="text-lg font-bold text-nuanu-navy">
                Account Information
              </h2>
              <p className="text-sm text-nuanu-gray-500">
                Your current profile details
              </p>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-4 p-4 bg-nuanu-gray-50 rounded-xl">
                <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                  <User className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-[10px] font-black text-nuanu-gray-400 uppercase tracking-widest">
                    Full Name
                  </p>
                  <p className="text-sm font-semibold text-nuanu-navy mt-0.5">
                    {currentUser?.name || "—"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4 p-4 bg-nuanu-gray-50 rounded-xl">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
                  <Mail className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-[10px] font-black text-nuanu-gray-400 uppercase tracking-widest">
                    Email Address
                  </p>
                  <p className="text-sm font-semibold text-nuanu-navy mt-0.5">
                    {currentUser?.email || "—"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4 p-4 bg-nuanu-gray-50 rounded-xl">
                <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
                  <Shield className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-[10px] font-black text-nuanu-gray-400 uppercase tracking-widest">
                    Role
                  </p>
                  <p className="text-sm font-semibold text-nuanu-navy mt-0.5 capitalize">
                    {currentUser?.roles?.join(", ")?.replace(/-/g, " ") || "—"}
                  </p>
                </div>
              </div>
            </div>

            <div className="pt-2">
              <button
                onClick={() => setActiveTab("password")}
                className="btn-secondary text-sm"
              >
                <KeyRound className="w-4 h-4" /> Change Password
              </button>
            </div>
          </motion.div>
        )}

        {/* ── Change Password Tab ── */}
        {activeTab === "password" && (
          <motion.div
            key="password"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="card space-y-5"
          >
            <div className="border-b border-nuanu-gray-100 pb-4">
              <h2 className="text-lg font-bold text-nuanu-navy">
                Change Password
              </h2>
              <p className="text-sm text-nuanu-gray-500">
                Set a new password for your account
              </p>
            </div>

            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label className="block text-[10px] font-black text-nuanu-gray-500 uppercase tracking-widest mb-1.5">
                  New Password
                </label>
                <div className="relative">
                  <input
                    type={showNew ? "text" : "password"}
                    required
                    value={newPass}
                    onChange={(e) => setNewPass(e.target.value)}
                    placeholder="Enter new password (min. 6 chars)"
                    className="input-field py-2.5 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNew((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-nuanu-gray-400 hover:text-nuanu-navy"
                  >
                    {showNew ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
                {/* Strength bar */}
                {newPass && (
                  <div className="mt-2 space-y-1">
                    <div className="h-1.5 bg-nuanu-gray-100 rounded-full overflow-hidden">
                      <motion.div
                        className={`h-full rounded-full ${strength.color}`}
                        initial={{ width: 0 }}
                        animate={{ width: strength.width }}
                        transition={{ duration: 0.3 }}
                      />
                    </div>
                    <p className="text-[10px] font-bold text-nuanu-gray-400">
                      Strength:{" "}
                      <span
                        className={
                          strength.label === "Strong" ||
                          strength.label === "Good"
                            ? "text-emerald-600"
                            : "text-orange-500"
                        }
                      >
                        {strength.label}
                      </span>
                    </p>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-[10px] font-black text-nuanu-gray-500 uppercase tracking-widest mb-1.5">
                  Confirm New Password
                </label>
                <div className="relative">
                  <input
                    type={showConfirm ? "text" : "password"}
                    required
                    value={confirmPass}
                    onChange={(e) => setConfirmPass(e.target.value)}
                    placeholder="Re-enter new password"
                    className={`input-field py-2.5 pr-10 ${
                      confirmPass && confirmPass !== newPass
                        ? "border-red-400 focus:ring-red-400/20"
                        : confirmPass && confirmPass === newPass
                          ? "border-emerald-400 focus:ring-emerald-400/20"
                          : ""
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-nuanu-gray-400 hover:text-nuanu-navy"
                  >
                    {showConfirm ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                  {confirmPass && confirmPass === newPass && (
                    <Check className="absolute right-9 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-500" />
                  )}
                </div>
                {confirmPass && confirmPass !== newPass && (
                  <p className="text-[10px] text-red-500 font-bold mt-1">
                    Passwords do not match
                  </p>
                )}
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  disabled={
                    isSaving ||
                    !newPass ||
                    !confirmPass ||
                    newPass !== confirmPass
                  }
                  className="btn-primary px-8"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" /> Save New Password
                    </>
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
