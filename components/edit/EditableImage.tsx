"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import type { ChangeEvent } from "react";

import { useEdit } from "@/components/providers/EditProvider";
import { ImageCropperModal } from "@/components/ui/ImageCropperModal";
import {
  imagePreparationErrorMessage,
  isExpectedImagePreparationError,
  normalizeImageForCrop
} from "@/lib/image-conversion";
import { uploadImage, deleteImageAsset } from "@/lib/upload";

interface EditableImageProps {
  src: string;
  alt: string;
  onChange: (url: string, publicId: string) => void;
  currentPublicId?: string;
  width: number;
  height: number;
  fit?: "cover" | "contain";
  cropAspectRatio?: number;
  sizes?: string;
  priority?: boolean;
  className?: string;
}

export function EditableImage({
  src,
  alt,
  onChange,
  currentPublicId,
  width,
  height,
  fit = "cover",
  cropAspectRatio,
  sizes = "(max-width: 768px) 100vw, 50vw",
  priority = false,
  className
}: EditableImageProps) {
  const { isEditing } = useEdit();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isCropModalOpen, setIsCropModalOpen] = useState(false);
  const [isPreparingImage, setIsPreparingImage] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleUpload = async (file: File) => {
    setError(null);
    setIsUploading(true);

    try {
      const uploadedImage = await uploadImage(file);

      if (currentPublicId && currentPublicId !== uploadedImage.public_id) {
        try {
          await deleteImageAsset(currentPublicId);
        } catch (cleanupError) {
          console.error(cleanupError);
        }
      }

      onChange(uploadedImage.secure_url, uploadedImage.public_id);
    } catch (uploadError) {
      console.error(uploadError);
      setError("Upload failed. Please try again.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    event.target.value = "";

    if (!file) {
      return;
    }

    void prepareSelectedFile(file);
  };

  const prepareSelectedFile = async (file: File) => {
    setError(null);
    setIsPreparingImage(true);

    try {
      const normalizedFile = await normalizeImageForCrop(file);
      setSelectedFile(normalizedFile);
      setIsCropModalOpen(true);
    } catch (conversionError) {
      if (!isExpectedImagePreparationError(conversionError)) {
        console.warn(conversionError);
      }

      setError(imagePreparationErrorMessage(conversionError));
    } finally {
      setIsPreparingImage(false);
    }
  };

  return (
    <>
      <div className={`relative overflow-hidden ${className ?? ""}`}>
        <Image
          src={src}
          alt={alt}
          width={width}
          height={height}
          sizes={sizes}
          priority={priority}
          className={`h-full w-full ${fit === "contain" ? "object-contain" : "object-cover"}`}
        />

        {isEditing ? (
          <>
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={isUploading || isPreparingImage || isCropModalOpen}
              className="absolute inset-0 flex items-center justify-center bg-rose-deep/35 text-sm font-medium text-warm-white opacity-0 transition hover:opacity-100 disabled:cursor-not-allowed disabled:opacity-100"
            >
              {isUploading || isPreparingImage ? "Uploading..." : "Change photo"}
            </button>
            <input
              ref={inputRef}
              type="file"
              accept="image/*,.apng,.dng,.heic,.heif,.hif,.png"
              className="sr-only"
              onChange={handleFileChange}
            />
          </>
        ) : null}

        {error ? (
          <span className="absolute bottom-2 left-2 rounded bg-rose-deep/90 px-2 py-1 text-xs text-warm-white">
            {error}
          </span>
        ) : null}
      </div>

      <ImageCropperModal
        isOpen={isCropModalOpen}
        file={selectedFile}
        title="Crop Photo"
        aspectRatio={cropAspectRatio ?? width / height}
        defaultPreset="free"
        onCancel={() => {
          setIsCropModalOpen(false);
          setSelectedFile(null);
        }}
        onApply={async (croppedFile) => {
          setIsCropModalOpen(false);
          setSelectedFile(null);
          await handleUpload(croppedFile);
        }}
      />
    </>
  );
}
