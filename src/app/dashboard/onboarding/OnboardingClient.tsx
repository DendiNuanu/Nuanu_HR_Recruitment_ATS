"use client";

import { useState } from "react";
import { UserPlus, Search, Filter, CheckSquare, Clock, AlertTriangle, ChevronRight, X, Loader2, Users } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { formatDate } from "@/lib/utils";
import { startOnboarding } from "./actions";

export type OnboardingData = {
  id: string;
  candidateName: string;
  position: string;
  department: string;
  startDate: string | Date;
  progress: number;
  status: string;
  tasksCompleted: number;
  tasksTotal: number;
};

export type ActiveApp = {
  id: string;
  candidateName: string;
  vacancyTitle: string;
};

export default function OnboardingClient({ 
  onboardings, 
  stats,
  activeApplications = [],
  departments = []
}: { 
  onboardings: OnboardingData[], 
  stats: { completed: number, inProgress: number, overdue: number },
  activeApplications?: ActiveApp[],
  departments?: { id: string, name: true }[]
}) {
  const [search, setSearch] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    applicationId: "",
    departmentId: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.applicationId) return;

    setIsSubmitting(true);
    try {
      const res = await startOnboarding(formData);
      if (res.success) {
        setIsModalOpen(false);
        setFormData({
          applicationId: "",
          departmentId: "",
        });
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'Completed': return 'text-emerald-600 bg-emerald-100';
      case 'In Progress': return 'text-blue-600 bg-blue-100';
      case 'Pending': return 'text-amber-600 bg-amber-100';
      default: return 'text-nuanu-gray-600 bg-nuanu-gray-100';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-nuanu-navy">Onboarding</h1>
          <p className="text-sm text-nuanu-gray-500 mt-1">Track new hire progress and checklist completion</p>
        </div>
        <button onClick={() => setIsModalOpen(true)} className="btn-primary">
          <UserPlus className="w-5 h-5" /> Start Onboarding
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        {/* ... (keep existing stats cards code) ... */}
        <div className="card bg-white p-5 border-l-4 border-l-emerald-500">
          <div className="flex items-center gap-3 mb-2">
            <CheckSquare className="w-5 h-5 text-emerald-500" />
            <h3 className="font-semibold text-nuanu-navy text-sm">Completed</h3>
          </div>
          <p className="text-2xl font-bold text-nuanu-navy">{stats.completed}</p>
          <p className="text-xs text-nuanu-gray-400 mt-1">New hires onboarded this year</p>
        </div>
        <div className="card bg-white p-5 border-l-4 border-l-blue-500">
          <div className="flex items-center gap-3 mb-2">
            <Clock className="w-5 h-5 text-blue-500" />
            <h3 className="font-semibold text-nuanu-navy text-sm">In Progress</h3>
          </div>
          <p className="text-2xl font-bold text-nuanu-navy">{stats.inProgress}</p>
          <p className="text-xs text-nuanu-gray-400 mt-1">Currently in onboarding process</p>
        </div>
        <div className="card bg-white p-5 border-l-4 border-l-amber-500">
          <div className="flex items-center gap-3 mb-2">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            <h3 className="font-semibold text-nuanu-navy text-sm">Action Required</h3>
          </div>
          <p className="text-2xl font-bold text-nuanu-navy">{stats.overdue}</p>
          <p className="text-xs text-nuanu-gray-400 mt-1">Overdue tasks across all hires</p>
        </div>
      </div>

      <div className="card">
        {/* ... (keep existing filter and list code) ... */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6 border-b border-nuanu-gray-100 pb-6">
          <div className="relative flex-1 group">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-nuanu-gray-400 group-focus-within:text-emerald-500 transition-colors pointer-events-none z-10">
              <Search className="w-5 h-5" />
            </div>
            <input
              type="text"
              placeholder="Search new hires by name or position..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input-field !pl-14 h-12 transition-all"
            />
          </div>
          <div className="relative min-w-[200px]">
            <select className="input-field appearance-none">
              <option value="all">All Statuses</option>
              <option value="In Progress">In Progress</option>
              <option value="Pending">Pending</option>
              <option value="Completed">Completed</option>
            </select>
            <Filter className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-nuanu-gray-400 pointer-events-none" />
          </div>
        </div>

        <div className="space-y-4">
          {onboardings.filter(o => o.candidateName.toLowerCase().includes(search.toLowerCase())).map((item, i) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="border border-nuanu-gray-200 rounded-xl p-5 hover:shadow-md transition-shadow bg-white flex flex-col md:flex-row md:items-center gap-6"
            >
              <div className="flex items-center gap-4 flex-1">
                <div className="w-12 h-12 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                  {item.candidateName.charAt(0)}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-nuanu-navy">{item.candidateName}</h3>
                  <p className="text-sm text-nuanu-gray-500">{item.position} • {item.department}</p>
                </div>
              </div>

              <div className="flex-1 max-w-xs w-full">
                <div className="flex justify-between text-xs font-medium text-nuanu-gray-600 mb-2">
                  <span>Progress</span>
                  <span>{item.progress}%</span>
                </div>
                <div className="h-2 bg-nuanu-gray-100 rounded-full overflow-hidden mb-2">
                  <div 
                    className="h-full rounded-full bg-gradient-to-r from-nuanu-emerald to-nuanu-teal" 
                    style={{ width: `${item.progress}%` }} 
                  />
                </div>
                <p className="text-xs text-nuanu-gray-400 text-center">{item.tasksCompleted} of {item.tasksTotal} tasks completed</p>
              </div>

              <div className="flex flex-col md:items-end gap-2 min-w-[150px]">
                <span className={`badge ${getStatusColor(item.status)}`}>{item.status}</span>
                <span className="text-xs text-nuanu-gray-500">Starts: {formatDate(item.startDate)}</span>
              </div>
              
              <div>
                <button className="p-2 text-nuanu-gray-400 hover:text-nuanu-navy bg-nuanu-gray-50 hover:bg-nuanu-gray-100 rounded-lg transition-colors">
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Start Onboarding Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              onClick={() => !isSubmitting && setIsModalOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden relative z-10"
            >
              <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50">
                <h2 className="text-lg font-bold text-nuanu-navy flex items-center gap-2">
                  <UserPlus className="w-5 h-5 text-nuanu-emerald" /> Start Onboarding
                </h2>
                <button 
                  onClick={() => !isSubmitting && setIsModalOpen(false)}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded-full transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">New Hire / Candidate *</label>
                  <select 
                    required
                    value={formData.applicationId}
                    onChange={e => setFormData({...formData, applicationId: e.target.value})}
                    className="input-field py-2.5"
                  >
                    <option value="" disabled>Select a hire...</option>
                    {activeApplications.map(app => (
                      <option key={app.id} value={app.id}>
                        {app.candidateName} - {app.vacancyTitle}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Assigned Department</label>
                  <select 
                    value={formData.departmentId}
                    onChange={e => setFormData({...formData, departmentId: e.target.value})}
                    className="input-field py-2.5"
                  >
                    <option value="">Same as job requisition</option>
                    {(departments as any[]).map(dept => (
                      <option key={dept.id} value={dept.id}>{dept.name}</option>
                    ))}
                  </select>
                </div>

                <div className="p-4 bg-blue-50 rounded-xl flex gap-3">
                  <div className="p-2 bg-white rounded-lg h-fit">
                    <CheckSquare className="w-4 h-4 text-blue-500" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-blue-900">Automated Checklist</p>
                    <p className="text-[10px] text-blue-700 mt-0.5">5 default onboarding tasks will be automatically assigned to this hire.</p>
                  </div>
                </div>

                <div className="pt-4 flex justify-end gap-3">
                  <button 
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="btn-secondary"
                    disabled={isSubmitting}
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    className="btn-primary px-8"
                    disabled={isSubmitting || !formData.applicationId}
                  >
                    {isSubmitting ? (
                      <><Loader2 className="w-4 h-4 animate-spin" /> Starting...</>
                    ) : "Start Onboarding"}
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

