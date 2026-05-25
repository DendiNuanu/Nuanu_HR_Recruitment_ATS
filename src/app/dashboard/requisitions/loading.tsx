export default function Loading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-7 w-44 bg-gray-200 rounded-lg" />
      <div className="card">
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-12 bg-gray-50 rounded-lg" />
          ))}
        </div>
      </div>
    </div>
  );
}
