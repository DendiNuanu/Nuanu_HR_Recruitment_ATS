"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Users, Download, CheckCircle2, Clock, AlertCircle } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { toast } from "sonner";
import EmployeeDetailModal from "./EmployeeDetailModal";

interface Employee {
  id: string;
  employeeCode: string;
  name: string;
  email: string;
  phone: string | null;
  position: string;
  startDate: string;
  status: string;
  retained90: boolean | null;
  retained180: boolean | null;
  check90DueAt: string | null;
  check180DueAt: string | null;
}

export default function EmployeesClient({ employees: initial }: { employees: Employee[] }) {
  const [employees, setEmployees] = useState(initial);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);

  const filtered = employees.filter((e) => {
    const matchSearch =
      e.name.toLowerCase().includes(search.toLowerCase()) ||
      e.email.toLowerCase().includes(search.toLowerCase()) ||
      e.position.toLowerCase().includes(search.toLowerCase()) ||
      e.employeeCode.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || e.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const now = new Date();

  const getDaysUntil = (dateStr: string | null) => {
    if (!dateStr) return null;
    const diff = new Date(dateStr).getTime() - now.getTime();
    return Math.ceil(diff / 86_400_000);
  };

  const handleRetentionToggle = async (id: string, field: "retained90" | "retained180", value: boolean) => {
    setEmployees((prev) => prev.map((e) => e.id === id ? { ...e, [field]: value } : e));
    const res = await fetch(`/api/employees/${id}/retention`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [field]: value }),
    });
    if (res.ok) {
      toast.success(`Retention status updated`);
    } else {
      toast.error("Failed to update retention");
      setEmployees((prev) => prev.map((e) => e.id === id ? { ...e, [field]: !value } : e));
    }
  };

  const exportCSV = () => {
    const headers = ["Employee Code", "Name", "Email", "Position", "Start Date", "Status", "90-Day Retained", "6-Month Retained"];
    const rows = filtered.map((e) => [
      e.employeeCode, e.name, e.email, e.position,
      formatDate(e.startDate), e.status,
      e.retained90 === null ? "Pending" : e.retained90 ? "Yes" : "No",
      e.retained180 === null ? "Pending" : e.retained180 ? "Yes" : "No",
    ]);
    const csv = [headers, ...rows].map((r) => r.map((v) => `"${v}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `employees_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-nuanu-navy flex items-center gap-3">
            <Users className="w-6 h-6 text-emerald-500" /> Employee Database
          </h1>
          <p className="text-sm text-nuanu-gray-500 mt-1">
            {employees.length} employees · Candidates converted after hiring
          </p>
        </div>
        <button onClick={exportCSV} className="btn-secondary text-sm flex items-center gap-2 py-2">
          <Download className="w-4 h-4" /> Export CSV
        </button>
      </div>

      {/* Filters */}
      <div className="card flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-nuanu-gray-400" />
          <input
            type="text"
            placeholder="Search by name, email, position..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-field !pl-12 h-11"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="input-field min-w-[160px]"
        >
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      {/* Table */}
      <div className="card overflow-x-auto">
        {filtered.length === 0 ? (
          <div className="text-center py-16">
            <Users className="w-12 h-12 text-nuanu-gray-200 mx-auto mb-4" />
            <p className="text-lg font-bold text-nuanu-navy">No employees yet</p>
            <p className="text-sm text-nuanu-gray-400 mt-1">
              Employees are automatically added when candidates are moved to the Hired stage.
            </p>
          </div>
        ) : (
          <table className="data-table min-w-full">
            <thead>
              <tr>
                <th>Employee</th>
                <th>Position</th>
                <th>Start Date</th>
                <th>Status</th>
                <th>90-Day Check</th>
                <th>6-Month Check</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((emp, i) => {
                const days90 = getDaysUntil(emp.check90DueAt);
                const days180 = getDaysUntil(emp.check180DueAt);

                return (
                  <motion.tr
                    key={emp.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.03 }}
                    onClick={() => setSelectedEmployeeId(emp.id)}
                    className="cursor-pointer hover:bg-gray-50 transition-colors"
                  >
                    <td>
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-sm">
                          {emp.name.split(" ").map((n) => n[0]).join("").substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-semibold text-nuanu-navy text-sm">{emp.name}</p>
                          <p className="text-xs text-nuanu-gray-400">{emp.email}</p>
                          <p className="text-[10px] text-nuanu-gray-300 font-mono">{emp.employeeCode}</p>
                        </div>
                      </div>
                    </td>
                    <td className="text-sm text-nuanu-navy font-medium">{emp.position}</td>
                    <td className="text-sm text-nuanu-gray-500">{formatDate(emp.startDate)}</td>
                    <td>
                      <span className={`badge text-xs font-bold uppercase ${emp.status === "active" ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-600"}`}>
                        {emp.status}
                      </span>
                    </td>
                    <td>
                      {emp.retained90 !== null ? (
                        <span className={`flex items-center gap-1 text-xs font-bold ${emp.retained90 ? "text-emerald-600" : "text-red-500"}`}>
                          {emp.retained90 ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                          {emp.retained90 ? "Retained" : "Left"}
                        </span>
                      ) : days90 !== null ? (
                        <div>
                          <p className={`text-xs font-bold ${days90 <= 7 ? "text-red-500" : days90 <= 30 ? "text-amber-500" : "text-nuanu-gray-400"}`}>
                            {days90 > 0 ? `Due in ${days90}d` : "Overdue"}
                          </p>
                          <div className="flex gap-2 mt-1">
                            <button onClick={() => handleRetentionToggle(emp.id, "retained90", true)}
                              className="text-[10px] font-bold text-emerald-600 hover:underline">✓ Yes</button>
                            <button onClick={() => handleRetentionToggle(emp.id, "retained90", false)}
                              className="text-[10px] font-bold text-red-500 hover:underline">✗ No</button>
                          </div>
                        </div>
                      ) : <span className="text-xs text-nuanu-gray-300">—</span>}
                    </td>
                    <td>
                      {emp.retained180 !== null ? (
                        <span className={`flex items-center gap-1 text-xs font-bold ${emp.retained180 ? "text-emerald-600" : "text-red-500"}`}>
                          {emp.retained180 ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                          {emp.retained180 ? "Retained" : "Left"}
                        </span>
                      ) : days180 !== null ? (
                        <div>
                          <p className={`text-xs font-bold ${days180 <= 7 ? "text-red-500" : days180 <= 30 ? "text-amber-500" : "text-nuanu-gray-400"}`}>
                            {days180 > 0 ? `Due in ${days180}d` : "Overdue"}
                          </p>
                          <div className="flex gap-2 mt-1">
                            <button onClick={() => handleRetentionToggle(emp.id, "retained180", true)}
                              className="text-[10px] font-bold text-emerald-600 hover:underline">✓ Yes</button>
                            <button onClick={() => handleRetentionToggle(emp.id, "retained180", false)}
                              className="text-[10px] font-bold text-red-500 hover:underline">✗ No</button>
                          </div>
                        </div>
                      ) : <span className="text-xs text-nuanu-gray-300">—</span>}
                    </td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <AnimatePresence>
        {selectedEmployeeId && (
          <EmployeeDetailModal
            employeeId={selectedEmployeeId}
            onClose={() => setSelectedEmployeeId(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
