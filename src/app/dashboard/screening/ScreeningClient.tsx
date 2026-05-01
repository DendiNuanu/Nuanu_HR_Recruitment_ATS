"use client";

import { useState } from "react";
import { Search, Filter, FileSpreadsheet, Brain, Users, PlayCircle, MoreVertical, X, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { createAssessment } from "./actions";

export type AssessmentData = {
  id: string;
  title: string;
  type: string;
  duration: string;
  candidates: number;
  avgScore: number;
  status: string;
};

export type ActiveApp = {
  id: string;
  candidateName: string;
  vacancyTitle: string;
};

export default function ScreeningClient({ 
  assessments, 
  activeApplications = [] 
}: { 
  assessments: AssessmentData[],
  activeApplications?: ActiveApp[]
}) {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    applicationId: "",
    type: "skill_test",
    title: "General Engineering Assessment",
    description: "A standard test of backend capabilities.",
    maxScore: 100,
  });

  const filteredAssessments = assessments.filter(a => {
    const matchSearch = a.title.toLowerCase().includes(search.toLowerCase());
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-nuanu-navy">Screening & Testing</h1>
          <p className="text-sm text-nuanu-gray-500 mt-1">Manage assessment templates and view candidate test results</p>
        </div>
        <div className="flex gap-3">
          <button onClick={() => setIsModalOpen(true)} className="btn-primary">
            + Create Assessment
          </button>
        </div>
      </div>

      <div className="card">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6 border-b border-nuanu-gray-100 pb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-nuanu-gray-400" />
            <input
              type="text"
              placeholder="Search assessments..."
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

        {/* Templates Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredAssessments.map((assessment, i) => (
            <motion.div
              key={assessment.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.05 }}
              className="border border-nuanu-gray-200 rounded-xl p-5 hover:border-nuanu-emerald hover:shadow-md transition-all bg-white relative group"
            >
              <div className="flex justify-between items-start mb-4">
                <div className="w-10 h-10 rounded-lg bg-nuanu-gray-50 flex items-center justify-center">
                  {getTypeIcon(assessment.type)}
                </div>
                <button className="p-1.5 text-nuanu-gray-400 hover:text-nuanu-navy rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">
                  <MoreVertical className="w-5 h-5" />
                </button>
              </div>

              <h3 className="text-lg font-bold text-nuanu-navy mb-1 truncate">{assessment.title}</h3>
              <div className="flex items-center gap-2 mb-6">
                <span className="text-xs text-nuanu-gray-500 uppercase tracking-wider">{assessment.type.replace('_', ' ')}</span>
                <span className="w-1 h-1 rounded-full bg-nuanu-gray-300" />
                <span className="text-xs text-nuanu-gray-500">{assessment.duration}</span>
              </div>

              <div className="flex items-center justify-between p-3 bg-nuanu-gray-50 rounded-lg mb-4">
                <div className="text-center flex-1 border-r border-nuanu-gray-200">
                  <p className="text-xs text-nuanu-gray-500 mb-0.5">Candidates</p>
                  <p className="font-bold text-nuanu-navy flex items-center justify-center gap-1">
                    <Users className="w-3.5 h-3.5" /> {assessment.candidates}
                  </p>
                </div>
                <div className="text-center flex-1">
                  <p className="text-xs text-nuanu-gray-500 mb-0.5">Avg. Score</p>
                  <p className="font-bold text-nuanu-emerald">{assessment.avgScore}%</p>
                </div>
              </div>

              <button className="w-full btn-secondary py-2 flex items-center justify-center gap-2 text-sm">
                <PlayCircle className="w-4 h-4" /> Send Assessment
              </button>
            </motion.div>
          ))}
          
          {filteredAssessments.length === 0 && (
            <div className="col-span-full text-center py-12">
              <FileSpreadsheet className="w-12 h-12 text-nuanu-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-nuanu-navy">No assessments found</h3>
              <p className="text-nuanu-gray-500 mt-1">Try adjusting your filters or create a new assessment template.</p>
            </div>
          )}
        </div>
      </div>

      {/* Send Assessment Modal */}
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
              className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden relative z-10"
            >
              <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50">
                <h2 className="text-lg font-bold text-nuanu-navy flex items-center gap-2">
                  <FileSpreadsheet className="w-5 h-5 text-gray-400" /> Send Assessment
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
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Candidate Application *</label>
                  <select 
                    required
                    value={formData.applicationId}
                    onChange={e => setFormData({...formData, applicationId: e.target.value})}
                    className="input-field py-2.5"
                  >
                    <option value="" disabled>Select a candidate...</option>
                    {activeApplications.map(app => (
                      <option key={app.id} value={app.id}>
                        {app.candidateName} - {app.vacancyTitle}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Assessment Type</label>
                  <select 
                    value={formData.type}
                    onChange={e => setFormData({...formData, type: e.target.value})}
                    className="input-field py-2.5"
                  >
                    <option value="skill_test">Technical Skill Test</option>
                    <option value="cognitive">Cognitive Assessment</option>
                    <option value="personality">Personality Test</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Title</label>
                  <input 
                    type="text" 
                    required
                    value={formData.title}
                    onChange={e => setFormData({...formData, title: e.target.value})}
                    className="input-field py-2.5"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Description</label>
                  <textarea 
                    value={formData.description}
                    onChange={e => setFormData({...formData, description: e.target.value})}
                    className="input-field py-2.5 resize-y"
                    rows={3}
                  />
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
                    className="btn-primary"
                    disabled={isSubmitting || !formData.applicationId}
                  >
                    {isSubmitting ? (
                      <><Loader2 className="w-4 h-4 animate-spin" /> Sending...</>
                    ) : "Send Assessment"}
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
