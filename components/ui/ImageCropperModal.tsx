"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Modal } from "@/components/ui/Modal";

export type CropPreset = "free" | "original" | "1:1" | "4:3" | "3:4";

interface ImageCropperModalProps {
  isOpen: boolean;
  file: File | null;
  aspectRatio?: number;
  defaultPreset?: CropPreset;
  title?: string;
  onCancel: () => void;
  onApply: (file: File) => void | Promise<void>;
}

interface ImageMeta {
  width: number;
  height: number;
}

interface Offset {
  x: number;
  y: number;
}

interface DragState {
  pointerId: number;
  startClientX: number;
  startClientY: number;
  startOffset: Offset;
}

const MAX_VIEWPORT_WIDTH = 360;
const MAX_VIEWPORT_HEIGHT = 420;
const MIN_VIEWPORT_WIDTH = 220;
const MIN_VIEWPORT_HEIGHT = 220;
const MIN_ZOOM = 1;
const MAX_ZOOM = 3;
const MIN_CROP_SIZE = 72;
const FREE_CROP_MIN_PERCENT = 30;
const LOCKED_CROP_MIN_PERCENT = 30;

const PRESET_OPTIONS: { id: CropPreset; label: string }[] = [
  { id: "free", label: "Free" },
  { id: "original", label: "Original" },
  { id: "1:1", label: "1:1" },
  { id: "4:3", label: "4:3" },
  { id: "3:4", label: "3:4" }
];

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function pickOutputMimeType(fileType: string) {
  if (fileType === "image/png" || fileType === "image/webp" || fileType === "image/jpeg") {
    return fileType;
  }

  return "image/jpeg";
}

function fileNameForOutput(originalName: string, mimeType: string) {
  const baseName = originalName.replace(/\.[^/.]+$/, "");

  if (mimeType === "image/png") {
    return `${baseName}-cropped.png`;
  }

  if (mimeType === "image/webp") {
    return `${baseName}-cropped.webp`;
  }

  return `${baseName}-cropped.jpg`;
}

function getPresetRatio(
  preset: CropPreset,
  imageMeta: ImageMeta | null,
  fallbackAspectRatio?: number
): number | null {
  if (preset === "free") {
    return null;
  }

  if (preset === "original") {
    if (imageMeta && imageMeta.width > 0 && imageMeta.height > 0) {
      return imageMeta.width / imageMeta.height;
    }

    if (fallbackAspectRatio && Number.isFinite(fallbackAspectRatio) && fallbackAspectRatio > 0) {
      return fallbackAspectRatio;
    }

    return 1;
  }

  if (preset === "1:1") {
    return 1;
  }

  if (preset === "4:3") {
    return 4 / 3;
  }

  return 3 / 4;
}

