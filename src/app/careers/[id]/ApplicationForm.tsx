"use client";

import { useState } from "react";
import { UploadCloud, CheckCircle2 } from "lucide-react";

export default function ApplicationForm({ jobId }: { jobId: string }) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState("");
  const [file, setFile] = useState<File | null>(null);

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    linkedin: "",
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setError("Please upload your Resume / CV");
      return;
    }
    
    setIsSubmitting(true);
    setError("");

    try {
      // Create FormData to send file + fields
      const submitData = new FormData();
      submitData.append("jobId", jobId);
      submitData.append("firstName", formData.firstName);
      submitData.append("lastName", formData.lastName);
      submitData.append("email", formData.email);
      submitData.append("phone", formData.phone);
      submitData.append("linkedin", formData.linkedin);
      submitData.append("resume", file);

      // We'll simulate upload delay then post the JSON (since we don't have real S3)
      // Real API route requires JSON, so we will send JSON for now but mock the file upload delay
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const res = await fetch("/api/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...formData, jobId, resumeUrl: "https://mock-storage.com/" + file.name }),
      });

      if (!res.ok) throw new Error("Failed to submit application");
      
      setIsSuccess(true);
    } catch (err: any) {
      setError(err.message || "An error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="text-center py-6">
        <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 className="w-8 h-8 text-emerald-600" />
        </div>
        <h4 className="text-xl font-bold text-nuanu-navy mb-2">Application Sent!</h4>
        <p className="text-sm text-nuanu-gray-500">
          Thank you for applying. Our recruitment team will review your profile and get back to you soon.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100">{error}</div>}
      
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-nuanu-gray-600 mb-1">First Name *</label>
          <input required type="text" className="input-field py-2.5 text-sm" value={formData.firstName} onChange={e => setFormData({...formData, firstName: e.target.value})} />
        </div>
        <div>
          <label className="block text-xs font-semibold text-nuanu-gray-600 mb-1">Last Name *</label>
          <input required type="text" className="input-field py-2.5 text-sm" value={formData.lastName} onChange={e => setFormData({...formData, lastName: e.target.value})} />
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold text-nuanu-gray-600 mb-1">Email Address *</label>
        <input required type="email" className="input-field py-2.5 text-sm" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
      </div>

      <div>
        <label className="block text-xs font-semibold text-nuanu-gray-600 mb-1">Phone Number</label>
        <input type="tel" className="input-field py-2.5 text-sm" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
      </div>

      <div>
        <label className="block text-xs font-semibold text-nuanu-gray-600 mb-1">LinkedIn Profile</label>
        <input type="url" placeholder="https://linkedin.com/in/..." className="input-field py-2.5 text-sm" value={formData.linkedin} onChange={e => setFormData({...formData, linkedin: e.target.value})} />
      </div>

      <div>
        <label className="block text-xs font-semibold text-nuanu-gray-600 mb-1">Resume / CV *</label>
        <label className="block border-2 border-dashed border-emerald-500/30 bg-emerald-50/30 rounded-xl p-4 text-center hover:bg-emerald-50/60 transition-colors cursor-pointer relative overflow-hidden">
          <input type="file" accept=".pdf,.doc,.docx" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleFileChange} />
          {file ? (
             <div className="flex flex-col items-center justify-center">
               <CheckCircle2 className="w-6 h-6 text-emerald-500 mx-auto mb-2" />
               <p className="text-sm text-emerald-700 font-bold truncate max-w-[200px]">{file.name}</p>
               <p className="text-[10px] text-emerald-600/70 mt-1">Click to change file</p>
             </div>
          ) : (
             <>
               <UploadCloud className="w-6 h-6 text-emerald-500 mx-auto mb-2" />
               <p className="text-xs text-emerald-700 font-bold">Click to upload PDF or DOCX</p>
               <p className="text-[10px] text-emerald-600/70 mt-1">Max 5MB</p>
             </>
          )}
        </label>
      </div>

      <button disabled={isSubmitting} type="submit" className="w-full btn-primary mt-2 flex items-center justify-center gap-2">
        {isSubmitting ? (
          <>
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            <span>Uploading & Submitting...</span>
          </>
        ) : "Submit Application"}
      </button>
    </form>
  );
}
