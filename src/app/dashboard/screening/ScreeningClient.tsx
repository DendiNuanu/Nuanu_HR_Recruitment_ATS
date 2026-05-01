"use client";

import { useState } from "react";
import { FileText, Plus, CheckCircle2, Search, Filter, PlayCircle, Clock } from "lucide-react";
import { motion } from "framer-motion";

export type AssessmentData = {
  id: string;
  title: string;
  type: string;
  duration: string;
  candidates: number;
  avgScore: number;
  status: string;
};

export default function ScreeningClient({ assessments }: { assessments: AssessmentData[] }) {
  const [search, setSearch] = useState("");

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-nuanu-navy">Screening & Testing</h1>
          <p className="text-sm text-nuanu-gray-500 mt-1">Manage assessment templates and view candidate test results</p>
        </div>
        <button className="btn-primary">
          <Plus className="w-5 h-5" /> Create Assessment
        </button>
      </div>

      <div className="card">
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
            <select className="input-field appearance-none">
              <option value="all">All Types</option>
              <option value="technical">Technical</option>
              <option value="behavioral">Behavioral</option>
              <option value="case">Case Study</option>
            </select>
            <Filter className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-nuanu-gray-400 pointer-events-none" />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {assessments.filter(a => a.title.toLowerCase().includes(search.toLowerCase())).map((assessment, i) => (
            <motion.div
              key={assessment.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="border border-nuanu-gray-200 rounded-xl p-5 hover:shadow-md transition-shadow bg-white flex flex-col"
            >
              <div className="flex justify-between items-start mb-4">
                <div className={`p-2 rounded-lg ${
                  assessment.type === 'Technical' ? 'bg-blue-100 text-blue-600' :
                  assessment.type === 'Behavioral' ? 'bg-purple-100 text-purple-600' :
                  'bg-emerald-100 text-emerald-600'
                }`}>
                  <FileText className="w-6 h-6" />
                </div>
                <span className={`badge ${assessment.status === 'Active' ? 'bg-emerald-100 text-emerald-700' : 'bg-nuanu-gray-100 text-nuanu-gray-600'}`}>
                  {assessment.status}
                </span>
              </div>
              
              <h3 className="font-bold text-lg text-nuanu-navy mb-1">{assessment.title}</h3>
              <p className="text-sm text-nuanu-gray-500 mb-4">{assessment.type}</p>
              
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-nuanu-gray-50 p-3 rounded-lg">
                  <div className="flex items-center gap-2 text-nuanu-gray-500 text-xs mb-1">
                    <Clock className="w-3.5 h-3.5" /> Duration
                  </div>
                  <p className="font-semibold text-sm">{assessment.duration}</p>
                </div>
                <div className="bg-nuanu-gray-50 p-3 rounded-lg">
                  <div className="flex items-center gap-2 text-nuanu-gray-500 text-xs mb-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Avg Score
                  </div>
                  <p className="font-semibold text-sm">{assessment.avgScore > 0 ? `${assessment.avgScore}%` : 'N/A'}</p>
                </div>
              </div>
              
              <div className="mt-auto flex gap-2">
                <button className="btn-secondary flex-1 py-2 text-sm">Edit</button>
                <button className="btn-secondary flex-1 py-2 text-sm flex items-center justify-center gap-1">
                  <PlayCircle className="w-4 h-4" /> Preview
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
