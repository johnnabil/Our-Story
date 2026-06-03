"use client";

import { EditableRichText } from "@/components/edit/EditableRichText";
import { EditableText } from "@/components/edit/EditableText";
import { useContent } from "@/components/providers/ContentProvider";

function formatToday() {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric"
  }).format(new Date());
}

export function Letter() {
  const { content, isLoading, updateContent } = useContent();

  if (isLoading || !content) {
    return (
      <section id="letter" className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6 sm:py-16 md:py-20">
        <p className="text-text-muted">Loading...</p>
      </section>
    );
  }

  const letter = content.letter;

  return (
    <section id="letter" className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6 sm:py-16 md:py-20">
      <h2 className="mb-8 text-center font-serif text-3xl text-rose sm:text-4xl md:text-5xl">Letter</h2>
      <article className="mx-auto max-w-[680px] rounded-2xl border border-gold/35 bg-parchment px-4 py-6 shadow-md sm:px-6 sm:py-8 md:px-10">
        <p className="mb-6 text-right text-sm text-text-muted">{formatToday()}</p>

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
            className="font-serif text-base leading-relaxed text-text sm:text-lg"
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
    </section>
  );
}
