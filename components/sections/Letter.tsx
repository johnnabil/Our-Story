"use client";

import { EditableRichText } from "@/components/edit/EditableRichText";
import { EditableText } from "@/components/edit/EditableText";
import { useContent } from "@/components/providers/ContentProvider";
import { useEdit } from "@/components/providers/EditProvider";
import { MemoryLoading } from "@/components/ui/MemoryLoading";

export function Letter() {
  const { content, isLoading, updateContent } = useContent();
  const { isEditing } = useEdit();

  if (isLoading || !content) {
    return <MemoryLoading id="letter" />;
  }

  const letter = content.letter;

  return (
    <section id="letter" className="relative overflow-hidden px-4 py-16 sm:px-6 md:py-24">
      <div className="pointer-events-none absolute left-[8%] top-20 hidden h-40 w-56 rotate-[-5deg] border border-gold/20 bg-gold-light/20 shadow-[0_18px_50px_oklch(31%_0.042_292_/_0.06)] lg:block" />
      <div className="pointer-events-none absolute bottom-16 right-[6%] hidden h-28 w-44 rotate-[4deg] border border-rose/15 bg-rose-light/18 lg:block" />

      <div className="mx-auto grid w-full max-w-6xl gap-10 lg:grid-cols-[0.62fr_1.38fr] lg:items-center">
        <div className="memory-reveal max-w-md lg:sticky lg:top-28">
          <div className="mb-8 w-fit rotate-[-2deg] border border-gold/25 bg-warm-white px-4 py-3 shadow-[0_12px_34px_oklch(31%_0.042_292_/_0.07)]">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-rose-ink">
              kept note
            </p>
          </div>
          <h2 className="max-w-[9ch] font-serif text-5xl leading-[0.95] text-archive-ink sm:text-6xl md:text-7xl lg:text-8xl">
            The letter
          </h2>
          <p className="mt-6 max-w-[30ch] text-base leading-7 text-text-muted sm:text-lg">
            folded into the quiet middle of our story.
          </p>
        </div>

        <div
          className={`relative ${
            isEditing ? "" : "memory-reveal [--memory-delay:120ms]"
          }`}
        >
          <div className="pointer-events-none absolute -left-3 top-8 hidden h-[calc(100%-4rem)] w-7 rotate-[-1.5deg] border border-gold/15 bg-parchment/70 shadow-[0_18px_45px_oklch(31%_0.042_292_/_0.07)] sm:block" />
          <article
            className={`letter-paper paper-shadow relative overflow-hidden px-5 py-8 sm:px-8 sm:py-10 md:px-14 md:py-12 ${
              isEditing ? "" : "rotate-[0.4deg]"
            }`}
          >
          <div className="pointer-events-none absolute inset-x-5 top-5 border-t border-warm-white/75" />
          <div className="pointer-events-none absolute inset-x-5 bottom-5 border-t border-gold/20" />
          <div className="pointer-events-none absolute right-0 top-0 h-24 w-24 bg-[linear-gradient(135deg,transparent_50%,oklch(88%_0.033_348_/_0.5)_50%)] shadow-[-12px_12px_24px_oklch(31%_0.042_292_/_0.08)]" />
          <div className="pointer-events-none absolute -left-8 top-28 h-16 w-16 rounded-full border border-gold/15" />
          <div className="pointer-events-none absolute bottom-24 right-16 h-px w-24 rotate-[-6deg] bg-rose/20" />

          <EditableText
            value={letter.salutation}
            className="letter-hand relative max-w-[18ch] text-4xl font-semibold leading-tight text-archive-ink sm:text-5xl"
            onChange={(salutation) =>
              updateContent("letter", {
                ...letter,
                salutation
              })
            }
          />

          <div className="relative mt-8 border-y border-gold/20 py-7 sm:mt-10 sm:py-9">
            <EditableRichText
              value={letter.body}
              onChange={(body) =>
                updateContent("letter", {
                  ...letter,
                  body
                })
              }
              className="letter-hand max-w-[52ch] text-[1.45rem] font-medium leading-[1.65] text-text sm:text-[1.75rem] sm:leading-[1.55]"
            />
          </div>

          <div className="mt-8 flex justify-end sm:mt-10">
            <EditableText
              value={letter.signature}
              className="letter-hand text-4xl font-semibold text-rose-deep sm:text-5xl"
              onChange={(signature) =>
                updateContent("letter", {
                  ...letter,
                  signature
                })
              }
            />
          </div>
          </article>
        </div>
      </div>
    </section>
  );
}
