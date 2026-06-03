export default function Loading() {
  return (
    <main className="bg-cream px-6 py-16 text-text">
      <div className="mx-auto max-w-6xl animate-pulse space-y-6">
        <div className="h-12 w-56 rounded bg-gold/20" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="h-44 rounded-2xl bg-warm-white" />
          ))}
        </div>
        <div className="h-44 rounded-2xl bg-warm-white" />
        <div className="h-44 rounded-2xl bg-warm-white" />
      </div>
    </main>
  );
}
