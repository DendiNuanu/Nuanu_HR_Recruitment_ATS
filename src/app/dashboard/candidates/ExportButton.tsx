"use client";

import { Download } from "lucide-react";
import { Candidate } from "./CandidatesTable";

export default function ExportButton({ candidates }: { candidates: Candidate[] }) {
  const handleExport = () => {
    if (!candidates || candidates.length === 0) {
      alert("No candidates to export.");
      return;
    }

    // 1. Prepare CSV Headers
    const headers = [
      "Candidate ID",
      "Name",
      "Email",
      "Applied Position",
      "Current Stage",
      "AI Match Score",
      "Experience (Years)",
      "Location",
      "Application Date",
      "Skills",
      "Resume Text"
    ];

    // 2. Prepare Data Rows
    // Helper function to safely escape CSV fields that might contain commas, quotes, or newlines
    const escapeCsvField = (field: any) => {
      if (field === null || field === undefined) return '""';
      const stringField = String(field);
      // If the field contains a comma, quote, or newline, we must wrap it in quotes and double any internal quotes
      if (stringField.includes(',') || stringField.includes('"') || stringField.includes('\n')) {
        return `"${stringField.replace(/"/g, '""')}"`;
      }
      return stringField;
    };

    const csvRows = candidates.map((c) => {
      return [
        escapeCsvField(c.id),
        escapeCsvField(c.name),
        escapeCsvField(c.email),
        escapeCsvField(c.vacancyTitle),
        escapeCsvField(c.stage),
        escapeCsvField(c.score),
        escapeCsvField(c.experienceYears),
        escapeCsvField(c.location),
        escapeCsvField(new Date(c.appliedAt).toLocaleDateString()),
        escapeCsvField(c.skills ? c.skills.join(", ") : ""),
        escapeCsvField(c.resumeText || "") // Including the complete resume text!
      ].join(",");
    });

    // 3. Combine headers and rows
    const csvContent = [headers.join(","), ...csvRows].join("\n");

    // 4. Trigger Download
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `Candidates_Export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <button 
      onClick={handleExport}
      className="btn-secondary py-1.5 text-sm flex items-center gap-2 hover:bg-nuanu-navy hover:text-white transition-colors"
      title="Export all candidates to CSV including Resume data"
    >
      <Download className="w-4 h-4" /> Export Data
    </button>
  );
}
