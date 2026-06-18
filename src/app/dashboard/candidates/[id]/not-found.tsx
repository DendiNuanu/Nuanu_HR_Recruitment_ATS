import Link from "next/link";
import { ArrowLeft, UserX } from "lucide-react";

export default function NotFound() {
  return (
    <div className="space-y-6">
      <Link
        href="/dashboard/candidates"
        className="inline-flex items-center gap-2 text-sm font-medium text-nuanu-gray-500 hover:text-nuanu-navy transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Candidates
      </Link>

      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-red-50">
            <UserX className="h-10 w-10 text-red-400" />
          </div>
          <h1 className="text-2xl font-extrabold text-nuanu-navy mb-2">
            Candidate Not Found
          </h1>
          <p className="text-sm text-nuanu-gray-500 max-w-md mb-8">
            The candidate you are looking for does not exist or may have been
            removed. Please check the URL and try again.
          </p>
          <Link
            href="/dashboard/candidates"
            className="btn-primary px-6 py-3 text-sm font-semibold inline-flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Go to Candidates List
          </Link>
        </div>
      </div>
    </div>
  );
}