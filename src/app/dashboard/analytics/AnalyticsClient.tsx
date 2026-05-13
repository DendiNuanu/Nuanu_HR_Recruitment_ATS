"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BarChart,
  Bar,
  AreaChart,
  Area,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  RadialBarChart,
  RadialBar,
} from "recharts";
import {
  BarChart3,
  Download,
  TrendingUp,
  TrendingDown,
  Clock,
  DollarSign,
  Users,
  Target,
  Award,
  MapPin,
  GitBranch,
  Zap,
  CheckCircle2,
  XCircle,
  ArrowRight,
  Activity,
  Briefcase,
  UserCheck,
  Heart,
  Star,
  Globe,
  Filter,
  RefreshCw,
  ChevronDown,
} from "lucide-react";

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

export type AnalyticsData = {
  sourceBreakdown: {
    source: string;
    count: number;
    hires: number;
    percentage: number;
    hireRate: number;
  }[];
  referralRate: number;
  linkedinRate: number;
  jobstreetRate: number;
  totalHires: number;
  quarterlyRates: {
    quarter: string;
    referral: number;
    linkedin: number;
    jobstreet: number;
    totalHires: number;
  }[];
  channelEffectiveness: {
    channel: string;
    hires: number;
    estimatedCost: number;
    costPerHire: number;
  }[];
  avgTimeToHire: number;
  avgTimeToFill: number;
  timeToHireTrend: { month: string; days: number; hires: number }[];
  deptBreakdown: {
    dept: string;
    openRoles: number;
    avgTimeToFill: number;
    applications: number;
    hires: number;
  }[];
  funnelStages: { stage: string; count: number; dropOffRate: number }[];
  yieldRatio: number;
  offerAcceptanceRate: number;
  retention90Days: number;
  qualityOfHire6Months: number;
  costPerHire: number;
  locationBreakdown: { location: string; count: number; percentage: number }[];
  monthlyTrend: {
    month: string;
    applications: number;
    hires: number;
    interviews: number;
    offers: number;
  }[];
  overview: {
    label: string;
    value: string;
    subValue: string;
    trend: number;
    color: string;
    icon: string;
  }[];
};

// ─────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────

const PALETTE = {
  emerald: "#10B981",
  teal: "#14B8A6",
  blue: "#3B82F6",
  indigo: "#6366F1",
  purple: "#8B5CF6",
  amber: "#F59E0B",
  orange: "#F97316",
  red: "#EF4444",
  pink: "#EC4899",
  navy: "#0A1628",
};

const CHART_COLORS = [
  PALETTE.emerald,
  PALETTE.blue,
  PALETTE.purple,
  PALETTE.amber,
  PALETTE.teal,
  PALETTE.orange,
  PALETTE.pink,
  PALETTE.indigo,
];

const RANGE_OPTIONS = [
  { key: "month", label: "This Month" },
  { key: "quarter", label: "This Quarter" },
  { key: "year", label: "This Year" },
  { key: "all", label: "All Time" },
] as const;

type Range = "month" | "quarter" | "year" | "all";

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

function fmt(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return n.toString();
}

function fmtRp(n: number) {
  if (n >= 1_000_000) return `Rp ${(n / 1_000_000).toFixed(1)}jt`;
  if (n >= 1_000) return `Rp ${(n / 1_000).toFixed(0)}rb`;
  return `Rp ${n.toLocaleString("id-ID")}`;
}

function TrendBadge({ value }: { value: number }) {
  if (value === 0)
    return <span className="text-xs text-nuanu-gray-400">—</span>;
  const up = value > 0;
  return (
    <span
      className={`inline-flex items-center gap-0.5 text-xs font-semibold ${up ? "text-emerald-600" : "text-red-500"}`}
    >
      {up ? (
        <TrendingUp className="w-3 h-3" />
      ) : (
        <TrendingDown className="w-3 h-3" />
      )}
      {Math.abs(value)}%
    </span>
  );
}

function SectionHeader({
  icon,
  title,
  subtitle,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="flex items-start gap-3 mb-6">
      <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-nuanu-emerald to-nuanu-teal flex items-center justify-center flex-shrink-0 text-white">
        {icon}
      </div>
      <div>
        <h2 className="text-lg font-bold text-nuanu-navy">{title}</h2>
        {subtitle && <p className="text-sm text-nuanu-gray-500">{subtitle}</p>}
      </div>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-nuanu-gray-400">
      <BarChart3 className="w-10 h-10 mb-3 opacity-30" />
      <p className="text-sm font-medium">{message}</p>
      <p className="text-xs mt-1 opacity-70">
        Data will appear as your team uses the ATS
      </p>
    </div>
  );
}

// Radial progress circle SVG
function RadialProgress({
  value,
  max = 100,
  color,
  size = 96,
}: {
  value: number;
  max?: number;
  color: string;
  size?: number;
}) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  const r = (size - 16) / 2;
  const circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;
  return (
    <svg width={size} height={size} className="-rotate-90">
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="#E2E8F0"
        strokeWidth={8}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth={8}
        strokeDasharray={`${dash} ${circ}`}
        strokeLinecap="round"
        style={{ transition: "stroke-dasharray 1s ease" }}
      />
    </svg>
  );
}

// ─────────────────────────────────────────────
// Custom Tooltip for Recharts
// ─────────────────────────────────────────────

