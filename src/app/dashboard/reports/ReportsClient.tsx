"use client";

import { useState } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { Download, BarChart3, Users, Briefcase, TrendingUp, UserCheck } from "lucide-react";

interface Props {
  year: number;
  monthlySummary: { month: string; applications: number; interviews: number; hires: number; offers: number }[];
  stageReport: { stage: string; count: number }[];
  channelReport: { channel: string; applications: number; hires: number; conversionRate: number }[];
  interviewerReport: { name: string; interviews: number; avgRating: number | null }[];
  headcountReport: { dept: string; open: number; filled: number; total: number }[];
}

const TABS = [
  { id: "monthly", label: "Monthly Summary", icon: BarChart3 },
  { id: "pipeline", label: "Pipeline Stages", icon: TrendingUp },
  { id: "channel", label: "Channel Performance", icon: Briefcase },
  { id: "interviewer", label: "Interviewer Performance", icon: UserCheck },
  { id: "headcount", label: "Headcount", icon: Users },
];

function exportCSV(headers: string[], rows: (string | number | null)[][], filename: string) {
  const csv = [headers, ...rows].map((r) => r.map((v) => `"${v ?? ""}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function ReportsClient({ year, monthlySummary, stageReport, channelReport, interviewerReport, headcountReport }: Props) {
  const [activeTab, setActiveTab] = useState("monthly");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-nuanu-navy flex items-center gap-3">
            <BarChart3 className="w-6 h-6 text-emerald-500" /> Reports
          </h1>
          <p className="text-sm text-nuanu-gray-500 mt-1">Recruitment reports for {year}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 flex-wrap border-b border-nuanu-gray-100 pb-0">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-bold border-b-2 transition-all -mb-px ${
              activeTab === id
                ? "border-emerald-500 text-emerald-700"
                : "border-transparent text-nuanu-gray-400 hover:text-nuanu-navy"
            }`}
          >
            <Icon className="w-4 h-4" /> {label}
          </button>
        ))}
      </div>

      {/* Monthly Summary */}
      {activeTab === "monthly" && (
        <div className="card space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-nuanu-navy">Monthly Recruitment Summary — {year}</h2>
            <button
              onClick={() => exportCSV(
                ["Month", "Applications", "Interviews", "Offers", "Hires"],
                monthlySummary.map((r) => [r.month, r.applications, r.interviews, r.offers, r.hires]),
                `monthly_summary_${year}.csv`
              )}
              className="btn-secondary text-xs py-1.5 flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" /> Export CSV
            </button>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={monthlySummary}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Legend />
              <Bar dataKey="applications" fill="#6366F1" name="Applications" radius={[4, 4, 0, 0]} />
              <Bar dataKey="interviews" fill="#3B82F6" name="Interviews" radius={[4, 4, 0, 0]} />
              <Bar dataKey="offers" fill="#F59E0B" name="Offers" radius={[4, 4, 0, 0]} />
              <Bar dataKey="hires" fill="#22C55E" name="Hires" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
          <table className="data-table w-full text-sm">
            <thead><tr><th>Month</th><th>Applications</th><th>Interviews</th><th>Offers</th><th>Hires</th></tr></thead>
            <tbody>
              {monthlySummary.map((r) => (
                <tr key={r.month}>
                  <td className="font-medium">{r.month}</td>
                  <td>{r.applications}</td>
                  <td>{r.interviews}</td>
                  <td>{r.offers}</td>
                  <td className="font-bold text-emerald-600">{r.hires}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pipeline Stages */}
      {activeTab === "pipeline" && (
        <div className="card space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-nuanu-navy">Pipeline Stage Distribution</h2>
            <button
              onClick={() => exportCSV(["Stage", "Count"], stageReport.map((r) => [r.stage, r.count]), `pipeline_stages_${year}.csv`)}
              className="btn-secondary text-xs py-1.5 flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" /> Export CSV
            </button>
          </div>
          <table className="data-table w-full text-sm">
            <thead><tr><th>Stage</th><th>Candidates</th><th>% of Total</th></tr></thead>
            <tbody>
              {stageReport.map((r) => {
                const total = stageReport.reduce((s, x) => s + x.count, 0);
                return (
                  <tr key={r.stage}>
                    <td className="font-medium capitalize">{r.stage.replace(/_/g, " ")}</td>
                    <td>{r.count}</td>
                    <td>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden max-w-[120px]">
                          <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${total > 0 ? (r.count / total) * 100 : 0}%` }} />
                        </div>
                        <span>{total > 0 ? Math.round((r.count / total) * 100) : 0}%</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Channel Performance */}
      {activeTab === "channel" && (
        <div className="card space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-nuanu-navy">Channel Performance</h2>
            <button
              onClick={() => exportCSV(
                ["Channel", "Applications", "Hires", "Conversion Rate"],
                channelReport.map((r) => [r.channel, r.applications, r.hires, `${r.conversionRate}%`]),
                `channel_performance_${year}.csv`
              )}
              className="btn-secondary text-xs py-1.5 flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" /> Export CSV
            </button>
          </div>
          <table className="data-table w-full text-sm">
            <thead><tr><th>Channel</th><th>Applications</th><th>Hires</th><th>Conversion Rate</th></tr></thead>
            <tbody>
              {channelReport.map((r) => (
                <tr key={r.channel}>
                  <td className="font-medium capitalize">{r.channel}</td>
                  <td>{r.applications}</td>
                  <td className="font-bold text-emerald-600">{r.hires}</td>
                  <td>{r.conversionRate}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Interviewer Performance */}
      {activeTab === "interviewer" && (
        <div className="card space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-nuanu-navy">Interviewer Performance</h2>
            <button
              onClick={() => exportCSV(
                ["Interviewer", "Interviews Conducted", "Avg Rating"],
                interviewerReport.map((r) => [r.name, r.interviews, r.avgRating ?? "N/A"]),
                `interviewer_performance_${year}.csv`
              )}
              className="btn-secondary text-xs py-1.5 flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" /> Export CSV
            </button>
          </div>
          {interviewerReport.length === 0 ? (
            <p className="text-center py-8 text-nuanu-gray-400">No interview data for this period.</p>
          ) : (
            <table className="data-table w-full text-sm">
              <thead><tr><th>Interviewer</th><th>Interviews</th><th>Avg Rating</th></tr></thead>
              <tbody>
                {interviewerReport.map((r) => (
                  <tr key={r.name}>
                    <td className="font-medium">{r.name}</td>
                    <td>{r.interviews}</td>
                    <td>{r.avgRating !== null ? `${r.avgRating}/5` : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Headcount */}
      {activeTab === "headcount" && (
        <div className="card space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-nuanu-navy">Headcount by Department</h2>
            <button
              onClick={() => exportCSV(
                ["Department", "Total HC", "Filled", "Open"],
                headcountReport.map((r) => [r.dept, r.total, r.filled, r.open]),
                `headcount_${year}.csv`
              )}
              className="btn-secondary text-xs py-1.5 flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" /> Export CSV
            </button>
          </div>
          <table className="data-table w-full text-sm">
            <thead><tr><th>Department</th><th>Total HC</th><th>Filled</th><th>Open</th><th>Fill Rate</th></tr></thead>
            <tbody>
              {headcountReport.map((r) => (
                <tr key={r.dept}>
                  <td className="font-medium">{r.dept}</td>
                  <td>{r.total}</td>
                  <td className="text-emerald-600 font-bold">{r.filled}</td>
                  <td className="text-amber-600 font-bold">{r.open}</td>
                  <td>{r.total > 0 ? Math.round((r.filled / r.total) * 100) : 0}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
