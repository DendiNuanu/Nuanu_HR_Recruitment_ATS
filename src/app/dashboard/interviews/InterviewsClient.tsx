"use client";

import { useState } from "react";
import { Search, Filter, Calendar, Video, MapPin, MoreVertical, CheckCircle2, XCircle, Clock, X, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { scheduleInterview } from "./actions";

export type InterviewData = {
  id: string;
  candidateName: string;
  position: string;
  stage: string;
  scheduledAt: string | Date;
  type: string;
  location: string;
  status: string;
  interviewerName: string;
  meetingUrl?: string;
};

export type ActiveApp = {
  id: string;
  candidateName: string;
  vacancyTitle: string;
};

export default function InterviewsClient({ 
  interviews, 
  activeApplications = [] 
}: { 
  interviews: InterviewData[],
  activeApplications?: ActiveApp[]
}) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    applicationId: "",
    type: "video",
    scheduledAt: "",
    location: "Google Meet",
    meetingUrl: "https://meet.google.com/new"
  });

  const filteredInterviews = interviews.filter(i => {
    const matchSearch = i.candidateName.toLowerCase().includes(search.toLowerCase()) || 
                       i.position.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || i.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const getStatusBadge = (status: string) => {
    switch(status) {
      case 'scheduled': return <span className="badge bg-blue-100 text-blue-700">Scheduled</span>;
      case 'confirmed': return <span className="badge bg-emerald-100 text-emerald-700">Confirmed</span>;
      case 'completed': return <span className="badge bg-nuanu-gray-100 text-nuanu-gray-700">Completed</span>;
      case 'cancelled': return <span className="badge bg-red-100 text-red-700">Cancelled</span>;
      default: return <span className="badge bg-nuanu-gray-100 text-nuanu-gray-700">{status}</span>;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.applicationId || !formData.scheduledAt) return;
    
    setIsSubmitting(true);
    try {
      const res = await scheduleInterview(formData);
      if (res.success) {
        setIsModalOpen(false);
        setFormData({
          applicationId: "",
          type: "video",
          scheduledAt: "",
          location: "Google Meet",
          meetingUrl: "https://meet.google.com/new"
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
          <h1 className="text-2xl font-bold text-nuanu-navy">Interviews</h1>
          <p className="text-sm text-nuanu-gray-500 mt-1">Manage and schedule candidate interviews</p>
        </div>
        <div className="flex gap-3">
          <button onClick={() => setIsModalOpen(true)} className="btn-primary">
            <Calendar className="w-5 h-5" /> Schedule Interview
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
              placeholder="Search interviews..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input-field pl-10"
            />
          </div>
          <div className="relative min-w-[200px]">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="input-field appearance-none"
            >
              <option value="all">All Statuses</option>
              <option value="scheduled">Scheduled</option>
              <option value="confirmed">Confirmed</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
            <Filter className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-nuanu-gray-400 pointer-events-none" />
          </div>
        </div>

        {/* Interviews List */}
        <div className="space-y-4">
          {filteredInterviews.map((interview, i) => (
            <motion.div
              key={interview.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="border border-nuanu-gray-200 rounded-xl p-5 hover:shadow-md transition-shadow bg-white"
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex flex-1 items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                    {interview.candidateName.charAt(0)}
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-nuanu-navy">{interview.candidateName}</h3>
                    <p className="text-sm text-nuanu-gray-500">{interview.position} • {interview.stage.replace('_', ' ')}</p>
                  </div>
                </div>

                <div className="flex flex-col gap-2 min-w-[200px]">
                  <div className="flex items-center gap-2 text-sm text-nuanu-gray-600">
                    <Clock className="w-4 h-4 text-nuanu-gray-400" />
                    {new Date(interview.scheduledAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-nuanu-gray-600">
                    {interview.type === 'video' ? <Video className="w-4 h-4 text-nuanu-gray-400" /> : <MapPin className="w-4 h-4 text-nuanu-gray-400" />}
                    {interview.location}
                  </div>
                </div>
                
                <div className="flex items-center gap-4">
                  <div className="flex flex-col items-end gap-2">
                    {getStatusBadge(interview.status)}
                    <span className="text-xs text-nuanu-gray-500">Interviewer: {interview.interviewerName}</span>
                  </div>
                  <button className="p-2 text-nuanu-gray-400 hover:bg-nuanu-gray-50 rounded-lg">
                    <MoreVertical className="w-5 h-5" />
                  </button>
                </div>
              </div>
              
              <div className="mt-4 pt-4 border-t border-nuanu-gray-100 flex gap-3">
                <button className="btn-secondary text-sm py-1.5 px-4"><CheckCircle2 className="w-4 h-4" /> Submit Feedback</button>
                <button className="btn-secondary text-sm py-1.5 px-4"><XCircle className="w-4 h-4 text-red-500" /> Reschedule</button>
                {interview.meetingUrl && (
                  <a href={interview.meetingUrl} target="_blank" rel="noopener noreferrer" className="btn-primary text-sm py-1.5 px-4 ml-auto">
                    <Video className="w-4 h-4" /> Join Meeting
                  </a>
                )}
              </div>
            </motion.div>
          ))}
          
          {filteredInterviews.length === 0 && (
             <div className="text-center py-12">
               <Calendar className="w-12 h-12 text-nuanu-gray-300 mx-auto mb-4" />
               <h3 className="text-lg font-medium text-nuanu-navy">No interviews found</h3>
               <p className="text-nuanu-gray-500 mt-1">Try adjusting your filters or schedule a new one</p>
             </div>
          )}
        </div>
      </div>

      {/* Schedule Modal */}
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
                  <Calendar className="w-5 h-5 text-gray-400" /> Schedule Interview
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
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Date & Time *</label>
                    <input 
                      type="datetime-local" 
                      required
                      value={formData.scheduledAt}
                      onChange={e => setFormData({...formData, scheduledAt: e.target.value})}
                      className="input-field py-2.5"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Interview Type</label>
                    <select 
                      value={formData.type}
                      onChange={e => setFormData({...formData, type: e.target.value})}
                      className="input-field py-2.5"
                    >
                      <option value="video">Video Call</option>
                      <option value="phone">Phone Call</option>
                      <option value="onsite">On-Site</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Location / Platform</label>
                  <input 
                    type="text" 
                    value={formData.location}
                    onChange={e => setFormData({...formData, location: e.target.value})}
                    className="input-field py-2.5"
                    placeholder="e.g. Google Meet, Zoom, Office Room A"
                  />
                </div>

                {formData.type === 'video' && (
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Meeting URL</label>
                    <input 
                      type="url" 
                      value={formData.meetingUrl}
                      onChange={e => setFormData({...formData, meetingUrl: e.target.value})}
                      className="input-field py-2.5"
                      placeholder="https://"
                    />
                  </div>
                )}

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
                      <><Loader2 className="w-4 h-4 animate-spin" /> Scheduling...</>
                    ) : "Confirm Schedule"}
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
