"use client";

import { useState } from "react";
import { Search, Filter, FileSpreadsheet, Brain, Users, PlayCircle, MoreVertical, X, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { createAssessment, remindAssessment, cancelAssessment, createTemplate } from "./actions";

export type AssessmentData = {
  id: string;
  title: string;
  type: string;
  duration: string;
  candidates: number;
  avgScore: number;
  status: string;
};

export type RecentAssessment = {
  id: string;
  candidateName: string;
  vacancyTitle: string;
  title: string;
  type: string;
  status: string;
  score: number | null;
  maxScore: number | null;
  createdAt: string;
};

export type ActiveApp = {
  id: string;
  candidateName: string;
  vacancyTitle: string;
};

export default function ScreeningClient({ 
  templates, 
  recentAssessments,
  activeApplications = [],
  stats
}: { 
  templates: AssessmentData[],
  recentAssessments: RecentAssessment[],
  activeApplications?: ActiveApp[],
  stats: {
    totalSent: number;
    pending: number;
    completed: number;
    avgScore: number;
  }
}) {
  const [activeTab, setActiveTab] = useState<"overview" | "templates">("overview");
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [openActionId, setOpenActionId] = useState<string | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    applicationId: "",
    type: "skill_test",
    title: "General Engineering Assessment",
    description: "A standard test of backend capabilities.",
    maxScore: 100,
  });

  const [templateData, setTemplateData] = useState({
    title: "",
    type: "skill_test",
    description: "",
    duration: 60,
    passThreshold: 70,
  });

  const filteredTemplates = templates.filter(a => {
    const matchSearch = a.title.toLowerCase().includes(search.toLowerCase());
    const matchType = typeFilter === "all" || a.type === typeFilter;
    return matchSearch && matchType;
  });

  const filteredRecent = recentAssessments.filter(a => {
    const matchSearch = a.candidateName.toLowerCase().includes(search.toLowerCase()) || 
                       a.title.toLowerCase().includes(search.toLowerCase());
    const matchType = typeFilter === "all" || a.type === typeFilter;
    return matchSearch && matchType;
  });

  const getTypeIcon = (type: string) => {
    switch(type) {
      case 'cognitive': return <Brain className="w-5 h-5 text-purple-500" />;
      case 'skill_test': return <FileSpreadsheet className="w-5 h-5 text-blue-500" />;
      default: return <FileSpreadsheet className="w-5 h-5 text-nuanu-gray-400" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch(status.toLowerCase()) {
      case 'completed': return <span className="px-2 py-1 rounded-full text-[10px] font-bold bg-green-100 text-green-700 uppercase tracking-tighter">Completed</span>;
      case 'pending': return <span className="px-2 py-1 rounded-full text-[10px] font-bold bg-yellow-100 text-yellow-700 uppercase tracking-tighter">Pending</span>;
      case 'started': return <span className="px-2 py-1 rounded-full text-[10px] font-bold bg-blue-100 text-blue-700 uppercase tracking-tighter">In Progress</span>;
      default: return <span className="px-2 py-1 rounded-full text-[10px] font-bold bg-gray-100 text-gray-700 uppercase tracking-tighter">{status}</span>;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.applicationId) return;

    setIsSubmitting(true);
    try {
      const res = await createAssessment(formData);
      if (res.success) {
        setIsModalOpen(false);
        setFormData({
          applicationId: "",
          type: "skill_test",
          title: "General Engineering Assessment",
          description: "A standard test of backend capabilities.",
          maxScore: 100,
        });
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await createTemplate(templateData);
      if (res.success) {
        setIsTemplateModalOpen(false);
        setTemplateData({
          title: "",
          type: "skill_test",
          description: "",
          duration: 60,
          passThreshold: 70,
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemind = async (id: string) => {
    const res = await remindAssessment(id);
    if (res.success) {
      setOpenActionId(null);
      alert("Professional reminder email triggered to candidate!");
    }
  };

  const handleCancel = async (id: string) => {
    if (confirm("Are you sure you want to cancel this assessment? This will revoke candidate access.")) {
      const res = await cancelAssessment(id);
      if (res.success) {
        setOpenActionId(null);
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-nuanu-navy">Screening & Testing</h1>
          <p className="text-sm text-nuanu-gray-500 mt-1">Manage assessment templates and view candidate test results</p>
        </div>
        <div className="flex gap-3">
          <button onClick={() => setIsTemplateModalOpen(true)} className="btn-secondary">
            + Create Template
          </button>
          <button onClick={() => setIsModalOpen(true)} className="btn-primary shadow-lg shadow-nuanu-emerald/20">
            + Send New Assessment
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: "Total Sent", value: stats.totalSent, icon: Users, color: "text-blue-600", bg: "bg-blue-50" },
          { label: "Pending", value: stats.pending, icon: Loader2, color: "text-yellow-600", bg: "bg-yellow-50" },
          { label: "Completed", value: stats.completed, icon: PlayCircle, color: "text-green-600", bg: "bg-green-50" },
          { label: "Avg. Score", value: `${stats.avgScore}%`, icon: Brain, color: "text-purple-600", bg: "bg-purple-50" },
        ].map((stat, i) => (
          <motion.div 
            key={i} 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="card p-4 flex items-center gap-4 border-l-4 border-l-nuanu-emerald hover:shadow-lg transition-shadow cursor-default"
          >
            <div className={`w-12 h-12 rounded-xl ${stat.bg} flex items-center justify-center`}>
              <stat.icon className={`w-6 h-6 ${stat.color}`} />
            </div>
            <div>
              <p className="text-xs text-nuanu-gray-500 font-bold uppercase tracking-wider">{stat.label}</p>
              <p className="text-xl font-black text-nuanu-navy">{stat.value}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-nuanu-gray-200">
        <button 
          onClick={() => setActiveTab("overview")}
          className={`px-8 py-4 text-sm font-bold transition-all relative ${
            activeTab === "overview" ? "text-nuanu-emerald border-b-2 border-nuanu-emerald" : "text-nuanu-gray-400 hover:text-nuanu-navy"
          }`}
        >
          Assessment Activity
        </button>
        <button 
          onClick={() => setActiveTab("templates")}
          className={`px-8 py-4 text-sm font-bold transition-all relative ${
            activeTab === "templates" ? "text-nuanu-emerald border-b-2 border-nuanu-emerald" : "text-nuanu-gray-400 hover:text-nuanu-navy"
          }`}
        >
          Test Templates Library
        </button>
      </div>

      <div className="card min-h-[500px] overflow-visible relative">
        {/* Shared Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6 border-b border-nuanu-gray-100 pb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-nuanu-gray-400" />
            <input
              type="text"
              placeholder={activeTab === "overview" ? "Search candidates or tests..." : "Search templates..."}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input-field pl-10"
            />
          </div>
          <div className="relative min-w-[200px]">
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="input-field appearance-none"
            >
              <option value="all">All Types</option>
              <option value="skill_test">Skill Test</option>
              <option value="cognitive">Cognitive</option>
              <option value="personality">Personality</option>
            </select>
            <Filter className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-nuanu-gray-400 pointer-events-none" />
          </div>
        </div>

        {activeTab === "overview" ? (
          <div className="overflow-visible">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-nuanu-gray-50/50">
                  <th className="px-6 py-4 text-xs font-black text-nuanu-navy uppercase tracking-widest">Candidate</th>
                  <th className="px-6 py-4 text-xs font-black text-nuanu-navy uppercase tracking-widest">Assessment</th>
                  <th className="px-6 py-4 text-xs font-black text-nuanu-navy uppercase tracking-widest">Status</th>
                  <th className="px-6 py-4 text-xs font-black text-nuanu-navy uppercase tracking-widest text-center">Score</th>
                  <th className="px-6 py-4 text-xs font-black text-nuanu-navy uppercase tracking-widest">Date Sent</th>
                  <th className="px-6 py-4 text-xs font-black text-nuanu-navy uppercase tracking-widest text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-nuanu-gray-100">
                {filteredRecent.map((a, i) => (
                  <motion.tr 
                    key={a.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="hover:bg-nuanu-gray-50/50 transition-colors group"
                  >
                    <td className="px-6 py-5">
                      <div>
                        <p className="font-bold text-nuanu-navy leading-tight">{a.candidateName}</p>
                        <p className="text-[11px] text-nuanu-gray-400 font-medium">{a.vacancyTitle}</p>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-nuanu-gray-50 flex items-center justify-center">
                          {getTypeIcon(a.type)}
                        </div>
                        <span className="text-sm font-semibold text-nuanu-navy">{a.title}</span>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      {getStatusBadge(a.status)}
                    </td>
                    <td className="px-6 py-5 text-center">
                      {a.score !== null ? (
                        <div className="flex flex-col items-center">
                          <span className={`text-sm font-black ${a.score >= 70 ? 'text-nuanu-emerald' : 'text-orange-500'}`}>
                            {a.score}%
                          </span>
                          <div className="w-16 h-1 bg-nuanu-gray-100 rounded-full mt-1 overflow-hidden">
                            <div 
                              className={`h-full ${a.score >= 70 ? 'bg-nuanu-emerald' : 'bg-orange-500'}`} 
                              style={{ width: `${a.score}%` }}
                            />
                          </div>
                        </div>
                      ) : (
                        <span className="text-nuanu-gray-400 font-bold">—</span>
                      )}
                    </td>
                    <td className="px-6 py-5 text-[13px] font-medium text-nuanu-gray-500">
                      {new Date(a.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </td>
                    <td className="px-6 py-5 text-right relative overflow-visible">
                      <button 
                        onClick={() => setOpenActionId(openActionId === a.id ? null : a.id)}
                        className="p-2 text-nuanu-gray-400 hover:text-nuanu-navy hover:bg-nuanu-gray-100 rounded-lg transition-all"
                      >
                        <MoreVertical className="w-5 h-5" />
                      </button>
                      
                      <AnimatePresence>
                        {openActionId === a.id && (
                          <>
                            <div className="fixed inset-0 z-[60]" onClick={() => setOpenActionId(null)} />
                            <motion.div 
                              initial={{ opacity: 0, scale: 0.95, y: -10 }}
                              animate={{ opacity: 1, scale: 1, y: 0 }}
                              exit={{ opacity: 0, scale: 0.95, y: -10 }}
                              className="absolute right-0 top-full mt-1 w-56 bg-white rounded-xl shadow-2xl border border-nuanu-gray-100 z-[70] overflow-hidden"
                              style={{ transformOrigin: 'top right' }}
                            >
                              <div className="p-2 space-y-1 text-left">
                                <button onClick={() => handleRemind(a.id)} className="w-full text-left px-3 py-2 text-sm font-semibold text-nuanu-navy hover:bg-nuanu-gray-50 rounded-lg flex items-center gap-3 transition-colors">
                                  <Users className="w-4 h-4 text-blue-500" /> Send Reminder Email
                                </button>
                                <button className="w-full text-left px-3 py-2 text-sm font-semibold text-nuanu-navy hover:bg-nuanu-gray-50 rounded-lg flex items-center gap-3 transition-colors">
                                  <PlayCircle className="w-4 h-4 text-nuanu-emerald" /> Review Results
                                </button>
                                <div className="h-px bg-nuanu-gray-100 my-1" />
                                <button onClick={() => handleCancel(a.id)} className="w-full text-left px-3 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 rounded-lg flex items-center gap-3 transition-colors">
                                  <X className="w-4 h-4" /> Revoke Candidate Access
                                </button>
                              </div>
                            </motion.div>
                          </>
                        )}
                      </AnimatePresence>
                    </td>
                  </motion.tr>
                ))}

                {filteredRecent.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-24 text-center">
                      <div className="flex flex-col items-center">
                        <div className="w-16 h-16 rounded-full bg-nuanu-gray-50 flex items-center justify-center mb-4">
                          <Users className="w-8 h-8 text-nuanu-gray-300" />
                        </div>
                        <h3 className="text-lg font-bold text-nuanu-navy">No assessment activity</h3>
                        <p className="text-nuanu-gray-500 max-w-xs mx-auto mt-1">Start by dispatching an assessment to a candidate from the recruitment pipeline.</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredTemplates.map((assessment, i) => (
              <motion.div
                key={assessment.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.05 }}
                className="border border-nuanu-gray-200 rounded-2xl p-6 hover:border-nuanu-emerald hover:shadow-xl transition-all bg-white relative group"
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="w-12 h-12 rounded-xl bg-nuanu-gray-50 flex items-center justify-center">
                    {getTypeIcon(assessment.type)}
                  </div>
                  <button className="p-2 text-nuanu-gray-400 hover:text-nuanu-navy rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">
                    <MoreVertical className="w-5 h-5" />
                  </button>
                </div>

                <h3 className="text-lg font-black text-nuanu-navy mb-1 truncate">{assessment.title}</h3>
                <div className="flex items-center gap-2 mb-6">
                  <span className="text-[10px] font-black text-nuanu-gray-400 uppercase tracking-widest">{assessment.type.replace('_', ' ')}</span>
                  <span className="w-1 h-1 rounded-full bg-nuanu-gray-300" />
                  <span className="text-[11px] font-bold text-nuanu-gray-500">{assessment.duration} mins</span>
                </div>

                <div className="flex items-center justify-between p-4 bg-nuanu-gray-50 rounded-xl mb-5">
                  <div className="text-center flex-1 border-r border-nuanu-gray-200">
                    <p className="text-[10px] font-bold text-nuanu-gray-400 uppercase mb-1 tracking-tighter">Usage</p>
                    <p className="font-black text-nuanu-navy flex items-center justify-center gap-1">
                      <Users className="w-3.5 h-3.5" /> {assessment.candidates}
                    </p>
                  </div>
                  <div className="text-center flex-1">
                    <p className="text-[10px] font-bold text-nuanu-gray-400 uppercase mb-1 tracking-tighter">Benchmark</p>
                    <p className="font-black text-nuanu-emerald">{assessment.avgScore}%</p>
                  </div>
                </div>

                <button 
                  onClick={() => {
                    setFormData({
                      ...formData,
                      title: assessment.title,
                      type: assessment.type,
                    });
                    setIsModalOpen(true);
                  }}
                  className="w-full py-3 bg-nuanu-navy text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-nuanu-navy/90 transition-colors shadow-lg shadow-nuanu-navy/10"
                >
                  <PlayCircle className="w-4 h-4" /> Send to Candidate
                </button>
              </motion.div>
            ))}
            
            {filteredTemplates.length === 0 && (
              <div className="col-span-full py-24 text-center">
                <div className="flex flex-col items-center">
                  <div className="w-16 h-16 rounded-full bg-nuanu-gray-50 flex items-center justify-center mb-4">
                    <FileSpreadsheet className="w-8 h-8 text-nuanu-gray-300" />
                  </div>
                  <h3 className="text-lg font-bold text-nuanu-navy">No templates found</h3>
                  <p className="text-nuanu-gray-500 max-w-xs mx-auto mt-1">Create your first assessment benchmark to start screening candidates professionally.</p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <AnimatePresence>
        {/* Create Template Modal */}
        {isTemplateModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-nuanu-navy/40 backdrop-blur-sm"
              onClick={() => !isSubmitting && setIsTemplateModalOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-xl overflow-hidden relative z-10 border border-white/20"
            >
              <div className="p-8 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-nuanu-navy to-nuanu-gray-900">
                <div>
                  <h2 className="text-xl font-black text-white flex items-center gap-2">
                    <Brain className="w-6 h-6 text-nuanu-emerald" /> Create Assessment Template
                  </h2>
                  <p className="text-nuanu-gray-400 text-xs mt-1 font-medium italic">Define standard benchmarks for your recruitment pipeline</p>
                </div>
                <button onClick={() => setIsTemplateModalOpen(false)} className="p-2 text-white/50 hover:text-white hover:bg-white/10 rounded-full transition-all">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleCreateTemplate} className="p-8 space-y-5">
                <div className="grid grid-cols-2 gap-5 text-left">
                  <div className="col-span-2">
                    <label className="block text-[10px] font-black text-nuanu-gray-500 uppercase tracking-widest mb-2">Template Title</label>
                    <input 
                      type="text" required placeholder="e.g. Senior Backend Engineer Challenge"
                      value={templateData.title}
                      onChange={e => setTemplateData({...templateData, title: e.target.value})}
                      className="input-field py-3 font-bold text-nuanu-navy placeholder:font-normal"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-nuanu-gray-500 uppercase tracking-widest mb-2">Test Category</label>
                    <select 
                      value={templateData.type}
                      onChange={e => setTemplateData({...templateData, type: e.target.value})}
                      className="input-field py-3 font-bold"
                    >
                      <option value="skill_test">Skill Test</option>
                      <option value="cognitive">Cognitive</option>
                      <option value="personality">Personality</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-nuanu-gray-500 uppercase tracking-widest mb-2">Duration (mins)</label>
                    <input 
                      type="number" required
                      value={templateData.duration}
                      onChange={e => setTemplateData({...templateData, duration: parseInt(e.target.value)})}
                      className="input-field py-3 font-bold"
                    />
                  </div>
                </div>

                <div className="text-left">
                  <label className="block text-[10px] font-black text-nuanu-gray-500 uppercase tracking-widest mb-2">Benchmark Description</label>
                  <textarea 
                    placeholder="Describe what this assessment measures..."
                    value={templateData.description}
                    onChange={e => setTemplateData({...templateData, description: e.target.value})}
                    className="input-field py-3 min-h-[100px] resize-none"
                  />
                </div>

                <div className="pt-4 flex justify-end gap-4">
                  <button type="button" onClick={() => setIsTemplateModalOpen(false)} className="px-6 py-3 text-sm font-bold text-nuanu-gray-500 hover:text-nuanu-navy transition-colors">Cancel</button>
                  <button type="submit" disabled={isSubmitting} className="btn-primary px-8 py-3">
                    {isSubmitting ? "Generating..." : "Save Template"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {/* Send Assessment Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-nuanu-navy/40 backdrop-blur-sm"
              onClick={() => !isSubmitting && setIsModalOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-xl overflow-hidden relative z-10 border border-white/20"
            >
              <div className="p-8 border-b border-gray-100 flex items-center justify-between bg-nuanu-gray-50 text-left">
                <div>
                  <h2 className="text-xl font-black text-nuanu-navy flex items-center gap-2">
                    <PlayCircle className="w-6 h-6 text-nuanu-emerald" /> Dispatch Assessment
                  </h2>
                  <p className="text-nuanu-gray-500 text-xs mt-1 font-medium">Link a professional benchmark to a specific candidate application</p>
                </div>
                <button onClick={() => setIsModalOpen(false)} className="p-2 text-nuanu-gray-400 hover:text-nuanu-navy hover:bg-nuanu-gray-200 rounded-full transition-all">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-8 space-y-5">
                <div className="text-left">
                  <label className="block text-[10px] font-black text-nuanu-gray-500 uppercase tracking-widest mb-2">Target Candidate Application</label>
                  <select 
                    required value={formData.applicationId}
                    onChange={e => setFormData({...formData, applicationId: e.target.value})}
                    className="input-field py-4 font-bold text-nuanu-navy"
                  >
                    <option value="" disabled>Select active candidate...</option>
                    {activeApplications.map(app => (
                      <option key={app.id} value={app.id}>{app.candidateName} — {app.vacancyTitle}</option>
                    ))}
                  </select>
                </div>
                
                <div className="grid grid-cols-2 gap-5 text-left">
                  <div>
                    <label className="block text-[10px] font-black text-nuanu-gray-500 uppercase tracking-widest mb-2">Assessment Type</label>
                    <select 
                      value={formData.type}
                      onChange={e => setFormData({...formData, type: e.target.value})}
                      className="input-field py-3 font-bold"
                    >
                      <option value="skill_test">Technical Skill Test</option>
                      <option value="cognitive">Cognitive Assessment</option>
                      <option value="personality">Personality Test</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-nuanu-gray-500 uppercase tracking-widest mb-2">Test Title</label>
                    <input 
                      type="text" required
                      value={formData.title}
                      onChange={e => setFormData({...formData, title: e.target.value})}
                      className="input-field py-3 font-bold"
                    />
                  </div>
                </div>

                <div className="text-left">
                  <label className="block text-[10px] font-black text-nuanu-gray-500 uppercase tracking-widest mb-2">Instructions to Candidate</label>
                  <textarea 
                    value={formData.description}
                    onChange={e => setFormData({...formData, description: e.target.value})}
                    className="input-field py-3 min-h-[100px] resize-none"
                  />
                </div>

                <div className="pt-4 flex justify-end gap-4">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-3 text-sm font-bold text-nuanu-gray-500 hover:text-nuanu-navy transition-colors">Discard</button>
                  <button type="submit" disabled={isSubmitting || !formData.applicationId} className="btn-primary px-8 py-3 shadow-xl shadow-nuanu-emerald/20">
                    {isSubmitting ? "Dispatching..." : "Send Assessment Now"}
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


