import { Loader2 } from "lucide-react";

export default function Loading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-5 w-40 bg-gray-200 rounded" />

      {/* Header skeleton */}
      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-gray-200 flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-7 w-48 bg-gray-200 rounded" />
            <div className="h-4 w-32 bg-gray-100 rounded" />
            <div className="h-6 w-20 bg-gray-100 rounded-full" />
          </div>
        </div>
      </div>

      {/* Tab bar skeleton */}
      <div className="rounded-2xl border border-gray-100 bg-white p-2 shadow-sm">
        <div className="flex gap-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-10 w-28 bg-gray-100 rounded-xl" />
          ))}
        </div>
      </div>

      {/* Content skeleton */}
      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
        </div>
      </div>
    </div>
  );
}