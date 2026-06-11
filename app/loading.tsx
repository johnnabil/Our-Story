export default function Loading() {
  return (
    <main className="bg-cream px-6 py-16 text-text">
      <div className="mx-auto flex min-h-[70svh] max-w-3xl animate-pulse flex-col justify-center">
        <div className="h-px w-24 bg-gold" />
        <div className="mt-6 h-14 w-64 bg-gold-light/70" />
        <div className="mt-5 h-4 w-full max-w-xl bg-warm-white" />
        <div className="mt-3 h-4 w-4/5 bg-warm-white" />
        <div className="mt-10 grid gap-3 sm:grid-cols-3">
          <div className="h-28 bg-parchment/80" />
          <div className="h-28 bg-warm-white" />
          <div className="h-28 bg-gold-light/60" />
        </div>
      </div>
    </main>
  );
}
