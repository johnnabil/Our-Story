"use client";

import { EditableRichText } from "@/components/edit/EditableRichText";
import { EditableText } from "@/components/edit/EditableText";
import { useContent } from "@/components/providers/ContentProvider";
import { MemoryLoading } from "@/components/ui/MemoryLoading";

export function Letter() {
  const { content, isLoading, updateContent } = useContent();

  if (isLoading || !content) {
    return <MemoryLoading id="letter" />;
  }

  const letter = content.letter;

  return (
    <section id="letter" className="px-4 py-16 sm:px-6 md:py-24">
      <div className="mx-auto grid w-full max-w-6xl gap-8 lg:grid-cols-[0.78fr_1.22fr] lg:items-start">
        <div className="lg:sticky lg:top-28">
          <h2 className="max-w-[10ch] font-serif text-4xl leading-tight text-archive-ink sm:text-5xl md:text-6xl">
          A Letter Kept For Us
        </h2>
        </div>

        <article className="relative border border-gold/30 bg-parchment px-5 py-8 shadow-[0_26px_70px_oklch(31%_0.042_292_/_0.11)] sm:px-8 sm:py-10 md:px-12">
          <div className="absolute -right-3 -top-3 hidden h-20 w-20 border border-rose/20 bg-rose-light/30 sm:block" />

        <EditableText
          value={letter.salutation}
          className="font-serif text-2xl text-text sm:text-3xl"
          onChange={(salutation) =>
            updateContent("letter", {
              ...letter,
              salutation
            })
          }
        />

        <div className="mt-6">
          <EditableRichText
            value={letter.body}
            onChange={(body) =>
              updateContent("letter", {
                ...letter,
                body
              })
            }
            className="max-w-[62ch] font-serif text-base leading-8 text-text sm:text-lg"
          />
        </div>

        <div className="mt-8">
          <EditableText
            value={letter.signature}
            className="font-serif text-xl italic text-rose-deep sm:text-2xl"
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
    </section>
  );
}
