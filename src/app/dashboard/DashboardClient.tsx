"use client";

import { motion } from "framer-motion";
import {
  Briefcase,
  Users,
  Clock,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  Target,
  Brain,
  Banknote,
  UserCheck,
  Activity,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
} from "recharts";

export type DashboardMetrics = {
  activeVacancies: number;
  totalVacancies: number;
  totalCandidates: number;
  newCandidatesThisMonth: number;
  averageTimeToHire: number;
  offerAcceptanceRate: number;
  averageMatchScore: number;
  averageCostPerHire: number;
  pipelineFunnel: { stage: string; count: number }[];
  candidateSourceBreakdown: {
    source: string;
    percentage: number;
    count: number;
  }[];
  monthlyApplications: { month: string; applications: number; hires: number }[];
  matchScoreDistribution: { range: string; count: number }[];
  recentActivity: {
    id: string;
    type: string;
    action: string;
    resource: string;
    time: string;
  }[];
  topCandidates: {
    id: string;
    name: string;
    vacancyTitle: string;
    score: number;
  }[];
  upcomingInterviews: {
    id: string;
    candidateName: string;
    position: string;
    type: string;
    status: string;
  }[];
  changes: {
    vacancies: string;
    candidates: string;
    timeToHire: string;
    offerRate: string;
    aiScore: string;
    costPerHire: string;
  };
};

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
};
const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

const FUNNEL_COLORS = [
  "#6366F1",
  "#8B5CF6",
  "#3B82F6",
  "#0EA5E9",
  "#14B8A6",
  "#F59E0B",
  "#22C55E",
];
const SOURCE_COLORS = ["#3B82F6", "#6366F1", "#10B981", "#F59E0B", "#EF4444"];

function ScoreCircle({
  score,
  size = 80,
  strokeWidth = 6,
}: {
  score: number;
  size?: number;
  strokeWidth?: number;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const color = score >= 80 ? "#10B981" : score >= 60 ? "#F59E0B" : "#EF4444";

  return (
    <div className="score-circle" style={{ width: size, height: size }}>
      <svg width={size} height={size}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#E2E8F0"
          strokeWidth={strokeWidth}
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.2, ease: "easeOut" }}
        />
      </svg>
      <span className="score-value" style={{ color, fontSize: size * 0.22 }}>
        {score}%
      </span>
    </div>
  );
}

function ActivityIcon({ type }: { type: string }) {
  const iconMap: Record<
    string,
    { icon: React.ElementType; color: string; bg: string }
  > = {
    application: { icon: Users, color: "text-blue-600", bg: "bg-blue-100" },
    interview: {
      icon: Calendar,
      color: "text-purple-600",
      bg: "bg-purple-100",
    },
    offer: { icon: UserCheck, color: "text-emerald-600", bg: "bg-emerald-100" },
    approval: { icon: Target, color: "text-amber-600", bg: "bg-amber-100" },
    score: { icon: Brain, color: "text-teal-600", bg: "bg-teal-100" },
    vacancy: { icon: Briefcase, color: "text-indigo-600", bg: "bg-indigo-100" },
    pipeline: { icon: Activity, color: "text-cyan-600", bg: "bg-cyan-100" },
    feedback: { icon: TrendingUp, color: "text-rose-600", bg: "bg-rose-100" },
    email: { icon: Users, color: "text-indigo-600", bg: "bg-indigo-100" },
    candidate: { icon: Users, color: "text-blue-600", bg: "bg-blue-100" },
  };
  const conf = iconMap[type] || iconMap.application;
  return (
    <div
      className={`w-8 h-8 rounded-lg ${conf.bg} ${conf.color} flex items-center justify-center flex-shrink-0`}
    >
      <conf.icon className="w-4 h-4" />
    </div>
  );
}

