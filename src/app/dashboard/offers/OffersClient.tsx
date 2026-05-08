"use client";

import { useState, useEffect } from "react";
import {
  Search,
  Filter,
  FileText,
  Send,
  MoreVertical,
  X,
  Loader2,
  Calendar,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Edit2,
  Trash2,
  TrendingUp,
  Eye,
  Plus,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { formatDate } from "@/lib/utils";
import {
  createOffer,
  sendOffer,
  acceptOffer,
  rejectOffer,
  withdrawOffer,
  deleteDraftOffer,
  editOffer,
} from "./actions";
import ConfirmModal from "@/components/ui/ConfirmModal";

// ─── Types ────────────────────────────────────────────────────────────────────

export type OfferData = {
  id: string;
  applicationId: string;
  candidateName: string;
  candidateEmail: string;
  position: string;
  salary: number;
  bonus?: number;
  benefits?: string;
  equity?: string;
  status: string;
  startDate: string | null;
  expiresAt: string | null;
  sentAt: string | null;
  respondedAt: string | null;
  rejectionReason: string | null;
  notes: string | null;
  documentUrl: string | null;
  createdAt: string;
};

export type ActiveApp = {
  id: string;
  candidateName: string;
  vacancyTitle: string;
};

// ─── Default form state ───────────────────────────────────────────────────────

const defaultCreateForm = {
  applicationId: "",
  salary: 15_000_000,
  bonus: 0,
  benefits: "",
  equity: "",
  startDate: new Date().toISOString().split("T")[0],
  expiresAt: "",
  notes: "",
};

const defaultEditForm = {
  salary: 0,
  bonus: 0,
  benefits: "",
  equity: "",
  startDate: "",
  expiresAt: "",
  notes: "",
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function OffersClient({
  offers,
  activeApplications = [],
  stats,
}: {
  offers: OfferData[];
  activeApplications?: ActiveApp[];
  stats: {
    total: number;
    draft: number;
    sent: number;
    accepted: number;
    rejected: number;
    acceptanceRate: number;
  };
}) {
  // ── State ──────────────────────────────────────────────────────
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0 });
  const [selectedOffer, setSelectedOffer] = useState<OfferData | null>(null);

  const [showConfirmSend, setShowConfirmSend] = useState(false);
  const [showAcceptConfirm, setShowAcceptConfirm] = useState(false);
  const [showRejectConfirm, setShowRejectConfirm] = useState(false);
  const [showWithdrawConfirm, setShowWithdrawConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  const [createFormData, setCreateFormData] = useState(defaultCreateForm);
  const [editFormData, setEditFormData] = useState(defaultEditForm);

  // ── Sync edit form when modal opens ───────────────────────────
  useEffect(() => {
    if (isEditModalOpen && selectedOffer) {
      setEditFormData({
        salary: selectedOffer.salary,
        bonus: selectedOffer.bonus ?? 0,
        benefits: selectedOffer.benefits ?? "",
        equity: selectedOffer.equity ?? "",
        startDate: selectedOffer.startDate
          ? selectedOffer.startDate.split("T")[0]
          : new Date().toISOString().split("T")[0],
        expiresAt: selectedOffer.expiresAt
          ? selectedOffer.expiresAt.split("T")[0]
          : "",
        notes: selectedOffer.notes ?? "",
      });
    }
  }, [isEditModalOpen, selectedOffer]);

  // Close dropdown on scroll
  useEffect(() => {
    const close = () => setOpenMenuId(null);
    window.addEventListener("scroll", close, true);
    return () => window.removeEventListener("scroll", close, true);
  }, []);

  // ── Derived ───────────────────────────────────────────────────
  const filtered = offers.filter(
    (o) =>
      (o.candidateName.toLowerCase().includes(search.toLowerCase()) ||
        o.position.toLowerCase().includes(search.toLowerCase())) &&
      (statusFilter === "all" || o.status === statusFilter),
  );

  const activeMenuOffer = openMenuId
    ? (offers.find((o) => o.id === openMenuId) ?? null)
    : null;

  // ── Helpers ───────────────────────────────────────────────────
  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      accepted: "bg-emerald-100 text-emerald-700",
      sent: "bg-blue-100 text-blue-700",
      draft: "bg-gray-100 text-gray-600",
      rejected: "bg-red-100 text-red-700",
      withdrawn: "bg-amber-100 text-amber-700",
    };
    const labels: Record<string, string> = {
      accepted: "Accepted",
      sent: "Sent",
      draft: "Draft",
      rejected: "Rejected",
      withdrawn: "Withdrawn",
    };
    return (
      <span
        className={`badge ${styles[status] ?? "bg-gray-100 text-gray-600"}`}
      >
        {labels[status] ?? status}
      </span>
    );
  };

  const getExpiryBadge = (expiresAt: string | null, status: string) => {
    if (!expiresAt || status !== "sent") return null;
    const days = Math.ceil(
      (new Date(expiresAt).getTime() - Date.now()) / 86_400_000,
    );
    if (days < 0)
      return (
        <span className="text-[10px] font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-full">
          Expired
        </span>
      );
    if (days <= 3)
      return (
        <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
          {days}d left
        </span>
      );
    return (
      <span className="text-[10px] font-bold text-gray-500 bg-gray-50 px-2 py-0.5 rounded-full">
        {days}d left
      </span>
    );
  };

  // ── Dropdown toggle ───────────────────────────────────────────
  const handleMenuToggle = (
    offerId: string,
    e: React.MouseEvent<HTMLButtonElement>,
  ) => {
    e.stopPropagation();
    if (openMenuId === offerId) {
      setOpenMenuId(null);
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    setMenuPos({
      top: rect.bottom + 4,
      left: Math.max(8, rect.right - 208),
    });
    setOpenMenuId(offerId);
  };

  // ── Action handlers ───────────────────────────────────────────
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createFormData.applicationId) return;
    setIsSubmitting(true);
    try {
      const result = await createOffer({
        applicationId: createFormData.applicationId,
        salary: createFormData.salary,
        bonus: createFormData.bonus || undefined,
        benefits: createFormData.benefits || undefined,
        equity: createFormData.equity || undefined,
        startDate: createFormData.startDate,
        expiresAt: createFormData.expiresAt || undefined,
        notes: createFormData.notes || undefined,
      });
      if (result.success) {
        toast.success("Offer created!");
        setIsCreateModalOpen(false);
        setCreateFormData(defaultCreateForm);
      } else {
        toast.error(result.error ?? "Failed to create offer");
      }
    } catch {
      toast.error("An unexpected error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSendOffer = async () => {
    if (!selectedOffer) return;
    setIsSubmitting(true);
    try {
      const result = await sendOffer(selectedOffer.id);
      if (result.success) {
        toast.success("Offer sent to candidate!");
      } else {
        toast.error(result.error ?? "Failed to send offer");
      }
    } catch {
      toast.error("An unexpected error occurred");
    } finally {
      setIsSubmitting(false);
      setShowConfirmSend(false);
      setSelectedOffer(null);
    }
  };

  const handleAccept = async () => {
    if (!selectedOffer) return;
    setIsSubmitting(true);
    try {
      const result = await acceptOffer(selectedOffer.id);
      if (result.success) {
        toast.success("Offer accepted! Candidate moved to Hired.");
      } else {
        toast.error(result.error ?? "Failed to accept offer");
      }
    } catch {
      toast.error("An unexpected error occurred");
    } finally {
      setIsSubmitting(false);
      setShowAcceptConfirm(false);
      setSelectedOffer(null);
    }
  };

  const handleReject = async () => {
    if (!selectedOffer) return;
    setIsSubmitting(true);
    try {
      const result = await rejectOffer(selectedOffer.id, rejectReason);
      if (result.success) {
        toast.success("Offer marked as rejected.");
      } else {
        toast.error(result.error ?? "Failed to reject offer");
      }
    } catch {
      toast.error("An unexpected error occurred");
    } finally {
      setIsSubmitting(false);
      setShowRejectConfirm(false);
      setSelectedOffer(null);
      setRejectReason("");
    }
  };

  const handleWithdraw = async () => {
    if (!selectedOffer) return;
    setIsSubmitting(true);
    try {
      const result = await withdrawOffer(selectedOffer.id);
      if (result.success) {
        toast.success("Offer withdrawn.");
      } else {
        toast.error(result.error ?? "Failed to withdraw offer");
      }
    } catch {
      toast.error("An unexpected error occurred");
    } finally {
      setIsSubmitting(false);
      setShowWithdrawConfirm(false);
      setSelectedOffer(null);
    }
  };

  const handleDelete = async () => {
    if (!selectedOffer) return;
    setIsSubmitting(true);
    try {
      const result = await deleteDraftOffer(selectedOffer.id);
      if (result.success) {
        toast.success("Draft deleted.");
      } else {
        toast.error(result.error ?? "Failed to delete draft");
      }
    } catch {
      toast.error("An unexpected error occurred");
    } finally {
      setIsSubmitting(false);
      setShowDeleteConfirm(false);
      setSelectedOffer(null);
    }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOffer) return;
    setIsSubmitting(true);
    try {
      const result = await editOffer(selectedOffer.id, {
        salary: editFormData.salary,
        bonus: editFormData.bonus || undefined,
        benefits: editFormData.benefits || undefined,
        equity: editFormData.equity || undefined,
        startDate: editFormData.startDate,
        expiresAt: editFormData.expiresAt || undefined,
        notes: editFormData.notes || undefined,
      });
      if (result.success) {
        toast.success("Offer updated!");
        setIsEditModalOpen(false);
        setSelectedOffer(null);
      } else {
        toast.error(result.error ?? "Failed to update offer");
      }
    } catch {
      toast.error("An unexpected error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Stats card config ─────────────────────────────────────────
  const statsCards = [
    {
      icon: FileText,
      label: "Total Offers",
      value: stats.total,
      sub: `${stats.draft} draft${stats.draft !== 1 ? "s" : ""}`,
      bg: "bg-blue-50",
      iconColor: "text-blue-600",
      border: "border-blue-100",
    },
    {
      icon: Send,
      label: "Sent / Pending",
      value: stats.sent,
      sub: "awaiting response",
      bg: "bg-amber-50",
      iconColor: "text-amber-600",
      border: "border-amber-100",
    },
    {
      icon: CheckCircle2,
      label: "Accepted",
      value: stats.accepted,
      sub: `${stats.rejected} rejected`,
      bg: "bg-emerald-50",
      iconColor: "text-emerald-600",
      border: "border-emerald-100",
    },
    {
      icon: TrendingUp,
      label: "Acceptance Rate",
      value: `${stats.acceptanceRate}%`,
      sub: "of responded offers",
      bg: "bg-purple-50",
      iconColor: "text-purple-600",
      border: "border-purple-100",
    },
  ];

  // ─────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* ── Header ──────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-nuanu-navy">
            Offers &amp; Contracts
          </h1>
          <p className="text-sm text-nuanu-gray-500 mt-1">
            Generate, send, and track candidate offer letters
          </p>
        </div>
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="btn-primary"
        >
          <Plus className="w-5 h-5" /> Generate Offer
        </button>
      </div>

      {/* ── Stats Cards ─────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statsCards.map((card) => (
          <div
            key={card.label}
            className={`card p-5 flex items-start gap-4 border ${card.border}`}
          >
            <div className={`p-3 rounded-2xl ${card.bg} shrink-0`}>
              <card.icon className={`w-6 h-6 ${card.iconColor}`} />
            </div>
            <div className="min-w-0">
              <p className="text-2xl font-black text-nuanu-navy leading-none">
                {card.value}
              </p>
              <p className="text-xs font-semibold text-nuanu-gray-600 mt-1">
                {card.label}
              </p>
              <p className="text-[11px] text-nuanu-gray-400 mt-0.5">
                {card.sub}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Offers Table Card ────────────────────────────────────── */}
      <div className="card">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6 border-b border-nuanu-gray-100 pb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-nuanu-gray-400" />
            <input
              type="text"
              placeholder="Search candidate or position..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input-field pl-10"
            />
          </div>
          <div className="relative min-w-[180px]">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="input-field appearance-none pr-9"
            >
              <option value="all">All Statuses</option>
              <option value="draft">Draft</option>
              <option value="sent">Sent</option>
              <option value="accepted">Accepted</option>
              <option value="rejected">Rejected</option>
              <option value="withdrawn">Withdrawn</option>
            </select>
            <Filter className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-nuanu-gray-400 pointer-events-none" />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          {offers.length === 0 ? (
            /* ── Full empty state ─────────────────────────────── */
            <div className="text-center py-16">
              <div className="w-16 h-16 rounded-3xl bg-nuanu-gray-50 flex items-center justify-center mx-auto mb-4">
                <FileText className="w-8 h-8 text-nuanu-gray-300" />
              </div>
              <h3 className="text-lg font-bold text-nuanu-navy mb-1">
                No offers yet
              </h3>
              <p className="text-sm text-nuanu-gray-500 mb-6">
                Generate your first offer letter to get started
              </p>
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="btn-primary mx-auto"
              >
                <Plus className="w-4 h-4" /> Generate Offer
              </button>
            </div>
          ) : filtered.length === 0 ? (
            /* ── Filter empty state ───────────────────────────── */
            <div className="text-center py-12">
              <Search className="w-10 h-10 text-nuanu-gray-300 mx-auto mb-3" />
              <p className="text-nuanu-gray-500 text-sm">
                No offers match your search or filter.
              </p>
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Candidate</th>
                  <th>Position</th>
                  <th>Compensation</th>
                  <th>Status</th>
                  <th>Start Date</th>
                  <th>Expires</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((offer, i) => (
                  <motion.tr
                    key={offer.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04 }}
                  >
                    {/* Candidate */}
                    <td>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-xs shrink-0">
                          {offer.candidateName.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-nuanu-navy text-sm truncate">
                            {offer.candidateName}
                          </p>
                          <p className="text-[11px] text-nuanu-gray-400 truncate">
                            {offer.candidateEmail}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Position */}
                    <td>
                      <span className="text-sm text-nuanu-gray-700 font-medium">
                        {offer.position}
                      </span>
                    </td>

                    {/* Compensation */}
                    <td>
                      <div className="text-sm font-bold text-nuanu-navy">
                        <span className="text-nuanu-emerald text-xs font-bold mr-0.5">
                          Rp
                        </span>
                        {offer.salary.toLocaleString("id-ID")}
                      </div>
                      {offer.bonus ? (
                        <div className="text-[11px] text-nuanu-gray-400 mt-0.5">
                          + Rp {offer.bonus.toLocaleString("id-ID")} bonus
                        </div>
                      ) : null}
                    </td>

                    {/* Status */}
                    <td>
                      <div className="space-y-1">
                        {getStatusBadge(offer.status)}
                        {offer.rejectionReason && (
                          <p className="text-[10px] text-red-500 max-w-[140px] truncate">
                            {offer.rejectionReason}
                          </p>
                        )}
                      </div>
                    </td>

                    {/* Start Date */}
                    <td>
                      <span className="text-sm text-nuanu-gray-600">
                        {offer.startDate ? formatDate(offer.startDate) : "—"}
                      </span>
                    </td>

                    {/* Expires */}
                    <td>
                      {getExpiryBadge(offer.expiresAt, offer.status) ?? (
                        <span className="text-sm text-nuanu-gray-400">—</span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="text-right">
                      <div className="flex justify-end">
                        <button
                          onClick={(e) => handleMenuToggle(offer.id, e)}
                          className="p-1.5 text-nuanu-gray-400 hover:text-nuanu-navy bg-nuanu-gray-50 hover:bg-nuanu-gray-200 rounded-lg transition-colors"
                          title="Actions"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* ── Per-row Dropdown Menu (fixed-position, never clipped) ── */}
      {activeMenuOffer && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setOpenMenuId(null)}
          />
          {/* Menu */}
          <div
            className="fixed z-50 w-52 bg-white rounded-2xl shadow-2xl border border-gray-100 py-2 overflow-hidden"
            style={{ top: menuPos.top, left: menuPos.left }}
          >
            {/* Group 1: View */}
            <p className="px-3 pt-1 pb-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
              View
            </p>
            <button
              onClick={() => {
                window.open(`/api/offers/${activeMenuOffer.id}/pdf`, "_blank");
                setOpenMenuId(null);
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <Eye className="w-4 h-4 text-blue-500 shrink-0" />
              View Offer Letter
            </button>

            {/* Group 2: Actions (contextual) */}
            {(activeMenuOffer.status === "draft" ||
              activeMenuOffer.status === "sent") && (
              <>
                <div className="border-t border-gray-100 my-1.5" />
                <p className="px-3 pb-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                  Actions
                </p>

                {activeMenuOffer.status === "draft" && (
                  <>
                    <button
                      onClick={() => {
                        setSelectedOffer(activeMenuOffer);
                        setIsEditModalOpen(true);
                        setOpenMenuId(null);
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      <Edit2 className="w-4 h-4 text-blue-500 shrink-0" />
                      Edit Offer
                    </button>
                    <button
                      onClick={() => {
                        setSelectedOffer(activeMenuOffer);
                        setShowConfirmSend(true);
                        setOpenMenuId(null);
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      <Send className="w-4 h-4 text-emerald-500 shrink-0" />
                      Send Offer
                    </button>
                  </>
                )}

                {activeMenuOffer.status === "sent" && (
                  <>
                    <button
                      onClick={() => {
                        setSelectedOffer(activeMenuOffer);
                        setShowAcceptConfirm(true);
                        setOpenMenuId(null);
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                      Mark as Accepted
                    </button>
                    <button
                      onClick={() => {
                        setSelectedOffer(activeMenuOffer);
                        setShowRejectConfirm(true);
                        setOpenMenuId(null);
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      <XCircle className="w-4 h-4 text-red-500 shrink-0" />
                      Mark as Rejected
                    </button>
                    <button
                      onClick={() => {
                        setSelectedOffer(activeMenuOffer);
                        setShowWithdrawConfirm(true);
                        setOpenMenuId(null);
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                      Withdraw Offer
                    </button>
                  </>
                )}
              </>
            )}

            {/* Group 3: Danger */}
            {activeMenuOffer.status === "draft" && (
              <>
                <div className="border-t border-gray-100 my-1.5" />
                <p className="px-3 pb-1.5 text-[10px] font-bold text-red-400 uppercase tracking-widest">
                  Danger
                </p>
                <button
                  onClick={() => {
                    setSelectedOffer(activeMenuOffer);
                    setShowDeleteConfirm(true);
                    setOpenMenuId(null);
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                >
                  <Trash2 className="w-4 h-4 shrink-0" />
                  Delete Draft
                </button>
              </>
            )}
          </div>
        </>
      )}

      {/* ── Confirmation Modals ──────────────────────────────────── */}
      <ConfirmModal
        isOpen={showConfirmSend}
        onClose={() => {
          setShowConfirmSend(false);
          setSelectedOffer(null);
        }}
        onConfirm={handleSendOffer}
        isLoading={isSubmitting}
        title="Send Offer Letter"
        message={`Send the official offer to ${selectedOffer?.candidateName ?? "the candidate"}? They will receive an email with the PDF attached.`}
        confirmText="Send Offer"
        type="info"
        requireDoubleConfirm={false}
      />

      <ConfirmModal
        isOpen={showAcceptConfirm}
        onClose={() => {
          setShowAcceptConfirm(false);
          setSelectedOffer(null);
        }}
        onConfirm={handleAccept}
        isLoading={isSubmitting}
        title="Mark as Accepted"
        message={`Confirm that ${selectedOffer?.candidateName ?? "the candidate"} has accepted this offer? Their application will be moved to Hired.`}
        confirmText="Confirm Acceptance"
        type="info"
        requireDoubleConfirm={false}
      />

      <ConfirmModal
        isOpen={showWithdrawConfirm}
        onClose={() => {
          setShowWithdrawConfirm(false);
          setSelectedOffer(null);
        }}
        onConfirm={handleWithdraw}
        isLoading={isSubmitting}
        title="Withdraw Offer"
        message={`Withdraw the offer sent to ${selectedOffer?.candidateName ?? "the candidate"}? Their application will move back to Final Interview.`}
        confirmText="Withdraw"
        type="warning"
        requireDoubleConfirm={false}
      />

      <ConfirmModal
        isOpen={showDeleteConfirm}
        onClose={() => {
          setShowDeleteConfirm(false);
          setSelectedOffer(null);
        }}
        onConfirm={handleDelete}
        isLoading={isSubmitting}
        title="Delete Draft Offer"
        message={`Permanently delete this draft offer for ${selectedOffer?.candidateName ?? "the candidate"}? This cannot be undone.`}
        confirmText="Delete Draft"
        type="danger"
        requireDoubleConfirm={true}
      />

      {/* ── Reject Modal (custom — needs rejection reason) ─────── */}
      <AnimatePresence>
        {showRejectConfirm && selectedOffer && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-nuanu-navy/70 backdrop-blur-2xl"
              onClick={() => !isSubmitting && setShowRejectConfirm(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden relative z-10"
            >
              <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-red-50">
                <h2 className="text-lg font-bold text-nuanu-navy flex items-center gap-2">
                  <XCircle className="w-5 h-5 text-red-500" />
                  Mark Offer as Rejected
                </h2>
                <button
                  onClick={() => !isSubmitting && setShowRejectConfirm(false)}
                  className="p-1.5 text-gray-400 hover:text-gray-600 rounded-full"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-6 space-y-4">
                <p className="text-sm text-nuanu-gray-600">
                  Record that{" "}
                  <span className="font-semibold text-nuanu-navy">
                    {selectedOffer.candidateName}
                  </span>{" "}
                  declined the offer for{" "}
                  <span className="font-semibold text-nuanu-navy">
                    {selectedOffer.position}
                  </span>
                  .
                </p>

                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                    Rejection Reason *
                  </label>
                  <textarea
                    required
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    className="input-field resize-y py-2.5"
                    rows={3}
                    placeholder="e.g. Accepted a competing offer, salary expectations not met..."
                    autoFocus
                  />
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowRejectConfirm(false)}
                    className="btn-secondary"
                    disabled={isSubmitting}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleReject}
                    disabled={isSubmitting || !rejectReason.trim()}
                    className="px-5 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white font-semibold text-sm transition-colors flex items-center gap-2 disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <XCircle className="w-4 h-4" />
                    )}
                    Confirm Rejection
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Create Offer Modal ───────────────────────────────────── */}
      <AnimatePresence>
        {isCreateModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              onClick={() => !isSubmitting && setIsCreateModalOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden relative z-10 max-h-[90vh] flex flex-col"
            >
              {/* Header */}
              <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50 shrink-0">
                <h2 className="text-lg font-bold text-nuanu-navy flex items-center gap-2">
                  <FileText className="w-5 h-5 text-nuanu-emerald" />
                  Generate New Offer
                </h2>
                <button
                  onClick={() => !isSubmitting && setIsCreateModalOpen(false)}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded-full transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Form */}
              <form
                onSubmit={handleCreate}
                className="p-6 space-y-4 overflow-y-auto"
              >
                {/* Candidate Selector */}
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">
                    Candidate Application *
                  </label>
                  <select
                    required
                    value={createFormData.applicationId}
                    onChange={(e) =>
                      setCreateFormData({
                        ...createFormData,
                        applicationId: e.target.value,
                      })
                    }
                    className="input-field py-2.5"
                  >
                    <option value="" disabled>
                      Select a candidate...
                    </option>
                    {activeApplications.map((app) => (
                      <option key={app.id} value={app.id}>
                        {app.candidateName} — {app.vacancyTitle}
                      </option>
                    ))}
                  </select>
                  {activeApplications.length === 0 && (
                    <p className="text-xs text-amber-600 mt-1">
                      No active applications without an existing offer.
                    </p>
                  )}
                </div>

                {/* Salary + Bonus */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">
                      Monthly Salary (Rp) *
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-xs">
                        Rp
                      </span>
                      <input
                        type="number"
                        required
                        min={0}
                        value={createFormData.salary}
                        onChange={(e) =>
                          setCreateFormData({
                            ...createFormData,
                            salary: parseInt(e.target.value) || 0,
                          })
                        }
                        className="input-field py-2.5 pl-9"
                        placeholder="15000000"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">
                      Signing Bonus (Rp)
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-xs">
                        Rp
                      </span>
                      <input
                        type="number"
                        min={0}
                        value={createFormData.bonus}
                        onChange={(e) =>
                          setCreateFormData({
                            ...createFormData,
                            bonus: parseInt(e.target.value) || 0,
                          })
                        }
                        className="input-field py-2.5 pl-9"
                        placeholder="0"
                      />
                    </div>
                  </div>
                </div>

                {/* Start Date + Expiry Date */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">
                      Proposed Start Date *
                    </label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="date"
                        required
                        value={createFormData.startDate}
                        onChange={(e) =>
                          setCreateFormData({
                            ...createFormData,
                            startDate: e.target.value,
                          })
                        }
                        className="input-field py-2.5 pl-9"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">
                      Offer Expiry Date
                    </label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="date"
                        value={createFormData.expiresAt}
                        onChange={(e) =>
                          setCreateFormData({
                            ...createFormData,
                            expiresAt: e.target.value,
                          })
                        }
                        className="input-field py-2.5 pl-9"
                      />
                    </div>
                  </div>
                </div>

                {/* Equity */}
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">
                    Equity / Stock Options
                  </label>
                  <input
                    type="text"
                    value={createFormData.equity}
                    onChange={(e) =>
                      setCreateFormData({
                        ...createFormData,
                        equity: e.target.value,
                      })
                    }
                    className="input-field py-2.5"
                    placeholder="e.g. 0.1% vested over 4 years"
                  />
                </div>

                {/* Benefits */}
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">
                    Benefits &amp; Perks
                  </label>
                  <textarea
                    value={createFormData.benefits}
                    onChange={(e) =>
                      setCreateFormData({
                        ...createFormData,
                        benefits: e.target.value,
                      })
                    }
                    className="input-field py-2.5 resize-y"
                    rows={2}
                    placeholder="Health insurance, meal allowance, remote work options..."
                  />
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">
                    Internal Notes
                  </label>
                  <textarea
                    value={createFormData.notes}
                    onChange={(e) =>
                      setCreateFormData({
                        ...createFormData,
                        notes: e.target.value,
                      })
                    }
                    className="input-field py-2.5 resize-y"
                    rows={2}
                    placeholder="Approvals, special conditions, reminders..."
                  />
                </div>

                {/* Actions */}
                <div className="pt-2 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setIsCreateModalOpen(false)}
                    className="btn-secondary"
                    disabled={isSubmitting}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn-primary px-8"
                    disabled={isSubmitting || !createFormData.applicationId}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <FileText className="w-4 h-4" /> Generate Offer
                      </>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Edit Offer Modal ─────────────────────────────────────── */}
      <AnimatePresence>
        {isEditModalOpen && selectedOffer && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              onClick={() => !isSubmitting && setIsEditModalOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden relative z-10 max-h-[90vh] flex flex-col"
            >
              {/* Header */}
              <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-blue-50 shrink-0">
                <div>
                  <h2 className="text-lg font-bold text-nuanu-navy flex items-center gap-2">
                    <Edit2 className="w-5 h-5 text-blue-500" />
                    Edit Offer
                  </h2>
                  <p className="text-xs text-nuanu-gray-500 mt-0.5">
                    {selectedOffer.candidateName} — {selectedOffer.position}
                  </p>
                </div>
                <button
                  onClick={() => !isSubmitting && setIsEditModalOpen(false)}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded-full transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Form */}
              <form
                onSubmit={handleEdit}
                className="p-6 space-y-4 overflow-y-auto"
              >
                {/* Salary + Bonus */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">
                      Monthly Salary (Rp) *
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-xs">
                        Rp
                      </span>
                      <input
                        type="number"
                        required
                        min={0}
                        value={editFormData.salary}
                        onChange={(e) =>
                          setEditFormData({
                            ...editFormData,
                            salary: parseInt(e.target.value) || 0,
                          })
                        }
                        className="input-field py-2.5 pl-9"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">
                      Signing Bonus (Rp)
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-xs">
                        Rp
                      </span>
                      <input
                        type="number"
                        min={0}
                        value={editFormData.bonus}
                        onChange={(e) =>
                          setEditFormData({
                            ...editFormData,
                            bonus: parseInt(e.target.value) || 0,
                          })
                        }
                        className="input-field py-2.5 pl-9"
                      />
                    </div>
                  </div>
                </div>

                {/* Start Date + Expiry */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">
                      Proposed Start Date *
                    </label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="date"
                        required
                        value={editFormData.startDate}
                        onChange={(e) =>
                          setEditFormData({
                            ...editFormData,
                            startDate: e.target.value,
                          })
                        }
                        className="input-field py-2.5 pl-9"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">
                      Offer Expiry Date
                    </label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="date"
                        value={editFormData.expiresAt}
                        onChange={(e) =>
                          setEditFormData({
                            ...editFormData,
                            expiresAt: e.target.value,
                          })
                        }
                        className="input-field py-2.5 pl-9"
                      />
                    </div>
                  </div>
                </div>

                {/* Equity */}
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">
                    Equity / Stock Options
                  </label>
                  <input
                    type="text"
                    value={editFormData.equity}
                    onChange={(e) =>
                      setEditFormData({
                        ...editFormData,
                        equity: e.target.value,
                      })
                    }
                    className="input-field py-2.5"
                    placeholder="e.g. 0.1% vested over 4 years"
                  />
                </div>

                {/* Benefits */}
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">
                    Benefits &amp; Perks
                  </label>
                  <textarea
                    value={editFormData.benefits}
                    onChange={(e) =>
                      setEditFormData({
                        ...editFormData,
                        benefits: e.target.value,
                      })
                    }
                    className="input-field py-2.5 resize-y"
                    rows={2}
                    placeholder="Health insurance, meal allowance, remote work options..."
                  />
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">
                    Internal Notes
                  </label>
                  <textarea
                    value={editFormData.notes}
                    onChange={(e) =>
                      setEditFormData({
                        ...editFormData,
                        notes: e.target.value,
                      })
                    }
                    className="input-field py-2.5 resize-y"
                    rows={2}
                    placeholder="Approvals, special conditions..."
                  />
                </div>

                {/* Actions */}
                <div className="pt-2 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setIsEditModalOpen(false)}
                    className="btn-secondary"
                    disabled={isSubmitting}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn-primary px-8"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Edit2 className="w-4 h-4" /> Save Changes
                      </>
                    )}
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
