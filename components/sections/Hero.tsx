"use client";

import { EditableImage } from "@/components/edit/EditableImage";
import { EditableText } from "@/components/edit/EditableText";
import { useContent } from "@/components/providers/ContentProvider";
import { MemoryLoading } from "@/components/ui/MemoryLoading";

export function Hero() {
  const { content, isLoading, updateContent } = useContent();

  if (isLoading || !content) {
    return <MemoryLoading id="hero" variant="hero" />;
  }

  const hero = content.hero;

  return (
    <section
      id="hero"
      className="relative overflow-hidden px-4 py-8 sm:px-6 md:min-h-[calc(100dvh-4rem)] md:py-6"
    >
      <div className="mx-auto grid w-full max-w-7xl items-center gap-8 md:min-h-[calc(100dvh-7rem)] md:grid-cols-[0.9fr_1.1fr] lg:gap-14">
        <div className="order-2 md:order-1">
          <h1 className="flex max-w-[760px] flex-wrap items-baseline gap-x-3 gap-y-1 text-5xl font-semibold leading-[1.04] text-archive-ink sm:text-6xl lg:text-7xl">
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
            className="mt-5 max-w-[40rem] text-lg leading-8 text-text-muted sm:text-xl"
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
            className="mt-8 max-w-[42rem] border-l border-rose/40 pl-5 font-serif text-xl italic leading-[1.55] text-rose-deep sm:text-2xl"
            onChange={(quote) =>
              updateContent("hero", {
                ...hero,
                quote
              })
            }
          />
        </div>

        <div className="order-1 md:order-2">
          <div className="relative mx-auto w-full max-w-[360px] sm:max-w-[430px] md:mr-0 md:max-w-[520px]">
            <div className="relative overflow-hidden rounded-[2rem] border border-gold/35 bg-warm-white shadow-[0_28px_80px_oklch(31%_0.042_292_/_0.16)] aspect-4/5">
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
    </section>
  );
}
