"use client";

import { useState } from "react";
import { Search, Filter, FileText, CheckCircle2, XCircle, Send, MoreVertical, DollarSign, X, Loader2, Calendar } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { formatDate } from "@/lib/utils";
import { createOffer, sendOffer } from "./actions";

export type OfferData = {
  id: string;
  candidateName: string;
  position: string;
  salary: number;
  bonus?: number;
  status: string;
  startDate: string | Date;
};

export type ActiveApp = {
  id: string;
  candidateName: string;
  vacancyTitle: string;
};

export default function OffersClient({ 
  offers,
  activeApplications = []
}: { 
  offers: OfferData[],
  activeApplications?: ActiveApp[]
}) {
  const [search, setSearch] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    applicationId: "",
    salary: 50000,
    bonus: 0,
    startDate: new Date().toISOString().split('T')[0],
    notes: ""
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.applicationId) return;

    setIsSubmitting(true);
    try {
      const res = await createOffer(formData);
      if (res.success) {
        setIsModalOpen(false);
        setFormData({
          applicationId: "",
          salary: 50000,
          bonus: 0,
          startDate: new Date().toISOString().split('T')[0],
          notes: ""
        });
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSendOffer = async (id: string) => {
    if (!confirm("Are you sure you want to send this offer to the candidate?")) return;
    await sendOffer(id);
  };

  const getStatusBadge = (status: string) => {
    switch(status) {
      case 'accepted': return <span className="badge bg-emerald-100 text-emerald-700">Accepted</span>;
      case 'sent': return <span className="badge bg-blue-100 text-blue-700">Sent</span>;
      case 'draft': return <span className="badge bg-nuanu-gray-100 text-nuanu-gray-700">Draft</span>;
      case 'rejected': return <span className="badge bg-red-100 text-red-700">Rejected</span>;
      default: return <span className="badge bg-nuanu-gray-100 text-nuanu-gray-700">{status}</span>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-nuanu-navy">Offers & Contracts</h1>
          <p className="text-sm text-nuanu-gray-500 mt-1">Generate, send, and track candidate offer letters</p>
        </div>
        <button onClick={() => setIsModalOpen(true)} className="btn-primary">
          <FileText className="w-5 h-5" /> Generate Offer
        </button>
      </div>

      <div className="card">
        {/* ... (keep existing filter and table code) ... */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6 border-b border-nuanu-gray-100 pb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-nuanu-gray-400" />
            <input
              type="text"
              placeholder="Search by candidate name or position..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input-field pl-10"
            />
          </div>
          <div className="relative min-w-[200px]">
            <select className="input-field appearance-none">
              <option value="all">All Statuses</option>
              <option value="draft">Draft</option>
              <option value="sent">Sent</option>
              <option value="accepted">Accepted</option>
              <option value="rejected">Rejected</option>
            </select>
            <Filter className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-nuanu-gray-400 pointer-events-none" />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Candidate</th>
                <th>Position</th>
                <th>Compensation</th>
                <th>Status</th>
                <th>Start Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {offers.filter(o => o.candidateName.toLowerCase().includes(search.toLowerCase())).map((offer, i) => (
                <motion.tr
                  key={offer.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <td>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-xs">
                        {offer.candidateName.charAt(0)}
                      </div>
                      <span className="font-semibold text-nuanu-navy">{offer.candidateName}</span>
                    </div>
                  </td>
                  <td>
                    <span className="text-nuanu-gray-600 text-sm">{offer.position}</span>
                  </td>
                  <td>
                    <div className="flex items-center gap-1.5 text-sm font-medium text-nuanu-navy">
                      <DollarSign className="w-4 h-4 text-nuanu-emerald" />
                      {offer.salary.toLocaleString()} / yr
                    </div>
                    {offer.bonus && <div className="text-xs text-nuanu-gray-500 mt-0.5">+ ${(offer.bonus).toLocaleString()} bonus</div>}
                  </td>
                  <td>{getStatusBadge(offer.status)}</td>
                  <td>
                    <span className="text-sm text-nuanu-gray-600">{formatDate(offer.startDate)}</span>
                  </td>
                  <td>
                    <div className="flex items-center gap-2">
                      <button className="p-1.5 text-nuanu-gray-400 hover:text-blue-600 bg-nuanu-gray-50 hover:bg-blue-50 rounded transition-colors" title="View Document">
                        <FileText className="w-4 h-4" />
                      </button>
                      <button 
                        disabled={offer.status !== "draft"}
                        onClick={() => handleSendOffer(offer.id)}
                        className="p-1.5 text-nuanu-gray-400 hover:text-emerald-600 bg-nuanu-gray-50 hover:bg-emerald-50 rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed" 
                        title="Send Offer"
                      >
                        <Send className="w-4 h-4" />
                      </button>
                      <button className="p-1.5 text-nuanu-gray-400 hover:text-nuanu-navy bg-nuanu-gray-50 hover:bg-nuanu-gray-200 rounded transition-colors">
                        <MoreVertical className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
          
          {offers.length === 0 && (
             <div className="text-center py-12">
               <FileText className="w-12 h-12 text-nuanu-gray-300 mx-auto mb-4" />
               <h3 className="text-lg font-medium text-nuanu-navy">No offers found</h3>
             </div>
          )}
        </div>
      </div>

      {/* Generate Offer Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              onClick={() => !isSubmitting && setIsModalOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden relative z-10"
            >
              <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50">
                <h2 className="text-lg font-bold text-nuanu-navy flex items-center gap-2">
                  <FileText className="w-5 h-5 text-nuanu-emerald" /> Generate New Offer
                </h2>
                <button 
                  onClick={() => !isSubmitting && setIsModalOpen(false)}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded-full transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Candidate Application *</label>
                  <select 
                    required
                    value={formData.applicationId}
                    onChange={e => setFormData({...formData, applicationId: e.target.value})}
                    className="input-field py-2.5"
                  >
                    <option value="" disabled>Select a candidate...</option>
                    {activeApplications.map(app => (
                      <option key={app.id} value={app.id}>
                        {app.candidateName} - {app.vacancyTitle}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Annual Salary ($)</label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input 
                        type="number" 
                        required
                        value={formData.salary}
                        onChange={e => setFormData({...formData, salary: parseInt(e.target.value)})}
                        className="input-field py-2.5 pl-9"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Signing Bonus ($)</label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input 
                        type="number" 
                        value={formData.bonus}
                        onChange={e => setFormData({...formData, bonus: parseInt(e.target.value)})}
                        className="input-field py-2.5 pl-9"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Proposed Start Date</label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input 
                      type="date" 
                      required
                      value={formData.startDate}
                      onChange={e => setFormData({...formData, startDate: e.target.value})}
                      className="input-field py-2.5 pl-9"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Internal Notes</label>
                  <textarea 
                    value={formData.notes}
                    onChange={e => setFormData({...formData, notes: e.target.value})}
                    className="input-field py-2.5 resize-y"
                    rows={2}
                    placeholder="Approvals, special conditions..."
                  />
                </div>

                <div className="pt-4 flex justify-end gap-3">
                  <button 
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="btn-secondary"
                    disabled={isSubmitting}
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    className="btn-primary px-8"
                    disabled={isSubmitting || !formData.applicationId}
                  >
                    {isSubmitting ? (
                      <><Loader2 className="w-4 h-4 animate-spin" /> Generating...</>
                    ) : "Generate Offer"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

