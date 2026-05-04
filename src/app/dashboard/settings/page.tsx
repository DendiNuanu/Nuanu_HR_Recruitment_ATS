"use client";

import { useState, useEffect } from "react";
import { Save, Building, Users, Bell, Shield, Database, Webhook, Plus, UserPlus, Key, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { getIntegrationSettings, updateIntegrationSettings } from "@/app/actions/settings";

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState("general");
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "success" | "error">("idle");

  // Google Sheets State
  const [sheetsConfig, setSheetsConfig] = useState({
    serviceAccount: "",
    spreadsheetId: "1-7L1O7Qf7UB0eFSx5VCdPvEh-6xWebHtY1Q7Zo0Z0jU",
    isActive: false
  });

  useEffect(() => {
    async function loadSettings() {
      const googleSettings = await getIntegrationSettings("google_sheets");
      if (googleSettings) {
        setSheetsConfig({
          serviceAccount: JSON.stringify(googleSettings.config, null, 2),
          spreadsheetId: (googleSettings.config as any)?.spreadsheetId || "1-7L1O7Qf7UB0eFSx5VCdPvEh-6xWebHtY1Q7Zo0Z0jU",
          isActive: googleSettings.isActive
        });
      }
    }
    loadSettings();
  }, []);

  const handleSaveIntegrations = async () => {
    setIsSaving(true);
    setSaveStatus("idle");
    try {
      let configObj = {};
      try {
        configObj = JSON.parse(sheetsConfig.serviceAccount);
      } catch (e) {
        // If not valid JSON, we still store it as an object if possible or handle error
      }
      
      const res = await updateIntegrationSettings(
        "google_sheets", 
        "spreadsheet", 
        { ...configObj, spreadsheetId: sheetsConfig.spreadsheetId },
        sheetsConfig.isActive
      );
      
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

  const tabs = [
    { id: "general", label: "General Information", icon: Building },
    { id: "users", label: "Users & Roles", icon: Users },
    { id: "notifications", label: "Notifications", icon: Bell },
    { id: "security", label: "Security", icon: Shield },
    { id: "integrations", label: "Integrations", icon: Webhook },
    { id: "database", label: "Database Sync", icon: Database },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-nuanu-navy">Settings</h1>
          <p className="text-sm text-nuanu-gray-500 mt-1">Configure your Nuanu ATS instance</p>
        </div>
        <button 
          onClick={activeTab === "integrations" ? handleSaveIntegrations : undefined}
          disabled={isSaving}
          className="btn-primary"
        >
          {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
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
                activeTab === tab.id ? "bg-emerald-50 text-emerald-700 shadow-sm" : "text-nuanu-gray-600 hover:bg-nuanu-gray-50"
              }`}
            >
              <tab.icon className={`w-5 h-5 ${activeTab === tab.id ? "text-emerald-600" : "text-nuanu-gray-400"}`} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div className="lg:col-span-3 min-h-[500px]">
          <AnimatePresence mode="wait">
            {activeTab === "general" && (
              <motion.div key="general" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
                <div className="card space-y-6">
                  <div className="border-b border-nuanu-gray-100 pb-4">
                    <h2 className="text-lg font-bold text-nuanu-navy">General Information</h2>
                    <p className="text-sm text-nuanu-gray-500">Update your company profile and branding</p>
                  </div>
                  <div className="space-y-4 max-w-2xl">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-nuanu-gray-700 mb-1.5">Company Name</label>
                        <input type="text" className="input-field" defaultValue="Nuanu" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-nuanu-gray-700 mb-1.5">Industry</label>
                        <select className="input-field">
                          <option>Technology</option>
                          <option>Healthcare</option>
                          <option>Finance</option>
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-nuanu-gray-700 mb-1.5">Company Website</label>
                      <input type="url" className="input-field" defaultValue="https://nuanu.com" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-nuanu-gray-700 mb-1.5">Company Logo</label>
                      <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-nuanu-gray-300 border-dashed rounded-xl hover:bg-nuanu-gray-50 transition-colors cursor-pointer">
                        <div className="space-y-1 text-center">
                          <Building className="mx-auto h-12 w-12 text-nuanu-gray-400" />
                          <div className="flex text-sm text-nuanu-gray-600 justify-center">
                            <span className="relative cursor-pointer bg-transparent rounded-md font-medium text-emerald-600 hover:text-emerald-500">
                              <span>Upload a file</span>
                            </span>
                            <p className="pl-1">or drag and drop</p>
                          </div>
                          <p className="text-xs text-nuanu-gray-500">PNG, JPG, GIF up to 10MB</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="card space-y-6">
                  <div className="border-b border-nuanu-gray-100 pb-4">
                    <h2 className="text-lg font-bold text-nuanu-navy">ATS Preferences</h2>
                    <p className="text-sm text-nuanu-gray-500">Configure global ATS settings</p>
                  </div>
                  <div className="space-y-4 max-w-2xl">
                    <div className="flex items-center justify-between py-2">
                      <div>
                        <p className="text-sm font-medium text-nuanu-navy">Require Resume Upload</p>
                        <p className="text-xs text-nuanu-gray-500">Force all applicants to attach a resume</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" className="sr-only peer" defaultChecked />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                      </label>
                    </div>
                    <div className="flex items-center justify-between py-2">
                      <div>
                        <p className="text-sm font-medium text-nuanu-navy">Enable AI Match Scoring</p>
                        <p className="text-xs text-nuanu-gray-500">Automatically score incoming candidates</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" className="sr-only peer" defaultChecked />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                      </label>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === "users" && (
              <motion.div key="users" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="card space-y-6">
                <div className="flex items-center justify-between border-b border-nuanu-gray-100 pb-4">
                  <div>
                    <h2 className="text-lg font-bold text-nuanu-navy">Users & Roles</h2>
                    <p className="text-sm text-nuanu-gray-500">Manage team members and their permissions</p>
                  </div>
                  <button className="btn-secondary text-sm py-2"><UserPlus className="w-4 h-4" /> Invite User</button>
                </div>
                <div className="overflow-x-auto">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>User</th>
                        <th>Role</th>
                        <th>Department</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="font-medium text-nuanu-navy">Super Admin</td>
                        <td><span className="badge bg-purple-100 text-purple-700">Owner</span></td>
                        <td>Human Resources</td>
                        <td><span className="badge bg-emerald-100 text-emerald-700">Active</span></td>
                      </tr>
                      <tr>
                        <td className="font-medium text-nuanu-navy">Recruiter One</td>
                        <td><span className="badge bg-blue-100 text-blue-700">Recruiter</span></td>
                        <td>Human Resources</td>
                        <td><span className="badge bg-emerald-100 text-emerald-700">Active</span></td>
                      </tr>
                      <tr>
                        <td className="font-medium text-nuanu-navy">Hiring Manager</td>
                        <td><span className="badge bg-nuanu-gray-100 text-nuanu-gray-700">Manager</span></td>
                        <td>Engineering</td>
                        <td><span className="badge bg-amber-100 text-amber-700">Pending</span></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </motion.div>
            )}

            {activeTab === "notifications" && (
              <motion.div key="notifications" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="card space-y-6">
                <div className="border-b border-nuanu-gray-100 pb-4">
                  <h2 className="text-lg font-bold text-nuanu-navy">Notifications</h2>
                  <p className="text-sm text-nuanu-gray-500">Choose what events you want to be notified about</p>
                </div>
                <div className="space-y-4 max-w-2xl">
                  {['New Candidate Applied', 'Interview Scheduled', 'Offer Accepted', 'Daily Pipeline Summary', 'AI Scoring Completed'].map((item, i) => (
                    <div key={item} className="flex items-center justify-between py-2 border-b border-nuanu-gray-50 last:border-0">
                      <span className="text-sm font-medium text-nuanu-navy">{item}</span>
                      <div className="flex gap-4">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input type="checkbox" defaultChecked className="rounded border-nuanu-gray-300 text-emerald-500 focus:ring-emerald-500" />
                          <span className="text-xs text-nuanu-gray-600">Email</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input type="checkbox" defaultChecked={i < 3} className="rounded border-nuanu-gray-300 text-emerald-500 focus:ring-emerald-500" />
                          <span className="text-xs text-nuanu-gray-600">In-App</span>
                        </label>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {activeTab === "security" && (
              <motion.div key="security" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="card space-y-6">
                <div className="border-b border-nuanu-gray-100 pb-4">
                  <h2 className="text-lg font-bold text-nuanu-navy">Security Settings</h2>
                  <p className="text-sm text-nuanu-gray-500">Manage your account security and authentication methods</p>
                </div>
                <div className="space-y-6 max-w-2xl">
                  <div>
                    <h3 className="text-sm font-semibold text-nuanu-navy mb-3">Two-Factor Authentication (2FA)</h3>
                    <div className="p-4 bg-nuanu-gray-50 rounded-xl border border-nuanu-gray-200 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-nuanu-navy">Authenticator App</p>
                        <p className="text-xs text-nuanu-gray-500">Protect your account with an authenticator app</p>
                      </div>
                      <button className="btn-secondary py-1.5 text-xs"><Plus className="w-3.5 h-3.5" /> Enable</button>
                    </div>
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-nuanu-navy mb-3">Password Management</h3>
                    <button className="btn-secondary py-2 text-sm"><Key className="w-4 h-4" /> Change Password</button>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === "integrations" && (
              <motion.div key="integrations" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="card space-y-6">
                <div className="border-b border-nuanu-gray-100 pb-4 flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-bold text-nuanu-navy flex items-center gap-2">
                      <Webhook className="w-5 h-5 text-emerald-600" /> External API Integrations
                    </h2>
                    <p className="text-sm text-nuanu-gray-500">Configure Webhooks for LinkedIn, JobStreet, and Google Sheets</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-nuanu-gray-400">Enabled</span>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        className="sr-only peer" 
                        checked={sheetsConfig.isActive}
                        onChange={e => setSheetsConfig({...sheetsConfig, isActive: e.target.checked})}
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                    </label>
                  </div>
                </div>
                <div className="space-y-6 max-w-2xl">
                  {/* LinkedIn & JobStreet (Keep static for now) */}
                  <div className="opacity-50 pointer-events-none grayscale">
                    <div className="p-4 bg-nuanu-gray-50 rounded-xl border border-nuanu-gray-200 mb-4">
                      <h3 className="font-semibold text-nuanu-navy mb-1 text-sm">LinkedIn Talent Solutions API</h3>
                      <p className="text-[10px] text-nuanu-gray-400 mb-3">Enterprise license required</p>
                    </div>
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
                        <label className="block text-xs font-bold text-nuanu-gray-500 uppercase tracking-widest mb-1.5">Service Account JSON (Google Cloud)</label>
                        <textarea 
                          rows={5} 
                          value={sheetsConfig.serviceAccount}
                          onChange={e => setSheetsConfig({...sheetsConfig, serviceAccount: e.target.value})}
                          placeholder='{"type": "service_account", "project_id": "...", "private_key": "..."}' 
                          className="input-field text-xs font-mono bg-nuanu-gray-50 focus:bg-white"
                        ></textarea>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-nuanu-gray-500 uppercase tracking-widest mb-1.5">Target Spreadsheet ID</label>
                        <input 
                          type="text" 
                          value={sheetsConfig.spreadsheetId}
                          onChange={e => setSheetsConfig({...sheetsConfig, spreadsheetId: e.target.value})}
                          placeholder="1-7L1O7Qf7UB0eFSx5VCdPvEh-6xWebHtY..." 
                          className="input-field text-sm bg-nuanu-gray-50 focus:bg-white" 
                        />
                      </div>
                      <div className="flex items-center gap-2 text-amber-600 bg-amber-50 p-3 rounded-xl border border-amber-100">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        <p className="text-[11px] font-medium leading-relaxed">
                          Important: Grant <span className="font-bold underline italic">Editor</span> access to your Service Account email in the Google Sheet sharing settings.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === "database" && (
              <motion.div key="database" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="card space-y-6">
                <div className="border-b border-nuanu-gray-100 pb-4">
                  <h2 className="text-lg font-bold text-nuanu-navy">Database Synchronization</h2>
                  <p className="text-sm text-nuanu-gray-500">Manage data backups and forced syncs</p>
                </div>
                <div className="space-y-6 max-w-2xl">
                  <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl">
                    <h3 className="text-sm font-semibold text-blue-800 mb-1">PostgreSQL Connection Status</h3>
                    <p className="text-xs text-blue-600 mb-3">Database is actively connected and synced via Prisma.</p>
                    <button className="btn-primary bg-blue-600 hover:bg-blue-700 py-2 text-xs">Test Connection</button>
                  </div>
                  
                  <div>
                    <h3 className="text-sm font-semibold text-nuanu-navy mb-2">Manual Data Sync</h3>
                    <p className="text-xs text-nuanu-gray-500 mb-3">Force a synchronization with Google Sheets instead of waiting for the cron job.</p>
                    <button className="btn-secondary py-2 text-sm"><Database className="w-4 h-4" /> Trigger Immediate Sync</button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
