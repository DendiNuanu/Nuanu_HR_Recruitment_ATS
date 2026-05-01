"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Brain, Upload, FileText, CheckCircle2, AlertCircle, RefreshCw, Sparkles, X, ChevronRight, BarChart3, Target, Briefcase } from "lucide-react";
import { demoCandidates } from "@/lib/demo-data";

export default function AIScoringPage() {
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);

  const topMatches = demoCandidates
    .filter(c => c.score >= 80)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

  const startScan = () => {
    setIsScanning(true);
    setScanProgress(0);
    
    const interval = setInterval(() => {
      setScanProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setTimeout(() => setIsScanning(false), 500);
          return 100;
        }
        return prev + 5;
      });
    }, 100);
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
          onClick={startScan}
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
              <p className="text-xs text-nuanu-gray-500">Extracting skills, evaluating experience, and calculating match rates for 12 new applications...</p>
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Top Matches */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-nuanu-navy">Top Recommendations</h2>
            <select className="input-field py-1.5 px-3 text-sm w-auto">
              <option>All Vacancies</option>
              <option>Senior Full Stack Developer</option>
              <option>Product Manager</option>
            </select>
          </div>

          <div className="space-y-4">
            {topMatches.map((candidate, i) => (
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
                      <span className="badge bg-emerald-100 text-emerald-700 uppercase">Strong Match</span>
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
                    <button className="btn-primary flex-1 text-sm py-2">Shortlist</button>
                    <button className="btn-secondary flex-1 text-sm py-2">View Full Analysis</button>
                  </div>
                </div>
              </motion.div>
            ))}
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

          <div className="card border-amber-200 bg-amber-50">
            <h3 className="font-bold text-amber-800 mb-2 flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              Missing Keywords Alert
            </h3>
            <p className="text-sm text-amber-700 mb-4">The following required skills are rarely found in recent applications for "Senior Full Stack Developer":</p>
            <div className="flex flex-wrap gap-2">
              {["GraphQL", "Docker Swarm", "WebRTC"].map(kw => (
                <span key={kw} className="px-2 py-1 bg-amber-100 text-amber-800 text-xs rounded border border-amber-200">
                  {kw}
                </span>
              ))}
            </div>
            <button className="text-sm font-semibold text-amber-700 hover:text-amber-800 mt-4 flex items-center gap-1">
              Adjust Job Description <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
