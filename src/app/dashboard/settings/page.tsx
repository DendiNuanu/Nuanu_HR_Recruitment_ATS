"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import ChannelCostsTab from "./ChannelCostsTab";
import EmailTemplatesTab from "./EmailTemplatesTab";
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
  Trash2,
  Pencil,
  Copy,
  Eye,
  EyeOff,
  Check,
  Mail,
  Send,
  ServerCog,
  DollarSign,
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
  updateUser,
  updateCompanyLogo,
  getCurrentUser,
  getAIStatus,
  getEmailConfig,
  saveEmailConfig,
  sendTestEmail,
  createUser,
  changeUserPassword,
  createRole,
  updateRole,
  deleteRole,
  createDepartment,
  updateDepartment,
  deleteDepartment,
} from "@/app/actions/settings";
import { getDepartments } from "@/app/actions/departments";
import ConfirmModal from "@/components/ui/ConfirmModal";

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

  // Users & Roles CRUD state
  const [deleteConfirmUser, setDeleteConfirmUser] = useState<any | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [editingUser, setEditingUser] = useState<any | null>(null);
  const [editData, setEditData] = useState({
    name: "",
    email: "",
    roleId: "",
    departmentId: "",
  });
  const [isEditSaving, setIsEditSaving] = useState(false);
  const [showTempPassword, setShowTempPassword] = useState<{
    name: string;
    email: string;
    password: string;
  } | null>(null);
  const [tempPasswordVisible, setTempPasswordVisible] = useState(false);
  const [copiedPassword, setCopiedPassword] = useState(false);

  // Email SMTP config (saved in DB via Settings UI)
  const [emailConfig, setEmailConfig] = useState({
    host: "",
    port: "587",
    user: "",
    pass: "",
    from: "",
  });
  const [emailPassVisible, setEmailPassVisible] = useState(false);
  const [isEmailSaving, setIsEmailSaving] = useState(false);
  const [isTestingEmail, setIsTestingEmail] = useState(false);

  // Create-user password fields
  const [createPassword, setCreatePassword] = useState("");
  const [createConfirmPassword, setCreateConfirmPassword] = useState("");
  const [showCreatePass, setShowCreatePass] = useState(false);
  const [showCreateConfirmPass, setShowCreateConfirmPass] = useState(false);

  // Change password modal
  const [changePwUser, setChangePwUser] = useState<any | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [newPasswordConfirm, setNewPasswordConfirm] = useState("");
  const [showNewPw, setShowNewPw] = useState(false);
  const [showNewPwConfirm, setShowNewPwConfirm] = useState(false);
  const [isChangingPw, setIsChangingPw] = useState(false);

  // Roles management state
  const [rolesExpanded, setRolesExpanded] = useState(false);
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [newRoleData, setNewRoleData] = useState({ name: "", description: "" });
  const [isCreatingRole, setIsCreatingRole] = useState(false);
  const [editingRole, setEditingRole] = useState<any | null>(null);
  const [editRoleData, setEditRoleData] = useState({
    name: "",
    description: "",
  });
  const [isEditRoleSaving, setIsEditRoleSaving] = useState(false);
  const [deleteConfirmRole, setDeleteConfirmRole] = useState<any | null>(null);
  const [isDeletingRole, setIsDeletingRole] = useState(false);

  // Departments management state
  const [isDeptModalOpen, setIsDeptModalOpen] = useState(false);
  const [newDeptData, setNewDeptData] = useState({
    name: "",
    code: "",
    description: "",
  });
  const [isCreatingDept, setIsCreatingDept] = useState(false);
  const [editingDept, setEditingDept] = useState<any | null>(null);
  const [editDeptData, setEditDeptData] = useState({
    name: "",
    code: "",
    description: "",
  });
  const [isEditDeptSaving, setIsEditDeptSaving] = useState(false);
  const [deleteConfirmDept, setDeleteConfirmDept] = useState<any | null>(null);
  const [isDeletingDept, setIsDeletingDept] = useState(false);

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

      const [usersData, rolesData, deptsData, emailCfg] = await Promise.all([
        getUsers(),
        getRoles(),
        getDepartments(),
        getEmailConfig(),
      ]);
      setUsers(usersData);
      setRoles(rolesData);
      setDepartments(deptsData);
      if (emailCfg) setEmailConfig(emailCfg);
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
    ...(isAdmin
      ? [{ id: "departments", label: "Departments", icon: Building }]
      : []),
    { id: "notifications", label: "Notifications", icon: Bell },
    { id: "security", label: "Security", icon: Shield },
    { id: "integrations", label: "Integrations", icon: Webhook },
    ...(isAdmin
      ? [{ id: "database", label: "Database Sync", icon: Database }]
      : []),
    ...(isAdmin
      ? [{ id: "ai_status", label: "AI Model Status", icon: Brain }]
      : []),
    ...(isAdmin
      ? [{ id: "channel_costs", label: "Channel Costs", icon: DollarSign }]
      : []),
    ...(isAdmin
      ? [{ id: "email_templates", label: "Email Templates", icon: Mail }]
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
                    onClick={() => {
                      setIsInviteModalOpen(true);
                      setCreatePassword("");
                      setCreateConfirmPassword("");
                    }}
                    className="btn-secondary text-sm py-2"
                  >
                    <UserPlus className="w-4 h-4" /> Create User
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
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => {
                                  setEditingUser(user);
                                  setEditData({
                                    name: user.name,
                                    email: user.email,
                                    roleId: user.userRoles[0]?.roleId || "",
                                    departmentId: user.departmentId || "",
                                  });
                                }}
                                className="p-1.5 text-nuanu-gray-400 hover:text-emerald-600 transition-colors rounded-lg hover:bg-emerald-50"
                                title="Edit user"
                              >
                                <Pencil className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => {
                                  setChangePwUser(user);
                                  setNewPassword("");
                                  setNewPasswordConfirm("");
                                }}
                                className="p-1.5 text-nuanu-gray-400 hover:text-blue-600 transition-colors rounded-lg hover:bg-blue-50"
                                title="Change password"
                              >
                                <Key className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => setDeleteConfirmUser(user)}
                                className="p-1.5 text-nuanu-gray-400 hover:text-red-600 transition-colors rounded-lg hover:bg-red-50"
                                title="Delete user"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
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

                {/* ─── Roles Section ─────────────────────────────────────── */}
                <div className="border-t border-nuanu-gray-100 pt-6">
                  <div className="flex items-center justify-between mb-4">
                    <button
                      onClick={() => setRolesExpanded((v) => !v)}
                      className="flex items-center gap-2 text-sm font-black text-nuanu-navy uppercase tracking-widest hover:text-nuanu-emerald transition-colors"
                    >
                      <Shield className="w-4 h-4" />
                      Roles Management
                      <span className="text-[10px] bg-nuanu-gray-100 text-nuanu-gray-500 px-2 py-0.5 rounded-full">
                        {roles.length}
                      </span>
                      <span className="text-nuanu-gray-400 text-xs">
                        {rolesExpanded ? "▲" : "▼"}
                      </span>
                    </button>
                    {rolesExpanded && (
                      <button
                        onClick={() => {
                          setNewRoleData({ name: "", description: "" });
                          setIsRoleModalOpen(true);
                        }}
                        className="btn-secondary text-xs py-1.5 px-3"
                      >
                        <Plus className="w-3.5 h-3.5" /> New Role
                      </button>
                    )}
                  </div>

                  {rolesExpanded && (
                    <div className="overflow-x-auto">
                      <table className="data-table">
                        <thead>
                          <tr>
                            <th>Name</th>
                            <th>Slug</th>
                            <th>Description</th>
                            <th>Type</th>
                            <th className="text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {roles.map((role) => (
                            <tr key={role.id}>
                              <td className="font-medium text-nuanu-navy">
                                {role.name}
                              </td>
                              <td>
                                <code className="text-[11px] bg-nuanu-gray-50 border border-nuanu-gray-100 px-2 py-0.5 rounded text-nuanu-gray-600">
                                  {role.slug}
                                </code>
                              </td>
                              <td className="text-sm text-nuanu-gray-500">
                                {role.description || "—"}
                              </td>
                              <td>
                                <span
                                  className={`badge text-[10px] ${
                                    role.isSystem
                                      ? "bg-blue-50 text-blue-700"
                                      : "bg-emerald-50 text-emerald-700"
                                  }`}
                                >
                                  {role.isSystem ? "System" : "Custom"}
                                </span>
                              </td>
                              <td className="text-right">
                                <div className="flex items-center justify-end gap-1">
                                  <button
                                    disabled={role.isSystem}
                                    onClick={() => {
                                      setEditingRole(role);
                                      setEditRoleData({
                                        name: role.name,
                                        description: role.description || "",
                                      });
                                    }}
                                    className="p-1.5 text-nuanu-gray-400 hover:text-emerald-600 transition-colors rounded-lg hover:bg-emerald-50 disabled:opacity-30 disabled:cursor-not-allowed"
                                    title={
                                      role.isSystem
                                        ? "System roles cannot be edited"
                                        : "Edit role"
                                    }
                                  >
                                    <Pencil className="w-4 h-4" />
                                  </button>
                                  <button
                                    disabled={role.isSystem}
                                    onClick={() => setDeleteConfirmRole(role)}
                                    className="p-1.5 text-nuanu-gray-400 hover:text-red-600 transition-colors rounded-lg hover:bg-red-50 disabled:opacity-30 disabled:cursor-not-allowed"
                                    title={
                                      role.isSystem
                                        ? "System roles cannot be deleted"
                                        : "Delete role"
                                    }
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                          {roles.length === 0 && (
                            <tr>
                              <td
                                colSpan={5}
                                className="text-center py-8 text-nuanu-gray-400 italic"
                              >
                                No roles found.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {activeTab === "departments" && isAdmin && (
              <motion.div
                key="departments"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="card space-y-6"
              >
                <div className="flex items-center justify-between border-b border-nuanu-gray-100 pb-4">
                  <div>
                    <h2 className="text-lg font-bold text-nuanu-navy">
                      Departments
                    </h2>
                    <p className="text-sm text-nuanu-gray-500">
                      Manage company departments
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setNewDeptData({ name: "", code: "", description: "" });
                      setIsDeptModalOpen(true);
                    }}
                    className="btn-secondary text-sm py-2"
                  >
                    <Plus className="w-4 h-4" /> New Department
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Code</th>
                        <th>Description</th>
                        <th>Status</th>
                        <th className="text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {departments.map((dept) => (
                        <tr key={dept.id}>
                          <td className="font-medium text-nuanu-navy">
                            {dept.name}
                          </td>
                          <td>
                            <code className="text-[11px] bg-nuanu-gray-50 border border-nuanu-gray-100 px-2 py-0.5 rounded text-nuanu-gray-600">
                              {dept.code}
                            </code>
                          </td>
                          <td className="text-sm text-nuanu-gray-500">
                            {dept.description || "—"}
                          </td>
                          <td>
                            <span
                              className={`badge text-[10px] ${
                                dept.isActive
                                  ? "bg-emerald-100 text-emerald-700"
                                  : "bg-red-100 text-red-700"
                              }`}
                            >
                              {dept.isActive ? "Active" : "Inactive"}
                            </span>
                          </td>
                          <td className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => {
                                  setEditingDept(dept);
                                  setEditDeptData({
                                    name: dept.name,
                                    code: dept.code,
                                    description: dept.description || "",
                                  });
                                }}
                                className="p-1.5 text-nuanu-gray-400 hover:text-emerald-600 transition-colors rounded-lg hover:bg-emerald-50"
                                title="Edit department"
                              >
                                <Pencil className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => setDeleteConfirmDept(dept)}
                                className="p-1.5 text-nuanu-gray-400 hover:text-red-600 transition-colors rounded-lg hover:bg-red-50"
                                title="Deactivate department"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {departments.length === 0 && (
                        <tr>
                          <td
                            colSpan={5}
                            className="text-center py-12 text-nuanu-gray-400 italic"
                          >
                            No departments found.
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
                      Configure Webhooks for SEEK and Google Sheets
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
                  {/* JobStreet Integrations */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* JobStreet Smart Post Card */}
                    <div className="p-5 bg-white rounded-2xl border-2 border-rose-50 shadow-sm hover:border-rose-200 transition-all">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-[#E60278] text-white flex items-center justify-center font-black text-xs italic">
                            JS
                          </div>
                          <div>
                            <h3 className="font-bold text-nuanu-navy text-sm">
                              SEEK
                            </h3>
                            <p className="text-[10px] text-nuanu-gray-400 uppercase font-black">
                              Smart Post Integration
                            </p>
                          </div>
                        </div>
                        <span className="badge bg-emerald-100 text-emerald-700 text-[10px]">
                          Active
                        </span>
                      </div>
                      <div className="space-y-3">
                        <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100">
                          <p className="text-[11px] font-bold text-emerald-700 flex items-center gap-1.5">
                            ✅ Smart Post Ready — No API Key Required
                          </p>
                          <p className="text-[10px] text-emerald-600 mt-1">
                            Use our guided Smart Post feature from any job card
                            to post directly to SEEK.
                          </p>
                        </div>

                        <div className="p-3 bg-amber-50 rounded-xl border border-amber-100">
                          <p className="text-[11px] font-bold text-amber-700 flex items-center gap-1.5">
                            🔑 Want Full API Automation?
                          </p>
                          <p className="text-[10px] text-amber-600 mt-1">
                            SEEK API partnership gives you automatic job
                            posting. Apply takes 4–8 weeks.
                          </p>
                        </div>

                        <a
                          href="https://talent.seek.com.au/partners/how-to-integrate"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-full py-2 bg-[#E60278]/10 text-[#E60278] rounded-lg text-[10px] font-bold border border-[#E60278]/20 flex items-center justify-center gap-2 hover:bg-[#E60278]/20 transition-colors"
                        >
                          Apply for SEEK Partnership →
                        </a>

                        <div className="pt-1">
                          <p className="text-[10px] font-bold text-nuanu-gray-400 uppercase mb-1">
                            Application Webhook (for when approved)
                          </p>
                          <code className="block p-2 bg-nuanu-gray-50 rounded text-[9px] text-nuanu-navy break-all border border-nuanu-gray-100">
                            https://nuanu-hr-recruitment-ats.vercel.app/api/webhooks/jobstreet
                          </code>
                        </div>
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

                {/* ── Email SMTP Configuration ───────────────────────── */}
                <div className="mt-6 p-5 rounded-2xl border-2 border-emerald-100 bg-emerald-50/40 space-y-4">
                  <div className="flex items-center gap-3 mb-1">
                    <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center">
                      <Mail className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-nuanu-navy">
                        Email Sending (SMTP)
                      </h3>
                      <p className="text-[11px] text-nuanu-gray-500">
                        Configure any SMTP provider — sends to ANY recipient, no
                        domain verification needed
                      </p>
                    </div>
                    <span
                      className={`ml-auto text-[10px] font-black px-2 py-1 rounded-full ${
                        emailConfig.host
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-gray-100 text-gray-500"
                      }`}
                    >
                      {emailConfig.host ? "CONFIGURED" : "NOT SET"}
                    </span>
                  </div>

                  {/* Quick-pick presets */}
                  <div>
                    <p className="text-[10px] font-black text-nuanu-gray-500 uppercase tracking-widest mb-2">
                      Quick Presets
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {[
                        {
                          label: "Brevo",
                          host: "smtp-relay.brevo.com",
                          port: "587",
                        },
                        { label: "Gmail", host: "smtp.gmail.com", port: "587" },
                        {
                          label: "Outlook",
                          host: "smtp-mail.outlook.com",
                          port: "587",
                        },
                        { label: "Zoho", host: "smtp.zoho.com", port: "587" },
                        {
                          label: "Yahoo",
                          host: "smtp.mail.yahoo.com",
                          port: "465",
                        },
                      ].map((p) => (
                        <button
                          key={p.label}
                          type="button"
                          onClick={() =>
                            setEmailConfig({
                              ...emailConfig,
                              host: p.host,
                              port: p.port,
                            })
                          }
                          className={`px-3 py-1.5 rounded-lg text-[11px] font-bold border transition-all ${
                            emailConfig.host === p.host
                              ? "bg-emerald-600 text-white border-emerald-600"
                              : "bg-white text-nuanu-navy border-nuanu-gray-200 hover:border-emerald-400"
                          }`}
                        >
                          {p.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-black text-nuanu-gray-500 uppercase tracking-widest mb-1">
                        SMTP Host
                      </label>
                      <input
                        type="text"
                        className="input-field py-2 text-sm"
                        placeholder="smtp-relay.brevo.com"
                        value={emailConfig.host}
                        onChange={(e) =>
                          setEmailConfig({
                            ...emailConfig,
                            host: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-nuanu-gray-500 uppercase tracking-widest mb-1">
                        Port
                      </label>
                      <input
                        type="text"
                        className="input-field py-2 text-sm"
                        placeholder="587"
                        value={emailConfig.port}
                        onChange={(e) =>
                          setEmailConfig({
                            ...emailConfig,
                            port: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-nuanu-gray-500 uppercase tracking-widest mb-1">
                        Username / Email
                      </label>
                      <input
                        type="email"
                        className="input-field py-2 text-sm"
                        placeholder="you@gmail.com"
                        value={emailConfig.user}
                        onChange={(e) =>
                          setEmailConfig({
                            ...emailConfig,
                            user: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-nuanu-gray-500 uppercase tracking-widest mb-1">
                        Password / SMTP Key
                      </label>
                      <div className="relative">
                        <input
                          type={emailPassVisible ? "text" : "password"}
                          className="input-field py-2 text-sm pr-10"
                          placeholder="App password or SMTP key"
                          value={emailConfig.pass}
                          onChange={(e) =>
                            setEmailConfig({
                              ...emailConfig,
                              pass: e.target.value,
                            })
                          }
                        />
                        <button
                          type="button"
                          onClick={() => setEmailPassVisible((v) => !v)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-nuanu-gray-400"
                        >
                          {emailPassVisible ? (
                            <EyeOff className="w-4 h-4" />
                          ) : (
                            <Eye className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-[10px] font-black text-nuanu-gray-500 uppercase tracking-widest mb-1">
                        From Display Name (optional)
                      </label>
                      <input
                        type="text"
                        className="input-field py-2 text-sm"
                        placeholder="Nuanu Recruitment <hr@nuanu.com>"
                        value={emailConfig.from}
                        onChange={(e) =>
                          setEmailConfig({
                            ...emailConfig,
                            from: e.target.value,
                          })
                        }
                      />
                    </div>
                  </div>

                  {/* Brevo Quick Guide */}
                  <div className="p-3 bg-white rounded-xl border border-emerald-100 text-[11px] text-nuanu-gray-600 space-y-1">
                    <p className="font-black text-emerald-700 uppercase tracking-wide text-[10px]">
                      ⚡ Recommended: Brevo (Free — 300 emails/day, NO domain
                      needed)
                    </p>
                    <p>
                      1. Sign up free at{" "}
                      <span className="font-bold text-nuanu-navy">
                        brevo.com
                      </span>
                    </p>
                    <p>
                      2. Go to Settings → SMTP &amp; API → Generate SMTP Key
                    </p>
                    <p>
                      3. Select <span className="font-bold">Brevo</span> preset
                      above, enter your Brevo login email as Username, paste the
                      SMTP Key as Password
                    </p>
                    <p>4. Click Save, then Send Test Email — done!</p>
                  </div>

                  <div className="flex gap-3 pt-1">
                    <button
                      onClick={async () => {
                        setIsEmailSaving(true);
                        const res = await saveEmailConfig(emailConfig);
                        setIsEmailSaving(false);
                        if (res.success)
                          toast.success("Email configuration saved!", {
                            description:
                              "Now click Send Test Email to verify it works.",
                          });
                        else
                          toast.error("Failed to save", {
                            description: res.error,
                          });
                      }}
                      disabled={
                        isEmailSaving ||
                        !emailConfig.host ||
                        !emailConfig.user ||
                        !emailConfig.pass
                      }
                      className="btn-primary py-2 px-5 text-xs"
                    >
                      {isEmailSaving ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />{" "}
                          Saving...
                        </>
                      ) : (
                        <>
                          <ServerCog className="w-3.5 h-3.5" /> Save
                          Configuration
                        </>
                      )}
                    </button>
                    <button
                      onClick={async () => {
                        if (!currentUser?.email) {
                          toast.error("Cannot determine your email address.");
                          return;
                        }
                        setIsTestingEmail(true);
                        const res = await sendTestEmail(currentUser.email);
                        setIsTestingEmail(false);
                        if (res.success) {
                          toast.success("Test email sent!", {
                            description: `Check your inbox at ${currentUser.email}`,
                          });
                        } else {
                          toast.error("Test failed", {
                            description: (res as any).error,
                          });
                        }
                      }}
                      disabled={isTestingEmail || !emailConfig.host}
                      className="btn-secondary py-2 px-5 text-xs"
                    >
                      {isTestingEmail ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />{" "}
                          Sending...
                        </>
                      ) : (
                        <>
                          <Send className="w-3.5 h-3.5" /> Send Test Email
                        </>
                      )}
                    </button>
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

      {/* ── Channel Costs Tab ─────────────────────────────────────────────── */}
      {activeTab === "channel_costs" && isAdmin && (
        <ChannelCostsTab />
      )}

      {/* ── Email Templates Tab ───────────────────────────────────────────── */}
      {activeTab === "email_templates" && isAdmin && (
        <EmailTemplatesTab />
      )}

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
                  <UserPlus className="w-5 h-5 text-emerald-400" /> Create Team
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
                  if (createPassword !== createConfirmPassword) {
                    toast.error("Passwords do not match");
                    return;
                  }
                  setIsSaving(true);
                  const res = await createUser({
                    name: inviteData.name,
                    email: inviteData.email,
                    password: createPassword,
                    roleId: inviteData.roleId,
                    departmentId: inviteData.departmentId,
                  });
                  setIsSaving(false);
                  if (res.success) {
                    setIsInviteModalOpen(false);
                    setInviteData({
                      name: "",
                      email: "",
                      roleId: "",
                      departmentId: "",
                    });
                    setCreatePassword("");
                    setCreateConfirmPassword("");
                    toast.success(`${inviteData.name} created successfully!`, {
                      description:
                        "The user can now log in with their credentials.",
                    });
                    const updatedUsers = await getUsers();
                    setUsers(updatedUsers);
                  } else {
                    toast.error("Failed to create user", {
                      description: res.error,
                    });
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

                {/* Password fields */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black text-nuanu-gray-500 uppercase tracking-widest mb-1.5">
                      Password *
                    </label>
                    <div className="relative">
                      <input
                        type={showCreatePass ? "text" : "password"}
                        required
                        placeholder="Min. 6 characters"
                        className="input-field py-2.5 pr-9"
                        value={createPassword}
                        onChange={(e) => setCreatePassword(e.target.value)}
                      />
                      <button
                        type="button"
                        onClick={() => setShowCreatePass((v) => !v)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-nuanu-gray-400"
                      >
                        {showCreatePass ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-nuanu-gray-500 uppercase tracking-widest mb-1.5">
                      Confirm Password *
                    </label>
                    <div className="relative">
                      <input
                        type={showCreateConfirmPass ? "text" : "password"}
                        required
                        placeholder="Re-enter password"
                        className={`input-field py-2.5 pr-9 ${
                          createConfirmPassword &&
                          createConfirmPassword !== createPassword
                            ? "border-red-400"
                            : createConfirmPassword &&
                                createConfirmPassword === createPassword
                              ? "border-emerald-400"
                              : ""
                        }`}
                        value={createConfirmPassword}
                        onChange={(e) =>
                          setCreateConfirmPassword(e.target.value)
                        }
                      />
                      <button
                        type="button"
                        onClick={() => setShowCreateConfirmPass((v) => !v)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-nuanu-gray-400"
                      >
                        {showCreateConfirmPass ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                    {createConfirmPassword &&
                      createConfirmPassword !== createPassword && (
                        <p className="text-[10px] text-red-500 font-bold mt-1">
                          Passwords do not match
                        </p>
                      )}
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
                    disabled={
                      isSaving ||
                      (!!createConfirmPassword &&
                        createConfirmPassword !== createPassword)
                    }
                    className="btn-primary py-2 px-6 text-xs"
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />{" "}
                        Creating...
                      </>
                    ) : (
                      <>
                        <UserPlus className="w-3.5 h-3.5" /> Create User
                      </>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ─── Delete Confirmation Modal ───────────────────────────── */}
      <ConfirmModal
        isOpen={!!deleteConfirmUser}
        onClose={() => !isDeleting && setDeleteConfirmUser(null)}
        onConfirm={async () => {
          if (!deleteConfirmUser) return;
          setIsDeleting(true);
          const res = await deleteUser(deleteConfirmUser.id);
          setIsDeleting(false);
          if (res.success) {
            setUsers((prev) =>
              prev.filter((u) => u.id !== deleteConfirmUser.id),
            );
            toast.success(`${deleteConfirmUser.name} has been removed.`);
          } else {
            toast.error("Failed to delete user", { description: res.error });
          }
          setDeleteConfirmUser(null);
        }}
        title={`Delete ${deleteConfirmUser?.name ?? "User"}?`}
        message={`${deleteConfirmUser?.name} (${deleteConfirmUser?.email}) will be permanently removed from the system.`}
        confirmText="YES, DELETE USER"
        cancelText="Keep User"
        type="danger"
        isLoading={isDeleting}
        requireDoubleConfirm={true}
      />

      {/* ─── Edit User Modal ──────────────────────────────────────── */}
      <AnimatePresence>
        {editingUser && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-nuanu-navy/40 backdrop-blur-sm"
              onClick={() => !isEditSaving && setEditingUser(null)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden relative z-10 border border-white/20"
            >
              <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-nuanu-navy text-white">
                <h2 className="text-lg font-black flex items-center gap-2">
                  <Pencil className="w-5 h-5 text-emerald-400" /> Edit Team
                  Member
                </h2>
                <button
                  onClick={() => setEditingUser(null)}
                  className="p-1 hover:bg-white/10 rounded-full transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  setIsEditSaving(true);
                  const res = await updateUser(editingUser.id, editData);
                  setIsEditSaving(false);
                  if (res.success) {
                    toast.success(`${editData.name} updated successfully!`, {
                      description: "Role and profile changes have been saved.",
                    });
                    setEditingUser(null);
                    const updatedUsers = await getUsers();
                    setUsers(updatedUsers);
                  } else {
                    toast.error("Failed to update user", {
                      description: res.error,
                    });
                  }
                }}
                className="p-6 space-y-4"
              >
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black text-nuanu-gray-500 uppercase tracking-widest mb-1.5">
                      Full Name
                    </label>
                    <input
                      type="text"
                      required
                      className="input-field py-2.5"
                      value={editData.name}
                      onChange={(e) =>
                        setEditData({ ...editData, name: e.target.value })
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
                      className="input-field py-2.5"
                      value={editData.email}
                      onChange={(e) =>
                        setEditData({ ...editData, email: e.target.value })
                      }
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black text-nuanu-gray-500 uppercase tracking-widest mb-1.5">
                      Role
                    </label>
                    <select
                      required
                      className="input-field py-2.5 text-xs font-bold"
                      value={editData.roleId}
                      onChange={(e) =>
                        setEditData({ ...editData, roleId: e.target.value })
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
                      value={editData.departmentId}
                      onChange={(e) =>
                        setEditData({
                          ...editData,
                          departmentId: e.target.value,
                        })
                      }
                    >
                      <option value="">No department</option>
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
                    onClick={() => setEditingUser(null)}
                    className="px-4 py-2 text-xs font-bold text-nuanu-gray-500"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isEditSaving}
                    className="btn-primary py-2 px-6 text-xs"
                  >
                    {isEditSaving ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />{" "}
                        Saving...
                      </>
                    ) : (
                      <>
                        <Check className="w-3.5 h-3.5" /> Save Changes
                      </>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ─── Change Password Modal ─────────────────────────────── */}
      <AnimatePresence>
        {changePwUser && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-nuanu-navy/40 backdrop-blur-sm"
              onClick={() => !isChangingPw && setChangePwUser(null)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden relative z-10"
            >
              <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-nuanu-navy text-white">
                <h2 className="text-base font-black flex items-center gap-2">
                  <Key className="w-4 h-4 text-blue-400" /> Change Password
                </h2>
                <div>
                  <p className="text-xs font-bold text-white/80">
                    {changePwUser.name}
                  </p>
                  <p className="text-[10px] text-white/50">
                    {changePwUser.email}
                  </p>
                </div>
                <button
                  onClick={() => setChangePwUser(null)}
                  className="p-1 hover:bg-white/10 rounded-full transition-all"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (newPassword !== newPasswordConfirm) {
                    toast.error("Passwords do not match");
                    return;
                  }
                  setIsChangingPw(true);
                  const res = await changeUserPassword(
                    changePwUser.id,
                    newPassword,
                  );
                  setIsChangingPw(false);
                  if (res.success) {
                    toast.success(`Password changed for ${changePwUser.name}`);
                    setChangePwUser(null);
                    setNewPassword("");
                    setNewPasswordConfirm("");
                  } else {
                    toast.error("Failed", { description: res.error });
                  }
                }}
                className="p-5 space-y-3"
              >
                <div>
                  <label className="block text-[10px] font-black text-nuanu-gray-500 uppercase tracking-widest mb-1.5">
                    New Password
                  </label>
                  <div className="relative">
                    <input
                      type={showNewPw ? "text" : "password"}
                      required
                      placeholder="Min. 6 characters"
                      className="input-field py-2.5 pr-9"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPw((v) => !v)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-nuanu-gray-400"
                    >
                      {showNewPw ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-nuanu-gray-500 uppercase tracking-widest mb-1.5">
                    Confirm Password
                  </label>
                  <div className="relative">
                    <input
                      type={showNewPwConfirm ? "text" : "password"}
                      required
                      placeholder="Re-enter password"
                      className={`input-field py-2.5 pr-9 ${
                        newPasswordConfirm && newPasswordConfirm !== newPassword
                          ? "border-red-400"
                          : newPasswordConfirm &&
                              newPasswordConfirm === newPassword
                            ? "border-emerald-400"
                            : ""
                      }`}
                      value={newPasswordConfirm}
                      onChange={(e) => setNewPasswordConfirm(e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPwConfirm((v) => !v)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-nuanu-gray-400"
                    >
                      {showNewPwConfirm ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                  {newPasswordConfirm && newPasswordConfirm !== newPassword && (
                    <p className="text-[10px] text-red-500 font-bold mt-1">
                      Passwords do not match
                    </p>
                  )}
                </div>
                <div className="pt-2 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setChangePwUser(null)}
                    className="px-4 py-2 text-xs font-bold text-nuanu-gray-500"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={
                      isChangingPw ||
                      !newPassword ||
                      newPassword !== newPasswordConfirm
                    }
                    className="btn-primary py-2 px-5 text-xs"
                  >
                    {isChangingPw ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />{" "}
                        Saving...
                      </>
                    ) : (
                      <>
                        <Check className="w-3.5 h-3.5" /> Save Password
                      </>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ─── Temp Password Modal ──────────────────────────────────── */}
      <AnimatePresence>
        {showTempPassword && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-nuanu-navy/40 backdrop-blur-sm"
              onClick={() => setShowTempPassword(null)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.85, y: 24 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.85, y: 24 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden relative z-10"
            >
              {/* Header */}
              <div className="p-6 bg-emerald-500 text-white text-center">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", delay: 0.1 }}
                  className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-3"
                >
                  <CheckCircle2 className="w-9 h-9 text-white" />
                </motion.div>
                <h2 className="text-xl font-black">User Created!</h2>
                <p className="text-emerald-100 text-sm mt-1">
                  {showTempPassword.name} &bull; {showTempPassword.email}
                </p>
              </div>

              {/* Body */}
              <div className="p-6 space-y-4">
                <div>
                  <p className="text-[10px] font-black text-nuanu-gray-500 uppercase tracking-widest mb-2">
                    Temporary Password
                  </p>
                  <div className="flex items-center gap-2 bg-nuanu-gray-50 border border-nuanu-gray-200 rounded-xl px-4 py-3">
                    <span className="flex-1 font-mono text-sm text-nuanu-navy tracking-widest select-all">
                      {tempPasswordVisible
                        ? showTempPassword.password
                        : "••••••••"}
                    </span>
                    <button
                      onClick={() => setTempPasswordVisible((v) => !v)}
                      className="p-1 text-nuanu-gray-400 hover:text-nuanu-navy transition-colors"
                    >
                      {tempPasswordVisible ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(
                          showTempPassword!.password,
                        );
                        setCopiedPassword(true);
                        setTimeout(() => setCopiedPassword(false), 2000);
                        toast.success("Password copied to clipboard!");
                      }}
                      className="p-1 text-nuanu-gray-400 hover:text-emerald-600 transition-colors"
                    >
                      {copiedPassword ? (
                        <Check className="w-4 h-4 text-emerald-500" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                  <p className="text-[10px] text-nuanu-gray-400 mt-2">
                    Share this password securely. The user can change it after
                    their first login.
                  </p>
                </div>

                <button
                  onClick={() => setShowTempPassword(null)}
                  className="w-full btn-primary py-2.5 text-sm"
                >
                  Done
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ─── Create Role Modal ────────────────────────────────────── */}
      <AnimatePresence>
        {isRoleModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-nuanu-navy/40 backdrop-blur-sm"
              onClick={() => !isCreatingRole && setIsRoleModalOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden relative z-10 border border-white/20"
            >
              <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-nuanu-navy text-white">
                <h2 className="text-lg font-black flex items-center gap-2">
                  <Shield className="w-5 h-5 text-emerald-400" /> Create New
                  Role
                </h2>
                <button
                  onClick={() => setIsRoleModalOpen(false)}
                  className="p-1 hover:bg-white/10 rounded-full transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  setIsCreatingRole(true);
                  const slug = newRoleData.name
                    .trim()
                    .toLowerCase()
                    .replace(/\s+/g, "-");
                  const res = await createRole({
                    name: newRoleData.name,
                    slug,
                    description: newRoleData.description,
                  });
                  setIsCreatingRole(false);
                  if (res.success) {
                    toast.success(`Role "${newRoleData.name}" created!`);
                    setIsRoleModalOpen(false);
                    const updatedRoles = await getRoles();
                    setRoles(updatedRoles);
                  } else {
                    toast.error("Failed to create role", {
                      description: res.error,
                    });
                  }
                }}
                className="p-6 space-y-4"
              >
                <div>
                  <label className="block text-[10px] font-black text-nuanu-gray-500 uppercase tracking-widest mb-1.5">
                    Role Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Department Head"
                    className="input-field py-2.5"
                    value={newRoleData.name}
                    onChange={(e) =>
                      setNewRoleData({ ...newRoleData, name: e.target.value })
                    }
                  />
                  {newRoleData.name && (
                    <p className="text-[10px] text-nuanu-gray-400 mt-1">
                      Slug:{" "}
                      <code className="font-mono">
                        {newRoleData.name.toLowerCase().replace(/\s+/g, "-")}
                      </code>
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-[10px] font-black text-nuanu-gray-500 uppercase tracking-widest mb-1.5">
                    Description
                  </label>
                  <input
                    type="text"
                    placeholder="Optional description"
                    className="input-field py-2.5"
                    value={newRoleData.description}
                    onChange={(e) =>
                      setNewRoleData({
                        ...newRoleData,
                        description: e.target.value,
                      })
                    }
                  />
                </div>
                <div className="pt-4 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setIsRoleModalOpen(false)}
                    className="px-4 py-2 text-xs font-bold text-nuanu-gray-500"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isCreatingRole}
                    className="btn-primary py-2 px-6 text-xs"
                  >
                    {isCreatingRole ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />{" "}
                        Creating...
                      </>
                    ) : (
                      <>
                        <Plus className="w-3.5 h-3.5" /> Create Role
                      </>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ─── Edit Role Modal ──────────────────────────────────────── */}
      <AnimatePresence>
        {editingRole && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-nuanu-navy/40 backdrop-blur-sm"
              onClick={() => !isEditRoleSaving && setEditingRole(null)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden relative z-10 border border-white/20"
            >
              <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-nuanu-navy text-white">
                <h2 className="text-lg font-black flex items-center gap-2">
                  <Pencil className="w-5 h-5 text-emerald-400" /> Edit Role
                </h2>
                <button
                  onClick={() => setEditingRole(null)}
                  className="p-1 hover:bg-white/10 rounded-full transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  setIsEditRoleSaving(true);
                  const res = await updateRole(editingRole.id, editRoleData);
                  setIsEditRoleSaving(false);
                  if (res.success) {
                    toast.success(`Role "${editRoleData.name}" updated!`);
                    setEditingRole(null);
                    const updatedRoles = await getRoles();
                    setRoles(updatedRoles);
                  } else {
                    toast.error("Failed to update role", {
                      description: res.error,
                    });
                  }
                }}
                className="p-6 space-y-4"
              >
                <div>
                  <label className="block text-[10px] font-black text-nuanu-gray-500 uppercase tracking-widest mb-1.5">
                    Role Name *
                  </label>
                  <input
                    type="text"
                    required
                    className="input-field py-2.5"
                    value={editRoleData.name}
                    onChange={(e) =>
                      setEditRoleData({ ...editRoleData, name: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-nuanu-gray-500 uppercase tracking-widest mb-1.5">
                    Description
                  </label>
                  <input
                    type="text"
                    placeholder="Optional description"
                    className="input-field py-2.5"
                    value={editRoleData.description}
                    onChange={(e) =>
                      setEditRoleData({
                        ...editRoleData,
                        description: e.target.value,
                      })
                    }
                  />
                </div>
                <div className="pt-4 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setEditingRole(null)}
                    className="px-4 py-2 text-xs font-bold text-nuanu-gray-500"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isEditRoleSaving}
                    className="btn-primary py-2 px-6 text-xs"
                  >
                    {isEditRoleSaving ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />{" "}
                        Saving...
                      </>
                    ) : (
                      <>
                        <Check className="w-3.5 h-3.5" /> Save Changes
                      </>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ─── Delete Role Confirmation ───────────────────────────────── */}
      <ConfirmModal
        isOpen={!!deleteConfirmRole}
        onClose={() => !isDeletingRole && setDeleteConfirmRole(null)}
        onConfirm={async () => {
          if (!deleteConfirmRole) return;
          setIsDeletingRole(true);
          const res = await deleteRole(deleteConfirmRole.id);
          setIsDeletingRole(false);
          if (res.success) {
            toast.success(`Role "${deleteConfirmRole.name}" deleted.`);
            setRoles((prev) =>
              prev.filter((r) => r.id !== deleteConfirmRole.id),
            );
          } else {
            toast.error("Failed to delete role", { description: res.error });
          }
          setDeleteConfirmRole(null);
        }}
        title={`Delete Role "${deleteConfirmRole?.name ?? ""}"?`}
        message={`This will permanently remove the "${deleteConfirmRole?.name}" role. Users with this role will lose it. This cannot be undone.`}
        confirmText="YES, DELETE ROLE"
        cancelText="Keep Role"
        type="danger"
        isLoading={isDeletingRole}
      />

      {/* ─── Create Department Modal ───────────────────────────────── */}
      <AnimatePresence>
        {isDeptModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-nuanu-navy/40 backdrop-blur-sm"
              onClick={() => !isCreatingDept && setIsDeptModalOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden relative z-10 border border-white/20"
            >
              <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-nuanu-navy text-white">
                <h2 className="text-lg font-black flex items-center gap-2">
                  <Building className="w-5 h-5 text-emerald-400" /> Create
                  Department
                </h2>
                <button
                  onClick={() => setIsDeptModalOpen(false)}
                  className="p-1 hover:bg-white/10 rounded-full transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  setIsCreatingDept(true);
                  const res = await createDepartment(newDeptData);
                  setIsCreatingDept(false);
                  if (res.success) {
                    toast.success(`Department "${newDeptData.name}" created!`);
                    setIsDeptModalOpen(false);
                    const updatedDepts = await getDepartments();
                    setDepartments(updatedDepts);
                  } else {
                    toast.error("Failed to create department", {
                      description: res.error,
                    });
                  }
                }}
                className="p-6 space-y-4"
              >
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black text-nuanu-gray-500 uppercase tracking-widest mb-1.5">
                      Department Name *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Engineering"
                      className="input-field py-2.5"
                      value={newDeptData.name}
                      onChange={(e) =>
                        setNewDeptData({ ...newDeptData, name: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-nuanu-gray-500 uppercase tracking-widest mb-1.5">
                      Code *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. ENG"
                      className="input-field py-2.5 uppercase"
                      value={newDeptData.code}
                      onChange={(e) =>
                        setNewDeptData({
                          ...newDeptData,
                          code: e.target.value.toUpperCase(),
                        })
                      }
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-nuanu-gray-500 uppercase tracking-widest mb-1.5">
                    Description
                  </label>
                  <input
                    type="text"
                    placeholder="Optional description"
                    className="input-field py-2.5"
                    value={newDeptData.description}
                    onChange={(e) =>
                      setNewDeptData({
                        ...newDeptData,
                        description: e.target.value,
                      })
                    }
                  />
                </div>
                <div className="pt-4 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setIsDeptModalOpen(false)}
                    className="px-4 py-2 text-xs font-bold text-nuanu-gray-500"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isCreatingDept}
                    className="btn-primary py-2 px-6 text-xs"
                  >
                    {isCreatingDept ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />{" "}
                        Creating...
                      </>
                    ) : (
                      <>
                        <Plus className="w-3.5 h-3.5" /> Create Department
                      </>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ─── Edit Department Modal ─────────────────────────────────── */}
      <AnimatePresence>
        {editingDept && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-nuanu-navy/40 backdrop-blur-sm"
              onClick={() => !isEditDeptSaving && setEditingDept(null)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden relative z-10 border border-white/20"
            >
              <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-nuanu-navy text-white">
                <h2 className="text-lg font-black flex items-center gap-2">
                  <Pencil className="w-5 h-5 text-emerald-400" /> Edit
                  Department
                </h2>
                <button
                  onClick={() => setEditingDept(null)}
                  className="p-1 hover:bg-white/10 rounded-full transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  setIsEditDeptSaving(true);
                  const res = await updateDepartment(
                    editingDept.id,
                    editDeptData,
                  );
                  setIsEditDeptSaving(false);
                  if (res.success) {
                    toast.success(`Department "${editDeptData.name}" updated!`);
                    setEditingDept(null);
                    const updatedDepts = await getDepartments();
                    setDepartments(updatedDepts);
                  } else {
                    toast.error("Failed to update department", {
                      description: res.error,
                    });
                  }
                }}
                className="p-6 space-y-4"
              >
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black text-nuanu-gray-500 uppercase tracking-widest mb-1.5">
                      Department Name *
                    </label>
                    <input
                      type="text"
                      required
                      className="input-field py-2.5"
                      value={editDeptData.name}
                      onChange={(e) =>
                        setEditDeptData({
                          ...editDeptData,
                          name: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-nuanu-gray-500 uppercase tracking-widest mb-1.5">
                      Code *
                    </label>
                    <input
                      type="text"
                      required
                      className="input-field py-2.5 uppercase"
                      value={editDeptData.code}
                      onChange={(e) =>
                        setEditDeptData({
                          ...editDeptData,
                          code: e.target.value.toUpperCase(),
                        })
                      }
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-nuanu-gray-500 uppercase tracking-widest mb-1.5">
                    Description
                  </label>
                  <input
                    type="text"
                    placeholder="Optional description"
                    className="input-field py-2.5"
                    value={editDeptData.description}
                    onChange={(e) =>
                      setEditDeptData({
                        ...editDeptData,
                        description: e.target.value,
                      })
                    }
                  />
                </div>
                <div className="pt-4 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setEditingDept(null)}
                    className="px-4 py-2 text-xs font-bold text-nuanu-gray-500"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isEditDeptSaving}
                    className="btn-primary py-2 px-6 text-xs"
                  >
                    {isEditDeptSaving ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />{" "}
                        Saving...
                      </>
                    ) : (
                      <>
                        <Check className="w-3.5 h-3.5" /> Save Changes
                      </>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ─── Delete Department Confirmation ─────────────────────────── */}
      <ConfirmModal
        isOpen={!!deleteConfirmDept}
        onClose={() => !isDeletingDept && setDeleteConfirmDept(null)}
        onConfirm={async () => {
          if (!deleteConfirmDept) return;
          setIsDeletingDept(true);
          const res = await deleteDepartment(deleteConfirmDept.id);
          setIsDeletingDept(false);
          if (res.success) {
            toast.success(
              `Department "${deleteConfirmDept.name}" deactivated.`,
            );
            setDepartments((prev) =>
              prev.filter((d) => d.id !== deleteConfirmDept.id),
            );
          } else {
            toast.error("Failed to deactivate department", {
              description: res.error,
            });
          }
          setDeleteConfirmDept(null);
        }}
        title={`Deactivate "${deleteConfirmDept?.name ?? ""}"?`}
        message={`"${deleteConfirmDept?.name}" will be marked as inactive. Existing users and vacancies in this department will not be affected.`}
        confirmText="YES, DEACTIVATE"
        cancelText="Keep Active"
        type="danger"
        isLoading={isDeletingDept}
      />
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
