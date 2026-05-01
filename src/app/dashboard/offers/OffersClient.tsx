"use client";

import { useState } from "react";
import { Search, Filter, FileText, CheckCircle2, XCircle, Send, MoreVertical, DollarSign } from "lucide-react";
import { motion } from "framer-motion";
import { formatDate } from "@/lib/utils";
export type OfferData = {
  id: string;
  candidateName: string;
  position: string;
  salary: number;
  bonus?: number;
  status: string;
  startDate: string | Date;
};

export default function OffersClient({ offers }: { offers: OfferData[] }) {
  const [search, setSearch] = useState("");

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
        <button className="btn-primary">
          <FileText className="w-5 h-5" /> Generate Offer
        </button>
      </div>

      <div className="card">
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
                      <button className="p-1.5 text-nuanu-gray-400 hover:text-emerald-600 bg-nuanu-gray-50 hover:bg-emerald-50 rounded transition-colors" title="Send Offer">
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
    </div>
  );
}
