"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createOffer } from "@/app/dashboard/offers/actions";
import CurrencyInput from "@/components/ui/CurrencyInput";
import { Briefcase, Calendar, ChevronLeft, Loader2, Save } from "lucide-react";
import Link from "next/link";

type ActiveApp = {
  id: string;
  candidateName: string;
  vacancyTitle: string;
};

export default function GenerateOfferForm({
  activeApplications,
}: {
  activeApplications: ActiveApp[];
}) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    applicationId: "",
    salary: 15_000_000,
    bonus: 0,
    equity: "",
    benefits: "",
    startDate: new Date().toISOString().split("T")[0],
    expiresAt: "",
    notes: "",
  });

  const selectedApp = activeApplications.find(
    (a) => a.id === formData.applicationId
  );

  const calculateExpiry = (days: number) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    return d.toISOString().split("T")[0];
  };

  const calculateStart = (days: number) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    return d.toISOString().split("T")[0];
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.applicationId) {
      toast.error("Please select a candidate");
      return;
    }
    
    setIsSubmitting(true);
    try {
      const res = await createOffer({
        applicationId: formData.applicationId,
        salary: formData.salary,
        bonus: formData.bonus || undefined,
        equity: formData.equity || undefined,
        benefits: formData.benefits || undefined,
        startDate: formData.startDate,
        expiresAt: formData.expiresAt || undefined,
        notes: formData.notes || undefined,
      });
      
      if (res.success) {
        toast.success("Offer generated successfully!");
        router.push("/dashboard/offers");
        router.refresh();
      } else {
        toast.error(res.error ?? "Failed to generate offer");
      }
    } catch (err) {
      toast.error("An error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto pb-12">
      <div className="mb-6 flex items-center gap-4">
        <Link href="/dashboard/offers" className="text-nuanu-gray-400 hover:text-nuanu-navy bg-white p-2 rounded-xl shadow-sm border border-gray-100 transition-colors">
          <ChevronLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-nuanu-navy">Generate New Offer</h1>
          <p className="text-sm text-nuanu-gray-500 mt-1">Create a formal offer package and send it to the candidate</p>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-8 items-start">
        {/* LEFT COLUMN: FORM */}
        <div className="flex-1 w-full bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <form id="offer-form" onSubmit={handleSubmit} className="space-y-6">
            
            <div>
              <label className="block text-sm font-semibold text-nuanu-navy mb-2">
                Candidate Application <span className="text-red-500">*</span>
              </label>
              <select
                required
                className="input-field"
                value={formData.applicationId}
                onChange={(e) => setFormData({ ...formData, applicationId: e.target.value })}
              >
                <option value="">Select a candidate...</option>
                {activeApplications.map((app) => (
                  <option key={app.id} value={app.id}>
                    {app.candidateName} — {app.vacancyTitle}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-nuanu-navy mb-2">
                  Monthly Salary (RP) <span className="text-red-500">*</span>
                </label>
                <CurrencyInput
                  value={formData.salary}
                  onChange={(v) => setFormData({ ...formData, salary: v })}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-nuanu-navy mb-2">
                  Signing Bonus (RP)
                </label>
                <CurrencyInput
                  value={formData.bonus}
                  onChange={(v) => setFormData({ ...formData, bonus: v })}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-nuanu-navy mb-2">
                Equity / Stock Options
              </label>
              <input
                type="text"
                className="input-field"
                placeholder="e.g. 0.1% vested over 4 years"
                value={formData.equity}
                onChange={(e) => setFormData({ ...formData, equity: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-nuanu-navy mb-2">
                Benefits & Perks
              </label>
              <textarea
                className="input-field min-h-[100px]"
                placeholder="Health insurance, meal allowance, remote work options..."
                value={formData.benefits}
                onChange={(e) => setFormData({ ...formData, benefits: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-nuanu-navy mb-2">
                  Proposed Start Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  required
                  className="input-field mb-2"
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                />
                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={() => setFormData({ ...formData, startDate: calculateStart(0) })} className="badge bg-gray-100 hover:bg-gray-200 text-gray-700 cursor-pointer">Today</button>
                  <button type="button" onClick={() => setFormData({ ...formData, startDate: calculateStart(7) })} className="badge bg-gray-100 hover:bg-gray-200 text-gray-700 cursor-pointer">+1 Week</button>
                  <button type="button" onClick={() => setFormData({ ...formData, startDate: calculateStart(14) })} className="badge bg-gray-100 hover:bg-gray-200 text-gray-700 cursor-pointer">+2 Weeks</button>
                  <button type="button" onClick={() => setFormData({ ...formData, startDate: calculateStart(30) })} className="badge bg-gray-100 hover:bg-gray-200 text-gray-700 cursor-pointer">+1 Month</button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-nuanu-navy mb-2">
                  Offer Expiry Date
                </label>
                <input
                  type="date"
                  className="input-field mb-2"
                  value={formData.expiresAt}
                  onChange={(e) => setFormData({ ...formData, expiresAt: e.target.value })}
                />
                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={() => setFormData({ ...formData, expiresAt: calculateExpiry(7) })} className="badge bg-gray-100 hover:bg-gray-200 text-gray-700 cursor-pointer">+1 Week</button>
                  <button type="button" onClick={() => setFormData({ ...formData, expiresAt: calculateExpiry(14) })} className="badge bg-gray-100 hover:bg-gray-200 text-gray-700 cursor-pointer">+2 Weeks</button>
                  <button type="button" onClick={() => setFormData({ ...formData, expiresAt: calculateExpiry(30) })} className="badge bg-gray-100 hover:bg-gray-200 text-gray-700 cursor-pointer">+1 Month</button>
                  <button type="button" onClick={() => setFormData({ ...formData, expiresAt: calculateExpiry(90) })} className="badge bg-gray-100 hover:bg-gray-200 text-gray-700 cursor-pointer">+3 Months</button>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-nuanu-navy mb-2">
                Internal Notes
              </label>
              <textarea
                className="input-field min-h-[80px]"
                placeholder="Approvals, special conditions, reminders..."
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              />
            </div>
            
          </form>
        </div>

        {/* RIGHT COLUMN: SUMMARY SIDEBAR */}
        <div className="w-full md:w-[35%] lg:w-[32%] shrink-0">
          <div className="sticky top-6 bg-white rounded-2xl shadow-md border border-gray-200 overflow-hidden">
            <div className="bg-nuanu-gray-50 px-6 py-4 border-b border-gray-100">
              <h3 className="font-bold text-nuanu-navy tracking-wide text-sm flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-emerald-600" /> 
                OFFER SUMMARY
              </h3>
            </div>
            
            <div className="p-6 space-y-5">
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Candidate Name</p>
                <p className="font-medium text-nuanu-navy break-words">
                  {selectedApp ? selectedApp.candidateName : <span className="text-gray-400 italic">Not selected</span>}
                </p>
              </div>

              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Position Applied For</p>
                <p className="font-medium text-nuanu-navy break-words">
                  {selectedApp ? selectedApp.vacancyTitle : <span className="text-gray-400 italic">Not selected</span>}
                </p>
              </div>

              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Monthly Salary</p>
                <p className="font-bold text-emerald-500 text-lg">
                  Rp {formData.salary.toLocaleString("id-ID")}
                </p>
              </div>

              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Start Date</p>
                <p className="font-medium text-nuanu-navy flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-gray-400" />
                  {formData.startDate || <span className="text-gray-400 italic">Not set</span>}
                </p>
              </div>

              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Offer Expires</p>
                <p className="font-medium text-nuanu-navy flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-gray-400" />
                  {formData.expiresAt || <span className="text-gray-400 italic">Not set</span>}
                </p>
              </div>
            </div>

            <div className="p-6 bg-gray-50 border-t border-gray-100 flex flex-col gap-3">
              <button
                type="submit"
                form="offer-form"
                disabled={isSubmitting}
                className="btn-primary w-full flex justify-center py-3 bg-emerald-500 hover:bg-emerald-600 border-emerald-500 text-white shadow-sm shadow-emerald-500/20"
              >
                {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5 mr-2" />}
                {isSubmitting ? "Generating..." : "Generate Offer"}
              </button>
              <button
                type="button"
                onClick={() => router.push("/dashboard/offers")}
                className="btn-secondary w-full flex justify-center py-3 bg-white text-gray-600 hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