function CustomTooltip({
  active,
  payload,
  label,
  unit = "",
}: {
  active?: boolean;
  payload?: { name: string; value: number; color: string }[];
  label?: string;
  unit?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-nuanu-gray-200 rounded-xl shadow-lg p-3 text-sm">
      {label && <p className="font-semibold text-nuanu-navy mb-2">{label}</p>}
      {payload.map((p, i) => (
        <div key={i} className="flex items-center gap-2 mb-0.5">
          <span
            className="w-2 h-2 rounded-full"
            style={{ background: p.color }}
          />
          <span className="text-nuanu-gray-600 capitalize">{p.name}:</span>
          <span className="font-semibold text-nuanu-navy">
            {p.value}
            {unit}
          </span>
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────
// ICON MAP (for overview cards)
// ─────────────────────────────────────────────

const ICON_MAP: Record<string, React.ReactNode> = {
  clock: <Clock className="w-5 h-5" />,
  check: <CheckCircle2 className="w-5 h-5" />,
  dollar: <DollarSign className="w-5 h-5" />,
  target: <Target className="w-5 h-5" />,
  users: <Users className="w-5 h-5" />,
  award: <Award className="w-5 h-5" />,
  activity: <Activity className="w-5 h-5" />,
  heart: <Heart className="w-5 h-5" />,
};

const COLOR_MAP: Record<string, { bg: string; text: string; bar: string }> = {
  emerald: {
    bg: "bg-emerald-50",
    text: "text-emerald-600",
    bar: "from-nuanu-emerald to-nuanu-teal",
  },
  blue: {
    bg: "bg-blue-50",
    text: "text-blue-600",
    bar: "from-blue-500 to-indigo-500",
  },
  purple: {
    bg: "bg-purple-50",
    text: "text-purple-600",
    bar: "from-purple-500 to-pink-500",
  },
  amber: {
    bg: "bg-amber-50",
    text: "text-amber-600",
    bar: "from-amber-400 to-orange-500",
  },
  teal: {
    bg: "bg-teal-50",
    text: "text-teal-600",
    bar: "from-teal-400 to-cyan-500",
  },
  red: {
    bg: "bg-red-50",
    text: "text-red-600",
    bar: "from-red-400 to-pink-500",
  },
};

// ─────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────

export default function AnalyticsClient({
  analyticsData: d,
}: {
  analyticsData: AnalyticsData;
}) {
  const [range, setRange] = useState<Range>("year");

  const containerVariants = {
    hidden: {},
    visible: { transition: { staggerChildren: 0.08 } },
  };
  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.5, ease: "easeOut" as const },
    },
  };

  // ── Filter monthly trend data by range ──────
  const filteredMonthly = (() => {
    const now = new Date();
    const months = d.monthlyTrend;
    if (range === "month") return months.slice(-1);
    if (range === "quarter") return months.slice(-3);
    if (range === "year") return months.slice(-12);
    return months;
  })();

  // ── Channel effectiveness: filter zero-hire entries ──
  const channelData = d.channelEffectiveness.filter(
    (c) => c.hires > 0 || c.estimatedCost > 0,
  );

  return (
    <div className="space-y-8 pb-12">
      {/* ══════════════════════════════════════
          HEADER
      ══════════════════════════════════════ */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
      >
        <div>
          <h1 className="text-2xl font-bold text-nuanu-navy flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-nuanu-emerald" />
            HR Analytics Dashboard
          </h1>
          <p className="text-sm text-nuanu-gray-500 mt-1">
            13 key recruitment metrics — executive intelligence
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Date range tabs */}
          <div className="flex rounded-xl border border-nuanu-gray-200 bg-white overflow-hidden">
            {RANGE_OPTIONS.map((opt) => (
              <button
                key={opt.key}
                onClick={() => setRange(opt.key)}
                className={`px-3 py-2 text-xs font-semibold transition-all ${
                  range === opt.key
                    ? "bg-gradient-to-r from-nuanu-emerald to-nuanu-teal text-white"
                    : "text-nuanu-gray-500 hover:text-nuanu-navy hover:bg-nuanu-gray-50"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <button className="btn-secondary !py-2 !px-3 text-xs">
            <Download className="w-3.5 h-3.5" /> Export
          </button>
        </div>
      </motion.div>

      {/* ══════════════════════════════════════
          HERO KPI CARDS (4 top metrics)
      ══════════════════════════════════════ */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
      >
        {d.overview.map((stat, i) => {
          const colors = COLOR_MAP[stat.color] ?? COLOR_MAP.emerald;
          return (
            <motion.div
              key={stat.label}
              variants={itemVariants}
              className={`card stat-card ${stat.color} p-5`}
            >
              <div className="flex items-start justify-between mb-3">
                <div
                  className={`w-10 h-10 rounded-xl ${colors.bg} ${colors.text} flex items-center justify-center`}
                >
                  {ICON_MAP[stat.icon] ?? <Activity className="w-5 h-5" />}
                </div>
                <TrendBadge value={stat.trend} />
              </div>
              <p className="text-xs font-medium text-nuanu-gray-500 mb-1">
                {stat.label}
              </p>
              <p className="text-2xl font-bold text-nuanu-navy leading-tight">
                {stat.value}
              </p>
              {stat.subValue && (
                <p className="text-xs text-nuanu-gray-400 mt-1">
                  {stat.subValue}
                </p>
              )}
            </motion.div>
          );
        })}
      </motion.div>

      {/* ══════════════════════════════════════
          SECTION 1: SOURCING & CHANNEL ANALYTICS
          Metrics 1–5
      ══════════════════════════════════════ */}
      <motion.div
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        className="space-y-4"
      >
        <SectionHeader
          icon={<GitBranch className="w-4 h-4" />}
          title="Sourcing & Channel Analytics"
          subtitle="Metrics 1–5: Source quality, channel rates, effectiveness"
        />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* 1. SOURCING ANALYTICS — big bar chart */}
          <div className="card lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold text-nuanu-navy">Candidate Sources</h3>
                <p className="text-xs text-nuanu-gray-400 mt-0.5">
                  Applications & hire rate by channel
                </p>
              </div>
              <span className="badge bg-emerald-100 text-emerald-700">
                Metric 1
              </span>
            </div>

            {d.sourceBreakdown.length === 0 ? (
              <EmptyState message="No source data yet" />
            ) : (
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={d.sourceBreakdown}
                    layout="vertical"
                    margin={{ left: 0, right: 32 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      horizontal={false}
                      stroke="#F1F5F9"
                    />
                    <XAxis
                      type="number"
                      tick={{ fontSize: 11, fill: "#64748B" }}
                    />
                    <YAxis
                      dataKey="source"
                      type="category"
                      width={84}
                      tick={{ fontSize: 12, fill: "#334155", fontWeight: 500 }}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Bar
                      dataKey="count"
                      name="Applications"
                      radius={[0, 4, 4, 0]}
                      maxBarSize={18}
                    >
                      {d.sourceBreakdown.map((_, i) => (
                        <Cell
                          key={i}
                          fill={CHART_COLORS[i % CHART_COLORS.length]}
                        />
                      ))}
                    </Bar>
                    <Bar
                      dataKey="hires"
                      name="Hires"
                      radius={[0, 4, 4, 0]}
                      fill="#CBD5E1"
                      maxBarSize={8}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* 2–4. CHANNEL RATE CARDS */}
          <div className="space-y-3">
            {/* Referral Rate */}
            <div className="card p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-emerald-500" />
                  <span className="text-sm font-semibold text-nuanu-navy">
                    Referral Rate
                  </span>
                  <span className="badge bg-emerald-50 text-emerald-600 text-[10px]">
                    M2
                  </span>
                </div>
                <span className="text-2xl font-bold text-emerald-600">
                  {d.referralRate.toFixed(1)}%
                </span>
              </div>
              <p className="text-xs text-nuanu-gray-400 mb-3">
                Hires via employee referrals
              </p>
              <div className="space-y-1.5">
                {d.quarterlyRates.map((q) => (
                  <div
                    key={q.quarter}
                    className="flex items-center gap-2 text-xs"
                  >
                    <span className="w-6 text-nuanu-gray-400">{q.quarter}</span>
                    <div className="flex-1 h-2 bg-nuanu-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-nuanu-emerald to-nuanu-teal rounded-full"
                        style={{ width: `${Math.min(100, q.referral)}%` }}
                      />
                    </div>
                    <span className="w-8 text-right font-semibold text-nuanu-navy">
                      {q.referral.toFixed(0)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* LinkedIn Rate */}
            <div className="card p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Briefcase className="w-4 h-4 text-blue-500" />
                  <span className="text-sm font-semibold text-nuanu-navy">
                    LinkedIn Rate
                  </span>
                  <span className="badge bg-blue-50 text-blue-600 text-[10px]">
                    M3
                  </span>
                </div>
                <span className="text-2xl font-bold text-blue-600">
                  {d.linkedinRate.toFixed(1)}%
                </span>
              </div>
              <p className="text-xs text-nuanu-gray-400 mb-3">
                Hires sourced from LinkedIn
              </p>
              <div className="space-y-1.5">
                {d.quarterlyRates.map((q) => (
                  <div
                    key={q.quarter}
                    className="flex items-center gap-2 text-xs"
                  >
                    <span className="w-6 text-nuanu-gray-400">{q.quarter}</span>
                    <div className="flex-1 h-2 bg-nuanu-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full"
                        style={{ width: `${Math.min(100, q.linkedin)}%` }}
                      />
                    </div>
                    <span className="w-8 text-right font-semibold text-nuanu-navy">
                      {q.linkedin.toFixed(0)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Jobstreet Rate */}
            <div className="card p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Globe className="w-4 h-4 text-purple-500" />
                  <span className="text-sm font-semibold text-nuanu-navy">
                    Jobstreet Rate
                  </span>
                  <span className="badge bg-purple-50 text-purple-600 text-[10px]">
                    M4
                  </span>
                </div>
                <span className="text-2xl font-bold text-purple-600">
                  {d.jobstreetRate.toFixed(1)}%
                </span>
              </div>
              <p className="text-xs text-nuanu-gray-400 mb-3">
                Hires sourced from Jobstreet
              </p>
              <div className="space-y-1.5">
                {d.quarterlyRates.map((q) => (
                  <div
                    key={q.quarter}
                    className="flex items-center gap-2 text-xs"
                  >
                    <span className="w-6 text-nuanu-gray-400">{q.quarter}</span>
                    <div className="flex-1 h-2 bg-nuanu-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full"
                        style={{ width: `${Math.min(100, q.jobstreet)}%` }}
                      />
                    </div>
                    <span className="w-8 text-right font-semibold text-nuanu-navy">
                      {q.jobstreet.toFixed(0)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* 5. CHANNEL EFFECTIVENESS TABLE */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-nuanu-navy">
                Recruitment Channel Effectiveness
              </h3>
              <p className="text-xs text-nuanu-gray-400 mt-0.5">
                Hires per channel vs estimated cost (IDR)
              </p>
            </div>
            <span className="badge bg-amber-50 text-amber-700">Metric 5</span>
          </div>

          {channelData.length === 0 ? (
            <EmptyState message="No channel data yet" />
          ) : (
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Channel</th>
                    <th className="text-right">Hires</th>
                    <th className="text-right">Est. Cost</th>
                    <th className="text-right">Cost / Hire</th>
                    <th className="text-right">Efficiency</th>
                  </tr>
                </thead>
                <tbody>
                  {channelData
                    .sort((a, b) => b.hires - a.hires)
                    .map((row, i) => {
                      const isFree = row.estimatedCost === 0;
                      const efficiency = isFree
                        ? 100
                        : Math.max(
                            0,
                            100 - Math.min(100, row.costPerHire / 100_000),
                          );
                      return (
                        <tr key={i}>
                          <td>
                            <div className="flex items-center gap-2">
                              <span
                                className="w-2 h-2 rounded-full"
                                style={{
                                  background:
                                    CHART_COLORS[i % CHART_COLORS.length],
                                }}
                              />
                              <span className="font-medium text-nuanu-navy capitalize">
                                {row.channel}
                              </span>
                            </div>
                          </td>
                          <td className="text-right font-semibold text-nuanu-navy">
                            {row.hires}
                          </td>
                          <td className="text-right">
                            {row.estimatedCost === 0 ? (
                              <span className="text-emerald-600 font-medium">
                                Free
                              </span>
                            ) : (
                              fmtRp(row.estimatedCost)
                            )}
                          </td>
                          <td className="text-right font-semibold">
                            {row.costPerHire === 0 ? (
                              <span className="text-emerald-600">—</span>
                            ) : (
                              fmtRp(row.costPerHire)
                            )}
                          </td>
                          <td className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <div className="w-20 h-1.5 bg-nuanu-gray-100 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-gradient-to-r from-nuanu-emerald to-nuanu-teal rounded-full"
                                  style={{ width: `${efficiency}%` }}
                                />
                              </div>
                              <span className="text-xs font-semibold text-emerald-600">
                                {efficiency.toFixed(0)}%
                              </span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </motion.div>

      {/* ══════════════════════════════════════
          SECTION 2: SPEED METRICS
          Metrics 7–8: Time-to-Fill, Time-to-Hire
      ══════════════════════════════════════ */}
      <motion.div
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        className="space-y-4"
      >
        <SectionHeader
          icon={<Clock className="w-4 h-4" />}
          title="Speed Metrics"
          subtitle="Metrics 7–8: Time-to-Fill & Time-to-Hire"
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="card stat-card emerald p-5">
            <div className="flex items-center gap-2 mb-3">
              <Clock className="w-5 h-5 text-emerald-500" />
              <span className="text-xs font-semibold text-nuanu-gray-500 uppercase tracking-wide">
                Time-to-Fill
              </span>
              <span className="badge bg-emerald-50 text-emerald-600 text-[10px]">
                M7
              </span>
            </div>
            <p className="text-4xl font-bold text-nuanu-navy">
              {d.avgTimeToFill > 0 ? d.avgTimeToFill : "—"}
            </p>
            <p className="text-sm text-nuanu-gray-500 mt-1">
              {d.avgTimeToFill > 0
                ? "days avg (approval → offer)"
                : "No filled positions yet"}
            </p>
          </div>

          <div className="card stat-card blue p-5">
            <div className="flex items-center gap-2 mb-3">
              <Zap className="w-5 h-5 text-blue-500" />
              <span className="text-xs font-semibold text-nuanu-gray-500 uppercase tracking-wide">
                Time-to-Hire
              </span>
              <span className="badge bg-blue-50 text-blue-600 text-[10px]">
                M8
              </span>
            </div>
            <p className="text-4xl font-bold text-nuanu-navy">
              {d.avgTimeToHire > 0 ? d.avgTimeToHire : "—"}
            </p>
            <p className="text-sm text-nuanu-gray-500 mt-1">
              {d.avgTimeToHire > 0
                ? "days avg (apply → hired)"
                : "No hires yet"}
            </p>
          </div>

          <div className="card p-5 sm:col-span-2">
            <p className="text-xs font-semibold text-nuanu-gray-500 uppercase tracking-wide mb-4">
              Hiring Speed Summary — {d.totalHires} total hires
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-nuanu-gray-400">Fastest Hire</p>
                <p className="text-xl font-bold text-nuanu-navy">
                  {d.timeToHireTrend.length > 0
                    ? `${Math.min(...d.timeToHireTrend.filter((t) => t.days > 0).map((t) => t.days))} days`
                    : "—"}
                </p>
              </div>
              <div>
                <p className="text-xs text-nuanu-gray-400">Peak Hiring Month</p>
                <p className="text-xl font-bold text-nuanu-navy">
                  {d.timeToHireTrend.length > 0
                    ? d.timeToHireTrend.reduce((a, b) =>
                        a.hires >= b.hires ? a : b,
                      ).month
                    : "—"}
                </p>
              </div>
              <div>
                <p className="text-xs text-nuanu-gray-400">
                  Dept. with most hires
                </p>
                <p className="text-xl font-bold text-nuanu-navy truncate">
                  {d.deptBreakdown.length > 0
                    ? d.deptBreakdown.reduce((a, b) =>
                        a.hires >= b.hires ? a : b,
                      ).dept
                    : "—"}
                </p>
              </div>
              <div>
                <p className="text-xs text-nuanu-gray-400">Open Roles</p>
                <p className="text-xl font-bold text-nuanu-navy">
                  {d.deptBreakdown.reduce((sum, d) => sum + d.openRoles, 0)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Time-to-Hire Trend Area Chart */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-nuanu-navy">Time-to-Hire Trend</h3>
              <p className="text-xs text-nuanu-gray-400 mt-0.5">
                Average days from application to hire per month
              </p>
            </div>
          </div>
          {d.timeToHireTrend.length === 0 ? (
            <EmptyState message="No trend data yet" />
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={d.timeToHireTrend}
                  margin={{ top: 4, right: 8, bottom: 0, left: 0 }}
                >
                  <defs>
                    <linearGradient id="ttgDays" x1="0" y1="0" x2="0" y2="1">
                      <stop
                        offset="5%"
                        stopColor={PALETTE.blue}
                        stopOpacity={0.2}
                      />
                      <stop
                        offset="95%"
                        stopColor={PALETTE.blue}
                        stopOpacity={0}
                      />
                    </linearGradient>
                    <linearGradient id="ttgHires" x1="0" y1="0" x2="0" y2="1">
                      <stop
                        offset="5%"
                        stopColor={PALETTE.emerald}
                        stopOpacity={0.2}
                      />
                      <stop
                        offset="95%"
                        stopColor={PALETTE.emerald}
                        stopOpacity={0}
                      />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="#F1F5F9"
                  />
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 11, fill: "#64748B" }}
                  />
                  <YAxis
                    yAxisId="days"
                    tick={{ fontSize: 11, fill: "#64748B" }}
                  />
                  <YAxis
                    yAxisId="hires"
                    orientation="right"
                    tick={{ fontSize: 11, fill: "#64748B" }}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Area
                    yAxisId="days"
                    type="monotone"
                    dataKey="days"
                    name="Avg Days"
                    stroke={PALETTE.blue}
                    fill="url(#ttgDays)"
                    strokeWidth={2}
                    dot={{ r: 3, fill: PALETTE.blue }}
                  />
                  <Area
                    yAxisId="hires"
                    type="monotone"
                    dataKey="hires"
                    name="Hires"
                    stroke={PALETTE.emerald}
                    fill="url(#ttgHires)"
                    strokeWidth={2}
                    dot={{ r: 3, fill: PALETTE.emerald }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Per-Department Breakdown */}
        {d.deptBreakdown.length > 0 && (
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-nuanu-navy">
                Department Breakdown
              </h3>
              <span className="text-xs text-nuanu-gray-400">
                {d.deptBreakdown.length} departments
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Department</th>
                    <th className="text-right">Open Roles</th>
                    <th className="text-right">Applications</th>
                    <th className="text-right">Hires</th>
                    <th className="text-right">Avg Time to Fill</th>
                    <th className="text-right">Conversion</th>
                  </tr>
                </thead>
                <tbody>
                  {d.deptBreakdown.map((row, i) => {
                    const conv =
                      row.applications > 0
                        ? ((row.hires / row.applications) * 100).toFixed(1)
                        : "0.0";
                    return (
                      <tr key={i}>
                        <td className="font-medium text-nuanu-navy">
                          {row.dept}
                        </td>
                        <td className="text-right">{row.openRoles}</td>
                        <td className="text-right">{row.applications}</td>
                        <td className="text-right font-semibold text-nuanu-navy">
                          {row.hires}
                        </td>
                        <td className="text-right">
                          {row.avgTimeToFill > 0 ? (
                            <span
                              className={`font-medium ${row.avgTimeToFill > 45 ? "text-red-500" : row.avgTimeToFill > 30 ? "text-amber-500" : "text-emerald-600"}`}
                            >
                              {row.avgTimeToFill}d
                            </span>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className="text-right">
                          <span
                            className={`font-semibold ${Number(conv) >= 20 ? "text-emerald-600" : Number(conv) >= 10 ? "text-amber-500" : "text-nuanu-gray-400"}`}
                          >
                            {conv}%
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </motion.div>

      {/* ══════════════════════════════════════
          SECTION 3: CONVERSION FUNNEL
          Metric 6: Recruitment Yield Ratio
      ══════════════════════════════════════ */}
      <motion.div
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        className="space-y-4"
      >
        <SectionHeader
          icon={<Filter className="w-4 h-4" />}
          title="Conversion Funnel"
          subtitle="Metric 6: Recruitment Yield Ratio — how many candidates become hires"
        />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Yield Ratio big number */}
          <div className="card flex flex-col items-center justify-center text-center py-8">
            <span className="badge bg-purple-50 text-purple-700 mb-4">
              Metric 6
            </span>
            <div className="relative w-32 h-32 flex items-center justify-center">
              <RadialProgress
                value={d.yieldRatio}
                color={PALETTE.purple}
                size={128}
              />
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-bold text-nuanu-navy">
                  {d.yieldRatio.toFixed(1)}
                </span>
                <span className="text-sm font-medium text-purple-600">%</span>
              </div>
            </div>
            <p className="text-base font-bold text-nuanu-navy mt-4">
              Yield Ratio
            </p>
            <p className="text-sm text-nuanu-gray-400 mt-1">
              Hires ÷ Interviewed × 100
            </p>
            <p className="text-xs text-nuanu-gray-300 mt-3">
              {d.yieldRatio >= 30
                ? "🟢 Excellent"
                : d.yieldRatio >= 15
                  ? "🟡 Good"
                  : d.yieldRatio > 0
                    ? "🔴 Needs improvement"
                    : "No data yet"}
            </p>
          </div>

          {/* Funnel visualization */}
          <div className="card lg:col-span-2">
            <h3 className="font-bold text-nuanu-navy mb-4">
              Recruitment Pipeline Funnel
            </h3>
            {d.funnelStages.length === 0 ? (
              <EmptyState message="No pipeline data yet" />
            ) : (
              <div className="space-y-2">
                {d.funnelStages.map((stage, i) => {
                  const maxCount = d.funnelStages[0]?.count || 1;
                  const widthPct =
                    maxCount > 0 ? (stage.count / maxCount) * 100 : 0;
                  const colors = [
                    PALETTE.blue,
                    PALETTE.teal,
                    PALETTE.emerald,
                    PALETTE.amber,
                    PALETTE.purple,
                  ];
                  return (
                    <div key={i} className="relative">
                      <div className="flex items-center gap-3 mb-1">
                        <span className="text-sm font-semibold text-nuanu-navy w-24 flex-shrink-0">
                          {stage.stage}
                        </span>
                        <div className="flex-1 h-8 bg-nuanu-gray-100 rounded-lg overflow-hidden relative">
                          <motion.div
                            initial={{ width: 0 }}
                            whileInView={{ width: `${widthPct}%` }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.8, delay: i * 0.1 }}
                            className="h-full rounded-lg flex items-center pl-3"
                            style={{
                              background: `linear-gradient(90deg, ${colors[i % colors.length]}CC, ${colors[i % colors.length]})`,
                            }}
                          >
                            <span className="text-xs font-bold text-white drop-shadow-sm">
                              {stage.count}
                            </span>
                          </motion.div>
                        </div>
                        <div className="w-20 text-right flex-shrink-0">
                          {stage.dropOffRate > 0 ? (
                            <span className="text-xs text-red-400 font-medium">
                              -{stage.dropOffRate.toFixed(0)}% drop
                            </span>
                          ) : (
                            <span className="text-xs text-nuanu-gray-300">
                              —
                            </span>
                          )}
                        </div>
                      </div>
                      {i < d.funnelStages.length - 1 && (
                        <div className="flex items-center ml-24 pl-3 mb-1">
                          <ArrowRight className="w-3 h-3 text-nuanu-gray-300" />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </motion.div>

      {/* ══════════════════════════════════════
          SECTION 4: OFFER & RETENTION
          Metrics 11–13
      ══════════════════════════════════════ */}
      <motion.div
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        className="space-y-4"
      >
        <SectionHeader
          icon={<Heart className="w-4 h-4" />}
          title="Offer & Retention"
          subtitle="Metrics 11–13: Acceptance rate, 90-day retention, 6-month quality of hire"
        />

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Offer Acceptance Rate */}
          <div className="card p-6 flex flex-col items-center text-center">
            <span className="badge bg-emerald-50 text-emerald-700 mb-4">
              Metric 11
            </span>
            <div className="relative w-24 h-24">
              <RadialProgress
                value={d.offerAcceptanceRate}
                color={PALETTE.emerald}
                size={96}
              />
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-bold text-nuanu-navy">
                  {d.offerAcceptanceRate.toFixed(0)}
                </span>
                <span className="text-xs font-medium text-emerald-600">%</span>
              </div>
            </div>
            <p className="text-sm font-bold text-nuanu-navy mt-3">
              Offer Acceptance Rate
            </p>
            <p className="text-xs text-nuanu-gray-400 mt-1">
              Accepted offers ÷ Total sent
            </p>
            <div className="mt-3 pt-3 border-t border-nuanu-gray-100 w-full">
              <p
                className={`text-xs font-semibold ${d.offerAcceptanceRate >= 80 ? "text-emerald-600" : d.offerAcceptanceRate >= 60 ? "text-amber-500" : d.offerAcceptanceRate > 0 ? "text-red-500" : "text-nuanu-gray-300"}`}
              >
                {d.offerAcceptanceRate >= 80
                  ? "🟢 Industry-leading"
                  : d.offerAcceptanceRate >= 60
                    ? "🟡 Average"
                    : d.offerAcceptanceRate > 0
                      ? "🔴 Below benchmark"
                      : "No offers yet"}
              </p>
            </div>
          </div>

          {/* 90-Day Retention */}
          <div className="card p-6 flex flex-col items-center text-center">
            <span className="badge bg-blue-50 text-blue-700 mb-4">
              Metric 12
            </span>
            <div className="relative w-24 h-24">
              <RadialProgress
                value={d.retention90Days}
                color={PALETTE.blue}
                size={96}
              />
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-bold text-nuanu-navy">
                  {d.retention90Days.toFixed(0)}
                </span>
                <span className="text-xs font-medium text-blue-600">%</span>
              </div>
            </div>
            <p className="text-sm font-bold text-nuanu-navy mt-3">
              90-Day Retention
            </p>
            <p className="text-xs text-nuanu-gray-400 mt-1">
              New hires retained first 90 days
            </p>
            <div className="mt-3 pt-3 border-t border-nuanu-gray-100 w-full">
              <p
                className={`text-xs font-semibold ${d.retention90Days >= 85 ? "text-emerald-600" : d.retention90Days >= 70 ? "text-amber-500" : d.retention90Days > 0 ? "text-red-500" : "text-nuanu-gray-300"}`}
              >
                {d.retention90Days >= 85
                  ? "🟢 Strong retention"
                  : d.retention90Days >= 70
                    ? "🟡 Moderate"
                    : d.retention90Days > 0
                      ? "🔴 High early turnover"
                      : "Not enough history"}
              </p>
            </div>
          </div>

          {/* 6-Month Quality of Hire */}
          <div className="card p-6 flex flex-col items-center text-center">
            <span className="badge bg-purple-50 text-purple-700 mb-4">
              Metric 13
            </span>
            <div className="relative w-24 h-24">
              <RadialProgress
                value={d.qualityOfHire6Months}
                color={PALETTE.purple}
                size={96}
              />
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-bold text-nuanu-navy">
                  {d.qualityOfHire6Months.toFixed(0)}
                </span>
                <span className="text-xs font-medium text-purple-600">%</span>
              </div>
            </div>
            <p className="text-sm font-bold text-nuanu-navy mt-3">
              Quality of Hire
            </p>
            <p className="text-xs text-nuanu-gray-400 mt-1">
              Retained after 6 months
            </p>
            <div className="mt-3 pt-3 border-t border-nuanu-gray-100 w-full">
              <p
                className={`text-xs font-semibold ${d.qualityOfHire6Months >= 80 ? "text-emerald-600" : d.qualityOfHire6Months >= 60 ? "text-amber-500" : d.qualityOfHire6Months > 0 ? "text-red-500" : "text-nuanu-gray-300"}`}
              >
                {d.qualityOfHire6Months >= 80
                  ? "🟢 Excellent quality"
                  : d.qualityOfHire6Months >= 60
                    ? "🟡 Acceptable"
                    : d.qualityOfHire6Months > 0
                      ? "🔴 Review process"
                      : "Not enough history"}
              </p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* ══════════════════════════════════════
          SECTION 5: COST ANALYTICS
          Metric 10: Cost per Hire
      ══════════════════════════════════════ */}
      <motion.div
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        className="space-y-4"
      >
        <SectionHeader
          icon={<DollarSign className="w-4 h-4" />}
          title="Cost Analytics"
          subtitle="Metric 10: Cost per Hire breakdown by channel"
        />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Cost per hire hero */}
          <div className="card stat-card amber flex flex-col justify-center p-6">
            <span className="badge bg-amber-50 text-amber-700 mb-3 self-start">
              Metric 10
            </span>
            <p className="text-xs font-semibold text-nuanu-gray-500 uppercase tracking-wide mb-1">
              Avg Cost per Hire
            </p>
            <p className="text-3xl font-bold text-nuanu-navy">
              {d.costPerHire > 0 ? fmtRp(d.costPerHire) : "—"}
            </p>
            <p className="text-sm text-nuanu-gray-400 mt-2">
              {d.costPerHire > 0
                ? "Based on channel costs ÷ total hires"
                : "No cost data available yet"}
            </p>
            <div className="mt-4 pt-4 border-t border-nuanu-gray-100">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-nuanu-gray-400 text-xs">Total Hires</p>
                  <p className="font-bold text-nuanu-navy">{d.totalHires}</p>
                </div>
                <div>
                  <p className="text-nuanu-gray-400 text-xs">Total Est. Cost</p>
                  <p className="font-bold text-nuanu-navy">
                    {fmtRp(d.costPerHire * d.totalHires)}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Channel cost breakdown bar chart */}
          <div className="card lg:col-span-2">
            <h3 className="font-bold text-nuanu-navy mb-1">
              Cost per Hire by Channel
            </h3>
            <p className="text-xs text-nuanu-gray-400 mb-4">
              Estimated recruitment spend per successful hire (IDR)
            </p>
            {channelData.filter((c) => c.costPerHire > 0).length === 0 ? (
              <EmptyState message="No cost data by channel" />
            ) : (
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={channelData.filter((c) => c.costPerHire > 0)}
                    margin={{ top: 4, right: 8, bottom: 0, left: 8 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                      stroke="#F1F5F9"
                    />
                    <XAxis
                      dataKey="channel"
                      tick={{ fontSize: 11, fill: "#64748B" }}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: "#64748B" }}
                      tickFormatter={(v) => fmtRp(v)}
                    />
                    <Tooltip
                      formatter={(v: number) => [fmtRp(v), "Cost / Hire"]}
                      contentStyle={{
                        borderRadius: 12,
                        border: "1px solid #E2E8F0",
                        fontSize: 12,
                      }}
                    />
                    <Bar
                      dataKey="costPerHire"
                      name="Cost / Hire"
                      radius={[6, 6, 0, 0]}
                      maxBarSize={48}
                    >
                      {channelData
                        .filter((c) => c.costPerHire > 0)
                        .map((_, i) => (
                          <Cell
                            key={i}
                            fill={CHART_COLORS[i % CHART_COLORS.length]}
                          />
                        ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>
      </motion.div>

      {/* ══════════════════════════════════════
          SECTION 6: DIVERSITY METRICS
          Metric 9: Domicile / Location breakdown
      ══════════════════════════════════════ */}
      <motion.div
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        className="space-y-4"
      >
        <SectionHeader
          icon={<MapPin className="w-4 h-4" />}
          title="Diversity Metrics"
          subtitle="Metric 9: Candidate domicile & location distribution"
        />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Pie chart */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold text-nuanu-navy">
                  Location / Domicile Distribution
                </h3>
                <p className="text-xs text-nuanu-gray-400 mt-0.5">
                  From CandidateProfile.location
                </p>
              </div>
              <span className="badge bg-teal-50 text-teal-700">Metric 9</span>
            </div>

            {d.locationBreakdown.length === 0 ? (
              <EmptyState message="No location data in candidate profiles" />
            ) : (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={d.locationBreakdown.slice(0, 8)}
                      dataKey="count"
                      nameKey="location"
                      cx="50%"
                      cy="50%"
                      outerRadius={90}
                      innerRadius={40}
                      paddingAngle={2}
                      label={({ location, percentage }) =>
                        `${location} ${percentage.toFixed(0)}%`
                      }
                      labelLine={false}
                    >
                      {d.locationBreakdown.slice(0, 8).map((_, i) => (
                        <Cell
                          key={i}
                          fill={CHART_COLORS[i % CHART_COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(v: number, name: string) => [v, name]}
                      contentStyle={{
                        borderRadius: 12,
                        border: "1px solid #E2E8F0",
                        fontSize: 12,
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Location ranked list */}
          <div className="card">
            <h3 className="font-bold text-nuanu-navy mb-4">
              Top Candidate Locations
            </h3>
            {d.locationBreakdown.length === 0 ? (
              <EmptyState message="No location data yet" />
            ) : (
              <div className="space-y-3">
                {d.locationBreakdown.slice(0, 10).map((loc, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <span className="w-6 text-center text-xs font-bold text-nuanu-gray-400">
                      {i + 1}
                    </span>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-sm font-medium text-nuanu-navy">
                          {loc.location || "Unknown"}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-nuanu-gray-400">
                            {loc.count} candidates
                          </span>
                          <span className="text-xs font-bold text-nuanu-navy">
                            {loc.percentage.toFixed(1)}%
                          </span>
                        </div>
                      </div>
                      <div className="h-1.5 bg-nuanu-gray-100 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          whileInView={{ width: `${loc.percentage}%` }}
                          viewport={{ once: true }}
                          transition={{ duration: 0.6, delay: i * 0.05 }}
                          className="h-full rounded-full"
                          style={{
                            background: CHART_COLORS[i % CHART_COLORS.length],
                          }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
                {d.locationBreakdown.length > 10 && (
                  <p className="text-xs text-nuanu-gray-400 text-center pt-1">
                    +{d.locationBreakdown.length - 10} more locations
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </motion.div>

      {/* ══════════════════════════════════════
          OVERALL TREND (last 6 months)
      ══════════════════════════════════════ */}
      <motion.div
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
      >
        <SectionHeader
          icon={<Activity className="w-4 h-4" />}
          title="Monthly Recruiting Activity"
          subtitle="Applications, interviews, offers and hires over time"
        />
        <div className="card">
          {filteredMonthly.length === 0 ? (
            <EmptyState message="No activity data yet" />
          ) : (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={filteredMonthly}
                  margin={{ top: 4, right: 8, bottom: 0, left: 0 }}
                >
                  <defs>
                    {["applications", "interviews", "offers", "hires"].map(
                      (key, i) => (
                        <linearGradient
                          key={key}
                          id={`grad-${key}`}
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="1"
                        >
                          <stop
                            offset="5%"
                            stopColor={CHART_COLORS[i]}
                            stopOpacity={0.3}
                          />
                          <stop
                            offset="95%"
                            stopColor={CHART_COLORS[i]}
                            stopOpacity={0}
                          />
                        </linearGradient>
                      ),
                    )}
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="#F1F5F9"
                  />
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 11, fill: "#64748B" }}
                  />
                  <YAxis tick={{ fontSize: 11, fill: "#64748B" }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Area
                    type="monotone"
                    dataKey="applications"
                    name="Applications"
                    stroke={CHART_COLORS[0]}
                    fill="url(#grad-applications)"
                    strokeWidth={2}
                  />
                  <Area
                    type="monotone"
                    dataKey="interviews"
                    name="Interviews"
                    stroke={CHART_COLORS[1]}
                    fill="url(#grad-interviews)"
                    strokeWidth={2}
                  />
                  <Area
                    type="monotone"
                    dataKey="offers"
                    name="Offers"
                    stroke={CHART_COLORS[2]}
                    fill="url(#grad-offers)"
                    strokeWidth={2}
                  />
                  <Area
                    type="monotone"
                    dataKey="hires"
                    name="Hires"
                    stroke={CHART_COLORS[3]}
                    fill="url(#grad-hires)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
