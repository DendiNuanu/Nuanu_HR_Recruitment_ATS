export default function Loading() {
  return (
    <div className="animate-pulse">
      <div className="flex justify-between items-center mb-6">
        <div className="h-7 w-40 bg-gray-200 rounded-lg" />
        <div className="flex gap-3">
          <div className="h-10 w-48 bg-gray-100 rounded-xl" />
          <div className="h-10 w-32 bg-gray-100 rounded-xl" />
        </div>
      </div>
      <div className="flex gap-4 overflow-x-auto pb-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex-shrink-0 w-64">
            <div className="flex items-center justify-between mb-3">
              <div className="h-5 w-24 bg-gray-200 rounded" />
              <div className="h-5 w-6 bg-gray-100 rounded-full" />
            </div>
            <div className="space-y-3">
              {Array.from({ length: i === 0 ? 4 : 2 }).map((_, j) => (
                <div key={j} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-gray-200" />
                    <div className="space-y-1 flex-1">
                      <div className="h-3.5 w-28 bg-gray-200 rounded" />
                      <div className="h-3 w-20 bg-gray-100 rounded" />
                    </div>
                  </div>
                  <div className="h-2 w-full bg-gray-100 rounded-full" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
