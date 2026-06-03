"use client";

import { EditableImage } from "@/components/edit/EditableImage";
import { EditableText } from "@/components/edit/EditableText";
import { useContent } from "@/components/providers/ContentProvider";

export function Hero() {
  const { content, isLoading, updateContent } = useContent();

  if (isLoading || !content) {
    return (
      <section
        id="hero"
        className="flex min-h-[92svh] items-center justify-center bg-gradient-to-b from-cream to-warm-white px-4 py-14 sm:px-6 sm:py-16 md:min-h-screen md:py-20"
      >
        <p className="text-text-muted">Loading...</p>
      </section>
    );
  }

  const hero = content.hero;

  return (
    <section
      id="hero"
      className="relative flex min-h-[92svh] items-center justify-center bg-gradient-to-b from-cream via-warm-white to-cream px-4 py-14 sm:px-6 sm:py-16 md:min-h-screen md:py-20"
    >
      <div className="mx-auto flex w-full max-w-5xl flex-col items-center gap-6 text-center sm:gap-8">
        <div className="w-56 max-w-full overflow-hidden rounded-3xl border-4 border-gold/40 shadow-lg aspect-3/4 sm:w-64 md:w-72">
          <EditableImage
            src={hero.photoUrl}
            alt={`${hero.names.her} and ${hero.names.him}`}
            width={432}
            height={576}
            fit="contain"
            priority
            sizes="(max-width: 640px) 224px, (max-width: 768px) 256px, 288px"
            className="h-full w-full"
            currentPublicId={hero.photoPublicId}
            onChange={(photoUrl, photoPublicId) => {
              updateContent("hero", {
                ...hero,
                photoUrl,
                photoPublicId
              });
            }}
          />
        </div>

        <h1 className="flex flex-wrap items-center justify-center gap-2 text-3xl font-semibold leading-tight text-rose sm:gap-3 sm:text-5xl md:text-7xl">
          <EditableText
            value={hero.names.her}
            as="span"
            className="font-serif"
            onChange={(her) =>
              updateContent("hero", {
                ...hero,
                names: {
                  ...hero.names,
                  her
                }
              })
            }
          />
          <span className="font-serif text-gold">&</span>
          <EditableText
            value={hero.names.him}
            as="span"
            className="font-serif"
            onChange={(him) =>
              updateContent("hero", {
                ...hero,
                names: {
                  ...hero.names,
                  him
                }
              })
            }
          />
        </h1>

        <EditableText
          value={hero.subtitle}
          as="p"
          className="max-w-2xl text-base text-text-muted sm:text-lg md:text-xl"
          onChange={(subtitle) =>
            updateContent("hero", {
              ...hero,
              subtitle
            })
          }
        />

        <EditableText
          value={hero.quote}
          as="blockquote"
          className="max-w-3xl font-serif text-xl italic text-rose-deep sm:text-2xl md:text-3xl"
          onChange={(quote) =>
            updateContent("hero", {
              ...hero,
              quote
            })
          }
        />
      </div>

      <a
        href="#countdowns"
        aria-label="Jump to the countdowns section"
        className="group absolute bottom-4 left-1/2 inline-flex -translate-x-1/2 items-center gap-2 rounded-full border border-gold/40 bg-warm-white/70 px-3 py-1.5 text-xs font-medium text-text-muted transition hover:border-rose/35 hover:text-rose sm:bottom-6 sm:text-sm"
      >
        <span>See Countdowns</span>
        <span aria-hidden className="text-base leading-none transition group-hover:translate-y-0.5">
          ↓
        </span>
      </a>
    </section>
  );
}
