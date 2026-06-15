"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent } from "react";

import { EditableText } from "@/components/edit/EditableText";
import { useContent } from "@/components/providers/ContentProvider";
import { useEdit } from "@/components/providers/EditProvider";
import { ImageCropperModal } from "@/components/ui/ImageCropperModal";
import { MemoryLoading } from "@/components/ui/MemoryLoading";
import { Modal } from "@/components/ui/Modal";
import {
  imagePreparationErrorMessage,
  isExpectedImagePreparationError,
  normalizeImageForCrop
} from "@/lib/image-conversion";
import { GALLERY_CATEGORIES, type GalleryCategory, type GalleryPhoto } from "@/lib/types";
import { uploadImage, deleteImageAsset } from "@/lib/upload";

type FilterCategory = "all" | GalleryCategory;
type AppendGalleryResponse = {
  gallery: GalleryPhoto[];
};
const DELETE_IMAGE_CONFIRMATION =
  "Delete this photo from Cloudinary and remove it from the gallery? This cannot be undone.";
const FOCUSABLE_SELECTOR =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

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

function previewTileClass(index: number) {
  const pattern = [
    "col-span-2 row-span-3",
    "row-span-2",
    "row-span-2",
    "row-span-3",
    "col-span-2 row-span-2",
    "row-span-2",
    "row-span-3",
    "row-span-2",
    "col-span-2 row-span-3",
    "row-span-2"
  ];

  return pattern[index % pattern.length];
}

function fullGalleryTileClass(index: number) {
  const pattern = [
    "row-span-3",
    "row-span-2",
    "row-span-4",
    "row-span-2",
    "row-span-3",
    "row-span-2",
    "row-span-3",
    "row-span-4",
    "row-span-2",
    "row-span-3"
  ];

  return pattern[index % pattern.length];
}

function queuedPhotoStatusLabel(queuedPhoto: QueuedPhoto) {
  if (queuedPhoto.status === "uploaded") {
    return "Uploaded";
  }

  if (queuedPhoto.status === "uploading") {
    return "Uploading";
  }

  if (queuedPhoto.status === "error") {
    return "Needs attention";
  }

  return queuedPhoto.croppedFile ? "Cropped" : "Crop required";
}

async function appendGalleryPhotos(photos: GalleryPhoto[]) {
  const response = await fetch("/api/content/gallery/append", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ photos }),
  });

  if (!response.ok) {
    throw new Error("Could not save uploaded photos to the gallery");
  }

  const payload = (await response.json()) as AppendGalleryResponse;
  return payload.gallery;
}

