"use client";

import { EditableImage } from "@/components/edit/EditableImage";
import { EditableText } from "@/components/edit/EditableText";
import { useContent } from "@/components/providers/ContentProvider";
import { useEdit } from "@/components/providers/EditProvider";
import { MemoryLoading } from "@/components/ui/MemoryLoading";

export function Hero() {
  const { content, isLoading, updateContent } = useContent();
  const { isEditing } = useEdit();

  if (isLoading || !content) {
    return <MemoryLoading id="hero" variant="hero" />;
  }

  const hero = content.hero;

  return (
    <section
      id="hero"
      className="archive-grain relative overflow-hidden px-4 py-8 sm:px-6 md:min-h-[calc(100dvh-4rem)] md:py-6"
    >
      <div className="table-shadow pointer-events-none absolute left-[8%] top-16 hidden h-28 w-20 rotate-[-8deg] border border-gold/20 bg-parchment/45 lg:block" />
      <div className="mx-auto grid w-full max-w-7xl items-center gap-10 md:min-h-[calc(100dvh-7rem)] md:grid-cols-[0.86fr_1.14fr] lg:gap-16">
        <div className="order-1 md:order-1">
          <h1 className="memory-reveal flex max-w-[780px] flex-wrap items-baseline gap-x-3 gap-y-1 text-5xl font-semibold leading-[1.03] text-archive-ink sm:text-6xl lg:text-7xl">
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
            className="memory-reveal mt-6 max-w-[40rem] text-lg leading-8 text-text-muted [--memory-delay:120ms] sm:text-xl"
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
            className="memory-reveal note-shadow mt-8 max-w-[42rem] border border-rose/20 bg-warm-white/55 px-5 py-4 font-serif text-xl italic leading-[1.55] text-rose-deep [--memory-delay:220ms] sm:text-2xl"
            onChange={(quote) =>
              updateContent("hero", {
                ...hero,
                quote
              })
            }
          />
        </div>

        <div className="order-2 md:order-2">
          <div className="relative mx-auto w-full max-w-[350px] sm:max-w-[430px] md:mr-0 md:max-w-[530px]">
            <div className="pointer-events-none absolute -bottom-8 left-8 right-8 h-12 rounded-[50%] bg-archive-ink/15 blur-2xl" />
            <div
              className={`scrapbook-polaroid relative p-3 pb-12 sm:p-4 sm:pb-14 ${
                isEditing ? "" : "motion-drop-in [--memory-delay:120ms] [--memory-rotate:-1.5deg]"
              }`}
            >
              <div className="scrapbook-tape pointer-events-none absolute -top-5 left-1/2 z-10 h-10 w-40 -translate-x-1/2 rotate-2" />
              <div className="relative aspect-4/5 overflow-hidden bg-parchment">
                <EditableImage
                  src={hero.photoUrl}
                  alt={`${hero.names.her} and ${hero.names.him}`}
                  width={720}
                  height={900}
                  fit="cover"
                  priority
                  sizes="(max-width: 768px) 100vw, 44vw"
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
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
