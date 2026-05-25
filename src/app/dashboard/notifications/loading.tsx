export default function Loading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-7 w-40 bg-gray-200 rounded-lg" />
      <div className="space-y-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="card h-16 bg-gray-50" />
        ))}
      </div>
    </div>
  );
}