export function ImageCropperModal({
  isOpen,
  file,
  aspectRatio,
  defaultPreset = "free",
  title = "Crop Image",
  onCancel,
  onApply
}: ImageCropperModalProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [imageMeta, setImageMeta] = useState<ImageMeta | null>(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState<Offset>({ x: 0, y: 0 });
  const [isPreparing, setIsPreparing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isApplying, setIsApplying] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [preset, setPreset] = useState<CropPreset>(defaultPreset);
  const [freeWidthPercent, setFreeWidthPercent] = useState(82);
  const [freeHeightPercent, setFreeHeightPercent] = useState(82);
  const [lockedSizePercent, setLockedSizePercent] = useState(88);
  const [viewportLimit, setViewportLimit] = useState({
    width: MAX_VIEWPORT_WIDTH,
    height: MAX_VIEWPORT_HEIGHT
  });
  const dragRef = useRef<DragState | null>(null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const updateViewportLimit = () => {
      const safeWidth = Math.min(MAX_VIEWPORT_WIDTH, Math.max(MIN_VIEWPORT_WIDTH, window.innerWidth - 56));
      const safeHeight = Math.min(
        MAX_VIEWPORT_HEIGHT,
        Math.max(MIN_VIEWPORT_HEIGHT, Math.floor(window.innerHeight * 0.38))
      );

      setViewportLimit({ width: safeWidth, height: safeHeight });
    };

    updateViewportLimit();
    window.addEventListener("resize", updateViewportLimit);

    return () => {
      window.removeEventListener("resize", updateViewportLimit);
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !file) {
      setPreviewUrl(null);
      setImageMeta(null);
      setOffset({ x: 0, y: 0 });
      setZoom(1);
      setError(null);
      setIsApplying(false);
      setIsPreparing(false);
      setIsDragging(false);
      setPreset(defaultPreset);
      setFreeWidthPercent(82);
      setFreeHeightPercent(82);
      setLockedSizePercent(88);
      dragRef.current = null;
      return;
    }

    let isCancelled = false;
    const objectUrl = URL.createObjectURL(file);

    setPreviewUrl(objectUrl);
    setImageMeta(null);
    setOffset({ x: 0, y: 0 });
    setZoom(1);
    setError(null);
    setIsApplying(false);
    setIsPreparing(true);
    setIsDragging(false);
    setPreset(defaultPreset);
    setFreeWidthPercent(82);
    setFreeHeightPercent(82);
    setLockedSizePercent(88);
    dragRef.current = null;

    const previewImage = new window.Image();
    previewImage.onload = () => {
      if (isCancelled) {
        return;
      }

      setImageMeta({
        width: previewImage.naturalWidth,
        height: previewImage.naturalHeight
      });
      const imageAspect = previewImage.naturalWidth / previewImage.naturalHeight;
      if (imageAspect >= 1) {
        setFreeWidthPercent(92);
        setFreeHeightPercent(clamp(Math.round(92 / imageAspect), FREE_CROP_MIN_PERCENT, 92));
      } else {
        setFreeHeightPercent(92);
        setFreeWidthPercent(clamp(Math.round(92 * imageAspect), FREE_CROP_MIN_PERCENT, 92));
      }
      setIsPreparing(false);
    };
    previewImage.onerror = () => {
      if (isCancelled) {
        return;
      }

      setError("Could not load this image.");
      setIsPreparing(false);
    };
    previewImage.src = objectUrl;

    return () => {
      isCancelled = true;
      URL.revokeObjectURL(objectUrl);
    };
  }, [defaultPreset, file, isOpen]);

  const activeRatio = useMemo(
    () => getPresetRatio(preset, imageMeta, aspectRatio),
    [aspectRatio, imageMeta, preset]
  );

  const viewportAspect = useMemo(() => {
    if (preset === "free") {
      if (imageMeta && imageMeta.width > 0 && imageMeta.height > 0) {
        return imageMeta.width / imageMeta.height;
      }

      if (aspectRatio && Number.isFinite(aspectRatio) && aspectRatio > 0) {
        return aspectRatio;
      }
    }

    return activeRatio ?? 1;
  }, [activeRatio, aspectRatio, imageMeta, preset]);

  const viewport = useMemo(() => {
    if (viewportAspect >= 1) {
      const width = viewportLimit.width;
      const height = clamp(
        Math.round(width / viewportAspect),
        MIN_VIEWPORT_HEIGHT,
        viewportLimit.height
      );

      return { width, height };
    }

    const height = viewportLimit.height;
    const width = clamp(
      Math.round(height * viewportAspect),
      MIN_VIEWPORT_WIDTH,
      viewportLimit.width
    );

    return { width, height };
  }, [viewportAspect, viewportLimit.height, viewportLimit.width]);

  const cropBox = useMemo(() => {
    if (preset === "free" || !activeRatio) {
      const width = clamp(
        (viewport.width * freeWidthPercent) / 100,
        MIN_CROP_SIZE,
        viewport.width
      );
      const height = clamp(
        (viewport.height * freeHeightPercent) / 100,
        MIN_CROP_SIZE,
        viewport.height
      );

      return { width, height };
    }

    const maxWidth = Math.min(viewport.width, viewport.height * activeRatio);
    const maxHeight = Math.min(viewport.height, viewport.width / activeRatio);

    const minScale = Math.max(MIN_CROP_SIZE / maxWidth, MIN_CROP_SIZE / maxHeight);
    const normalizedScale =
      preset === "original" ? 1 : clamp(lockedSizePercent / 100, minScale, 1);

    return {
      width: maxWidth * normalizedScale,
      height: maxHeight * normalizedScale
    };
  }, [activeRatio, freeHeightPercent, freeWidthPercent, lockedSizePercent, preset, viewport.height, viewport.width]);

  const cropBoxOrigin = useMemo(
    () => ({
      left: (viewport.width - cropBox.width) / 2,
      top: (viewport.height - cropBox.height) / 2
    }),
    [cropBox.height, cropBox.width, viewport.height, viewport.width]
  );

  const baseImageSize = useMemo(() => {
    if (!imageMeta) {
      return null;
    }

    const coverScale = Math.max(
      viewport.width / imageMeta.width,
      viewport.height / imageMeta.height
    );

    return {
      width: imageMeta.width * coverScale,
      height: imageMeta.height * coverScale
    };
  }, [imageMeta, viewport.height, viewport.width]);

  const clampOffset = useCallback(
    (nextOffset: Offset, nextZoom: number): Offset => {
      if (!baseImageSize) {
        return { x: 0, y: 0 };
      }

      const displayWidth = baseImageSize.width * nextZoom;
      const displayHeight = baseImageSize.height * nextZoom;

      const maxX = Math.max(0, (displayWidth - cropBox.width) / 2);
      const maxY = Math.max(0, (displayHeight - cropBox.height) / 2);

      return {
        x: clamp(nextOffset.x, -maxX, maxX),
        y: clamp(nextOffset.y, -maxY, maxY)
      };
    },
    [baseImageSize, cropBox.height, cropBox.width]
  );

  useEffect(() => {
    setOffset((previous) => clampOffset(previous, zoom));
  }, [clampOffset, zoom]);

  const handleZoomChange = (nextZoom: number) => {
    const normalizedZoom = clamp(nextZoom, MIN_ZOOM, MAX_ZOOM);
    setZoom(normalizedZoom);
    setOffset((previous) => clampOffset(previous, normalizedZoom));
  };

  const handlePresetChange = (nextPreset: CropPreset) => {
    setPreset(nextPreset);

    if (nextPreset === "original") {
      setZoom(1);
      setOffset({ x: 0, y: 0 });
      setLockedSizePercent(100);
      return;
    }

    if (preset === "original") {
      setLockedSizePercent(88);
    }
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!baseImageSize || isPreparing || isApplying) {
      return;
    }

    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      pointerId: event.pointerId,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startOffset: offset
    };
    setIsDragging(true);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const dragState = dragRef.current;
    if (!dragState || dragState.pointerId !== event.pointerId) {
      return;
    }

    event.preventDefault();

    const deltaX = event.clientX - dragState.startClientX;
    const deltaY = event.clientY - dragState.startClientY;

    const nextOffset = {
      x: dragState.startOffset.x + deltaX,
      y: dragState.startOffset.y + deltaY
    };

    setOffset(clampOffset(nextOffset, zoom));
  };

  const handlePointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    const dragState = dragRef.current;
    if (!dragState || dragState.pointerId !== event.pointerId) {
      return;
    }

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    dragRef.current = null;
    setIsDragging(false);
  };

  const handleApply = async () => {
    if (!file || !previewUrl || !imageMeta || !baseImageSize) {
      return;
    }

    setIsApplying(true);
    setError(null);

    try {
      const sourceImage = new window.Image();
      sourceImage.src = previewUrl;
      await sourceImage.decode();

      const displayWidth = baseImageSize.width * zoom;
      const displayHeight = baseImageSize.height * zoom;
      const imageLeft = viewport.width / 2 - displayWidth / 2 + offset.x;
      const imageTop = viewport.height / 2 - displayHeight / 2 + offset.y;

      const sourceScaleX = imageMeta.width / displayWidth;
      const sourceScaleY = imageMeta.height / displayHeight;

      const sourceX = clamp(
        (cropBoxOrigin.left - imageLeft) * sourceScaleX,
        0,
        imageMeta.width
      );
      const sourceY = clamp(
        (cropBoxOrigin.top - imageTop) * sourceScaleY,
        0,
        imageMeta.height
      );
      const sourceWidth = clamp(cropBox.width * sourceScaleX, 1, imageMeta.width - sourceX);
      const sourceHeight = clamp(cropBox.height * sourceScaleY, 1, imageMeta.height - sourceY);

      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(sourceWidth));
      canvas.height = Math.max(1, Math.round(sourceHeight));

      const context = canvas.getContext("2d");
      if (!context) {
        throw new Error("Canvas context is not available");
      }

      context.drawImage(
        sourceImage,
        sourceX,
        sourceY,
        sourceWidth,
        sourceHeight,
        0,
        0,
        canvas.width,
        canvas.height
      );

      const outputType = pickOutputMimeType(file.type);
      const croppedBlob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob(resolve, outputType, 0.92);
      });

      if (!croppedBlob) {
        throw new Error("Could not create cropped file");
      }

      const croppedFile = new File([croppedBlob], fileNameForOutput(file.name, outputType), {
        type: outputType
      });

      await onApply(croppedFile);
    } catch (cropError) {
      console.error(cropError);
      setError("Could not crop this image. Please try again.");
    } finally {
      setIsApplying(false);
    }
  };

  const canCrop = Boolean(file && previewUrl && imageMeta && baseImageSize);
  const displayWidth = baseImageSize ? baseImageSize.width * zoom : 0;
  const displayHeight = baseImageSize ? baseImageSize.height * zoom : 0;

  return (
    <Modal
      isOpen={isOpen}
      title={title}
      onClose={onCancel}
      maxWidth="lg"
      bodyClassName="px-4 pb-0 sm:px-5"
    >
      <div className="grid min-h-0 gap-4 sm:grid-cols-[minmax(0,1fr)_15rem]">
        <div className="min-w-0 space-y-3">
          <p className="text-sm text-text-muted">Drag to reposition. Use zoom and crop size to refine the frame.</p>

          <div className="grid grid-cols-5 gap-1 rounded-full border border-gold/25 bg-cream p-1">
            {PRESET_OPTIONS.map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => handlePresetChange(option.id)}
                className={`min-h-10 rounded-full px-2 py-2 text-[11px] font-medium transition ${
                  preset === option.id
                    ? "bg-warm-white text-rose-ink shadow-sm"
                    : "text-text-muted hover:bg-warm-white/70 hover:text-rose-ink"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>

          <div
            className={`relative mx-auto overflow-hidden rounded-xl border border-gold/30 bg-cream/40 ${
              isDragging ? "cursor-grabbing" : "cursor-grab"
            } touch-none select-none`}
            style={{ width: `${viewport.width}px`, height: `${viewport.height}px` }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
          >
            {canCrop ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={previewUrl!}
                alt="Crop preview"
                draggable={false}
                className="pointer-events-none absolute left-1/2 top-1/2 max-w-none select-none"
                style={{
                  width: `${displayWidth}px`,
                  height: `${displayHeight}px`,
                  transform: `translate(-50%, -50%) translate(${offset.x}px, ${offset.y}px)`
                }}
              />
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-text-light">
                {isPreparing ? "Preparing image..." : error ?? "No image selected"}
              </div>
            )}

            <div
              className="pointer-events-none absolute rounded-md border-2 border-warm-white/95 shadow-[0_0_0_9999px_rgba(79,69,110,0.38)]"
              style={{
                left: `${cropBoxOrigin.left}px`,
                top: `${cropBoxOrigin.top}px`,
                width: `${cropBox.width}px`,
                height: `${cropBox.height}px`
              }}
            />
          </div>
        </div>

        <div className="min-w-0 space-y-4 sm:pt-8">
          <label className="block text-sm font-medium text-text-muted">
            Zoom
            <input
              type="range"
              min={MIN_ZOOM}
              max={MAX_ZOOM}
              step={0.01}
              value={zoom}
              onChange={(event) => handleZoomChange(Number(event.target.value))}
              disabled={!canCrop || isApplying}
              className="mt-2 w-full accent-rose"
            />
          </label>

          {preset === "free" ? (
            <div className="grid gap-3">
              <label className="block text-sm font-medium text-text-muted">
                Crop width
                <input
                  type="range"
                  min={FREE_CROP_MIN_PERCENT}
                  max={100}
                  step={1}
                  value={freeWidthPercent}
                  onChange={(event) => setFreeWidthPercent(Number(event.target.value))}
                  disabled={!canCrop || isApplying}
                  className="mt-2 w-full accent-rose"
                />
              </label>
              <label className="block text-sm font-medium text-text-muted">
                Crop height
                <input
                  type="range"
                  min={FREE_CROP_MIN_PERCENT}
                  max={100}
                  step={1}
                  value={freeHeightPercent}
                  onChange={(event) => setFreeHeightPercent(Number(event.target.value))}
                  disabled={!canCrop || isApplying}
                  className="mt-2 w-full accent-rose"
                />
              </label>
            </div>
          ) : preset === "original" ? (
            <p className="rounded-md border border-gold/25 bg-cream px-3 py-2 text-sm text-text-muted">
              Original uses the full photo frame.
            </p>
          ) : (
            <label className="block text-sm font-medium text-text-muted">
              Crop size
              <input
                type="range"
                min={LOCKED_CROP_MIN_PERCENT}
                max={100}
                step={1}
                value={lockedSizePercent}
                onChange={(event) => setLockedSizePercent(Number(event.target.value))}
                disabled={!canCrop || isApplying}
                className="mt-2 w-full accent-rose"
              />
            </label>
          )}

          {error ? <p className="text-sm text-rose-deep">{error}</p> : null}
        </div>
      </div>

      <div className="sticky bottom-0 -mx-4 mt-4 flex gap-2 border-t border-gold/20 bg-warm-white px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:-mx-5 sm:px-5">
          <button
            type="button"
            onClick={onCancel}
            disabled={isApplying}
            className="min-h-11 flex-1 rounded-full border border-gold/40 px-4 py-2 text-sm text-text transition hover:bg-cream disabled:cursor-not-allowed disabled:opacity-70 sm:flex-none"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              void handleApply();
            }}
            disabled={!canCrop || isApplying}
            className="min-h-11 flex-1 rounded-full border border-rose/40 bg-rose/10 px-4 py-2 text-sm font-medium text-rose-ink transition hover:bg-rose/15 disabled:cursor-not-allowed disabled:opacity-70 sm:flex-none"
          >
            {isApplying ? "Applying..." : "Use crop"}
          </button>
        </div>
    </Modal>
  );
}
