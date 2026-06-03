"use client";

import useEmblaCarousel from "embla-carousel-react";
import Image from "next/image";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { ChangeEvent } from "react";

import { EditableText } from "@/components/edit/EditableText";
import { useContent } from "@/components/providers/ContentProvider";
import { useEdit } from "@/components/providers/EditProvider";
import { ImageCropperModal } from "@/components/ui/ImageCropperModal";
import { Modal } from "@/components/ui/Modal";
import {
  imagePreparationErrorMessage,
  isExpectedImagePreparationError,
  normalizeImageForCrop
} from "@/lib/image-conversion";
import { GALLERY_CATEGORIES, type GalleryCategory } from "@/lib/types";
import { uploadImage, deleteImageAsset } from "@/lib/upload";

type FilterCategory = "all" | GalleryCategory;
const AUTO_ROTATE_MS = 1800;

type QueuedPhotoStatus = "ready" | "needs-crop" | "uploading" | "uploaded" | "error";

interface QueuedPhoto {
  id: string;
  originalFile: File;
  croppedFile: File | null;
  caption: string;
  category: GalleryCategory;
  status: QueuedPhotoStatus;
  error: string | null;
}

function createQueueId(file: File, index: number) {
  return `${file.name}-${file.lastModified}-${file.size}-${index}-${crypto.randomUUID()}`;
}

function captionFromFileName(fileName: string) {
  const baseName = fileName.replace(/\.[^/.]+$/, "").trim();

  if (!baseName) {
    return "New memory";
  }

  return baseName.replace(/[-_]+/g, " ");
}

