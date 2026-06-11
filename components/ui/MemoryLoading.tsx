interface MemoryLoadingProps {
  id?: string;
  variant?: "hero" | "section";
}

export function MemoryLoading({ id, variant = "section" }: MemoryLoadingProps) {
  if (variant === "hero") {
    return (
      <section
        id={id}
        className="flex min-h-[100dvh] items-center overflow-hidden px-4 py-20 sm:px-6 md:py-24"
      >
        <div className="mx-auto grid w-full max-w-6xl items-center gap-10 md:grid-cols-[minmax(0,0.9fr)_minmax(300px,1fr)]">
          <div>
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
            <div className="mt-8 h-1.5 max-w-sm overflow-hidden rounded-full bg-gold/20">
              <div className="h-full w-1/2 rounded-full bg-rose animate-[memory-progress_1.7s_ease-in-out_infinite]" />
            </div>
          </div>

          <div className="relative min-h-[340px]">
            <div className="absolute left-3 top-14 h-52 w-36 rotate-[-8deg] rounded-md border border-gold/25 bg-warm-white p-3 shadow-[0_22px_60px_oklch(31%_0.042_292_/_0.14)] animate-[memory-float_3.6s_ease-in-out_infinite] sm:left-8">
              <div className="loading-shimmer h-32 rounded-sm" />
              <div className="mt-4 h-2 w-20 rounded-full bg-gold/20" />
              <div className="mt-2 h-2 w-14 rounded-full bg-rose/15" />
            </div>
            <div className="absolute left-1/2 top-2 h-60 w-40 -translate-x-1/2 rotate-[4deg] rounded-md border border-gold/25 bg-warm-white p-3 shadow-[0_26px_70px_oklch(31%_0.042_292_/_0.16)] animate-[memory-float_4.2s_ease-in-out_infinite_0.2s]">
              <div className="loading-shimmer h-40 rounded-sm" />
              <div className="mt-4 h-2 w-24 rounded-full bg-gold/20" />
              <div className="mt-2 h-2 w-16 rounded-full bg-rose/15" />
            </div>
            <div className="absolute bottom-8 right-3 h-48 w-36 rotate-[10deg] rounded-md border border-gold/25 bg-warm-white p-3 shadow-[0_20px_58px_oklch(31%_0.042_292_/_0.14)] animate-[memory-float_3.9s_ease-in-out_infinite_0.4s] sm:right-8">
              <div className="loading-shimmer h-28 rounded-sm" />
              <div className="mt-4 h-2 w-20 rounded-full bg-gold/20" />
              <div className="mt-2 h-2 w-12 rounded-full bg-rose/15" />
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section
      id={id}
      className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6 sm:py-16 md:py-20"
    >
      <div className="grid gap-4 rounded-md border border-gold/20 bg-warm-white/70 p-5 shadow-sm sm:grid-cols-[160px_minmax(0,1fr)]">
        <div className="loading-shimmer h-32 rounded-sm" />
        <div className="flex flex-col justify-center">
          <div className="h-px w-20 animate-[memory-draw_1.2s_ease-out_infinite_alternate] bg-gold" />
          <p className="mt-4 text-xs font-bold uppercase tracking-[0.28em] text-rose-ink/70">
            Arranging memories
          </p>
          <div className="mt-5 h-2 w-full max-w-md overflow-hidden rounded-full bg-gold/20">
            <div className="h-full w-1/2 rounded-full bg-rose animate-[memory-progress_1.7s_ease-in-out_infinite]" />
          </div>
        </div>
      </div>
    </section>
  );
}
