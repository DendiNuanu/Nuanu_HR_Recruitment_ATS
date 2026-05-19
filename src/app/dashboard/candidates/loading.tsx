export default function Loading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="flex justify-between items-center">
        <div className="space-y-2">
          <div className="h-7 w-36 bg-gray-200 rounded-lg" />
          <div className="h-4 w-56 bg-gray-100 rounded" />
        </div>
        <div className="flex gap-3">
          <div className="h-9 w-28 bg-gray-200 rounded-xl" />
          <div className="h-9 w-28 bg-gray-200 rounded-xl" />
        </div>
      </div>
      <div className="card">
        <div className="flex gap-4 mb-6">
          <div className="h-12 flex-1 bg-gray-100 rounded-xl" />
          <div className="h-12 w-48 bg-gray-100 rounded-xl" />
        </div>
        <div className="space-y-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 py-3 border-b border-gray-50">
              <div className="w-10 h-10 rounded-full bg-gray-200 flex-shrink-0" />
              <div className="flex-1 space-y-1.5">
                <div className="h-4 w-40 bg-gray-200 rounded" />
                <div className="h-3 w-28 bg-gray-100 rounded" />
              </div>
              <div className="h-4 w-32 bg-gray-100 rounded" />
              <div className="h-6 w-20 bg-gray-100 rounded-full" />
              <div className="h-4 w-16 bg-gray-100 rounded" />
              <div className="flex gap-2">
                <div className="w-8 h-8 bg-gray-100 rounded-lg" />
                <div className="w-8 h-8 bg-gray-100 rounded-lg" />
                <div className="w-8 h-8 bg-gray-100 rounded-lg" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
