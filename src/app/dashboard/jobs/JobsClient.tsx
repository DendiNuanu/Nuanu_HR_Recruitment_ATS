"use client";

import { useState } from "react";
import { Search, Filter, Briefcase, Building, Users } from "lucide-react";
import JobCard from "./JobCard";
import { motion, AnimatePresence } from "framer-motion";

export default function JobsClient({ 
  initialVacancies, 
  departments 
}: { 
  initialVacancies: any[], 
  departments: any[] 
}) {
  const [search, setSearch] = useState("");
  const [selectedDept, setSelectedDept] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");

  const filteredJobs = initialVacancies.filter(job => {
    const matchSearch = 
      job.title.toLowerCase().includes(search.toLowerCase()) ||
      job.code.toLowerCase().includes(search.toLowerCase()) ||
      job.department?.name.toLowerCase().includes(search.toLowerCase());
    
    const matchDept = selectedDept === "all" || job.departmentId === selectedDept;
    const matchStatus = selectedStatus === "all" || job.status === selectedStatus;

    return matchSearch && matchDept && matchStatus;
  });

  return (
    <div className="space-y-6">
      <div className="card">
        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-4 mb-8">
          {/* Search Input */}
          <div className="relative flex-1 group">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-nuanu-gray-400 group-focus-within:text-emerald-500 transition-colors pointer-events-none z-10">
              <Search className="w-5 h-5" />
            </div>
            <input 
              type="text" 
              placeholder="Search by job title, department, or code..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input-field !pl-14 h-12 shadow-sm focus:shadow-emerald-500/5 transition-all"
            />
          </div>

          {/* Filters */}
          <div className="flex items-center gap-3">
            <div className="relative min-w-[180px]">
              <select 
                value={selectedDept}
                onChange={(e) => setSelectedDept(e.target.value)}
                className="input-field h-12 pl-10 appearance-none bg-white font-medium border-2 border-nuanu-gray-100 hover:border-nuanu-gray-200 transition-all"
              >
                <option value="all">All Departments</option>
                {departments.map(dept => (
                  <option key={dept.id} value={dept.id}>{dept.name}</option>
                ))}
              </select>
              <Building className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-nuanu-gray-400 pointer-events-none" />
              <Filter className="absolute right-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-nuanu-gray-300 pointer-events-none" />
            </div>

            <div className="relative min-w-[160px]">
              <select 
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="input-field h-12 pl-10 appearance-none bg-white font-medium border-2 border-nuanu-gray-100 hover:border-nuanu-gray-200 transition-all"
              >
                <option value="all">All Statuses</option>
                <option value="published">Published</option>
                <option value="draft">Draft</option>
                <option value="closed">Closed</option>
              </select>
              <Users className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-nuanu-gray-400 pointer-events-none" />
              <Filter className="absolute right-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-nuanu-gray-300 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Results Info */}
        <div className="mb-4 flex items-center justify-between">
          <p className="text-sm text-nuanu-gray-500">
            Showing <span className="font-bold text-nuanu-navy">{filteredJobs.length}</span> job requisitions
            {search && <span> for "<span className="text-emerald-600 italic font-medium">{search}</span>"</span>}
          </p>
          {(search || selectedDept !== "all" || selectedStatus !== "all") && (
            <button 
              onClick={() => { setSearch(""); setSelectedDept("all"); setSelectedStatus("all"); }}
              className="text-xs font-bold text-emerald-600 hover:text-emerald-700 underline underline-offset-4"
            >
              Clear all filters
            </button>
          )}
        </div>

        {/* Jobs Grid */}
        {filteredJobs.length === 0 ? (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            className="text-center py-20 bg-nuanu-gray-50 rounded-2xl border-2 border-dashed border-nuanu-gray-200"
          >
            <Briefcase className="w-16 h-16 text-nuanu-gray-300 mx-auto mb-4 opacity-50" />
            <h3 className="text-xl font-bold text-nuanu-navy">No results matched your search</h3>
            <p className="text-nuanu-gray-500 mt-2 max-w-sm mx-auto">Try adjusting your filters or keywords to find what you're looking for.</p>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            <AnimatePresence mode="popLayout">
              {filteredJobs.map((job) => (
                <motion.div
                  key={job.id}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.2 }}
                >
                  <JobCard job={job} />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}
