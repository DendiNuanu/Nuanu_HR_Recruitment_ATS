"use client";

import { useState, useEffect } from "react";
import { X, Loader2, Save, FileText } from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

type ModalProps = {
  employee: {
    id: string;
    candidateName: string;
    position: string;
    department: string;
    startDate: string;
    employmentType: string;
  };
  onClose: () => void;
  onSuccess: () => void;
};

export default function NewHireConfirmationModal({ employee, onClose, onSuccess }: ModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const [formData, setFormData] = useState({
    employmentType: employee.employmentType || "Full Time",
    contractStart: employee.startDate ? new Date(employee.startDate).toISOString().split("T")[0] : "",
    contractEnd: "",
    isPermanent: false,
    workLocation: "Onsite",
    workingHours: "08:00–17:00, Mon–Fri",
    reportingTo: "",
    salaryType: "Gross",
    basicSalary: "",
    mealAllowance: "",
    transportAllowance: "",
    healthAllowance: "",
    otherAllowanceLabel: "",
    otherAllowanceAmount: "",
    laptopProvided: false,
    laptopType: "",
    companyEmail: `${employee.candidateName.split(" ")[0].toLowerCase()}@nuanu.com`,
    nametagRequired: false,
    lunchProvided: false,
    accessCard: false,
    notes: "",
  });

  useEffect(() => {
    // Fetch draft if exists
    async function fetchDraft() {
      try {
        const res = await fetch(`/api/employee-contracts/${employee.id}`);
        if (res.ok) {
          const data = await res.json();
          if (data.contract) {
            setFormData({
              employmentType: data.contract.employmentType,
              contractStart: new Date(data.contract.contractStart).toISOString().split("T")[0],
              contractEnd: data.contract.contractEnd ? new Date(data.contract.contractEnd).toISOString().split("T")[0] : "",
              isPermanent: data.contract.isPermanent,
              workLocation: data.contract.workLocation,
              workingHours: data.contract.workingHours,
              reportingTo: data.contract.reportingTo,
              salaryType: data.contract.salaryType,
              basicSalary: data.contract.basicSalary.toString(),
              mealAllowance: data.contract.mealAllowance?.toString() || "",
              transportAllowance: data.contract.transportAllowance?.toString() || "",
              healthAllowance: data.contract.healthAllowance?.toString() || "",
              otherAllowanceLabel: data.contract.otherAllowanceLabel || "",
              otherAllowanceAmount: data.contract.otherAllowanceAmount?.toString() || "",
              laptopProvided: data.contract.laptopProvided,
              laptopType: data.contract.laptopType || "",
              companyEmail: data.contract.companyEmail || "",
              nametagRequired: data.contract.nametagRequired,
              lunchProvided: data.contract.lunchProvided,
              accessCard: data.contract.accessCard,
              notes: data.contract.notes || "",
            });
          }
        }
      } catch (err) {
        console.error("Failed to fetch draft", err);
      } finally {
        setIsLoading(false);
      }
    }
    fetchDraft();
  }, [employee.id]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    if (type === "checkbox") {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData((prev) => ({ ...prev, [name]: checked }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleSave = async (action: "draft" | "finalize") => {
    if (!formData.basicSalary || Number(formData.basicSalary) <= 0) {
      toast.error("Basic Salary is required and must be greater than 0");
      return;
    }
    if (!formData.contractStart) {
      toast.error("Contract Start Date is required");
      return;
    }
    if (!formData.isPermanent && !formData.contractEnd) {
      toast.error("Contract End Date is required for non-permanent employees");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        employee_id: employee.id,
        action,
        ...formData,
        basicSalary: Number(formData.basicSalary),
        mealAllowance: Number(formData.mealAllowance) || 0,
        transportAllowance: Number(formData.transportAllowance) || 0,
        healthAllowance: Number(formData.healthAllowance) || 0,
        otherAllowanceAmount: Number(formData.otherAllowanceAmount) || 0,
      };

      const res = await fetch("/api/employee-contracts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const data = await res.json();
        
        if (action === "finalize" && data.contract_id) {
          toast.success("Contract finalized! Generating memo...");
          try {
            const genRes = await fetch(`/api/memo-hire/generate/${data.contract_id}`, { method: "POST" });
            if (genRes.ok) {
              toast.success("Memo Hire generated successfully!");
            } else {
              toast.error("Failed to generate Memo Hire");
            }
          } catch (e) {
            toast.error("Error generating Memo Hire");
          }
        } else {
          toast.success("Draft saved!");
        }
        onSuccess();
      } else {
        const err = await res.json();
        toast.error(err.error || "Failed to save contract");
      }
    } catch (err) {
      toast.error("An unexpected error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  const basic = Number(formData.basicSalary) || 0;
  const meal = Number(formData.mealAllowance) || 0;
  const transport = Number(formData.transportAllowance) || 0;
  const health = Number(formData.healthAllowance) || 0;
  const other = Number(formData.otherAllowanceAmount) || 0;
  const totalPackage = basic + meal + transport + health + other;

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(val);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-nuanu-navy/40 backdrop-blur-sm"
        onClick={() => !isSubmitting && onClose()}
      />

      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col relative z-10 overflow-hidden"
      >
        <div className="flex items-center justify-between p-6 border-b border-gray-100 bg-gray-50/50">
          <div>
            <h2 className="text-xl font-bold text-nuanu-navy flex items-center gap-2">
              <FileText className="w-5 h-5 text-nuanu-emerald" />
              New Hire Confirmation
            </h2>
            <p className="text-sm text-nuanu-gray-500 mt-1">Finalize employment details and generate Memo Hire</p>
          </div>
          <button onClick={onClose} disabled={isSubmitting} className="p-2 text-gray-400 hover:bg-gray-100 rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {isLoading ? (
          <div className="flex-1 flex items-center justify-center p-12">
            <Loader2 className="w-8 h-8 animate-spin text-nuanu-emerald" />
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-6 space-y-8">
            {/* Read-only header */}
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex flex-wrap gap-4 items-center justify-between">
              <div>
                <p className="text-xs font-bold text-blue-900 uppercase tracking-wider mb-1">Employee</p>
                <p className="text-sm font-semibold text-blue-950">{employee.candidateName}</p>
              </div>
              <div>
                <p className="text-xs font-bold text-blue-900 uppercase tracking-wider mb-1">Position</p>
                <p className="text-sm font-semibold text-blue-950">{employee.position}</p>
              </div>
              <div>
                <p className="text-xs font-bold text-blue-900 uppercase tracking-wider mb-1">Department</p>
                <p className="text-sm font-semibold text-blue-950">{employee.department}</p>
              </div>
              <div>
                <p className="text-xs font-bold text-blue-900 uppercase tracking-wider mb-1">Join Date</p>
                <p className="text-sm font-semibold text-blue-950">{new Date(employee.startDate).toLocaleDateString()}</p>
              </div>
            </div>

            {/* Section A: Employment Details */}
            <section>
              <h3 className="text-sm font-bold text-nuanu-navy border-b border-gray-100 pb-2 mb-4 uppercase tracking-wider">A. Employment Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Employment Type</label>
                  <select name="employmentType" value={formData.employmentType} onChange={handleChange} className="input-field py-2">
                    <option>Full Time</option>
                    <option>Part Time</option>
                    <option>Contract</option>
                    <option>Internship</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Reporting To</label>
                  <input type="text" name="reportingTo" value={formData.reportingTo} onChange={handleChange} placeholder="Manager Name" className="input-field py-2" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Contract Start Date *</label>
                  <input type="date" name="contractStart" value={formData.contractStart} onChange={handleChange} className="input-field py-2" required />
                </div>
                <div className="flex flex-col">
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5 flex items-center justify-between">
                    Contract End Date
                    <label className="flex items-center gap-1.5 text-nuanu-navy cursor-pointer">
                      <input type="checkbox" name="isPermanent" checked={formData.isPermanent} onChange={handleChange} className="rounded text-nuanu-emerald focus:ring-nuanu-emerald w-3.5 h-3.5" />
                      <span className="text-[10px] uppercase font-bold">Permanent?</span>
                    </label>
                  </label>
                  {!formData.isPermanent ? (
                    <input type="date" name="contractEnd" value={formData.contractEnd} onChange={handleChange} className="input-field py-2" />
                  ) : (
                    <div className="input-field py-2 bg-gray-50 text-gray-400 italic">Permanent (No end date)</div>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Work Location</label>
                  <select name="workLocation" value={formData.workLocation} onChange={handleChange} className="input-field py-2">
                    <option>Onsite</option>
                    <option>Remote</option>
                    <option>Hybrid</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Working Hours</label>
                  <input type="text" name="workingHours" value={formData.workingHours} onChange={handleChange} placeholder="e.g. 08:00–17:00, Mon–Fri" className="input-field py-2" />
                </div>
              </div>
            </section>

            {/* Section B: Compensation */}
            <section>
              <h3 className="text-sm font-bold text-nuanu-navy border-b border-gray-100 pb-2 mb-4 uppercase tracking-wider">B. Compensation</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Salary Type</label>
                  <select name="salaryType" value={formData.salaryType} onChange={handleChange} className="input-field py-2">
                    <option>Gross</option>
                    <option>Nett</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Basic Salary *</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm font-semibold">Rp</span>
                    <input type="number" name="basicSalary" value={formData.basicSalary} onChange={handleChange} className="input-field py-2 pl-10" required />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Meal Allowance (Optional)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm font-semibold">Rp</span>
                    <input type="number" name="mealAllowance" value={formData.mealAllowance} onChange={handleChange} className="input-field py-2 pl-10" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Transport Allowance (Optional)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm font-semibold">Rp</span>
                    <input type="number" name="transportAllowance" value={formData.transportAllowance} onChange={handleChange} className="input-field py-2 pl-10" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Health Allowance (Optional)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm font-semibold">Rp</span>
                    <input type="number" name="healthAllowance" value={formData.healthAllowance} onChange={handleChange} className="input-field py-2 pl-10" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5">Other Allowance</label>
                    <input type="text" name="otherAllowanceLabel" value={formData.otherAllowanceLabel} onChange={handleChange} placeholder="Label" className="input-field py-2" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5">&nbsp;</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm font-semibold">Rp</span>
                      <input type="number" name="otherAllowanceAmount" value={formData.otherAllowanceAmount} onChange={handleChange} className="input-field py-2 pl-10" />
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="mt-6 bg-emerald-50 border border-emerald-100 rounded-xl p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-emerald-900 uppercase tracking-wider">Total Package</p>
                  <p className="text-[10px] text-emerald-700">Auto-calculated sum of all allowances and salary</p>
                </div>
                <div className="text-xl font-bold text-emerald-700">
                  {formatCurrency(totalPackage)}
                </div>
              </div>
            </section>

            {/* Section C: Assets & Facilities */}
            <section>
              <h3 className="text-sm font-bold text-nuanu-navy border-b border-gray-100 pb-2 mb-4 uppercase tracking-wider">C. Assets & Facilities</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-xl cursor-pointer hover:bg-gray-50 transition-colors">
                  <input type="checkbox" name="laptopProvided" checked={formData.laptopProvided} onChange={handleChange} className="rounded text-nuanu-emerald focus:ring-nuanu-emerald w-4 h-4" />
                  <span className="text-sm font-semibold text-nuanu-navy">Laptop Provided</span>
                </label>
                <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-xl cursor-pointer hover:bg-gray-50 transition-colors">
                  <input type="checkbox" name="nametagRequired" checked={formData.nametagRequired} onChange={handleChange} className="rounded text-nuanu-emerald focus:ring-nuanu-emerald w-4 h-4" />
                  <span className="text-sm font-semibold text-nuanu-navy">Nametag Req.</span>
                </label>
                <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-xl cursor-pointer hover:bg-gray-50 transition-colors">
                  <input type="checkbox" name="lunchProvided" checked={formData.lunchProvided} onChange={handleChange} className="rounded text-nuanu-emerald focus:ring-nuanu-emerald w-4 h-4" />
                  <span className="text-sm font-semibold text-nuanu-navy">Lunch Provided</span>
                </label>
                <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-xl cursor-pointer hover:bg-gray-50 transition-colors">
                  <input type="checkbox" name="accessCard" checked={formData.accessCard} onChange={handleChange} className="rounded text-nuanu-emerald focus:ring-nuanu-emerald w-4 h-4" />
                  <span className="text-sm font-semibold text-nuanu-navy">Access Card</span>
                </label>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {formData.laptopProvided && (
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5">Laptop Type / Specs</label>
                    <input type="text" name="laptopType" value={formData.laptopType} onChange={handleChange} placeholder="e.g. MacBook Pro M3" className="input-field py-2" />
                  </div>
                )}
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Company Email</label>
                  <input type="email" name="companyEmail" value={formData.companyEmail} onChange={handleChange} placeholder="firstname@nuanu.com" className="input-field py-2" />
                </div>
              </div>
              <div className="mt-4">
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Notes / Special Instructions</label>
                <textarea name="notes" value={formData.notes} onChange={handleChange} placeholder="Any additional notes..." className="input-field py-2 min-h-[80px]" />
              </div>
            </section>
          </div>
        )}

        {/* Footer Actions */}
        <div className="p-6 border-t border-gray-100 bg-gray-50 flex items-center justify-between gap-4">
          <button onClick={() => !isSubmitting && onClose()} disabled={isSubmitting} className="text-sm font-semibold text-gray-500 hover:text-gray-700 px-4 py-2">
            Cancel
          </button>
          <div className="flex items-center gap-3">
            <button
              onClick={() => handleSave("draft")}
              disabled={isSubmitting}
              className="btn-secondary gap-2 border-gray-300 shadow-sm bg-white hover:bg-gray-50"
            >
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save as Draft
            </button>
            <button
              onClick={() => handleSave("finalize")}
              disabled={isSubmitting}
              className="btn-primary gap-2"
            >
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save & Generate Memo Hire →"}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
