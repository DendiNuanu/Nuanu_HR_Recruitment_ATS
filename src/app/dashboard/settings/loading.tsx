export default function Loading() {
  return (
    <div className="space-y-6 animate-pulse max-w-2xl">
      <div className="h-7 w-32 bg-gray-200 rounded-lg" />
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="card h-20 bg-gray-50" />
      ))}
    </div>
  );
}
