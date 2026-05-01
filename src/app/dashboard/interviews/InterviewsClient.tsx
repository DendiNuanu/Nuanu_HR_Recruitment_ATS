"use client";

import { useState } from "react";
import { Search, Filter, Calendar, Video, MapPin, MoreVertical, CheckCircle2, XCircle, Clock } from "lucide-react";
import { motion } from "framer-motion";
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

export default function InterviewsClient({ interviews }: { interviews: InterviewData[] }) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

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

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-nuanu-navy">Interviews</h1>
          <p className="text-sm text-nuanu-gray-500 mt-1">Manage and schedule candidate interviews</p>
        </div>
        <div className="flex gap-3">
          <button className="btn-primary">
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
               <p className="text-nuanu-gray-500 mt-1">Try adjusting your filters</p>
             </div>
          )}
        </div>
      </div>
    </div>
  );
}
