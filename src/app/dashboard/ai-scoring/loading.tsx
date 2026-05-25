export default function Loading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-7 w-32 bg-gray-200 rounded-lg" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="card h-40 bg-gray-50" />
        ))}
      </div>
    </div>
  );
}
