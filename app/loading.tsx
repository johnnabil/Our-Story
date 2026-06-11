export default function Loading() {
  return (
    <main className="archive-grain min-h-svh overflow-hidden bg-cream px-6 py-12 text-text">
      <div className="mx-auto flex min-h-[calc(100svh-6rem)] max-w-5xl flex-col justify-center">
        <div className="grid items-center gap-10 lg:grid-cols-[minmax(0,0.9fr)_minmax(320px,1fr)]">
          <div className="max-w-xl">
            <div className="mb-5 h-px w-28 origin-left animate-[memory-draw_1.2s_ease-out_infinite_alternate] bg-gold" />
            <p className="text-xs font-bold uppercase tracking-[0.32em] text-rose-ink/70">
              Opening the archive
            </p>
            <h1 className="mt-4 font-serif text-5xl font-bold leading-tight text-rose-ink sm:text-6xl">
              Our Story
            </h1>
            <p className="mt-5 max-w-md text-sm leading-7 text-text-muted">
              Gathering the letters, photos, dates, and little pieces of us.
            </p>

            <div className="mt-8 h-1.5 overflow-hidden rounded-full bg-gold/20">
              <div className="h-full w-1/2 rounded-full bg-rose animate-[memory-progress_1.7s_ease-in-out_infinite]" />
            </div>
          </div>

          <div className="relative min-h-[360px]">
            <div className="absolute left-6 top-12 h-56 w-40 rotate-[-8deg] rounded-md border border-gold/25 bg-warm-white p-3 shadow-[0_22px_60px_oklch(31%_0.042_292_/_0.14)] animate-[memory-float_3.6s_ease-in-out_infinite]">
              <div className="loading-shimmer h-36 rounded-sm" />
              <div className="mt-4 h-2 w-24 rounded-full bg-gold/20" />
              <div className="mt-2 h-2 w-16 rounded-full bg-rose/15" />
            </div>

            <div className="absolute left-1/2 top-4 h-64 w-44 -translate-x-1/2 rotate-[4deg] rounded-md border border-gold/25 bg-warm-white p-3 shadow-[0_26px_70px_oklch(31%_0.042_292_/_0.16)] animate-[memory-float_4.2s_ease-in-out_infinite_0.2s]">
              <div className="loading-shimmer h-44 rounded-sm" />
              <div className="mt-4 h-2 w-28 rounded-full bg-gold/20" />
              <div className="mt-2 h-2 w-20 rounded-full bg-rose/15" />
            </div>

            <div className="absolute bottom-8 right-4 h-52 w-40 rotate-[10deg] rounded-md border border-gold/25 bg-warm-white p-3 shadow-[0_20px_58px_oklch(31%_0.042_292_/_0.14)] animate-[memory-float_3.9s_ease-in-out_infinite_0.4s]">
              <div className="loading-shimmer h-32 rounded-sm" />
              <div className="mt-4 h-2 w-24 rounded-full bg-gold/20" />
              <div className="mt-2 h-2 w-14 rounded-full bg-rose/15" />
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
