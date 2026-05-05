"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Brain, Upload, FileText, CheckCircle2, AlertCircle, RefreshCw, Sparkles, X, ChevronRight, BarChart3, Target, Briefcase, ScanLine, Loader2 } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { scanResumes, shortlistCandidate, getFullAnalysis } from "./actions";

export type TopMatch = {
  id: string;
  name: string;
  score: number;
  currentTitle: string;
  currentCompany: string;
  skills: string[];
  experienceYears: number;
  vacancyTitle: string;
};

export type MissingKeywordAlert = {
  vacancyTitle: string;
  keywords: string[];
};

export default function AIScoringClient({ 
  topMatches, 
  missingKeywordAlerts = [],
  vacancies = []
}: { 
  topMatches: TopMatch[],
  missingKeywordAlerts?: MissingKeywordAlert[],
  vacancies?: string[]
}) {
  const [selectedMatch, setSelectedMatch] = useState<TopMatch | null>(null);
  const [selectedVacancy, setSelectedVacancy] = useState("All Vacancies");
  const [isScanning, setIsScanning] = useState(false);
  const [isShortlisting, setIsShortlisting] = useState<string | null>(null);
  const [selectedAnalysis, setSelectedAnalysis] = useState<any>(null);
  const [isLoadingAnalysis, setIsLoadingAnalysis] = useState(false);
  const [scanMessage, setScanMessage] = useState("");
  const [scanProgress, setScanProgress] = useState(0);

  const filteredMatches = selectedVacancy === "All Vacancies" 
    ? topMatches 
    : topMatches.filter(m => m.vacancyTitle === selectedVacancy);

  const handleScan = async () => {
    setIsScanning(true);
    setScanProgress(0);
    setScanMessage("");
    
    // Animate progress while the real AI processes
    const interval = setInterval(() => {
      setScanProgress(prev => {
        if (prev >= 90) return 90; // Hold at 90% until real result
        return prev + 2;
      });
    }, 300);

    try {
      const res = await scanResumes();
      clearInterval(interval);
      setScanProgress(100);
      if (res.success) {
        setScanMessage(res.message || "Scan complete!");
      } else {
        setScanMessage(res.error || "Failed to scan");
      }
    } catch (error) {
      clearInterval(interval);
      setScanMessage("An error occurred while scanning");
    } finally {
      setTimeout(() => {
        setIsScanning(false);
        setScanProgress(0);
        setTimeout(() => setScanMessage(""), 5000);
      }, 1000);
    }
  };

  const handleShortlist = async (id: string) => {
    setIsShortlisting(id);
    try {
      const res = await shortlistCandidate(id);
      if (res.success) {
        setScanMessage(res.message);
        setTimeout(() => setScanMessage(""), 5000);
      } else {
        alert(res.error);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsShortlisting(null);
    }
  };

  const handleViewAnalysis = async (id: string) => {
    setIsLoadingAnalysis(true);
    try {
      const res = await getFullAnalysis(id);
      if (res.success) {
        setSelectedAnalysis(res.data);
      } else {
        alert(res.error);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoadingAnalysis(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-nuanu-navy">AI Match Scoring</h1>
          <p className="text-sm text-nuanu-gray-500 mt-1">Intelligently match candidate resumes against job requirements</p>
        </div>
        <button 
          className="btn-primary bg-gradient-to-r from-purple-500 to-indigo-600 hover:shadow-lg hover:shadow-purple-500/25 border-0"
          onClick={handleScan}
          disabled={isScanning}
        >
          {isScanning ? (
            <RefreshCw className="w-5 h-5 animate-spin" />
          ) : (
            <Brain className="w-5 h-5" />
          )}
          {isScanning ? "Analyzing..." : "Scan New Resumes"}
        </button>
      </div>

      {isScanning && (
        <motion.div 
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="card bg-gradient-to-r from-indigo-50 to-purple-50 border-indigo-100 p-6"
        >
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-indigo-600 animate-pulse" />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-bold text-nuanu-navy">AI Engine Analysis in Progress</h3>
              <p className="text-xs text-nuanu-gray-500">Extracting skills, evaluating experience, and calculating match rates for new applications...</p>
            </div>
            <div className="text-right">
              <span className="text-2xl font-bold text-indigo-600">{scanProgress}%</span>
            </div>
          </div>
          <div className="h-2 w-full bg-white rounded-full overflow-hidden">
            <motion.div 
              className="h-full bg-gradient-to-r from-indigo-500 to-purple-500"
              style={{ width: `${scanProgress}%` }}
              layout
            />
          </div>
        </motion.div>
      )}

      {scanMessage && !isScanning && (
        <motion.div 
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="card bg-emerald-50 border-emerald-200 p-4"
        >
          <p className="text-sm font-medium text-emerald-700">✅ {scanMessage}</p>
        </motion.div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Top Matches */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-nuanu-navy">Top Recommendations</h2>
            <select 
              className="input-field py-1.5 px-3 text-sm w-auto cursor-pointer border-nuanu-gray-200 focus:border-indigo-500"
              value={selectedVacancy}
              onChange={(e) => setSelectedVacancy(e.target.value)}
            >
              <option value="All Vacancies">All Vacancies</option>
              {vacancies.map(v => (
                <option key={v} value={v}>{v}</option>
              ))}
            </select>
          </div>

          <div className="space-y-4">
            {filteredMatches.length > 0 && filteredMatches.map((candidate, i) => (
              <motion.div 
                key={candidate.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="card p-0 overflow-hidden"
              >
                <div className="p-5 flex flex-col md:flex-row gap-6">
                  {/* Score */}
                  <div className="flex-shrink-0 flex flex-col items-center justify-center">
                    <div className="relative w-24 h-24">
                      <svg className="w-full h-full -rotate-90">
                        <circle cx="48" cy="48" r="40" fill="none" stroke="#E2E8F0" strokeWidth="8" />
                        <circle 
                          cx="48" cy="48" r="40" 
                          fill="none" 
                          stroke={candidate.score >= 90 ? "#10B981" : "#3B82F6"} 
                          strokeWidth="8" 
                          strokeDasharray="251" 
                          strokeDashoffset={251 - (candidate.score / 100) * 251}
                          strokeLinecap="round" 
                        />
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-2xl font-bold text-nuanu-navy">{candidate.score}%</span>
                        <span className="text-[10px] text-nuanu-gray-400 font-medium uppercase tracking-wider">Match</span>
                      </div>
                    </div>
                  </div>

                  {/* Details */}
                  <div className="flex-1">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h3 className="text-lg font-bold text-nuanu-navy">{candidate.name}</h3>
                        <p className="text-sm text-nuanu-gray-500">{candidate.currentTitle} at {candidate.currentCompany}</p>
                      </div>
                      <span className={`badge uppercase ${
                        candidate.score >= 85 ? "bg-emerald-100 text-emerald-700" :
                        candidate.score >= 70 ? "bg-blue-100 text-blue-700" :
                        "bg-nuanu-gray-100 text-nuanu-gray-600"
                      }`}>
                        {candidate.score >= 85 ? "Strong Match" : 
                         candidate.score >= 70 ? "Good Match" : 
                         "Potential Match"}
                      </span>
                    </div>

                    <div className="mb-4">
                      <p className="text-xs font-semibold text-nuanu-gray-400 uppercase tracking-wider mb-2">Matched Skills</p>
                      <div className="flex flex-wrap gap-2">
                        {candidate.skills.map(skill => (
                          <span key={skill} className="px-2.5 py-1 bg-nuanu-gray-100 text-nuanu-gray-700 text-xs rounded-md border border-nuanu-gray-200 flex items-center gap-1.5">
                            <CheckCircle2 className="w-3 h-3 text-nuanu-emerald" />
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center gap-4 text-sm text-nuanu-gray-500">
                      <div className="flex items-center gap-1.5">
                        <Briefcase className="w-4 h-4 text-nuanu-gray-400" />
                        {candidate.experienceYears} Years Exp.
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Target className="w-4 h-4 text-nuanu-gray-400" />
                        {candidate.vacancyTitle}
                      </div>
                    </div>
                  </div>
                  
                  {/* Actions */}
                  <div className="flex flex-row md:flex-col justify-end gap-2 border-t md:border-t-0 md:border-l border-nuanu-gray-100 pt-4 md:pt-0 md:pl-6">
                    <button 
                      onClick={() => handleShortlist(candidate.id)}
                      disabled={isShortlisting === candidate.id}
                      className="btn-primary flex-1 text-sm py-2 min-w-[120px]"
                    >
                      {isShortlisting === candidate.id ? <Loader2 className="w-4 h-4 animate-spin" /> : "Shortlist"}
                    </button>
                    <button 
                      onClick={() => handleViewAnalysis(candidate.id)}
                      disabled={isLoadingAnalysis}
                      className="btn-secondary flex-1 text-sm py-2 min-w-[120px]"
                    >
                      {isLoadingAnalysis ? <Loader2 className="w-4 h-4 animate-spin" /> : "View Analysis"}
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
            {filteredMatches.length === 0 && (
              <div className="card p-12 flex flex-col items-center justify-center text-center bg-nuanu-gray-50 border-dashed border-2 border-nuanu-gray-200">
                <div className="w-16 h-16 rounded-full bg-nuanu-gray-100 flex items-center justify-center mb-4">
                  <ScanLine className="w-8 h-8 text-nuanu-gray-400" />
                </div>
                <h3 className="text-lg font-bold text-nuanu-navy mb-1">No matches found</h3>
                <p className="text-nuanu-gray-500 max-w-xs">No candidates have been scored yet for the "{selectedVacancy}" vacancy.</p>
                <button 
                  onClick={handleScan}
                  className="mt-6 text-sm font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1.5"
                >
                  <Brain className="w-4 h-4" />
                  Scan New Resumes
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right Column - Scoring Metrics */}
        <div className="space-y-6">
          <div className="card bg-nuanu-navy text-white">
            <h3 className="font-bold mb-4 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-emerald-400" />
              Scoring Model Weights
            </h3>
            <div className="space-y-4">
              {[
                { label: "Hard Skills & Technical", weight: 40, color: "bg-emerald-400" },
                { label: "Experience Relevance", weight: 25, color: "bg-blue-400" },
                { label: "Soft Skills & Keywords", weight: 15, color: "bg-purple-400" },
                { label: "Education & Certs", weight: 10, color: "bg-amber-400" },
                { label: "ATS Formatting/Clarity", weight: 10, color: "bg-teal-400" }
              ].map(item => (
                <div key={item.label}>
                  <div className="flex justify-between text-sm mb-1.5">
                    <span className="text-gray-300">{item.label}</span>
                    <span className="font-bold">{item.weight}%</span>
                  </div>
                  <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                    <div className={`h-full ${item.color} rounded-full`} style={{ width: `${item.weight}%` }} />
                  </div>
                </div>
              ))}
            </div>
            <button className="w-full mt-6 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg text-sm font-medium transition-colors">
              Configure Model
            </button>
          </div>

          {missingKeywordAlerts.length > 0 ? (
            <div className="space-y-4">
              {missingKeywordAlerts.map((alert, idx) => (
                <div key={idx} className="card border-amber-200 bg-amber-50">
                  <h3 className="font-bold text-amber-800 mb-2 flex items-center gap-2">
                    <AlertCircle className="w-5 h-5" />
                    Missing Keywords Alert
                  </h3>
                  <p className="text-sm text-amber-700 mb-4">
                    The following required skills are rarely found in recent applications for <span className="font-bold">"{alert.vacancyTitle}"</span>:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {alert.keywords.map(kw => (
                      <span key={kw} className="px-2 py-1 bg-amber-100 text-amber-800 text-xs rounded border border-amber-200">
                        {kw}
                      </span>
                    ))}
                  </div>
                  <button className="text-sm font-semibold text-amber-700 hover:text-amber-800 mt-4 flex items-center gap-1">
                    Adjust Job Description <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="card border-emerald-200 bg-emerald-50">
              <h3 className="font-bold text-emerald-800 mb-2 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5" />
                Keywords Healthy
              </h3>
              <p className="text-sm text-emerald-700">All required skills for active vacancies are well-represented in current applications.</p>
            </div>
          )}
        </div>
      </div>

      {/* Analysis Modal */}
      <AnimatePresence>
        {selectedAnalysis && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedAnalysis(null)}
              className="absolute inset-0 bg-nuanu-navy/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              {/* Modal Header */}
              <div className="p-6 border-b border-nuanu-gray-100 flex items-center justify-between bg-gradient-to-r from-nuanu-gray-50 to-white">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-xl">
                    {selectedAnalysis.application.candidate.name.substring(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-nuanu-navy">{selectedAnalysis.application.candidate.name}</h3>
                    <p className="text-sm text-nuanu-gray-500">{selectedAnalysis.application.vacancy.title} • AI Match Analysis</p>
                  </div>
                </div>
                <button 
                  onClick={() => setSelectedAnalysis(null)}
                  className="p-2 rounded-lg hover:bg-nuanu-gray-100 text-nuanu-gray-400 transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* Modal Content */}
              <div className="flex-1 overflow-y-auto p-8 space-y-8">
                {/* Score Breakdown */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                  {[
                    { label: "Overall", score: selectedAnalysis.overallScore, color: "text-indigo-600" },
                    { label: "Hard Skills", score: selectedAnalysis.hardSkillsScore, color: "text-emerald-600" },
                    { label: "Soft Skills", score: selectedAnalysis.softSkillsScore, color: "text-purple-600" },
                    { label: "Experience", score: selectedAnalysis.experienceScore, color: "text-blue-600" },
                    { label: "Education", score: selectedAnalysis.educationScore, color: "text-amber-600" },
                    { label: "ATS Format", score: selectedAnalysis.formatScore, color: "text-teal-600" },
                  ].map(stat => (
                    <div key={stat.label} className="text-center p-4 rounded-xl bg-nuanu-gray-50 border border-nuanu-gray-100">
                      <div className={`text-2xl font-bold ${stat.color}`}>{stat.score}%</div>
                      <div className="text-[10px] text-nuanu-gray-400 font-bold uppercase tracking-wider mt-1">{stat.label}</div>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Strengths */}
                  <div className="space-y-4">
                    <h4 className="font-bold text-nuanu-navy flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-emerald-500" /> Key Strengths
                    </h4>
                    <div className="space-y-2">
                      {selectedAnalysis.strengths.map((s: string, i: number) => (
                        <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-emerald-50 border border-emerald-100 text-sm text-emerald-800">
                          <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" />
                          {s}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Skill Gaps */}
                  <div className="space-y-4">
                    <h4 className="font-bold text-nuanu-navy flex items-center gap-2">
                      <AlertCircle className="w-5 h-5 text-amber-500" /> Skill Gaps & Missing Keywords
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedAnalysis.missingKeywords.map((kw: string) => (
                        <span key={kw} className="px-3 py-1 bg-amber-50 text-amber-700 border border-amber-100 text-xs rounded-full font-medium">
                          {kw}
                        </span>
                      ))}
                      {selectedAnalysis.skillGaps.map((gap: string) => (
                        <span key={gap} className="px-3 py-1 bg-nuanu-gray-50 text-nuanu-gray-600 border border-nuanu-gray-200 text-xs rounded-full font-medium">
                          {gap}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Recommendations */}
                <div className="p-6 rounded-xl bg-indigo-50 border border-indigo-100 space-y-4">
                  <h4 className="font-bold text-indigo-900 flex items-center gap-2">
                    <Brain className="w-5 h-5" /> AI Recommendations
                  </h4>
                  <ul className="space-y-2">
                    {selectedAnalysis.recommendations.map((r: string, i: number) => (
                      <li key={i} className="flex items-start gap-3 text-sm text-indigo-800">
                        <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 mt-1.5 flex-shrink-0" />
                        {r}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-6 border-t border-nuanu-gray-100 bg-nuanu-gray-50 flex justify-end gap-3">
                <button 
                  onClick={() => setSelectedAnalysis(null)}
                  className="btn-secondary px-6"
                >
                  Close Analysis
                </button>
                <button 
                  onClick={() => {
                    handleShortlist(selectedAnalysis.applicationId);
                    setSelectedAnalysis(null);
                  }}
                  className="btn-primary px-8 bg-indigo-600 hover:bg-indigo-700"
                >
                  Shortlist Candidate
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