export function Gallery() {
  const { content, isLoading, updateContent } = useContent();
  const { isEditing } = useEdit();

  const [activeCategory, setActiveCategory] = useState<FilterCategory>("all");
  const [selectedSlideIndex, setSelectedSlideIndex] = useState(0);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [defaultNewCategory, setDefaultNewCategory] =
    useState<GalleryCategory>("romantic");
  const [queuedPhotos, setQueuedPhotos] = useState<QueuedPhoto[]>([]);
  const [cropQueueId, setCropQueueId] = useState<string | null>(null);
  const [cropSourceFile, setCropSourceFile] = useState<File | null>(null);
  const [isPreparingImage, setIsPreparingImage] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const gallery = useMemo(() => content?.gallery ?? [], [content]);

  const filtered = useMemo(
    () =>
      gallery
        .map((photo, index) => ({ photo, index }))
        .filter(
          ({ photo }) =>
            activeCategory === "all" || photo.category === activeCategory,
        ),
    [gallery, activeCategory],
  );

  const canInteract = filtered.length >= 2;
  const canLoopSlides = canInteract;
  const emblaOptions = useMemo(
    () => ({
      loop: canLoopSlides,
      align: "start" as const,
    }),
    [canLoopSlides],
  );
  const [emblaRef, emblaApi] = useEmblaCarousel(emblaOptions);

  useEffect(() => {
    if (!emblaApi) {
      return;
    }

    const onSelect = () => {
      setSelectedSlideIndex(emblaApi.selectedScrollSnap());
    };

    onSelect();
    emblaApi.on("select", onSelect);
    emblaApi.on("reInit", onSelect);

    return () => {
      emblaApi.off("select", onSelect);
      emblaApi.off("reInit", onSelect);
    };
  }, [emblaApi]);

  useEffect(() => {
    setSelectedSlideIndex(0);
    emblaApi?.scrollTo(0, true);
  }, [activeCategory, emblaApi]);

  useEffect(() => {
    if (!filtered.length) {
      setSelectedSlideIndex(0);
      setLightboxIndex(null);
      return;
    }

    if (selectedSlideIndex >= filtered.length) {
      const clampedIndex = filtered.length - 1;
      setSelectedSlideIndex(clampedIndex);
      emblaApi?.scrollTo(clampedIndex, true);
    }

    if (lightboxIndex !== null && lightboxIndex >= filtered.length) {
      setLightboxIndex(filtered.length - 1);
    }
  }, [filtered.length, selectedSlideIndex, lightboxIndex, emblaApi]);

  useEffect(() => {
    if (
      !emblaApi ||
      !canInteract ||
      isEditing ||
      lightboxIndex !== null ||
      isAddModalOpen
    ) {
      return;
    }

    const intervalId = window.setInterval(() => {
      emblaApi.scrollNext();
    }, AUTO_ROTATE_MS);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [emblaApi, canInteract, isEditing, lightboxIndex, isAddModalOpen]);

  const currentLightboxItem =
    lightboxIndex !== null ? filtered[lightboxIndex] : null;
  const activeSlide = filtered[selectedSlideIndex] ?? null;
  const cropQueueItem =
    cropQueueId !== null
      ? queuedPhotos.find((queuedPhoto) => queuedPhoto.id === cropQueueId) ?? null
      : null;
  const readyQueuedPhotos = queuedPhotos.filter(
    (queuedPhoto) => queuedPhoto.croppedFile !== null,
  );
  const isCropModalOpen = cropQueueId !== null && cropSourceFile !== null;
  const slideSizeClass =
    "flex-[0_0_80%] sm:flex-[0_0_58%] md:flex-[0_0_45%] lg:flex-[0_0_34%] xl:flex-[0_0_30%]";

  const scrollToSlide = useCallback(
    (index: number) => {
      emblaApi?.scrollTo(index);
    },
    [emblaApi],
  );

  const scrollToPreviousSlide = useCallback(() => {
    emblaApi?.scrollPrev();
  }, [emblaApi]);

  const scrollToNextSlide = useCallback(() => {
    emblaApi?.scrollNext();
  }, [emblaApi]);

  const goToPrevious = useCallback(() => {
    setLightboxIndex((previous) => {
      if (previous === null || filtered.length <= 1) {
        return previous;
      }

      return (previous - 1 + filtered.length) % filtered.length;
    });
  }, [filtered.length]);

  const goToNext = useCallback(() => {
    setLightboxIndex((previous) => {
      if (previous === null || filtered.length <= 1) {
        return previous;
      }

      return (previous + 1) % filtered.length;
    });
  }, [filtered.length]);

  useEffect(() => {
    if (lightboxIndex === null) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setLightboxIndex(null);
      } else if (event.key === "ArrowLeft") {
        goToPrevious();
      } else if (event.key === "ArrowRight") {
        goToNext();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [lightboxIndex, goToPrevious, goToNext]);

  if (isLoading || !content) {
    return (
      <section
        id="gallery"
        className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6 sm:py-16 md:py-20"
      >
        <p className="text-text-muted">Loading...</p>
      </section>
    );
  }

  const resetAddModal = () => {
    setIsAddModalOpen(false);
    setDefaultNewCategory("romantic");
    setQueuedPhotos([]);
    setCropQueueId(null);
    setCropSourceFile(null);
    setIsPreparingImage(false);
    setUploadError(null);
  };

  const handlePhotoDelete = async (index: number) => {
    const photo = gallery[index];
    if (!photo) {
      return;
    }

    try {
      await deleteImageAsset(photo.publicId);
    } catch (error) {
      console.error(error);
    }

    updateContent(
      "gallery",
      gallery.filter((_, currentIndex) => currentIndex !== index),
    );
  };

  const handleFilesSelected = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";

    if (!files.length) {
      return;
    }

    const nextQueuedPhotos = files.map((file, index): QueuedPhoto => ({
      id: createQueueId(file, index),
      originalFile: file,
      croppedFile: null,
      caption: captionFromFileName(file.name),
      category: defaultNewCategory,
      status: "needs-crop",
      error: null,
    }));

    setQueuedPhotos((current) => [...current, ...nextQueuedPhotos]);
    setCropQueueId(nextQueuedPhotos[0]?.id ?? null);
    setUploadError(null);
  };

  const updateQueuedPhoto = (
    id: string,
    updater: (queuedPhoto: QueuedPhoto) => QueuedPhoto,
  ) => {
    setQueuedPhotos((current) =>
      current.map((queuedPhoto) =>
        queuedPhoto.id === id ? updater(queuedPhoto) : queuedPhoto,
      ),
    );
  };

  const removeQueuedPhoto = (id: string) => {
    setQueuedPhotos((current) =>
      current.filter((queuedPhoto) => queuedPhoto.id !== id),
    );

    if (cropQueueId === id) {
      setCropQueueId(null);
      setCropSourceFile(null);
    }
  };

  const openCropperForQueuedPhoto = async (id: string) => {
    const queuedPhoto = queuedPhotos.find((photo) => photo.id === id);

    if (!queuedPhoto) {
      return;
    }

    setCropQueueId(id);
    setCropSourceFile(null);
    setUploadError(null);
    setIsPreparingImage(true);
    updateQueuedPhoto(id, (current) => ({ ...current, error: null }));

    try {
      const normalizedFile = await normalizeImageForCrop(queuedPhoto.originalFile);
      setCropSourceFile(normalizedFile);
    } catch (conversionError) {
      if (!isExpectedImagePreparationError(conversionError)) {
        console.warn(conversionError);
      }

      const message = imagePreparationErrorMessage(conversionError);
      updateQueuedPhoto(id, (current) => ({
        ...current,
        status: "error",
        error: message
      }));
      setCropQueueId(null);
      setCropSourceFile(null);
    } finally {
      setIsPreparingImage(false);
    }
  };

  const handleAddQueuedPhotos = async (
    event: React.FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    if (!queuedPhotos.length) {
      setUploadError("Please choose one or more image files.");
      return;
    }

    const uncroppedCount = queuedPhotos.length - readyQueuedPhotos.length;
    if (uncroppedCount > 0) {
      setUploadError("Crop every selected photo before uploading.");
      return;
    }

    setUploadError(null);
    setIsUploading(true);
    setQueuedPhotos((current) =>
      current.map((queuedPhoto) => ({
        ...queuedPhoto,
        status: "uploading",
        error: null,
      })),
    );

    try {
      const uploadedPhotos = await Promise.all(
        queuedPhotos.map(async (queuedPhoto) => {
          if (!queuedPhoto.croppedFile) {
            throw new Error(`Missing cropped file for ${queuedPhoto.originalFile.name}`);
          }

          const uploaded = await uploadImage(queuedPhoto.croppedFile);

          return {
            url: uploaded.secure_url,
            caption: queuedPhoto.caption.trim() || "New memory",
            category: queuedPhoto.category,
            publicId: uploaded.public_id,
          };
        }),
      );

      updateContent("gallery", [...gallery, ...uploadedPhotos]);
      setActiveCategory("all");
      resetAddModal();
    } catch (error) {
      console.error(error);
      setQueuedPhotos((current) =>
        current.map((queuedPhoto) => ({
          ...queuedPhoto,
          status: queuedPhoto.croppedFile ? "ready" : "needs-crop",
          error: queuedPhoto.croppedFile ? null : "Crop required.",
        })),
      );
      setUploadError("Upload failed. No photos were added. Try again.");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <section
      id="gallery"
      className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6 sm:py-16 md:py-20"
    >
      <div className="mb-8 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <h2 className="font-serif text-3xl text-rose sm:text-4xl md:text-5xl">
          Gallery
        </h2>
        {isEditing ? (
          <button
            type="button"
            onClick={() => setIsAddModalOpen(true)}
            className="rounded-full border border-rose/40 px-4 py-2 text-sm text-rose transition hover:bg-rose/10"
          >
            Add photos
          </button>
        ) : null}
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setActiveCategory("all")}
          className={`rounded-full border px-3 py-1.5 text-sm transition ${
            activeCategory === "all"
              ? "border-rose/50 bg-rose/10 text-rose"
              : "border-gold/30 text-text-muted hover:border-rose/30 hover:text-rose"
          } whitespace-nowrap`}
        >
          All
        </button>
        {GALLERY_CATEGORIES.map((category) => (
          <button
            key={category}
            type="button"
            onClick={() => setActiveCategory(category)}
            className={`rounded-full border px-3 py-1.5 text-sm capitalize transition ${
              activeCategory === category
                ? "border-rose/50 bg-rose/10 text-rose"
                : "border-gold/30 text-text-muted hover:border-rose/30 hover:text-rose"
            } whitespace-nowrap`}
          >
            {category}
          </button>
        ))}
      </div>

      {filtered.length ? (
        <>
          <div className="relative">
            <div ref={emblaRef} className="overflow-hidden">
              <div className="flex gap-3 sm:gap-4">
                {filtered.map(({ photo, index }, visibleIndex) => (
                  <div
                    key={`${photo.url}-${index}`}
                    className={`min-w-0 shrink-0 ${slideSizeClass}`}
                  >
                    <article className="gallery-hover-target group relative">
                      <button
                        type="button"
                        onClick={() => setLightboxIndex(visibleIndex)}
                        className="relative block w-full"
                      >
                        <div className="relative aspect-4/3 w-full overflow-hidden rounded-2xl border border-gold/20 bg-warm-white shadow-sm">
                          <Image
                            src={photo.url}
                            alt={photo.caption}
                            width={1600}
                            height={1200}
                            sizes="(max-width: 640px) 80vw, (max-width: 768px) 58vw, (max-width: 1024px) 45vw, 30vw"
                            className="h-full w-full object-contain"
                          />
                          <span className="gallery-hover-caption pointer-events-none absolute inset-x-0 bottom-0 bg-linear-to-t from-text/65 via-text/20 to-transparent p-3 text-left text-xs text-warm-white opacity-0 transition-opacity duration-200 sm:p-4 sm:text-sm">
                            {photo.caption}
                          </span>
                        </div>
                      </button>
                    </article>
                  </div>
                ))}
              </div>
            </div>

            {canInteract ? (
              <>
                <button
                  type="button"
                  onClick={scrollToPreviousSlide}
                  className="absolute left-3 top-1/2 hidden -translate-y-1/2 rounded border border-warm-white/35 bg-text/35 px-3 py-2 text-sm text-warm-white transition hover:bg-text/55 md:block"
                  aria-label="Previous slide"
                >
                  Prev
                </button>
                <button
                  type="button"
                  onClick={scrollToNextSlide}
                  className="absolute right-3 top-1/2 hidden -translate-y-1/2 rounded border border-warm-white/35 bg-text/35 px-3 py-2 text-sm text-warm-white transition hover:bg-text/55 md:block"
                  aria-label="Next slide"
                >
                  Next
                </button>
              </>
            ) : null}
          </div>

          {canInteract ? (
            <div className="mt-4 flex items-center justify-center gap-2">
              {filtered.map((_, index) => (
                <button
                  key={`dot-${index}`}
                  type="button"
                  onClick={() => scrollToSlide(index)}
                  className={`h-2.5 w-2.5 rounded-full border transition ${
                    index === selectedSlideIndex
                      ? "border-rose bg-rose"
                      : "border-gold/50 bg-transparent hover:border-rose/50"
                  }`}
                  aria-label={`Go to slide ${index + 1}`}
                />
              ))}
            </div>
          ) : null}

          {isEditing && activeSlide ? (
            <div className="mt-4 rounded-2xl border border-gold/20 bg-warm-white p-4">
              <p className="mb-3 text-xs uppercase tracking-[0.12em] text-text-light">
                Edit current slide
              </p>
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    void handlePhotoDelete(activeSlide.index);
                  }}
                  className="rounded border border-rose/30 px-2 py-1 text-xs text-rose transition hover:bg-rose/10"
                >
                  Delete photo
                </button>
                <select
                  value={activeSlide.photo.category}
                  onChange={(event) => {
                    const next = [...gallery];
                    next[activeSlide.index] = {
                      ...activeSlide.photo,
                      category: event.target.value as GalleryCategory,
                    };
                    updateContent("gallery", next);
                  }}
                  className="rounded border border-gold/30 bg-cream px-2 py-1 text-xs capitalize text-text"
                >
                  {GALLERY_CATEGORIES.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </div>
              <EditableText
                value={activeSlide.photo.caption}
                className="text-sm text-text-muted"
                onChange={(caption) => {
                  const next = [...gallery];
                  next[activeSlide.index] = {
                    ...activeSlide.photo,
                    caption,
                  };
                  updateContent("gallery", next);
                }}
              />
            </div>
          ) : null}
        </>
      ) : (
        <div className="rounded-2xl border border-gold/20 bg-warm-white p-8 text-center">
          <p className="text-text-muted">No photos in this category yet.</p>
          {isEditing ? (
            <p className="mt-2 text-sm text-text-light">
              Add a photo or switch to another category.
            </p>
          ) : null}
        </div>
      )}

      {currentLightboxItem ? (
        <div className="fixed inset-0 z-50 bg-text/90 p-3 sm:p-6">
          <button
            type="button"
            onClick={() => setLightboxIndex(null)}
            className="absolute right-3 top-3 rounded border border-warm-white/30 px-3 py-1 text-xs text-warm-white transition hover:bg-warm-white/10 sm:right-4 sm:top-4 sm:text-sm"
          >
            Close
          </button>
          <div className="mx-auto flex h-full max-w-5xl flex-col items-center justify-center gap-3 sm:gap-4">
            <div className="relative max-h-[78vh] w-full overflow-hidden rounded-2xl border border-warm-white/20 sm:max-h-[85vh]">
              <Image
                src={currentLightboxItem.photo.url}
                alt={currentLightboxItem.photo.caption}
                width={1600}
                height={1200}
                sizes="100vw"
                className="max-h-[78vh] w-full object-contain sm:max-h-[85vh]"
              />
            </div>

            {canInteract ? (
              <div className="flex w-full max-w-sm items-center justify-center gap-3 sm:hidden">
                <button
                  type="button"
                  onClick={goToPrevious}
                  className="w-full rounded border border-warm-white/30 px-3 py-2 text-sm text-warm-white transition hover:bg-warm-white/10"
                >
                  Prev
                </button>
                <button
                  type="button"
                  onClick={goToNext}
                  className="w-full rounded border border-warm-white/30 px-3 py-2 text-sm text-warm-white transition hover:bg-warm-white/10"
                >
                  Next
                </button>
              </div>
            ) : null}

            {canInteract ? (
              <>
                <button
                  type="button"
                  onClick={goToPrevious}
                  className="absolute left-3 top-1/2 hidden -translate-y-1/2 rounded border border-warm-white/30 px-3 py-2 text-sm text-warm-white transition hover:bg-warm-white/10 sm:block"
                >
                  Prev
                </button>
                <button
                  type="button"
                  onClick={goToNext}
                  className="absolute right-3 top-1/2 hidden -translate-y-1/2 rounded border border-warm-white/30 px-3 py-2 text-sm text-warm-white transition hover:bg-warm-white/10 sm:block"
                >
                  Next
                </button>
              </>
            ) : null}
          </div>
        </div>
      ) : null}

      <Modal
        isOpen={isAddModalOpen}
        title="Add Photos"
        onClose={() => {
          resetAddModal();
        }}
      >
        <form
          className="space-y-4"
          onSubmit={(event) => void handleAddQueuedPhotos(event)}
        >
          <label className="block text-sm text-text-muted">
            Default category
            <select
              value={defaultNewCategory}
              onChange={(event) =>
                setDefaultNewCategory(event.target.value as GalleryCategory)
              }
              className="mt-1 w-full rounded-md border border-gold/35 bg-cream px-3 py-2 outline-none focus:border-rose focus:ring-2 focus:ring-rose/20"
            >
              {GALLERY_CATEGORIES.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-sm text-text-muted">
            Image files
            <input
              type="file"
              accept="image/*,.apng,.dng,.heic,.heif,.hif,.png"
              multiple
              onChange={handleFilesSelected}
              disabled={isUploading || isPreparingImage}
              className="mt-1 w-full rounded-md border border-gold/35 bg-cream px-3 py-2 text-sm text-text disabled:opacity-70"
            />
          </label>

          {queuedPhotos.length ? (
            <div className="max-h-80 space-y-3 overflow-y-auto pr-1">
              {queuedPhotos.map((queuedPhoto, index) => (
                <div
                  key={queuedPhoto.id}
                  className="rounded-md border border-gold/25 bg-cream p-3"
                >
                  <div className="mb-2 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-text">
                        {queuedPhoto.originalFile.name}
                      </p>
                      <p className="text-xs text-text-light">
                        Photo {index + 1} of {queuedPhotos.length} ·{" "}
                        {queuedPhoto.croppedFile ? "Cropped" : "Crop required"}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeQueuedPhoto(queuedPhoto.id)}
                      disabled={isUploading}
                      className="shrink-0 rounded border border-rose/30 px-2 py-1 text-xs text-rose transition hover:bg-rose/10 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Remove
                    </button>
                  </div>

                  <div className="grid gap-2 sm:grid-cols-[1fr_140px_auto]">
                    <input
                      type="text"
                      value={queuedPhoto.caption}
                      onChange={(event) =>
                        updateQueuedPhoto(queuedPhoto.id, (current) => ({
                          ...current,
                          caption: event.target.value,
                        }))
                      }
                      disabled={isUploading}
                      className="rounded-md border border-gold/35 bg-warm-white px-3 py-2 text-sm text-text outline-none focus:border-rose focus:ring-2 focus:ring-rose/20 disabled:opacity-70"
                      placeholder="Memory caption"
                    />
                    <select
                      value={queuedPhoto.category}
                      onChange={(event) =>
                        updateQueuedPhoto(queuedPhoto.id, (current) => ({
                          ...current,
                          category: event.target.value as GalleryCategory,
                        }))
                      }
                      disabled={isUploading}
                      className="rounded-md border border-gold/35 bg-warm-white px-3 py-2 text-sm capitalize text-text outline-none focus:border-rose focus:ring-2 focus:ring-rose/20 disabled:opacity-70"
                    >
                      {GALLERY_CATEGORIES.map((category) => (
                        <option key={category} value={category}>
                          {category}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => {
                        void openCropperForQueuedPhoto(queuedPhoto.id);
                      }}
                      disabled={isUploading || isPreparingImage}
                      className="rounded border border-rose/30 px-3 py-2 text-xs text-rose transition hover:bg-rose/10 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isPreparingImage && cropQueueId === queuedPhoto.id
                        ? "Preparing..."
                        : queuedPhoto.croppedFile
                          ? "Recrop"
                          : "Crop"}
                    </button>
                  </div>

                  {queuedPhoto.error ? (
                    <p className="mt-2 text-xs text-rose-deep">{queuedPhoto.error}</p>
                  ) : null}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-text-light">
              Select multiple images, crop each one, then add them together.
            </p>
          )}

          {uploadError ? (
            <p className="text-sm text-rose-deep">{uploadError}</p>
          ) : null}

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isUploading || isPreparingImage || !queuedPhotos.length}
              className="rounded-full border border-rose/40 px-4 py-2 text-sm font-medium text-rose transition hover:bg-rose/10 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isUploading
                ? `Uploading ${queuedPhotos.length}...`
                : `Add ${queuedPhotos.length ? `${queuedPhotos.length} ` : ""}photo${queuedPhotos.length === 1 ? "" : "s"}`}
            </button>
          </div>
        </form>
      </Modal>

      <ImageCropperModal
        isOpen={isCropModalOpen}
        file={cropSourceFile}
        title="Crop Photo"
        aspectRatio={4 / 3}
        defaultPreset="free"
        onCancel={() => {
          setCropQueueId(null);
          setCropSourceFile(null);
        }}
        onApply={(croppedFile) => {
          if (cropQueueItem) {
            updateQueuedPhoto(cropQueueItem.id, (current) => ({
              ...current,
              croppedFile,
              status: "ready",
              error: null,
            }));
          }

          setCropQueueId(null);
          setCropSourceFile(null);
        }}
      />
    </section>
  );
}
