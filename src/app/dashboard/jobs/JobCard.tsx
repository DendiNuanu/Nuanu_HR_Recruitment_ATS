"use client";

import { useState } from "react";
import {
  Briefcase,
  Users,
  Eye,
  Edit,
  MoreVertical,
  Trash2,
  Copy,
  Send,
  Loader2,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { deleteVacancy } from "@/app/actions/jobs";
import ConfirmModal from "@/components/ui/ConfirmModal";
import JobStreetPoster from "./JobStreetPoster";

export default function JobCard({ job }: { job: any }) {
  const router = useRouter();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDuplicating, setIsDuplicating] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isSubmittingApproval, setIsSubmittingApproval] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);

  // JobStreet state
  const [showJobStreet, setShowJobStreet] = useState(false);
  const [isPostedToJobStreet, setIsPostedToJobStreet] = useState(
    () =>
      job.jobPostings?.some(
        (p: { channel: string; status: string }) =>
          p.channel === "jobstreet" && p.status === "active",
      ) ?? false,
  );

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await deleteVacancy(job.id);
      setShowDeleteModal(false);
      router.refresh();
    } catch (error) {
      console.error(error);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDuplicate = async () => {
    setIsDuplicating(true);
    setIsMenuOpen(false);
    try {
      const { duplicateVacancy } = await import("@/app/actions/jobs");
      const res = await duplicateVacancy(job.id);
      if (res.success) {
        router.refresh();
      } else {
        alert("Duplication failed");
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsDuplicating(false);
    }
  };

  const handleSubmitForApproval = async () => {
    setIsSubmittingApproval(true);
    try {
      const res = await fetch("/api/requisition/create", {
        method: "POST",
        body: JSON.stringify({
          vacancyId: job.id,
          userId: job.creatorId,
        }),
        headers: { "Content-Type": "application/json" },
      });

      const data = await res.json();
      if (data.success) {
        toast.success("Requisition submitted successfully!");
        router.refresh();
      } else {
        toast.error(data.error || "Failed to submit for approval");
      }
    } catch (error) {
      toast.error("An unexpected error occurred");
    } finally {
      setIsSubmittingApproval(false);
    }
  };

  const handlePublish = async () => {
    setIsPublishing(true);
    try {
      const { publishVacancy } = await import("@/app/actions/jobs");
      const res = await publishVacancy(job.id);
      if (res.success) {
        toast.success("Job published successfully!");
        router.refresh();
      } else {
        toast.error(res.error || "Failed to publish job");
      }
    } catch (error) {
      toast.error("An unexpected error occurred");
    } finally {
      setIsPublishing(false);
    }
  };

  const handleMarkPosted = (jobId: string) => {
    setIsPostedToJobStreet(true);
    // Close modal after a short delay so user sees the success state
    setTimeout(() => setShowJobStreet(false), 2000);
  };

  return (
    <>
      <div className="border border-nuanu-gray-100 rounded-xl p-5 hover:shadow-lg hover:border-emerald-100 transition-all group bg-white relative">
        <div className="flex justify-between items-start mb-3">
          <span
            className={`badge text-xs font-bold uppercase ${
              job.status === "published"
                ? "bg-emerald-100 text-emerald-700"
                : job.status === "draft"
                  ? "bg-gray-100 text-gray-600"
                  : job.status === "pending_approval"
                    ? "bg-amber-100 text-amber-700"
                    : job.status === "closed"
                      ? "bg-red-100 text-red-700"
                      : "bg-gray-100 text-gray-600"
            }`}
          >
            {job.status === "pending_approval" ? "Pending Approval" : job.status}
          </span>

          {/* 3 Dots Menu */}
          <div className="relative">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="text-nuanu-gray-400 hover:text-nuanu-navy p-1 rounded-md hover:bg-nuanu-gray-50 transition-colors"
            >
              <MoreVertical className="w-4 h-4" />
            </button>

            {isMenuOpen && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setIsMenuOpen(false)}
                />
                <div className="absolute right-0 mt-1 w-36 bg-white border border-nuanu-gray-200 rounded-lg shadow-lg overflow-hidden z-20">
                  <button
                    onClick={handleDuplicate}
                    disabled={isDuplicating}
                    className="w-full text-left px-4 py-2 text-sm text-nuanu-gray-700 hover:bg-nuanu-gray-50 flex items-center gap-2 transition-colors disabled:opacity-50"
                  >
                    {isDuplicating ? (
                      <div className="w-3.5 h-3.5 border-2 border-nuanu-gray-400 border-t-nuanu-navy rounded-full animate-spin" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                    {isDuplicating ? "Duplicating..." : "Duplicate"}
                  </button>
                  <button
                    onClick={() => {
                      setIsMenuOpen(false);
                      setShowDeleteModal(true);
                    }}
                    disabled={isDeleting}
                    className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />{" "}
                    {isDeleting ? "Deleting..." : "Delete"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        <h3 className="font-bold text-nuanu-navy mb-1 group-hover:text-emerald-600 transition-colors">
          {job.title}
        </h3>
        <p className="text-xs text-nuanu-gray-500 mb-4 flex items-center gap-1">
          {job.code}{" "}
          <span className="w-1 h-1 bg-nuanu-gray-300 rounded-full mx-1"></span>{" "}
          {job.department?.name || "General"}
        </p>

        <div className="flex items-center gap-4 text-sm text-nuanu-gray-600 mb-5">
          <span className="flex items-center gap-1.5">
            <Briefcase className="w-4 h-4 text-nuanu-gray-400" />{" "}
            {job.employmentType}
          </span>
          <span className="flex items-center gap-1.5">
            <Users className="w-4 h-4 text-nuanu-gray-400" /> {job.filledCount}/
            {job.headcount} Hired
          </span>
        </div>

        {/* Actions Section */}
        <div className="mb-3 space-y-2">
          {job.status === "approved" ? (
            <button
              onClick={handlePublish}
              disabled={isPublishing}
              className="w-full py-2.5 bg-nuanu-navy text-white rounded-lg text-xs font-bold flex items-center justify-center gap-2 hover:bg-nuanu-navy-dark transition-all shadow-md shadow-nuanu-navy/10"
            >
              {isPublishing ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              )}
              {isPublishing ? "Publishing..." : "Publish to Careers"}
            </button>
          ) : (
            !job.isApproved &&
            job.status !== "published" && (
              <button
                onClick={handleSubmitForApproval}
                disabled={
                  isSubmittingApproval || job.status === "pending_approval"
                }
                className={`w-full py-2.5 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                  job.status === "pending_approval"
                    ? "bg-amber-50 text-amber-600 cursor-default border border-amber-100"
                    : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-100"
                }`}
              >
                {isSubmittingApproval ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : job.status === "pending_approval" ? (
                  <CheckCircle2 className="w-3 h-3" />
                ) : (
                  <Send className="w-3.5 h-3.5" />
                )}
                {isSubmittingApproval
                  ? "Submitting..."
                  : job.status === "pending_approval"
                    ? "Pending Approval"
                    : "Submit for Approval"}
              </button>
            )
          )}

          {/* ── JobStreet Button ── */}
          <button
            onClick={() => setShowJobStreet(true)}
            className={`w-full py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-2 border transition-all ${
              isPostedToJobStreet
                ? "bg-emerald-50 text-emerald-700 border-emerald-100 hover:bg-emerald-100"
                : "bg-rose-50 text-[#E60278] border-rose-100 hover:bg-rose-100 hover:border-rose-200"
            }`}
          >
            {/* SEEK / JS badge */}
            <span
              className={`inline-flex items-center justify-center w-4 h-4 rounded text-[8px] font-black italic shrink-0 ${
                isPostedToJobStreet
                  ? "bg-emerald-500 text-white"
                  : "bg-[#E60278] text-white"
              }`}
            >
              JS
            </span>
            {isPostedToJobStreet ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5" /> Posted on JobStreet
              </>
            ) : (
              "Post to JobStreet"
            )}
          </button>
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-nuanu-gray-50">
          <div className="flex items-center gap-2">
            <span className="flex items-center justify-center bg-blue-50 text-blue-600 text-xs font-bold w-6 h-6 rounded-md">
              {job._count?.applications || 0}
            </span>
            <span className="text-xs text-nuanu-gray-500 font-medium">
              Candidates
            </span>
          </div>
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Link
              href={`/careers/${job.id}`}
              target="_blank"
              className="p-1.5 text-nuanu-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-md transition-colors"
              title="View Public Page"
            >
              <Eye className="w-4 h-4" />
            </Link>
            <Link
              href={`/dashboard/jobs/${job.id}/edit`}
              className="p-1.5 text-nuanu-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
              title="Edit Job"
            >
              <Edit className="w-4 h-4" />
            </Link>
          </div>
        </div>

        <ConfirmModal
          isOpen={showDeleteModal}
          onClose={() => setShowDeleteModal(false)}
          onConfirm={handleDelete}
          isLoading={isDeleting}
          title="Delete Vacancy"
          message={`Are you sure you want to delete "${job.title}"? This action cannot be undone and will remove all associated applications.`}
        />
      </div>

      {/* ── JobStreet Poster Modal ── */}
      <JobStreetPoster
        job={{
          id: job.id,
          title: job.title,
          code: job.code,
          description: job.description ?? null,
          requirements: job.requirements ?? null,
          responsibilities: job.responsibilities ?? null,
          location: job.location ?? null,
          employmentType: job.employmentType,
          salaryMin: job.salaryMin ?? null,
          salaryMax: job.salaryMax ?? null,
          currency: job.currency ?? "IDR",
          experienceMin: job.experienceMin ?? 0,
          educationLevel: job.educationLevel ?? null,
          skills: job.skills ?? [],
          department: { name: job.department?.name ?? "General" },
        }}
        isOpen={showJobStreet}
        onClose={() => setShowJobStreet(false)}
        onMarkPosted={handleMarkPosted}
      />
    </>
  );
}
