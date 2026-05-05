"use client";

import { useState } from "react";
import { Search, Filter, Calendar, Video, MapPin, MoreVertical, CheckCircle2, XCircle, Clock, X, Loader2, Star, ThumbsUp, ThumbsDown, Minus, Trash2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { scheduleInterview, submitInterviewFeedback, rescheduleInterview, cancelInterview } from "./actions";
import { getCalendarStatus } from "@/app/actions/settings";
import { useEffect } from "react";

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
  meetingLink?: string;
  calendarSynced?: boolean;
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
  
  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
  const [isRescheduleOpen, setIsRescheduleOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeInterview, setActiveInterview] = useState<InterviewData | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [isCalendarConnected, setIsCalendarConnected] = useState(false);

  useEffect(() => {
    getCalendarStatus().then(res => setIsCalendarConnected(res.connected));
  }, []);

  const [formData, setFormData] = useState({
    applicationId: "",
    type: "video",
    scheduledAt: "",
    location: "Google Meet",
    meetingUrl: "https://meet.google.com/new",
    syncWithGoogle: true
  });

  const [feedbackData, setFeedbackData] = useState({
    overallRating: 5,
    technicalScore: 5,
    communicationScore: 5,
    cultureFitScore: 5,
    leadershipScore: 5,
    strengths: "",
    weaknesses: "",
    recommendation: "neutral",
    notes: ""
  });

  const [rescheduleData, setRescheduleData] = useState({
    scheduledAt: "",
    location: "",
    meetingUrl: ""
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

  const handleFeedbackSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeInterview) return;
    
    setIsSubmitting(true);
    try {
      const res = await submitInterviewFeedback({
        interviewId: activeInterview.id,
        ...feedbackData
      });
      if (res.success) {
        setIsFeedbackOpen(false);
        setFeedbackData({
          overallRating: 5,
          technicalScore: 5,
          communicationScore: 5,
          cultureFitScore: 5,
          leadershipScore: 5,
          strengths: "",
          weaknesses: "",
          recommendation: "neutral",
          notes: ""
        });
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRescheduleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeInterview || !rescheduleData.scheduledAt) return;
    
    setIsSubmitting(true);
    try {
      const res = await rescheduleInterview({
        interviewId: activeInterview.id,
        ...rescheduleData
      });
      if (res.success) {
        setIsRescheduleOpen(false);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = async (id: string) => {
    if (!confirm("Are you sure you want to cancel this interview?")) return;
    try {
      await cancelInterview(id);
    } catch (error) {
      console.error(error);
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
              className="border border-nuanu-gray-200 rounded-xl p-5 hover:shadow-md transition-shadow bg-white relative"
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
                  <div className="relative">
                    <button 
                      onClick={() => setOpenMenuId(openMenuId === interview.id ? null : interview.id)}
                      className="p-2 text-nuanu-gray-400 hover:bg-nuanu-gray-50 rounded-lg"
                    >
                      <MoreVertical className="w-5 h-5" />
                    </button>
                    {openMenuId === interview.id && (
                      <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-nuanu-gray-100 z-20 py-1">
                        <button 
                          onClick={() => {
                            setActiveInterview(interview);
                            setRescheduleData({
                              scheduledAt: new Date(interview.scheduledAt).toISOString().slice(0, 16),
                              location: interview.location,
                              meetingUrl: interview.meetingUrl || ""
                            });
                            setIsRescheduleOpen(true);
                            setOpenMenuId(null);
                          }}
                          className="w-full text-left px-4 py-2 text-sm text-nuanu-gray-700 hover:bg-nuanu-gray-50 flex items-center gap-2"
                        >
                          <Clock className="w-4 h-4" /> Reschedule
                        </button>
                        <button 
                          onClick={() => {
                            handleCancel(interview.id);
                            setOpenMenuId(null);
                          }}
                          className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                        >
                          <Trash2 className="w-4 h-4" /> Cancel Interview
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="mt-4 pt-4 border-t border-nuanu-gray-100 flex gap-3">
                <button 
                  onClick={() => {
                    setActiveInterview(interview);
                    setIsFeedbackOpen(true);
                  }}
                  className="btn-secondary text-sm py-1.5 px-4"
                >
                  <CheckCircle2 className="w-4 h-4" /> Submit Feedback
                </button>
                <button 
                   onClick={() => {
                    setActiveInterview(interview);
                    setRescheduleData({
                      scheduledAt: new Date(interview.scheduledAt).toISOString().slice(0, 16),
                      location: interview.location,
                      meetingUrl: interview.meetingUrl || ""
                    });
                    setIsRescheduleOpen(true);
                  }}
                  className="btn-secondary text-sm py-1.5 px-4"
                >
                  <XCircle className="w-4 h-4 text-red-500" /> Reschedule
                </button>
                {interview.calendarSynced && interview.meetingLink && (
                  <a href={interview.meetingLink} target="_blank" rel="noopener noreferrer" className="btn-primary text-sm py-1.5 px-4 ml-auto bg-blue-600 hover:bg-blue-700">
                    <Video className="w-4 h-4" /> Open Google Meet
                  </a>
                )}
                {!interview.calendarSynced && interview.meetingUrl && interview.status === 'scheduled' && (
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

                {isCalendarConnected && (
                  <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <Calendar className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-blue-900">Google Calendar Sync</p>
                        <p className="text-[10px] text-blue-600">Create event and meeting link</p>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        className="sr-only peer"
                        checked={formData.syncWithGoogle}
                        onChange={e => setFormData({...formData, syncWithGoogle: e.target.checked})}
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
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

      {/* Feedback Modal */}
      <AnimatePresence>
        {isFeedbackOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              onClick={() => !isSubmitting && setIsFeedbackOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden relative z-10"
            >
              <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50">
                <h2 className="text-lg font-bold text-nuanu-navy flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-nuanu-emerald" /> Interview Feedback: {activeInterview?.candidateName}
                </h2>
                <button 
                  onClick={() => !isSubmitting && setIsFeedbackOpen(false)}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded-full transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleFeedbackSubmit} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wider">Overall Rating (1-10)</label>
                      <div className="flex items-center gap-2">
                        <input 
                          type="range" min="1" max="10" step="1"
                          value={feedbackData.overallRating}
                          onChange={e => setFeedbackData({...feedbackData, overallRating: parseInt(e.target.value)})}
                          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-nuanu-navy"
                        />
                        <span className="text-lg font-bold text-nuanu-navy min-w-[2ch]">{feedbackData.overallRating}</span>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">Recommendation</label>
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          { id: 'reject', label: 'Reject', icon: ThumbsDown, color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200' },
                          { id: 'neutral', label: 'Neutral', icon: Minus, color: 'text-gray-600', bg: 'bg-gray-50', border: 'border-gray-200' },
                          { id: 'hire', label: 'Hire', icon: ThumbsUp, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200' }
                        ].map(rec => (
                          <button
                            key={rec.id}
                            type="button"
                            onClick={() => setFeedbackData({...feedbackData, recommendation: rec.id})}
                            className={`p-3 rounded-xl border flex flex-col items-center gap-1 transition-all ${
                              feedbackData.recommendation === rec.id 
                                ? `${rec.bg} ${rec.border} ${rec.color} ring-2 ring-offset-1 ring-current` 
                                : 'border-gray-100 text-gray-400 hover:bg-gray-50'
                            }`}
                          >
                            <rec.icon className="w-5 h-5" />
                            <span className="text-[10px] font-bold uppercase tracking-tighter">{rec.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {[
                      { id: 'technicalScore', label: 'Technical Skills' },
                      { id: 'communicationScore', label: 'Communication' },
                      { id: 'cultureFitScore', label: 'Culture Fit' },
                      { id: 'leadershipScore', label: 'Leadership' }
                    ].map(field => (
                      <div key={field.id}>
                        <div className="flex justify-between items-center mb-1">
                          <label className="text-[10px] font-bold text-gray-500 uppercase">{field.label}</label>
                          <span className="text-xs font-bold text-nuanu-navy">{(feedbackData as any)[field.id]}/10</span>
                        </div>
                        <input 
                          type="range" min="1" max="10" 
                          value={(feedbackData as any)[field.id]}
                          onChange={e => setFeedbackData({...feedbackData, [field.id]: parseInt(e.target.value)})}
                          className="w-full h-1.5 bg-gray-100 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-2">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Strengths</label>
                    <textarea 
                      value={feedbackData.strengths}
                      onChange={e => setFeedbackData({...feedbackData, strengths: e.target.value})}
                      className="input-field min-h-[100px] py-2 text-sm"
                      placeholder="What did they do well?"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Areas for Improvement</label>
                    <textarea 
                      value={feedbackData.weaknesses}
                      onChange={e => setFeedbackData({...feedbackData, weaknesses: e.target.value})}
                      className="input-field min-h-[100px] py-2 text-sm"
                      placeholder="Any red flags or gaps?"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Private Notes (Admin only)</label>
                  <textarea 
                    value={feedbackData.notes}
                    onChange={e => setFeedbackData({...feedbackData, notes: e.target.value})}
                    className="input-field py-2 text-sm"
                    placeholder="Internal comments..."
                  />
                </div>

                <div className="pt-4 flex justify-end gap-3 border-t border-gray-100">
                  <button 
                    type="button"
                    onClick={() => setIsFeedbackOpen(false)}
                    className="btn-secondary px-6"
                    disabled={isSubmitting}
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    className="btn-primary px-8 bg-nuanu-emerald hover:bg-emerald-600 border-0"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</> : "Submit Final Feedback"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Reschedule Modal */}
      <AnimatePresence>
        {isRescheduleOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              onClick={() => !isSubmitting && setIsRescheduleOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden relative z-10"
            >
              <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-red-50/50">
                <h2 className="text-lg font-bold text-nuanu-navy flex items-center gap-2">
                  <Clock className="w-5 h-5 text-red-500" /> Reschedule Interview
                </h2>
                <button 
                  onClick={() => !isSubmitting && setIsRescheduleOpen(false)}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded-full transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleRescheduleSubmit} className="p-6 space-y-4">
                <div className="p-4 bg-nuanu-gray-50 rounded-xl border border-nuanu-gray-100">
                  <p className="text-xs text-nuanu-gray-500 mb-1 uppercase font-bold tracking-wider">Current Schedule</p>
                  <p className="text-sm font-bold text-nuanu-navy">
                    {activeInterview ? new Date(activeInterview.scheduledAt).toLocaleString([], { dateStyle: 'long', timeStyle: 'short' }) : ""}
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">New Date & Time *</label>
                  <input 
                    type="datetime-local" 
                    required
                    value={rescheduleData.scheduledAt}
                    onChange={e => setRescheduleData({...rescheduleData, scheduledAt: e.target.value})}
                    className="input-field py-2.5"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">New Location / Platform</label>
                  <input 
                    type="text" 
                    value={rescheduleData.location}
                    onChange={e => setRescheduleData({...rescheduleData, location: e.target.value})}
                    className="input-field py-2.5"
                    placeholder="e.g. Zoom, Meeting Room 2"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Meeting URL</label>
                  <input 
                    type="url" 
                    value={rescheduleData.meetingUrl}
                    onChange={e => setRescheduleData({...rescheduleData, meetingUrl: e.target.value})}
                    className="input-field py-2.5"
                    placeholder="https://"
                  />
                </div>

                <div className="pt-4 flex flex-col gap-2">
                  <button 
                    type="submit"
                    className="btn-primary w-full py-3"
                    disabled={isSubmitting || !rescheduleData.scheduledAt}
                  >
                    {isSubmitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Updating...</> : "Update Interview Time"}
                  </button>
                  <button 
                    type="button"
                    onClick={() => setIsRescheduleOpen(false)}
                    className="btn-secondary w-full py-3"
                    disabled={isSubmitting}
                  >
                    Keep Original Time
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
