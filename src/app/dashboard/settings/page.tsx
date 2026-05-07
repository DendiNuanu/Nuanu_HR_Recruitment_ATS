"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Save,
  Building,
  Users,
  Bell,
  Shield,
  Database,
  Webhook,
  Plus,
  UserPlus,
  Key,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Calendar,
  Cpu,
  RefreshCw,
  Brain,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  getIntegrationSettings,
  updateIntegrationSettings,
  getCalendarStatus,
  getUsers,
  getRoles,
  inviteUser,
  deleteUser,
  updateUserRole,
  updateCompanyLogo,
  getCurrentUser,
  getAIStatus,
} from "@/app/actions/settings";
import { getDepartments } from "@/app/actions/departments";

export default function SettingsPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("integrations");
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "success" | "error">(
    "idle",
  );

  // Google Sheets State
  const [sheetsConfig, setSheetsConfig] = useState({
    serviceAccount: "",
    spreadsheetId: "1-7L1O7Qf7UB0eFSx5VCdPvEh-6xWebHtY1Q7Zo0Z0jU",
    isActive: false,
  });

  const [isCalendarConnected, setIsCalendarConnected] = useState(false);
  const [generalConfig, setGeneralConfig] = useState({
    companyName: "Nuanu",
    industry: "Creative City Development and Sustainable Tourism",
    website: "https://nuanu.com",
    logo: "",
    requireResume: true,
    enableAI: true,
  });

  const [users, setUsers] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [inviteData, setInviteData] = useState({
    name: "",
    email: "",
    roleId: "",
    departmentId: "",
  });

  const [currentUser, setCurrentUser] = useState<any>(null);
  const [aiStatus, setAiStatus] = useState<any>(null);
  const [isCheckingAI, setIsCheckingAI] = useState(false);

  // Show success/error toast after Google Calendar OAuth redirect.
  // Reading window.location.search avoids useSearchParams + Suspense requirement.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const calendarParam = params.get("calendar");
    if (calendarParam === "connected") {
      setIsCalendarConnected(true);
      setActiveTab("integrations");
      toast.success("Google Calendar connected successfully!", {
        description: "Your interviews will now sync with Google Calendar.",
      });
      router.replace("/dashboard/settings", { scroll: false });
    } else if (calendarParam === "error") {
      setActiveTab("integrations");
      toast.error("Failed to connect Google Calendar", {
        description:
          "Please check your Google Cloud credentials and try again.",
      });
      router.replace("/dashboard/settings", { scroll: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    async function loadSettings() {
      const user = await getCurrentUser();
      setCurrentUser(user);

      const googleSettings = await getIntegrationSettings("google_sheets");
      if (googleSettings) {
        setSheetsConfig({
          serviceAccount: JSON.stringify(googleSettings.config, null, 2),
          spreadsheetId:
            (googleSettings.config as any)?.spreadsheetId ||
            "1-7L1O7Qf7UB0eFSx5VCdPvEh-6xWebHtY1Q7Zo0Z0jU",
          isActive: googleSettings.isActive,
        });
      }

      const calendar = await getCalendarStatus();
      setIsCalendarConnected(calendar.connected);

      const genSettings = await getIntegrationSettings("general_info");
      if (genSettings) {
        setGeneralConfig(genSettings.config as any);
      }

      const [usersData, rolesData, deptsData] = await Promise.all([
        getUsers(),
        getRoles(),
        getDepartments(),
      ]);
      setUsers(usersData);
      setRoles(rolesData);
      setDepartments(deptsData);
    }
    loadSettings();
    checkAI();
  }, []);

  const checkAI = async () => {
    setIsCheckingAI(true);
    try {
      const status = await getAIStatus();
      setAiStatus(status);
    } catch (error) {
      setAiStatus({ status: "OFF", error: "Connection failed" });
    } finally {
      setIsCheckingAI(false);
    }
  };

  const handleSaveIntegrations = async () => {
    let configObj = {};
    try {
      configObj = JSON.parse(sheetsConfig.serviceAccount);
    } catch (e) {}

    return await updateIntegrationSettings(
      "google_sheets",
      "spreadsheet",
      { ...configObj, spreadsheetId: sheetsConfig.spreadsheetId },
      sheetsConfig.isActive,
    );
  };

  const handleGlobalSave = async () => {
    setIsSaving(true);
    setSaveStatus("idle");
    try {
      let res;
      if (activeTab === "integrations") {
        res = await handleSaveIntegrations();
      } else {
        res = await updateIntegrationSettings(
          "general_info",
          "general",
          generalConfig,
          true,
        );
      }

      if (res.success) {
        setSaveStatus("success");
        setTimeout(() => setSaveStatus("idle"), 3000);
      } else {
        setSaveStatus("error");
      }
    } catch (error) {
      setSaveStatus("error");
    } finally {
      setIsSaving(false);
    }
  };

  const isAdmin = currentUser?.roles?.some(
    (r: string) =>
      r.toLowerCase() === "admin" || r.toLowerCase() === "super-admin",
  );

  const tabs = [
    { id: "general", label: "General Information", icon: Building },
    ...(isAdmin ? [{ id: "users", label: "Users & Roles", icon: Users }] : []),
    { id: "notifications", label: "Notifications", icon: Bell },
    { id: "security", label: "Security", icon: Shield },
    { id: "integrations", label: "Integrations", icon: Webhook },
    ...(isAdmin
      ? [{ id: "database", label: "Database Sync", icon: Database }]
      : []),
    ...(isAdmin
      ? [{ id: "ai_status", label: "AI Model Status", icon: Brain }]
      : []),
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-nuanu-navy">Settings</h1>
          <p className="text-sm text-nuanu-gray-500 mt-1">
            Configure your Nuanu ATS instance
          </p>
        </div>
        <button
          onClick={handleGlobalSave}
          disabled={isSaving}
          className="btn-primary"
        >
          {isSaving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          {saveStatus === "success" ? "Saved!" : "Save Changes"}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Navigation Sidebar */}
        <div className="lg:col-span-1 space-y-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? "bg-emerald-50 text-emerald-700 shadow-sm"
                  : "text-nuanu-gray-600 hover:bg-nuanu-gray-50"
              }`}
            >
              <tab.icon
                className={`w-5 h-5 ${activeTab === tab.id ? "text-emerald-600" : "text-nuanu-gray-400"}`}
              />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div className="lg:col-span-3 min-h-[500px]">
          <AnimatePresence mode="wait">
            {activeTab === "general" && (
              <motion.div
                key="general"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                <div className="card space-y-6">
                  <div className="border-b border-nuanu-gray-100 pb-4">
                    <h2 className="text-lg font-bold text-nuanu-navy">
                      General Information
                    </h2>
                    <p className="text-sm text-nuanu-gray-500">
                      Update your company profile and branding
                    </p>
                  </div>
                  <div className="space-y-4 max-w-2xl">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-nuanu-gray-700 mb-1.5">
                          Company Name
                        </label>
                        <input
                          type="text"
                          className="input-field"
                          value={generalConfig.companyName}
                          onChange={(e) =>
                            setGeneralConfig({
                              ...generalConfig,
                              companyName: e.target.value,
                            })
                          }
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-nuanu-gray-700 mb-1.5">
                          Industry
                        </label>
                        <input
                          type="text"
                          className="input-field"
                          value={generalConfig.industry}
                          onChange={(e) =>
                            setGeneralConfig({
                              ...generalConfig,
                              industry: e.target.value,
                            })
                          }
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-nuanu-gray-700 mb-1.5">
                        Company Website
                      </label>
                      <input
                        type="url"
                        className="input-field"
                        value={generalConfig.website}
                        onChange={(e) =>
                          setGeneralConfig({
                            ...generalConfig,
                            website: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-nuanu-gray-700 mb-1.5">
                        Company Logo
                      </label>
                      <input
                        type="file"
                        id="logo-upload"
                        className="hidden"
                        accept="image/*"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onloadend = async () => {
                              const base64 = reader.result as string;
                              setGeneralConfig({
                                ...generalConfig,
                                logo: base64,
                              });
                              const res = await updateCompanyLogo(base64);
                              if (res.success) {
                                setSaveStatus("success");
                                setTimeout(() => setSaveStatus("idle"), 2000);
                              }
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                      />
                      <label
                        htmlFor="logo-upload"
                        className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-nuanu-gray-300 border-dashed rounded-xl hover:bg-nuanu-gray-50 transition-colors cursor-pointer overflow-hidden relative group"
                      >
                        <div className="space-y-1 text-center">
                          {generalConfig.logo ? (
                            <img
                              src={generalConfig.logo}
                              alt="Logo"
                              className="mx-auto h-20 w-auto object-contain mb-2"
                            />
                          ) : (
                            <Building className="mx-auto h-12 w-12 text-nuanu-gray-400" />
                          )}
                          <div className="flex text-sm text-nuanu-gray-600 justify-center">
                            <span className="relative cursor-pointer bg-transparent rounded-md font-medium text-emerald-600 hover:text-emerald-500">
                              <span>
                                {generalConfig.logo
                                  ? "Change logo"
                                  : "Upload a file"}
                              </span>
                            </span>
                            {!generalConfig.logo && (
                              <p className="pl-1">or drag and drop</p>
                            )}
                          </div>
                          <p className="text-xs text-nuanu-gray-500">
                            PNG, JPG, GIF up to 10MB
                          </p>
                        </div>
                      </label>
                    </div>
                  </div>
                </div>

                <div className="card space-y-6">
                  <div className="border-b border-nuanu-gray-100 pb-4">
                    <h2 className="text-lg font-bold text-nuanu-navy">
                      ATS Preferences
                    </h2>
                    <p className="text-sm text-nuanu-gray-500">
                      Configure global ATS settings
                    </p>
                  </div>
                  <div className="space-y-4 max-w-2xl">
                    <div className="flex items-center justify-between py-2">
                      <div>
                        <p className="text-sm font-medium text-nuanu-navy">
                          Require Resume Upload
                        </p>
                        <p className="text-xs text-nuanu-gray-500">
                          Force all applicants to attach a resume
                        </p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          className="sr-only peer"
                          checked={generalConfig.requireResume}
                          onChange={(e) =>
                            setGeneralConfig({
                              ...generalConfig,
                              requireResume: e.target.checked,
                            })
                          }
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                      </label>
                    </div>
                    <div className="flex items-center justify-between py-2">
                      <div>
                        <p className="text-sm font-medium text-nuanu-navy">
                          Enable AI Match Scoring
                        </p>
                        <p className="text-xs text-nuanu-gray-500">
                          Automatically score incoming candidates
                        </p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          className="sr-only peer"
                          checked={generalConfig.enableAI}
                          onChange={(e) =>
                            setGeneralConfig({
                              ...generalConfig,
                              enableAI: e.target.checked,
                            })
                          }
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                      </label>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === "users" && isAdmin && (
              <motion.div
                key="users"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="card space-y-6"
              >
                <div className="flex items-center justify-between border-b border-nuanu-gray-100 pb-4">
                  <div>
                    <h2 className="text-lg font-bold text-nuanu-navy">
                      Users & Roles
                    </h2>
                    <p className="text-sm text-nuanu-gray-500">
                      Manage team members and their permissions
                    </p>
                  </div>
                  <button
                    onClick={() => setIsInviteModalOpen(true)}
                    className="btn-secondary text-sm py-2"
                  >
                    <UserPlus className="w-4 h-4" /> Invite User
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>User</th>
                        <th>Role</th>
                        <th>Department</th>
                        <th>Status</th>
                        <th className="text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((user) => (
                        <tr key={user.id}>
                          <td>
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold text-xs uppercase">
                                {user.name.charAt(0)}
                              </div>
                              <div>
                                <p className="font-medium text-nuanu-navy leading-none">
                                  {user.name}
                                </p>
                                <p className="text-[10px] text-nuanu-gray-400 mt-1">
                                  {user.email}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td>
                            <div className="flex flex-wrap gap-1">
                              {user.userRoles.map((ur: any) => (
                                <span
                                  key={ur.id}
                                  className="badge bg-blue-50 text-blue-700 text-[10px]"
                                >
                                  {ur.role.name}
                                </span>
                              ))}
                            </div>
                          </td>
                          <td className="text-sm text-nuanu-gray-600 font-medium">
                            {user.department?.name || "—"}
                          </td>
                          <td>
                            <span
                              className={`badge ${user.isActive ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"} text-[10px]`}
                            >
                              {user.isActive ? "Active" : "Inactive"}
                            </span>
                          </td>
                          <td className="text-right">
                            <button
                              onClick={async () => {
                                if (
                                  confirm(
                                    `Are you sure you want to delete ${user.name}?`,
                                  )
                                ) {
                                  const res = await deleteUser(user.id);
                                  if (res.success) {
                                    setUsers(
                                      users.filter((u) => u.id !== user.id),
                                    );
                                  }
                                }
                              }}
                              className="p-1.5 text-nuanu-gray-400 hover:text-red-600 transition-colors"
                            >
                              <AlertCircle className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                      {users.length === 0 && (
                        <tr>
                          <td
                            colSpan={5}
                            className="text-center py-12 text-nuanu-gray-400 italic"
                          >
                            No users found.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            )}

            {activeTab === "notifications" && (
              <motion.div
                key="notifications"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="card space-y-6"
              >
                <div className="border-b border-nuanu-gray-100 pb-4">
                  <h2 className="text-lg font-bold text-nuanu-navy">
                    Notifications
                  </h2>
                  <p className="text-sm text-nuanu-gray-500">
                    Choose what events you want to be notified about
                  </p>
                </div>
                <div className="space-y-4 max-w-2xl">
                  {[
                    "New Candidate Applied",
                    "Interview Scheduled",
                    "Offer Accepted",
                    "Daily Pipeline Summary",
                    "AI Scoring Completed",
                  ].map((item, i) => (
                    <div
                      key={item}
                      className="flex items-center justify-between py-2 border-b border-nuanu-gray-50 last:border-0"
                    >
                      <span className="text-sm font-medium text-nuanu-navy">
                        {item}
                      </span>
                      <div className="flex gap-4">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            defaultChecked
                            className="rounded border-nuanu-gray-300 text-emerald-500 focus:ring-emerald-500"
                          />
                          <span className="text-xs text-nuanu-gray-600">
                            Email
                          </span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            defaultChecked={i < 3}
                            className="rounded border-nuanu-gray-300 text-emerald-500 focus:ring-emerald-500"
                          />
                          <span className="text-xs text-nuanu-gray-600">
                            In-App
                          </span>
                        </label>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {activeTab === "security" && (
              <motion.div
                key="security"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="card space-y-6"
              >
                <div className="border-b border-nuanu-gray-100 pb-4">
                  <h2 className="text-lg font-bold text-nuanu-navy">
                    Security Settings
                  </h2>
                  <p className="text-sm text-nuanu-gray-500">
                    Manage your account security and authentication methods
                  </p>
                </div>
                <div className="space-y-6 max-w-2xl">
                  <div>
                    <h3 className="text-sm font-semibold text-nuanu-navy mb-3">
                      Two-Factor Authentication (2FA)
                    </h3>
                    <div className="p-4 bg-nuanu-gray-50 rounded-xl border border-nuanu-gray-200 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-nuanu-navy">
                          Authenticator App
                        </p>
                        <p className="text-xs text-nuanu-gray-500">
                          Protect your account with an authenticator app
                        </p>
                      </div>
                      <button className="btn-secondary py-1.5 text-xs">
                        <Plus className="w-3.5 h-3.5" /> Enable
                      </button>
                    </div>
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-nuanu-navy mb-3">
                      Password Management
                    </h3>
                    <button className="btn-secondary py-2 text-sm">
                      <Key className="w-4 h-4" /> Change Password
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === "integrations" && (
              <motion.div
                key="integrations"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="card space-y-6"
              >
                <div className="border-b border-nuanu-gray-100 pb-4 flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-bold text-nuanu-navy flex items-center gap-2">
                      <Webhook className="w-5 h-5 text-emerald-600" /> External
                      API Integrations
                    </h2>
                    <p className="text-sm text-nuanu-gray-500">
                      Configure Webhooks for LinkedIn, JobStreet, and Google
                      Sheets
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-nuanu-gray-400">
                      Enabled
                    </span>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        className="sr-only peer"
                        checked={sheetsConfig.isActive}
                        onChange={(e) =>
                          setSheetsConfig({
                            ...sheetsConfig,
                            isActive: e.target.checked,
                          })
                        }
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                    </label>
                  </div>
                </div>
                <div className="space-y-6 max-w-2xl">
                  {/* LinkedIn & JobStreet Integrations */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* LinkedIn Card */}
                    <div className="p-5 bg-white rounded-2xl border-2 border-blue-50 shadow-sm hover:border-blue-200 transition-all">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center">
                            <svg
                              className="w-6 h-6 fill-current"
                              viewBox="0 0 24 24"
                            >
                              <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.239-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
                            </svg>
                          </div>
                          <div>
                            <h3 className="font-bold text-nuanu-navy text-sm">
                              LinkedIn Talent
                            </h3>
                            <p className="text-[10px] text-nuanu-gray-400 uppercase font-black">
                              Simple Job Posting
                            </p>
                          </div>
                        </div>
                        <span className="badge bg-nuanu-gray-100 text-nuanu-gray-500 text-[10px]">
                          Disabled
                        </span>
                      </div>
                      <div className="space-y-3">
                        <input
                          type="password"
                          placeholder="Client ID"
                          className="input-field py-1.5 text-xs"
                        />
                        <input
                          type="password"
                          placeholder="Client Secret"
                          className="input-field py-1.5 text-xs"
                        />
                        <div className="pt-2">
                          <p className="text-[10px] font-bold text-nuanu-gray-400 uppercase mb-1">
                            Webhook Endpoint
                          </p>
                          <code className="block p-2 bg-nuanu-gray-50 rounded text-[9px] text-nuanu-navy break-all border border-nuanu-gray-100">
                            https://nuanu-ats.app/api/webhooks/linkedin
                          </code>
                        </div>
                      </div>
                    </div>

                    {/* JobStreet Card */}
                    <div className="p-5 bg-white rounded-2xl border-2 border-indigo-50 shadow-sm hover:border-indigo-200 transition-all">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-indigo-900 text-white flex items-center justify-center font-black text-xs italic">
                            SEEK
                          </div>
                          <div>
                            <h3 className="font-bold text-nuanu-navy text-sm">
                              JobStreet / SEEK
                            </h3>
                            <p className="text-[10px] text-nuanu-gray-400 uppercase font-black">
                              API Integration
                            </p>
                          </div>
                        </div>
                        <span className="badge bg-nuanu-gray-100 text-nuanu-gray-500 text-[10px]">
                          Disabled
                        </span>
                      </div>
                      <div className="space-y-3">
                        <input
                          type="password"
                          placeholder="API Key"
                          className="input-field py-1.5 text-xs"
                        />
                        <div className="pt-2">
                          <p className="text-[10px] font-bold text-nuanu-gray-400 uppercase mb-1">
                            Application Webhook
                          </p>
                          <code className="block p-2 bg-nuanu-gray-50 rounded text-[9px] text-nuanu-navy break-all border border-nuanu-gray-100">
                            https://nuanu-ats.app/api/webhooks/jobstreet
                          </code>
                        </div>
                        <button className="w-full py-2 bg-indigo-50 text-indigo-700 rounded-lg text-[10px] font-bold border border-indigo-100">
                          Configure Mapping
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Google Calendar */}
                  <div className="p-6 bg-white rounded-2xl border-2 border-blue-100 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-10">
                      <Calendar className="w-16 h-16 text-blue-600" />
                    </div>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-bold text-nuanu-navy flex items-center gap-2">
                        <div
                          className={`w-2 h-2 rounded-full ${isCalendarConnected ? "bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]" : "bg-nuanu-gray-300"}`}
                        ></div>
                        Google Calendar Integration
                      </h3>
                      {isCalendarConnected ? (
                        <span className="badge bg-emerald-100 text-emerald-700 text-[10px]">
                          Connected
                        </span>
                      ) : (
                        <span className="badge bg-nuanu-gray-100 text-nuanu-gray-600 text-[10px]">
                          Not Connected
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-nuanu-gray-500 mb-6 max-w-md">
                      Sync your interviews with Google Calendar and
                      automatically generate Google Meet links for video calls.
                    </p>

                    {isCalendarConnected ? (
                      <div className="flex items-center gap-3">
                        <div className="flex-1 p-3 bg-emerald-50 border border-emerald-100 rounded-xl flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          <span className="text-xs font-medium text-emerald-700">
                            Calendar Sync Active
                          </span>
                        </div>
                        <button
                          onClick={() =>
                            (window.location.href =
                              "/api/calendar/google/connect")
                          }
                          className="btn-secondary py-2 text-xs"
                        >
                          Reconnect
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() =>
                          (window.location.href =
                            "/api/calendar/google/connect")
                        }
                        className="btn-primary bg-blue-600 hover:bg-blue-700 w-full justify-center"
                      >
                        <Calendar className="w-4 h-4" /> Connect Google Calendar
                      </button>
                    )}
                  </div>

                  {/* Google Sheets */}
                  <div className="p-6 bg-white rounded-2xl border-2 border-emerald-100 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-10">
                      <Database className="w-16 h-16 text-emerald-600" />
                    </div>
                    <h3 className="font-bold text-nuanu-navy mb-4 flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]"></div>
                      Google Sheets Live Tracking
                    </h3>
                    <div className="space-y-4 relative z-10">
                      <div>
                        <label className="block text-xs font-bold text-nuanu-gray-500 uppercase tracking-widest mb-1.5">
                          Service Account JSON (Google Cloud)
                        </label>
                        <textarea
                          rows={5}
                          value={sheetsConfig.serviceAccount}
                          onChange={(e) =>
                            setSheetsConfig({
                              ...sheetsConfig,
                              serviceAccount: e.target.value,
                            })
                          }
                          placeholder='{"type": "service_account", "project_id": "...", "private_key": "..."}'
                          className="input-field text-xs font-mono bg-nuanu-gray-50 focus:bg-white"
                        ></textarea>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-nuanu-gray-500 uppercase tracking-widest mb-1.5">
                          Target Spreadsheet ID
                        </label>
                        <input
                          type="text"
                          value={sheetsConfig.spreadsheetId}
                          onChange={(e) =>
                            setSheetsConfig({
                              ...sheetsConfig,
                              spreadsheetId: e.target.value,
                            })
                          }
                          placeholder="1-7L1O7Qf7UB0eFSx5VCdPvEh-6xWebHtY..."
                          className="input-field text-sm bg-nuanu-gray-50 focus:bg-white"
                        />
                      </div>
                      <div className="flex items-center gap-2 text-amber-600 bg-amber-50 p-3 rounded-xl border border-amber-100">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        <p className="text-[11px] font-medium leading-relaxed">
                          Important: Grant{" "}
                          <span className="font-bold underline italic">
                            Editor
                          </span>{" "}
                          access to your Service Account email in the Google
                          Sheet sharing settings.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === "database" && isAdmin && (
              <motion.div
                key="database"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="card space-y-6"
              >
                <div className="border-b border-nuanu-gray-100 pb-4">
                  <h2 className="text-lg font-bold text-nuanu-navy">
                    Database Synchronization
                  </h2>
                  <p className="text-sm text-nuanu-gray-500">
                    Manage data backups and forced syncs
                  </p>
                </div>
                <div className="space-y-6 max-w-2xl">
                  <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl">
                    <h3 className="text-sm font-semibold text-blue-800 mb-1">
                      PostgreSQL Connection Status
                    </h3>
                    <p className="text-xs text-blue-600 mb-3">
                      Database is actively connected and synced via Prisma.
                    </p>
                    <button className="btn-primary bg-blue-600 hover:bg-blue-700 py-2 text-xs">
                      Test Connection
                    </button>
                  </div>

                  <div>
                    <h3 className="text-sm font-semibold text-nuanu-navy mb-2">
                      Manual Data Sync
                    </h3>
                    <p className="text-xs text-nuanu-gray-500 mb-3">
                      Force a synchronization with Google Sheets instead of
                      waiting for the cron job.
                    </p>
                    <button className="btn-secondary py-2 text-sm">
                      <Database className="w-4 h-4" /> Trigger Immediate Sync
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === "ai_status" && isAdmin && (
              <motion.div
                key="ai_status"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                <div className="card space-y-6 relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-8 opacity-5">
                    <Brain className="w-32 h-32 text-indigo-600" />
                  </div>

                  <div className="flex items-center justify-between border-b border-nuanu-gray-100 pb-4 relative z-10">
                    <div>
                      <h2 className="text-lg font-bold text-nuanu-navy">
                        AI Model Status
                      </h2>
                      <p className="text-sm text-nuanu-gray-500">
                        Detect and monitor local AI engine connectivity
                      </p>
                    </div>
                    <button
                      onClick={checkAI}
                      disabled={isCheckingAI}
                      className="btn-secondary text-sm py-2"
                    >
                      <RefreshCw
                        className={`w-4 h-4 ${isCheckingAI ? "animate-spin" : ""}`}
                      />
                      {isCheckingAI ? "Detecting..." : "Refresh Status"}
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative z-10">
                    {/* Status Card */}
                    <div
                      className={`p-6 rounded-2xl border-2 transition-all ${
                        aiStatus?.status === "ON"
                          ? "bg-emerald-50 border-emerald-100 shadow-sm shadow-emerald-100/50"
                          : "bg-red-50 border-red-100 shadow-sm shadow-red-100/50"
                      }`}
                    >
                      <p className="text-[10px] font-black uppercase tracking-widest text-nuanu-gray-400 mb-2">
                        Engine Connectivity
                      </p>
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-3 h-3 rounded-full animate-pulse ${
                            aiStatus?.status === "ON"
                              ? "bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]"
                              : "bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]"
                          }`}
                        ></div>
                        <span
                          className={`text-2xl font-black ${
                            aiStatus?.status === "ON"
                              ? "text-emerald-700"
                              : "text-red-700"
                          }`}
                        >
                          {aiStatus?.status || "DETECTING..."}
                        </span>
                      </div>
                      <p className="text-[10px] mt-2 font-medium text-nuanu-gray-500">
                        {aiStatus?.status === "ON"
                          ? "Ollama server is active and responding."
                          : aiStatus?.error || "Ollama server not found."}
                      </p>
                    </div>

                    {/* Active Model Card */}
                    <div className="p-6 rounded-2xl border-2 border-nuanu-gray-100 bg-white">
                      <p className="text-[10px] font-black uppercase tracking-widest text-nuanu-gray-400 mb-2">
                        Primary Model
                      </p>
                      <div className="flex items-center gap-2">
                        <Cpu className="w-5 h-5 text-indigo-600" />
                        <span className="text-xl font-bold text-nuanu-navy">
                          {aiStatus?.model || "qwen2.5"}
                        </span>
                      </div>
                      <p className="text-[10px] mt-2 font-medium text-nuanu-gray-500 uppercase tracking-tighter">
                        Optimized for AI Scoring & Matching
                      </p>
                    </div>

                    {/* Resources Card */}
                    <div className="p-6 rounded-2xl border-2 border-nuanu-gray-100 bg-white">
                      <p className="text-[10px] font-black uppercase tracking-widest text-nuanu-gray-400 mb-2">
                        Available Models
                      </p>
                      <div className="flex items-center gap-2">
                        <Database className="w-5 h-5 text-emerald-600" />
                        <span className="text-xl font-bold text-nuanu-navy">
                          {aiStatus?.models?.length || 0}
                        </span>
                      </div>
                      <p className="text-[10px] mt-2 font-medium text-nuanu-gray-500 uppercase">
                        Installed in local Ollama instance
                      </p>
                    </div>
                  </div>

                  {aiStatus?.models?.length > 0 && (
                    <div className="space-y-4 relative z-10">
                      <h3 className="text-sm font-bold text-nuanu-navy flex items-center gap-2">
                        <Plus className="w-4 h-4 text-emerald-500" /> Detected
                        Model Inventory
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {aiStatus.models.map((m: any) => (
                          <div
                            key={m.name}
                            className="p-3 bg-nuanu-gray-50 rounded-xl border border-nuanu-gray-100 flex justify-between items-center"
                          >
                            <span className="text-xs font-bold text-nuanu-navy">
                              {m.name}
                            </span>
                            <span className="text-[10px] text-nuanu-gray-400 font-medium">
                              {(m.size / (1024 * 1024 * 1024)).toFixed(1)} GB
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="p-4 bg-nuanu-navy rounded-2xl text-white flex items-center justify-between relative z-10">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
                        <Shield className="w-5 h-5 text-emerald-400" />
                      </div>
                      <div>
                        <p className="text-xs font-bold">
                          Local Execution Privacy
                        </p>
                        <p className="text-[10px] text-gray-400">
                          All resume data is processed locally. No data leaves
                          your infrastructure.
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-black uppercase tracking-widest text-emerald-400">
                        Secure Engine
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <AnimatePresence>
        {isInviteModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-nuanu-navy/40 backdrop-blur-sm"
              onClick={() => !isSaving && setIsInviteModalOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden relative z-10 border border-white/20"
            >
              <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-nuanu-navy text-white">
                <h2 className="text-lg font-black flex items-center gap-2">
                  <UserPlus className="w-5 h-5 text-emerald-400" /> Invite Team
                  Member
                </h2>
                <button
                  onClick={() => setIsInviteModalOpen(false)}
                  className="p-1 hover:bg-white/10 rounded-full transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  setIsSaving(true);
                  const res = await inviteUser(inviteData);
                  setIsSaving(false);
                  if (res.success) {
                    alert(
                      `User invited! Temporary Password: ${res.tempPassword}`,
                    );
                    setIsInviteModalOpen(false);
                    const updatedUsers = await getUsers();
                    setUsers(updatedUsers);
                  } else {
                    alert(res.error);
                  }
                }}
                className="p-6 space-y-4"
              >
                <div>
                  <label className="block text-[10px] font-black text-nuanu-gray-500 uppercase tracking-widest mb-1.5">
                    Full Name
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="John Doe"
                    className="input-field py-2.5"
                    value={inviteData.name}
                    onChange={(e) =>
                      setInviteData({ ...inviteData, name: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-nuanu-gray-500 uppercase tracking-widest mb-1.5">
                    Email Address
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="john@company.com"
                    className="input-field py-2.5"
                    value={inviteData.email}
                    onChange={(e) =>
                      setInviteData({ ...inviteData, email: e.target.value })
                    }
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black text-nuanu-gray-500 uppercase tracking-widest mb-1.5">
                      Assign Role
                    </label>
                    <select
                      required
                      className="input-field py-2.5 text-xs font-bold"
                      value={inviteData.roleId}
                      onChange={(e) =>
                        setInviteData({ ...inviteData, roleId: e.target.value })
                      }
                    >
                      <option value="" disabled>
                        Select role...
                      </option>
                      {roles.map((role) => (
                        <option key={role.id} value={role.id}>
                          {role.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-nuanu-gray-500 uppercase tracking-widest mb-1.5">
                      Department
                    </label>
                    <select
                      className="input-field py-2.5 text-xs font-bold"
                      value={inviteData.departmentId}
                      onChange={(e) =>
                        setInviteData({
                          ...inviteData,
                          departmentId: e.target.value,
                        })
                      }
                    >
                      <option value="">Select dept...</option>
                      {departments.map((dept) => (
                        <option key={dept.id} value={dept.id}>
                          {dept.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="pt-4 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setIsInviteModalOpen(false)}
                    className="px-4 py-2 text-xs font-bold text-nuanu-gray-500"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="btn-primary py-2 px-6 text-xs"
                  >
                    {isSaving ? "Inviting..." : "Send Invitation"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

const X = ({ className }: { className?: string }) => (
  <svg
    className={className}
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M6 18L18 6M6 6l12 12"
    />
  </svg>
);
