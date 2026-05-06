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
    
    const interval = setInterval(() => {
      setScanProgress(prev => {
        if (prev >= 90) return 90;
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
    <div className="w-full py-4 space-y-10">
      
      {/* HEADER SECTION - FULL WIDTH & DYNAMIC */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-8 bg-white p-10 rounded-[2.5rem] border border-nuanu-gray-100 shadow-xl shadow-nuanu-gray-200/20 mb-4">
        <div className="flex-1 space-y-4">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-50 text-indigo-600 rounded-full text-[10px] font-black uppercase tracking-[0.2em] shadow-sm"
          >
            <Sparkles className="w-3 h-3" /> Intelligence Engine Active
          </motion.div>
          <h1 className="text-5xl font-black text-nuanu-navy tracking-tight leading-none">
            AI Match Scoring
          </h1>
          <p className="text-sm text-nuanu-gray-500 font-bold max-w-2xl">
            Automatically evaluating candidate resumes against job requirements using advanced neural scoring models.
          </p>
        </div>

        <div className="flex-shrink-0">
          <button 
            className="btn-primary bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 shadow-2xl shadow-emerald-500/20 border-0 py-5 px-12 rounded-[2rem] transition-all hover:-translate-y-1 active:scale-95 flex items-center gap-4 group"
            onClick={handleScan}
            disabled={isScanning}
          >
            {isScanning ? (
              <RefreshCw className="w-6 h-6 animate-spin" />
            ) : (
              <Brain className="w-7 h-7 group-hover:scale-110 transition-transform" />
            )}
            <span className="text-lg font-black tracking-tight text-white uppercase">
              {isScanning ? "Neural Analyzing..." : "Scan New Resumes"}
            </span>
          </button>
        </div>
      </div>

      <AnimatePresence>
        {isScanning && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="w-full card bg-nuanu-navy text-white p-10 overflow-hidden relative border-0 shadow-2xl rounded-[3rem]"
          >
            <div className="absolute top-0 right-0 p-10 opacity-5">
              <Brain className="w-64 h-64" />
            </div>
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h3 className="text-2xl font-black mb-2 tracking-tight uppercase">Neural Engine Syncing</h3>
                  <p className="text-indigo-200 text-sm font-medium">Processing large-scale candidate datasets...</p>
                </div>
                <div className="text-right">
                  <span className="text-6xl font-black text-emerald-400">{scanProgress}%</span>
                </div>
              </div>
              <div className="h-4 w-full bg-white/10 rounded-full overflow-hidden backdrop-blur-md">
                <motion.div 
                  className="h-full bg-gradient-to-r from-emerald-400 to-indigo-400"
                  style={{ width: `${scanProgress}%` }}
                  layout
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {scanMessage && !isScanning && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full p-6 bg-emerald-500 text-white rounded-3xl shadow-2xl flex items-center justify-center gap-4 font-black text-lg"
        >
          <CheckCircle2 className="w-8 h-8" /> {scanMessage}
        </motion.div>
      )}

      {/* RECOMMENDATIONS SECTION - FULL WIDTH */}
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6 bg-white p-8 rounded-[2rem] border border-nuanu-gray-100 shadow-xl shadow-nuanu-gray-200/20">
          <div className="flex items-center gap-5">
            <div className="w-14 h-14 rounded-2xl bg-indigo-50 flex items-center justify-center">
              <Target className="w-7 h-7 text-indigo-600" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-nuanu-navy tracking-tight">Recommendations</h2>
              <p className="text-[10px] font-black text-nuanu-gray-400 uppercase tracking-[0.2em] mt-1">Top Matched Talent</p>
            </div>
          </div>
          
          <div className="w-full sm:w-auto">
            <div className="relative">
              <select 
                className="input-field py-4 px-8 text-sm font-black w-full sm:min-w-[280px] rounded-2xl border-nuanu-gray-100 focus:border-indigo-500 shadow-md appearance-none cursor-pointer pr-14 bg-nuanu-gray-50/50"
                value={selectedVacancy}
                onChange={(e) => setSelectedVacancy(e.target.value)}
              >
                <option value="All Vacancies">All Vacancies</option>
                {vacancies.map(v => (
                  <option key={v} value={v}>{v}</option>
                ))}
              </select>
              <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-nuanu-gray-400">
                <ChevronRight className="w-5 h-5 rotate-90" />
              </div>
            </div>
          </div>
        </div>

        {/* CANDIDATE CARDS - EXPANDED TO FULL WIDTH */}
        <div className="space-y-6">
          {filteredMatches.length > 0 && filteredMatches.map((candidate, i) => (
            <motion.div 
              key={candidate.id}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="w-full card p-0 overflow-hidden hover:shadow-2xl hover:shadow-indigo-500/10 transition-all duration-500 group border-nuanu-gray-100 rounded-[2.5rem] bg-white"
            >
              <div className="p-8 flex flex-col lg:flex-row gap-10 items-center">
                
                {/* Score Gauge */}
                <div className="flex-shrink-0">
                  <div className="relative w-36 h-36 group-hover:scale-105 transition-transform duration-500">
                    <svg className="w-full h-full -rotate-90">
                      <circle cx="72" cy="72" r="64" fill="none" stroke="#F1F5F9" strokeWidth="12" />
                      <circle 
                        cx="72" cy="72" r="64" 
                        fill="none" 
                        stroke={candidate.score >= 90 ? "#10B981" : "#6366F1"} 
                        strokeWidth="12" 
                        strokeDasharray="402" 
                        strokeDashoffset={402 - (candidate.score / 100) * 402}
                        strokeLinecap="round"
                        className="transition-all duration-1000 ease-out"
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-3xl font-black text-nuanu-navy leading-none tracking-tighter">{candidate.score}%</span>
                      <span className="text-[10px] text-nuanu-gray-400 font-black uppercase tracking-widest mt-1.5">Match</span>
                    </div>
                  </div>
                </div>

                {/* Candidate Info - Stretched */}
                <div className="flex-1 text-center lg:text-left space-y-6 w-full">
                  <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
                    <div>
                      <h3 className="text-3xl font-black text-nuanu-navy tracking-tight leading-none group-hover:text-indigo-600 transition-colors">
                        {candidate.name}
                      </h3>
                      <p className="text-base font-bold text-nuanu-gray-500 mt-2">
                        {candidate.currentTitle} <span className="text-nuanu-gray-200 mx-1">at</span> {candidate.currentCompany}
                      </p>
                    </div>
                    <div className="flex justify-center xl:justify-end">
                      <span className={`px-6 py-2 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-lg ${
                        candidate.score >= 85 ? "bg-emerald-100 text-emerald-700" :
                        candidate.score >= 70 ? "bg-indigo-100 text-indigo-700" :
                        "bg-nuanu-gray-100 text-nuanu-gray-600"
                      }`}>
                        {candidate.score >= 85 ? "Top Talent" : 
                         candidate.score >= 70 ? "Qualified" : 
                         "Screening"}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <p className="text-[9px] font-black text-nuanu-gray-300 uppercase tracking-[0.3em]">Neural Skillset Analysis</p>
                    <div className="flex flex-wrap justify-center lg:justify-start gap-3">
                      {candidate.skills.map(skill => (
                        <span key={skill} className="px-4 py-2 bg-nuanu-gray-50 text-nuanu-navy text-xs font-black rounded-xl border border-nuanu-gray-100 flex items-center gap-2.5 transition-all hover:bg-white hover:shadow-md">
                          <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-lg shadow-emerald-500/50" />
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-wrap justify-center lg:justify-start items-center gap-10 text-xs font-bold text-nuanu-gray-400 pt-6 border-t border-nuanu-gray-50">
                    <div className="flex items-center gap-3">
                      <Briefcase className="w-5 h-5 text-nuanu-gray-400" />
                      <span>{candidate.experienceYears} Years Experience</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Target className="w-5 h-5 text-indigo-400" />
                      <span className="text-indigo-600 font-black">{candidate.vacancyTitle}</span>
                    </div>
                  </div>
                </div>
                
                {/* Actions - Aligned Right */}
                <div className="flex flex-row lg:flex-col justify-center gap-4 min-w-full lg:min-w-[200px] lg:pl-10 lg:border-l border-nuanu-gray-100">
                  <button 
                    onClick={() => handleShortlist(candidate.id)}
                    disabled={isShortlisting === candidate.id}
                    className="btn-primary w-full text-[11px] font-black uppercase tracking-[0.2em] py-5 rounded-[1.5rem] shadow-2xl shadow-emerald-500/10 active:scale-95 transition-all"
                  >
                    {isShortlisting === candidate.id ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : "Shortlist"}
                  </button>
                  <button 
                    onClick={() => handleViewAnalysis(candidate.id)}
                    disabled={isLoadingAnalysis}
                    className="btn-secondary w-full text-[11px] font-black uppercase tracking-[0.2em] py-5 rounded-[1.5rem] bg-nuanu-gray-50 border-nuanu-gray-100 hover:bg-white active:scale-95 transition-all"
                  >
                    {isLoadingAnalysis ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : "Full Analysis"}
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
          
          {filteredMatches.length === 0 && (
            <div className="w-full card p-24 flex flex-col items-center justify-center text-center bg-nuanu-gray-50/20 border-dashed border-2 border-nuanu-gray-200 rounded-[3rem] shadow-inner">
              <div className="w-24 h-24 rounded-[2rem] bg-white shadow-2xl flex items-center justify-center mb-10 border border-nuanu-gray-50">
                <ScanLine className="w-12 h-12 text-nuanu-gray-300" />
              </div>
              <h3 className="text-3xl font-black text-nuanu-navy mb-4 tracking-tight">No Matches Found</h3>
              <p className="text-base text-nuanu-gray-500 max-w-md font-medium leading-relaxed">
                The intelligence engine hasn't mapped any candidates to this role yet. Deploy the neural scanner to begin.
              </p>
              <button 
                onClick={handleScan}
                className="mt-10 px-12 py-5 bg-nuanu-navy text-white rounded-2xl font-black text-xs uppercase tracking-[0.3em] hover:shadow-2xl transition-all"
              >
                <Brain className="w-6 h-6" /> Deploy Talent Scan
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Analysis Modal Section - Stays Wide for visibility */}
      <AnimatePresence>
        {selectedAnalysis && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setSelectedAnalysis(null)}
              className="absolute inset-0 bg-nuanu-navy/80 backdrop-blur-xl"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 30 }}
              className="relative w-full max-w-5xl bg-white rounded-[3rem] shadow-3xl overflow-hidden flex flex-col max-h-[92vh]"
            >
              <div className="p-10 border-b border-nuanu-gray-100 flex items-center justify-between bg-white">
                <div className="flex items-center gap-6">
                  <div className="w-16 h-16 rounded-2xl bg-indigo-600 flex items-center justify-center text-white font-black text-3xl shadow-xl">
                    {selectedAnalysis.application.candidate.name.substring(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="text-3xl font-black text-nuanu-navy tracking-tight">{selectedAnalysis.application.candidate.name}</h3>
                    <p className="text-sm font-bold text-nuanu-gray-400 uppercase tracking-widest mt-1">
                      {selectedAnalysis.application.vacancy.title} <span className="mx-3 text-nuanu-gray-200">|</span> AI Neural Score
                    </p>
                  </div>
                </div>
                <button onClick={() => setSelectedAnalysis(null)} className="p-4 rounded-2xl hover:bg-nuanu-gray-100 transition-all">
                  <X className="w-8 h-8 text-nuanu-navy" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-12 space-y-16">
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
                  {[
                    { label: "Overall Score", score: selectedAnalysis.overallScore, color: "text-indigo-600", bg: "bg-indigo-50/50" },
                    { label: "Hard Skills", score: selectedAnalysis.hardSkillsScore, color: "text-emerald-600", bg: "bg-emerald-50/50" },
                    { label: "Soft Skills", score: selectedAnalysis.softSkillsScore, color: "text-purple-600", bg: "bg-purple-50/50" },
                    { label: "Experience", score: selectedAnalysis.experienceScore, color: "text-blue-600", bg: "bg-blue-50/50" },
                    { label: "Education", score: selectedAnalysis.educationScore, color: "text-amber-600", bg: "bg-amber-50/50" },
                    { label: "ATS Formatting", score: selectedAnalysis.formatScore, color: "text-teal-600", bg: "bg-teal-50/50" },
                  ].map(stat => (
                    <div key={stat.label} className={`text-center p-6 rounded-[2.5rem] ${stat.bg} border border-white shadow-xl transition-all hover:scale-105`}>
                      <div className={`text-4xl font-black ${stat.color}`}>{stat.score}%</div>
                      <div className="text-[10px] text-nuanu-gray-400 font-black uppercase tracking-widest mt-3 leading-tight">{stat.label}</div>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                  <div className="space-y-8">
                    <h4 className="text-2xl font-black text-nuanu-navy flex items-center gap-4">
                      <Sparkles className="w-6 h-6 text-emerald-500" /> Neural Strengths
                    </h4>
                    <div className="space-y-4">
                      {selectedAnalysis.strengths.map((s: string, i: number) => (
                        <div key={i} className="flex items-start gap-5 p-6 rounded-3xl bg-emerald-50/30 border border-emerald-100/50 text-base font-bold text-emerald-900 shadow-sm transition-all hover:bg-white hover:shadow-xl">
                          <CheckCircle2 className="w-6 h-6 mt-0.5 text-emerald-500 flex-shrink-0" />
                          {s}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-8">
                    <h4 className="text-2xl font-black text-nuanu-navy flex items-center gap-4">
                      <AlertCircle className="w-6 h-6 text-amber-500" /> Neural Gaps
                    </h4>
                    <div className="flex flex-wrap gap-4">
                      {selectedAnalysis.missingKeywords.map((kw: string) => (
                        <span key={kw} className="px-6 py-3 bg-amber-50 text-amber-800 border border-amber-100 text-xs rounded-2xl font-black uppercase tracking-tight shadow-md hover:scale-105 transition-transform">
                          {kw}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="p-10 rounded-[3rem] bg-nuanu-navy text-white space-y-8 shadow-3xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-12 opacity-10">
                    <Brain className="w-48 h-48 text-white" />
                  </div>
                  <h4 className="text-3xl font-black flex items-center gap-6 tracking-tight relative z-10">
                    <Brain className="w-8 h-8 text-emerald-400" /> Neural Recommendation
                  </h4>
                  <ul className="space-y-5 relative z-10">
                    {selectedAnalysis.recommendations.map((r: string, i: number) => (
                      <li key={i} className="flex items-start gap-6 text-lg font-medium text-indigo-100 leading-relaxed">
                        <div className="w-3 h-3 rounded-full bg-emerald-400 mt-2.5 flex-shrink-0 shadow-lg shadow-emerald-400/50" />
                        {r}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="p-10 border-t border-nuanu-gray-100 bg-white/80 backdrop-blur-md flex justify-end gap-6">
                <button onClick={() => setSelectedAnalysis(null)} className="px-10 py-5 text-sm font-black uppercase tracking-[0.3em] text-nuanu-gray-400 hover:text-nuanu-navy transition-all">
                  Dismiss
                </button>
                <button 
                  onClick={() => { handleShortlist(selectedAnalysis.applicationId); setSelectedAnalysis(null); }}
                  className="px-16 py-5 bg-indigo-600 text-white rounded-[2rem] font-black text-sm uppercase tracking-[0.3em] shadow-3xl shadow-indigo-600/40 hover:shadow-indigo-600/60 active:scale-95 transition-all"
                >
                  Confirm Shortlist
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
