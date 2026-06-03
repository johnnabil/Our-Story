"use client";

export default function Error({
  error,
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-cream px-6 py-16 text-text">
      <div className="w-full max-w-lg rounded-2xl border border-gold/30 bg-warm-white p-8 text-center shadow-sm">
        <h1 className="font-serif text-4xl text-rose">Something went wrong</h1>
        <p className="mt-3 text-text-muted">
          {error.message || "An unexpected error interrupted this page."}
        </p>
        <button
          type="button"
          onClick={reset}
          className="mt-6 rounded-full border border-rose/40 px-5 py-2 text-sm font-medium text-rose transition hover:bg-rose/10"
        >
          Try again
        </button>
      </div>
    </main>
  );
}
