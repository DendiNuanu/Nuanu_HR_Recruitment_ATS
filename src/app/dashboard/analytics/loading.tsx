export default function Loading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-7 w-40 bg-gray-200 rounded-lg" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="card h-24 bg-gray-50" />
        ))}
      </div>
      <div className="card h-80 bg-gray-50" />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card h-64 bg-gray-50" />
        <div className="card h-64 bg-gray-50" />
      </div>
    </div>
  );
}
