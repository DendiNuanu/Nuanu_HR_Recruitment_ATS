"use client";

import { BarChart3, Download, Calendar, Filter } from "lucide-react";
import { motion } from "framer-motion";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell, PieChart, Pie } from "recharts";
export type AnalyticsData = {
  candidateSourceBreakdown: { source: string; percentage: number; count: number }[];
  timeToHire: { month: string; days: number }[];
  overview: { label: string; value: string; change: string; color: string }[];
};

export default function AnalyticsClient({ analyticsData }: { analyticsData: AnalyticsData }) {
  const COLORS = ["#10B981", "#3B82F6", "#8B5CF6", "#F59E0B"];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-nuanu-navy">Analytics & Reports</h1>
          <p className="text-sm text-nuanu-gray-500 mt-1">Deep dive into your recruitment performance</p>
        </div>
        <div className="flex gap-3">
          <button className="btn-secondary">
            <Calendar className="w-4 h-4" /> Date Range
          </button>
          <button className="btn-primary">
            <Download className="w-4 h-4" /> Export Report
          </button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {analyticsData.overview.map((stat, i) => (
          <motion.div 
            key={stat.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="card p-5"
          >
            <p className="text-sm text-nuanu-gray-500 mb-1">{stat.label}</p>
            <div className="flex items-end justify-between">
              <h3 className="text-2xl font-bold text-nuanu-navy">{stat.value}</h3>
              <span className={`text-xs font-semibold ${stat.change.startsWith('+') ? 'text-emerald-600' : 'text-emerald-600'}`}>
                {stat.change} vs last yr
              </span>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Source Quality */}
        <div className="card">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-bold text-nuanu-navy">Candidate Source Quality</h3>
            <button className="text-nuanu-gray-400 hover:text-nuanu-navy p-1"><Filter className="w-4 h-4" /></button>
          </div>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analyticsData.candidateSourceBreakdown} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                <XAxis type="number" />
                <YAxis dataKey="source" type="category" width={100} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="percentage" fill="#10B981" radius={[0, 4, 4, 0]}>
                  {analyticsData.candidateSourceBreakdown.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Time to Hire Trends */}
        <div className="card">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-bold text-nuanu-navy">Time to Hire Trends (Days)</h3>
            <button className="text-nuanu-gray-400 hover:text-nuanu-navy p-1"><Filter className="w-4 h-4" /></button>
          </div>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={analyticsData.timeToHire}>
                <defs>
                  <linearGradient id="colorDays" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Area type="monotone" dataKey="days" stroke="#3B82F6" fillOpacity={1} fill="url(#colorDays)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