export default function DashboardClient({
  metrics,
}: {
  metrics: DashboardMetrics;
}) {
  const statCards = [
    {
      label: "Active Vacancies",
      value: metrics.activeVacancies,
      total: metrics.totalVacancies,
      suffix: ` / ${metrics.totalVacancies}`,
      suffix: ` / ${metrics.totalVacancies}`,
      change: metrics.changes.vacancies,
      up: metrics.changes.vacancies.startsWith("+"),
      icon: Briefcase,
      color: "emerald",
      gradient: "from-emerald-500 to-teal-500",
    },
    {
      label: "Total Candidates",
      value: metrics.totalCandidates,
      change: metrics.changes.candidates,
      up: metrics.changes.candidates.startsWith("+"),
      icon: Users,
      color: "blue",
      gradient: "from-blue-500 to-indigo-500",
    },
    {
      label: "Avg. Time to Hire",
      value: `${metrics.averageTimeToHire}`,
      suffix: " days",
      change: metrics.changes.timeToHire,
      up: metrics.changes.timeToHire.startsWith("+"),
      icon: Clock,
      color: "amber",
      gradient: "from-amber-500 to-orange-500",
    },
    {
      label: "Offer Accept Rate",
      value: `${metrics.offerAcceptanceRate}`,
      suffix: "%",
      change: metrics.changes.offerRate,
      up: metrics.changes.offerRate.startsWith("+"),
      icon: TrendingUp,
      color: "purple",
      gradient: "from-purple-500 to-violet-500",
    },
    {
      label: "Avg. AI Match Score",
      value: `${metrics.averageMatchScore}`,
      suffix: "%",
      change: metrics.changes.aiScore,
      up: metrics.changes.aiScore.startsWith("+"),
      icon: Brain,
      color: "teal",
      gradient: "from-teal-500 to-cyan-500",
    },
    {
      label: "Cost per Hire",
      value: `Rp ${metrics.averageCostPerHire.toLocaleString("id-ID")}`,
      change: metrics.changes.costPerHire,
      up: metrics.changes.costPerHire.startsWith("+"),
      icon: Banknote,
      color: "red",
      gradient: "from-rose-500 to-pink-500",
    },
  ];

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="space-y-6"
    >
      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {statCards.map((stat) => (
          <motion.div
            key={stat.label}
            variants={item}
            className={`card stat-card ${stat.color} card-interactive`}
          >
            <div className="flex items-start justify-between mb-3">
              <div
                className={`w-10 h-10 rounded-xl bg-gradient-to-br ${stat.gradient} flex items-center justify-center shadow-lg`}
              >
                <stat.icon className="w-5 h-5 text-white" />
              </div>
              <span
                className={`inline-flex items-center gap-0.5 text-xs font-semibold px-2 py-0.5 rounded-full ${
                  stat.up !== undefined && !stat.up
                    ? "bg-emerald-50 text-emerald-600"
                    : "bg-emerald-50 text-emerald-600"
                }`}
              >
                {stat.up ? (
                  <ArrowUpRight className="w-3 h-3" />
                ) : (
                  <ArrowDownRight className="w-3 h-3" />
                )}
                {stat.change}
              </span>
            </div>
            <p className="text-2xl font-bold text-nuanu-navy">
              {stat.value}
              {stat.suffix && (
                <span className="text-sm font-normal text-nuanu-gray-400">
                  {stat.suffix}
                </span>
              )}
            </p>
            <p className="text-xs text-nuanu-gray-400 mt-1">{stat.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Hiring Pipeline Funnel */}
        <motion.div variants={item} className="card lg:col-span-2">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-base font-bold text-nuanu-navy">
                Hiring Pipeline
              </h3>
              <p className="text-xs text-nuanu-gray-400 mt-0.5">
                Candidate progression through stages
              </p>
            </div>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={metrics.pipelineFunnel} barSize={40}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#E2E8F0"
                  vertical={false}
                />
                <XAxis
                  dataKey="stage"
                  tick={{ fontSize: 11, fill: "#94A3B8" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "#94A3B8" }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    background: "#0A1628",
                    border: "none",
                    borderRadius: "10px",
                    color: "#fff",
                    fontSize: "13px",
                  }}
                />
                <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                  {metrics.pipelineFunnel.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={FUNNEL_COLORS[index]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Candidate Source */}
        <motion.div variants={item} className="card">
          <h3 className="text-base font-bold text-nuanu-navy mb-1">
            Candidate Sources
          </h3>
          <p className="text-xs text-nuanu-gray-400 mb-4">
            Where candidates come from
          </p>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={metrics.candidateSourceBreakdown}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={75}
                  paddingAngle={3}
                  dataKey="count"
                >
                  {metrics.candidateSourceBreakdown.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={SOURCE_COLORS[index]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: "#0A1628",
                    border: "none",
                    borderRadius: "10px",
                    color: "#fff",
                    fontSize: "13px",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-2 mt-2">
            {metrics.candidateSourceBreakdown.map((source, i) => (
              <div
                key={source.source}
                className="flex items-center justify-between text-sm"
              >
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ background: SOURCE_COLORS[i] }}
                  />
                  <span className="text-nuanu-gray-600">{source.source}</span>
                </div>
                <span className="font-semibold text-nuanu-navy">
                  {source.percentage}%
                </span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Application Trends + Top Candidates + Upcoming */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Monthly Application Trends */}
        <motion.div variants={item} className="card lg:col-span-2">
          <h3 className="text-base font-bold text-nuanu-navy mb-1">
            Application Trends
          </h3>
          <p className="text-xs text-nuanu-gray-400 mb-4">
            Monthly applications vs hires
          </p>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={metrics.monthlyApplications}>
                <defs>
                  <linearGradient id="appGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3B82F6" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#3B82F6" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="hireGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10B981" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#10B981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#E2E8F0"
                  vertical={false}
                />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 11, fill: "#94A3B8" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "#94A3B8" }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    background: "#0A1628",
                    border: "none",
                    borderRadius: "10px",
                    color: "#fff",
                    fontSize: "13px",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="applications"
                  stroke="#3B82F6"
                  strokeWidth={2.5}
                  fill="url(#appGradient)"
                />
                <Area
                  type="monotone"
                  dataKey="hires"
                  stroke="#10B981"
                  strokeWidth={2.5}
                  fill="url(#hireGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* AI Match Score Distribution */}
        <motion.div variants={item} className="card">
          <h3 className="text-base font-bold text-nuanu-navy mb-1">
            AI Match Distribution
          </h3>
          <p className="text-xs text-nuanu-gray-400 mb-4">
            Score distribution across candidates
          </p>
          <div className="flex justify-center mb-4">
            <ScoreCircle
              score={metrics.averageMatchScore}
              size={100}
              strokeWidth={8}
            />
          </div>
          <p className="text-center text-xs text-nuanu-gray-400 mb-4">
            Average Match Score
          </p>
          <div className="space-y-2">
            {metrics.matchScoreDistribution.map((dist) => {
              const maxCount = Math.max(
                ...metrics.matchScoreDistribution.map((d) => d.count),
              );
              const pct = (dist.count / maxCount) * 100;
              return (
                <div key={dist.range} className="flex items-center gap-3">
                  <span className="text-xs text-nuanu-gray-500 w-16">
                    {dist.range}
                  </span>
                  <div className="flex-1 h-5 bg-nuanu-gray-100 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 1, ease: "easeOut" }}
                      className="h-full rounded-full bg-gradient-to-r from-nuanu-emerald to-nuanu-teal"
                    />
                  </div>
                  <span className="text-xs font-semibold text-nuanu-navy w-8 text-right">
                    {dist.count}
                  </span>
                </div>
              );
            })}
          </div>
        </motion.div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Activity */}
        <motion.div variants={item} className="card lg:col-span-2">
          <h3 className="text-base font-bold text-nuanu-navy mb-4">
            Recent Activity
          </h3>
          <div className="space-y-3">
            {metrics.recentActivity.map((activity) => (
              <div
                key={activity.id}
                className="flex items-start gap-3 p-3 rounded-xl hover:bg-nuanu-gray-50 transition-colors"
              >
                <ActivityIcon type={activity.type} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-nuanu-navy">
                    {activity.action}
                  </p>
                  <p className="text-xs text-nuanu-gray-400 truncate">
                    {activity.resource}
                  </p>
                </div>
                <span className="text-xs text-nuanu-gray-400 whitespace-nowrap">
                  {activity.time}
                </span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Top Candidates + Upcoming Interviews */}
        <motion.div variants={item} className="space-y-6">
          {/* Top Candidates */}
          <div className="card">
            <h3 className="text-base font-bold text-nuanu-navy mb-4">
              Top Candidates
            </h3>
            <div className="space-y-3">
              {metrics.topCandidates
                .filter((c) => c.score >= 85)
                .slice(0, 4)
                .map((candidate, i) => (
                  <div
                    key={candidate.id}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-nuanu-gray-50 transition-colors"
                  >
                    <span className="text-xs font-bold text-nuanu-gray-400 w-5">
                      #{i + 1}
                    </span>
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-nuanu-emerald to-nuanu-teal flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                      {candidate.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-nuanu-navy truncate">
                        {candidate.name}
                      </p>
                      <p className="text-xs text-nuanu-gray-400 truncate">
                        {candidate.vacancyTitle}
                      </p>
                    </div>
                    <ScoreCircle
                      score={candidate.score}
                      size={40}
                      strokeWidth={3}
                    />
                  </div>
                ))}
            </div>
          </div>

          {/* Upcoming Interviews */}
          <div className="card">
            <h3 className="text-base font-bold text-nuanu-navy mb-4">
              Upcoming Interviews
            </h3>
            <div className="space-y-3">
              {metrics.upcomingInterviews.slice(0, 3).map((interview) => (
                <div
                  key={interview.id}
                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-nuanu-gray-50 transition-colors"
                >
                  <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center flex-shrink-0">
                    <Calendar className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-nuanu-navy truncate">
                      {interview.candidateName}
                    </p>
                    <p className="text-xs text-nuanu-gray-400 truncate">
                      {interview.position}
                    </p>
                  </div>
                  <span
                    className={`badge ${
                      interview.status === "confirmed"
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-blue-100 text-blue-700"
                    }`}
                  >
                    {interview.type}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}