export function Gallery() {
  const { content, isLoading, updateContent, replaceContent } = useContent();
  const { isEditing } = useEdit();

  const [activeCategory, setActiveCategory] = useState<FilterCategory>("all");
  const [selectedSlideIndex, setSelectedSlideIndex] = useState(0);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [lightboxImageState, setLightboxImageState] = useState<
    "loading" | "loaded" | "error"
  >("loading");
  const [isGalleryModalOpen, setIsGalleryModalOpen] = useState(false);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [defaultNewCategory, setDefaultNewCategory] =
    useState<GalleryCategory>("romantic");
  const [queuedPhotos, setQueuedPhotos] = useState<QueuedPhoto[]>([]);
  const [cropQueueId, setCropQueueId] = useState<string | null>(null);
  const [cropSourceFile, setCropSourceFile] = useState<File | null>(null);
  const [isPreparingImage, setIsPreparingImage] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({ uploaded: 0, total: 0 });
  const [uploadError, setUploadError] = useState<string | null>(null);
  const lightboxRef = useRef<HTMLDivElement | null>(null);
  const galleryDialogRef = useRef<HTMLDivElement | null>(null);
  const lightboxTriggerRef = useRef<HTMLButtonElement | null>(null);
  const gallery = useMemo(() => content?.gallery ?? [], [content]);

  const filtered = useMemo(
    () =>
      gallery
        .map((photo, index) => ({ photo, index }))
        .filter(
          ({ photo }) =>
            activeCategory === "all" || photo.category === activeCategory,
        )
        .reverse(),
    [gallery, activeCategory],
  );

  const canInteract = filtered.length >= 2;
  const previewItems = filtered.slice(0, 10);
  const hiddenPhotoCount = Math.max(0, filtered.length - previewItems.length);
  const categoryCounts = useMemo(() => {
    const counts = new Map<FilterCategory, number>([["all", gallery.length]]);

    GALLERY_CATEGORIES.forEach((category) => {
      counts.set(
        category,
        gallery.filter((photo) => photo.category === category).length,
      );
    });

    return counts;
  }, [gallery]);

  useEffect(() => {
    setSelectedSlideIndex(0);
  }, [activeCategory]);

  useEffect(() => {
    if (!filtered.length) {
      setSelectedSlideIndex(0);
      setLightboxIndex(null);
      return;
    }

    if (selectedSlideIndex >= filtered.length) {
      const clampedIndex = filtered.length - 1;
      setSelectedSlideIndex(clampedIndex);
    }

    if (lightboxIndex !== null && lightboxIndex >= filtered.length) {
      setLightboxIndex(filtered.length - 1);
    }
  }, [filtered.length, selectedSlideIndex, lightboxIndex]);

  const currentLightboxItem =
    lightboxIndex !== null ? filtered[lightboxIndex] : null;
  const lightboxPhotoUrl = currentLightboxItem?.photo.url ?? null;
  const activeSlide = filtered[selectedSlideIndex] ?? null;
  const cropQueueItem =
    cropQueueId !== null
      ? queuedPhotos.find((queuedPhoto) => queuedPhoto.id === cropQueueId) ?? null
      : null;
  const readyQueuedPhotos = queuedPhotos.filter(
    (queuedPhoto) => queuedPhoto.croppedFile !== null,
  );
  const isCropModalOpen = cropQueueId !== null && cropSourceFile !== null;
  const photoPositionLabel = filtered.length
    ? `${filtered.length} ${filtered.length === 1 ? "photo" : "photos"}`
    : "0 photos";
  const uploadProgressPercent =
    uploadProgress.total > 0
      ? Math.round((uploadProgress.uploaded / uploadProgress.total) * 100)
      : 0;

  const closeLightbox = useCallback(() => {
    setLightboxIndex(null);
    window.requestAnimationFrame(() => {
      lightboxTriggerRef.current?.focus();
      lightboxTriggerRef.current = null;
    });
  }, []);

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

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const focusable = lightboxRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
    if (focusable && focusable.length > 0) {
      focusable[0].focus();
    } else {
      lightboxRef.current?.focus();
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeLightbox();
        return;
      } else if (event.key === "ArrowLeft") {
        event.preventDefault();
        goToPrevious();
        return;
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        goToNext();
        return;
      }

      if (event.key !== "Tab" || !lightboxRef.current) {
        return;
      }

      const focusableElements = Array.from(
        lightboxRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
      );

      if (focusableElements.length === 0) {
        event.preventDefault();
        return;
      }

      const first = focusableElements[0];
      const last = focusableElements[focusableElements.length - 1];
      const active = document.activeElement as HTMLElement | null;

      if (event.shiftKey) {
        if (!active || active === first || !lightboxRef.current.contains(active)) {
          event.preventDefault();
          last.focus();
        }
        return;
      }

      if (!active || active === last || !lightboxRef.current.contains(active)) {
        event.preventDefault();
        first.focus();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [lightboxIndex, closeLightbox, goToPrevious, goToNext]);

  useEffect(() => {
    if (lightboxPhotoUrl === null) {
      setLightboxImageState("loading");
      return;
    }

    setLightboxImageState("loading");
  }, [lightboxPhotoUrl]);

  useEffect(() => {
    if (lightboxIndex === null || filtered.length <= 1) {
      return;
    }

    const previous = filtered[(lightboxIndex - 1 + filtered.length) % filtered.length];
    const next = filtered[(lightboxIndex + 1) % filtered.length];

    [previous, next].forEach((item) => {
      const image = new window.Image();
      image.decoding = "async";
      image.src = item.photo.url;
    });
  }, [filtered, lightboxIndex]);

  useEffect(() => {
    if (!isGalleryModalOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    window.requestAnimationFrame(() => {
      const focusable = galleryDialogRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
      if (focusable && focusable.length > 0) {
        focusable[0].focus();
      } else {
        galleryDialogRef.current?.focus();
      }
    });

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setIsGalleryModalOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isGalleryModalOpen]);

  if (isLoading || !content) {
    return <MemoryLoading id="gallery" />;
  }

  const resetAddModal = () => {
    setIsAddModalOpen(false);
    setDefaultNewCategory("romantic");
    setQueuedPhotos([]);
    setCropQueueId(null);
    setCropSourceFile(null);
    setIsPreparingImage(false);
    setUploadProgress({ uploaded: 0, total: 0 });
    setUploadError(null);
  };

  const handlePhotoDelete = async (index: number) => {
    const photo = gallery[index];
    if (!photo) {
      return;
    }

    if (!window.confirm(DELETE_IMAGE_CONFIRMATION)) {
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
    setUploadProgress({ uploaded: 0, total: queuedPhotos.length });
    setQueuedPhotos((current) =>
      current.map((queuedPhoto) => ({
        ...queuedPhoto,
        status: "uploading",
        error: null,
      })),
    );

    const uploadedPhotos: GalleryPhoto[] = [];
    const uploadedQueueIds = new Set<string>();
    let failedUploadCount = 0;

    for (const queuedPhoto of queuedPhotos) {
      if (!queuedPhoto.croppedFile) {
        failedUploadCount += 1;
        updateQueuedPhoto(queuedPhoto.id, (current) => ({
          ...current,
          status: "error",
          error: "Crop required.",
        }));
        continue;
      }

      try {
        const uploaded = await uploadImage(queuedPhoto.croppedFile);
        uploadedPhotos.push({
          url: uploaded.secure_url,
          caption: queuedPhoto.caption.trim() || "New memory",
          category: queuedPhoto.category,
          publicId: uploaded.public_id,
        });
        uploadedQueueIds.add(queuedPhoto.id);
        setUploadProgress({ uploaded: uploadedPhotos.length, total: queuedPhotos.length });
        updateQueuedPhoto(queuedPhoto.id, (current) => ({
          ...current,
          status: "uploaded",
        }));
      } catch (error) {
        console.error(error);
        failedUploadCount += 1;
        updateQueuedPhoto(queuedPhoto.id, (current) => ({
          ...current,
          status: "error",
          error: "Upload failed. Try this photo again.",
        }));
      }
    }

    if (uploadedPhotos.length > 0) {
      let savedGallery: GalleryPhoto[];

      try {
        savedGallery = await appendGalleryPhotos(uploadedPhotos);
      } catch (error) {
        console.error(error);
        setQueuedPhotos((current) =>
          current.filter((queuedPhoto) => !uploadedQueueIds.has(queuedPhoto.id)),
        );
        setUploadError(
          `${uploadedPhotos.length} ${
            uploadedPhotos.length === 1 ? "photo was" : "photos were"
          } uploaded to Cloudinary, but the gallery could not save them yet. Try Save All before leaving this page.`
        );
        setIsUploading(false);
        return;
      }

      replaceContent("gallery", savedGallery);

      setQueuedPhotos((current) =>
        current
          .filter((queuedPhoto) => !uploadedQueueIds.has(queuedPhoto.id))
          .map((queuedPhoto) => ({
            ...queuedPhoto,
            status: queuedPhoto.croppedFile ? "ready" : "needs-crop",
            error: queuedPhoto.croppedFile ? null : "Crop required.",
          })),
      );

      if (failedUploadCount === 0) {
        setActiveCategory("all");
        resetAddModal();
        setIsUploading(false);
        return;
      }

      setUploadError(
        `${uploadedPhotos.length} of ${queuedPhotos.length} ${
          uploadedPhotos.length === 1 ? "photo was" : "photos were"
        } uploaded and saved. Try the remaining ${failedUploadCount} again.`
      );
      setIsUploading(false);
      setUploadProgress((current) =>
        current.uploaded === current.total ? { uploaded: 0, total: 0 } : current
      );
      return;
    }

    setUploadError(`0 of ${queuedPhotos.length} photos uploaded. Try again.`);
    setIsUploading(false);
  };

  return (
    <section
      id="gallery"
      className="px-4 py-16 sm:px-6 md:py-24"
    >
      <div className="mx-auto w-full max-w-7xl">
      <div className="mb-8 flex flex-col items-start justify-between gap-5 lg:flex-row lg:items-end">
        <div>
        <h2 className="font-serif text-4xl leading-tight text-rose-ink sm:text-5xl md:text-6xl">
          Photos
        </h2>
        </div>
        {isEditing ? (
          <button
            type="button"
            onClick={() => setIsAddModalOpen(true)}
            className="min-h-11 rounded-full border border-rose/40 bg-warm-white px-4 py-2 text-sm text-rose-ink transition hover:bg-rose-light/30 active:scale-[0.98]"
          >
            Add photos
          </button>
        ) : null}
      </div>

      <div className="mb-6 flex flex-col gap-4 border-y border-gold/20 py-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <label className="flex min-w-0 flex-1 flex-col gap-1 sm:max-w-xs">
          <span className="text-xs font-medium text-text-light">Memory type</span>
          <span className="relative block">
          <select
            value={activeCategory}
            onChange={(event) =>
              setActiveCategory(event.target.value as FilterCategory)
            }
            className="min-h-11 w-full appearance-none rounded-full border border-gold/35 bg-warm-white py-2 pl-4 pr-11 text-sm capitalize text-text outline-none focus:border-rose focus:ring-2 focus:ring-rose/20"
          >
            <option value="all">All</option>
            {GALLERY_CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
          <span
            aria-hidden
            className="pointer-events-none absolute right-4 top-1/2 h-2 w-2 -translate-y-[65%] rotate-45 border-b border-r border-text-light"
          />
          </span>
        </label>

        {filtered.length ? (
          <div className="flex flex-wrap items-center gap-2 sm:justify-end">
            <p className="flex min-h-11 items-center rounded-md border border-gold/25 bg-warm-white px-3 text-sm tabular-nums text-text-muted">
              {photoPositionLabel}
            </p>
          </div>
        ) : null}
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1">
          {(["all", ...GALLERY_CATEGORIES] as FilterCategory[]).map((category) => {
            const count = categoryCounts.get(category) ?? 0;
            return (
              <button
                key={category}
                type="button"
                onClick={() => setActiveCategory(category)}
                className={`min-h-10 shrink-0 rounded-full border px-3 py-1.5 text-xs capitalize transition active:scale-[0.98] ${
                  activeCategory === category
                    ? "border-rose/45 bg-rose-light/40 text-rose-ink"
                    : "border-gold/25 bg-warm-white text-text-muted hover:border-rose/30 hover:text-rose-ink"
                }`}
              >
                {category} <span className="tabular-nums text-text-light">{count}</span>
              </button>
            );
          })}
        </div>
      </div>

      {filtered.length ? (
        <>
          <div className="grid auto-rows-[88px] grid-cols-2 gap-3 sm:auto-rows-[104px] sm:grid-cols-4 lg:auto-rows-[118px] lg:grid-cols-6">
            {previewItems.map(({ photo, index }, visibleIndex) => (
              <button
                key={`${photo.url}-${index}`}
                type="button"
                onClick={(event) => {
                  lightboxTriggerRef.current = event.currentTarget;
                  setSelectedSlideIndex(visibleIndex);
                  if (isEditing) {
                    return;
                  }
                  setLightboxIndex(visibleIndex);
                }}
                className={`group relative block overflow-hidden rounded-2xl border bg-warm-white text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-[0_18px_50px_oklch(31%_0.042_292_/_0.12)] active:scale-[0.99] ${
                  selectedSlideIndex === visibleIndex && isEditing
                    ? "border-rose/60 ring-2 ring-rose/20"
                    : "border-gold/20"
                } ${previewTileClass(visibleIndex)}`}
              >
                <Image
                  src={photo.url}
                  alt={photo.caption}
                  width={900}
                  height={1200}
                  sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                  className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.025]"
                />
                <span className="absolute inset-x-0 bottom-0 bg-linear-to-t from-text/70 via-text/20 to-transparent p-3 text-xs text-warm-white opacity-0 transition group-hover:opacity-100 group-focus-visible:opacity-100">
                  {photo.caption}
                </span>
              </button>
            ))}
          </div>

          <div className="mt-5 flex flex-col items-start justify-between gap-3 border-t border-gold/20 pt-5 sm:flex-row sm:items-center">
            <p className="text-sm text-text-muted">
              Showing {previewItems.length} of {filtered.length} photos
            </p>
            <button
              type="button"
              onClick={() => setIsGalleryModalOpen(true)}
              className="min-h-11 rounded-full border border-rose/40 bg-warm-white px-5 py-2 text-sm text-rose-ink transition hover:bg-rose-light/30 active:scale-[0.98]"
            >
              {hiddenPhotoCount > 0 ? `View all photos (${filtered.length})` : "Open gallery"}
            </button>
          </div>

          {isEditing && activeSlide ? (
            <div className="mt-4 rounded-2xl border border-gold/20 bg-warm-white p-4">
              <p className="mb-3 text-xs font-medium text-text-light">
                Edit current slide
              </p>
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    void handlePhotoDelete(activeSlide.index);
                  }}
                  className="min-h-11 rounded border border-rose/30 px-3 py-2 text-xs text-rose-ink transition hover:bg-rose/10"
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
                  className="min-h-11 rounded border border-gold/30 bg-cream px-3 py-2 text-xs capitalize text-text"
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
      </div>

      {isGalleryModalOpen ? (
        <div
          className="fixed inset-0 z-50 bg-text/75 p-3 sm:p-5"
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              setIsGalleryModalOpen(false);
            }
          }}
          role="presentation"
        >
          <div
            ref={galleryDialogRef}
            role="dialog"
            aria-modal="true"
            aria-label="All photos"
            tabIndex={-1}
            className="mx-auto flex h-full max-w-7xl flex-col overflow-hidden rounded-2xl border border-gold/25 bg-cream outline-none shadow-2xl"
          >
            <div className="flex shrink-0 flex-col gap-3 border-b border-gold/20 bg-warm-white px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
              <div>
                <h3 className="font-serif text-3xl text-rose-ink">All Photos</h3>
                <p className="mt-1 text-sm text-text-muted">{photoPositionLabel}</p>
              </div>
              <button
                type="button"
                onClick={() => setIsGalleryModalOpen(false)}
                className="min-h-11 rounded-full border border-gold/35 px-4 py-2 text-sm text-text-muted transition hover:bg-cream active:scale-[0.98]"
              >
                Close
              </button>
            </div>

            <div className="shrink-0 overflow-x-auto border-b border-gold/20 bg-cream px-4 py-3 sm:px-5">
              <div className="flex gap-2">
                {(["all", ...GALLERY_CATEGORIES] as FilterCategory[]).map((category) => {
                  const count = categoryCounts.get(category) ?? 0;
                  return (
                    <button
                      key={category}
                      type="button"
                      onClick={() => setActiveCategory(category)}
                      className={`min-h-10 shrink-0 rounded-full border px-3 py-1.5 text-xs capitalize transition active:scale-[0.98] ${
                        activeCategory === category
                          ? "border-rose/45 bg-rose-light/40 text-rose-ink"
                          : "border-gold/25 bg-warm-white text-text-muted hover:border-rose/30 hover:text-rose-ink"
                      }`}
                    >
                      {category} <span className="tabular-nums text-text-light">{count}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-5">
              {filtered.length ? (
                <div className="grid auto-rows-[84px] grid-cols-2 gap-3 sm:auto-rows-[96px] sm:grid-cols-4 lg:auto-rows-[104px] lg:grid-cols-6">
                  {filtered.map(({ photo, index }, visibleIndex) => (
                    <button
                      key={`${photo.url}-${index}`}
                      type="button"
                      onClick={(event) => {
                        lightboxTriggerRef.current = event.currentTarget;
                        setSelectedSlideIndex(visibleIndex);
                        if (isEditing) {
                          setIsGalleryModalOpen(false);
                          return;
                        }
                        setIsGalleryModalOpen(false);
                        setLightboxIndex(visibleIndex);
                      }}
                      className={`group relative block overflow-hidden rounded-xl border bg-warm-white text-left shadow-sm transition hover:-translate-y-0.5 active:scale-[0.99] ${
                        selectedSlideIndex === visibleIndex && isEditing
                          ? "border-rose/60 ring-2 ring-rose/20"
                          : "border-gold/20"
                      } ${fullGalleryTileClass(visibleIndex)}`}
                    >
                      <Image
                        src={photo.url}
                        alt={photo.caption}
                        width={700}
                        height={900}
                        sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
                        className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.025]"
                      />
                      <span className="absolute inset-x-0 bottom-0 bg-linear-to-t from-text/70 via-text/20 to-transparent p-3 text-xs text-warm-white opacity-0 transition group-hover:opacity-100 group-focus-visible:opacity-100">
                        {photo.caption}
                      </span>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="rounded-2xl border border-gold/20 bg-warm-white p-8 text-center">
                  <p className="text-text-muted">No photos in this category yet.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}

      {currentLightboxItem ? (
        <div
          className="fixed inset-0 z-50 bg-text/92 p-3 sm:p-6"
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              closeLightbox();
            }
          }}
          role="presentation"
        >
          <div
            ref={lightboxRef}
            role="dialog"
            aria-modal="true"
            aria-label={
              currentLightboxItem.photo.caption.trim()
                ? `Photo preview: ${currentLightboxItem.photo.caption}`
                : "Photo preview"
            }
            tabIndex={-1}
            className="mx-auto flex h-full max-w-6xl flex-col outline-none"
          >
            <div className="flex min-h-16 shrink-0 items-center justify-between gap-4 px-1 pb-3 text-warm-white">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">
                  {currentLightboxItem.photo.caption || "Photo"}
                </p>
                <p className="mt-0.5 text-xs text-warm-white/70">
                  {(lightboxIndex ?? 0) + 1} of {filtered.length}
                </p>
              </div>
              <button
                type="button"
                onClick={closeLightbox}
                className="min-h-11 shrink-0 rounded-full border border-warm-white/30 bg-warm-white/10 px-4 py-2 text-sm text-warm-white transition hover:bg-warm-white/18 active:scale-[0.98]"
              >
                Close
              </button>
            </div>

            <div className="relative flex min-h-0 flex-1 items-center justify-center">
              {canInteract ? (
                <button
                  type="button"
                  onClick={goToPrevious}
                  className="absolute left-0 top-1/2 z-10 hidden min-h-11 -translate-y-1/2 rounded-full border border-warm-white/25 bg-text/35 px-4 py-2 text-sm text-warm-white backdrop-blur transition hover:bg-text/55 active:scale-[0.98] md:block"
                  aria-label="Previous photo"
                >
                  Previous
                </button>
              ) : null}

              <div className="relative flex h-full w-full items-center justify-center overflow-hidden rounded-2xl border border-warm-white/20 bg-text/25">
                {lightboxImageState === "loading" ? (
                  <div
                    className="absolute inset-0 z-10 flex items-center justify-center bg-text/45 px-6 text-warm-white backdrop-blur-sm"
                    aria-live="polite"
                  >
                    <div className="relative w-full max-w-sm overflow-hidden rounded-xl border border-warm-white/20 bg-warm-white/10 p-4 shadow-[0_24px_80px_oklch(0%_0_0_/_0.32)]">
                      <div className="loading-shimmer h-48 rounded-md border border-warm-white/10 bg-warm-white/10" />
                      <div className="pointer-events-none absolute inset-x-4 top-4 h-48 overflow-hidden rounded-md">
                        <span
                          className="block h-full w-full animate-[photo-scan_1.8s_ease-in-out_infinite] bg-linear-to-b from-transparent via-warm-white/20 to-transparent"
                          aria-hidden="true"
                        />
                      </div>
                      <div className="mt-4 flex items-center justify-between gap-4">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">
                            Developing photo...
                          </p>
                          <p className="mt-1 text-xs text-warm-white/65">
                            Bringing the full memory into focus.
                          </p>
                        </div>
                        <span
                          className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-warm-white/25 bg-warm-white/10"
                          aria-hidden="true"
                        >
                          <span className="h-5 w-5 rounded-full border-2 border-warm-white/25 border-t-warm-white animate-spin" />
                        </span>
                      </div>
                    </div>
                  </div>
                ) : null}

                {lightboxImageState === "error" ? (
                  <div className="absolute inset-0 z-10 flex items-center justify-center bg-text/45 px-6 text-center text-sm font-medium text-warm-white">
                    This photo could not load. Try another photo or close this preview.
                  </div>
                ) : null}

                <Image
                  key={currentLightboxItem.photo.url}
                  src={currentLightboxItem.photo.url}
                  alt={currentLightboxItem.photo.caption}
                  width={1800}
                  height={1400}
                  sizes="100vw"
                  unoptimized
                  onLoad={() => setLightboxImageState("loaded")}
                  onError={() => setLightboxImageState("error")}
                  className={`max-h-full w-auto max-w-full object-contain transition-opacity duration-300 ${
                    lightboxImageState === "loaded" ? "opacity-100" : "opacity-0"
                  }`}
                />
              </div>

              {canInteract ? (
                <button
                  type="button"
                  onClick={goToNext}
                  className="absolute right-0 top-1/2 z-10 hidden min-h-11 -translate-y-1/2 rounded-full border border-warm-white/25 bg-text/35 px-4 py-2 text-sm text-warm-white backdrop-blur transition hover:bg-text/55 active:scale-[0.98] md:block"
                  aria-label="Next photo"
                >
                  Next
                </button>
              ) : null}
            </div>

            {canInteract ? (
              <div className="flex shrink-0 gap-3 pt-3 md:hidden">
                <button
                  type="button"
                  onClick={goToPrevious}
                  className="min-h-11 flex-1 rounded-full border border-warm-white/30 px-3 py-2 text-sm text-warm-white transition hover:bg-warm-white/10 active:scale-[0.98]"
                  aria-label="Previous photo"
                >
                  Previous
                </button>
                <button
                  type="button"
                  onClick={goToNext}
                  className="min-h-11 flex-1 rounded-full border border-warm-white/30 px-3 py-2 text-sm text-warm-white transition hover:bg-warm-white/10 active:scale-[0.98]"
                  aria-label="Next photo"
                >
                  Next
                </button>
              </div>
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
        bodyClassName="px-4 pb-0 sm:px-5"
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
            <div className="space-y-3">
              {queuedPhotos.map((queuedPhoto, index) => (
                <div
                  key={queuedPhoto.id}
                  className="rounded-lg border border-gold/25 bg-cream p-3"
                >
                  <div className="mb-3 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-text">
                        {queuedPhoto.originalFile.name}
                      </p>
                      <p className="text-xs text-text-light">
                        Photo {index + 1} of {queuedPhotos.length} ·{" "}
                        {queuedPhotoStatusLabel(queuedPhoto)}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeQueuedPhoto(queuedPhoto.id)}
                      disabled={isUploading}
                      className="min-h-11 rounded-md border border-rose/30 px-3 py-2 text-sm text-rose-ink transition hover:bg-rose/10 disabled:cursor-not-allowed disabled:opacity-60 sm:shrink-0"
                    >
                      Remove
                    </button>
                  </div>

                  <div className="grid min-w-0 gap-2">
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
                      className="min-h-11 w-full rounded-md border border-gold/35 bg-warm-white px-3 py-2 text-sm text-text outline-none focus:border-rose focus:ring-2 focus:ring-rose/20 disabled:opacity-70"
                      placeholder="Memory caption"
                    />
                    <div className="grid min-w-0 gap-2 sm:grid-cols-[minmax(0,1fr)_140px]">
                      <select
                        value={queuedPhoto.category}
                        onChange={(event) =>
                          updateQueuedPhoto(queuedPhoto.id, (current) => ({
                            ...current,
                            category: event.target.value as GalleryCategory,
                          }))
                        }
                        disabled={isUploading}
                        className="min-h-11 w-full rounded-md border border-gold/35 bg-warm-white px-3 py-2 text-sm capitalize text-text outline-none focus:border-rose focus:ring-2 focus:ring-rose/20 disabled:opacity-70"
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
                        className="min-h-11 w-full rounded-md border border-rose/30 bg-warm-white px-3 py-2 text-sm font-medium text-rose-ink transition hover:bg-rose/10 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {isPreparingImage && cropQueueId === queuedPhoto.id
                          ? "Preparing..."
                          : queuedPhoto.croppedFile
                            ? "Recrop"
                            : "Crop"}
                      </button>
                    </div>
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

          {isUploading && uploadProgress.total > 0 ? (
            <div className="rounded-md border border-gold/25 bg-cream p-3" aria-live="polite">
              <div className="mb-2 flex items-center justify-between gap-3 text-sm">
                <span className="font-medium text-text">Uploading photos</span>
                <span className="tabular-nums text-text-muted">
                  {uploadProgress.uploaded} of {uploadProgress.total}
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-gold/20">
                <div
                  className="h-full rounded-full bg-rose transition-[width] duration-300"
                  style={{ width: `${uploadProgressPercent}%` }}
                />
              </div>
            </div>
          ) : null}

          <div className="sticky bottom-0 -mx-4 flex justify-end border-t border-gold/20 bg-warm-white px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:-mx-5 sm:px-5">
            <button
              type="submit"
              disabled={isUploading || isPreparingImage || !queuedPhotos.length}
              className="min-h-11 w-full rounded-full border border-rose/40 bg-rose/10 px-4 py-2 text-sm font-medium text-rose-ink transition hover:bg-rose/15 disabled:cursor-not-allowed disabled:opacity-70 sm:w-auto"
            >
              {isUploading
                ? `Uploading ${uploadProgress.uploaded} of ${uploadProgress.total}...`
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
