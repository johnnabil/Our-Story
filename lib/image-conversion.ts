const HEIC_MIME_TYPES = new Set([
  "image/heic",
  "image/heif",
  "image/heic-sequence",
  "image/heif-sequence"
]);
const HEIC_EXTENSIONS = [".heic", ".heif", ".hif"];
const DNG_MIME_TYPES = new Set(["image/x-adobe-dng", "image/dng"]);
const DNG_EXTENSIONS = [".dng"];
const JPEG_START_MARKER = 0xffd8;
const JPEG_END_MARKER = 0xffd9;
const HEIC_BRANDS = new Set([
  "heic",
  "heix",
  "hevc",
  "hevx",
  "heim",
  "heis",
  "hevm",
  "hevs",
  "mif1",
  "msf1"
]);
const JPEG_QUALITY = 0.92;

export class ImagePreparationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ImagePreparationError";
  }
}

function hasExtension(fileName: string, extensions: string[]) {
  const normalizedName = fileName.toLowerCase();

  return extensions.some((extension) => normalizedName.endsWith(extension));
}

function jpgFileName(originalName: string) {
  const baseName = originalName.replace(/\.[^/.]+$/, "");

  return `${baseName || "image"}.jpg`;
}

function convertedFileName(originalName: string) {
  const baseName = originalName.replace(/\.[^/.]+$/, "");

  return `${baseName || "image"}-converted.jpg`;
}

function readUint16(bytes: Uint8Array, index: number) {
  return (bytes[index] << 8) | bytes[index + 1];
}

function findLargestEmbeddedJpeg(bytes: Uint8Array) {
  let bestStart = -1;
  let bestEnd = -1;
  let index = 0;

  while (index + 1 < bytes.length) {
    if (readUint16(bytes, index) !== JPEG_START_MARKER) {
      index += 1;
      continue;
    }

    let endIndex = index + 2;

    while (endIndex + 1 < bytes.length) {
      if (readUint16(bytes, endIndex) === JPEG_END_MARKER) {
        endIndex += 2;

        if (endIndex - index > bestEnd - bestStart) {
          bestStart = index;
          bestEnd = endIndex;
        }

        break;
      }

      endIndex += 1;
    }

    index = Math.max(endIndex, index + 2);
  }

  if (bestStart < 0 || bestEnd <= bestStart) {
    return null;
  }

  return bytes.slice(bestStart, bestEnd);
}

async function hasHeicBrand(file: File) {
  const header = await file.slice(0, 64).arrayBuffer();
  const bytes = new Uint8Array(header);

  if (bytes.length < 12) {
    return false;
  }

  const decoder = new TextDecoder("utf-8");
  const boxType = decoder.decode(bytes.slice(4, 8));

  if (boxType !== "ftyp") {
    return false;
  }

  for (let index = 8; index + 4 <= bytes.length; index += 4) {
    const brand = decoder.decode(bytes.slice(index, index + 4)).replace("\0", " ").trim();

    if (HEIC_BRANDS.has(brand)) {
      return true;
    }
  }

  return false;
}

export async function isHeicImage(file: File): Promise<boolean> {
  if (HEIC_MIME_TYPES.has(file.type) || hasExtension(file.name, HEIC_EXTENSIONS)) {
    return true;
  }

  if (await hasHeicBrand(file)) {
    return true;
  }

  const { isHeic } = await import("heic-to/csp");
  return isHeic(file);
}

export function isDngImage(file: File): boolean {
  return DNG_MIME_TYPES.has(file.type) || hasExtension(file.name, DNG_EXTENSIONS);
}

export function imagePreparationErrorMessage(error: unknown): string {
  if (error instanceof ImagePreparationError) {
    return error.message;
  }

  return "Could not convert this image. Please choose another photo.";
}

export function isExpectedImagePreparationError(error: unknown): boolean {
  return error instanceof ImagePreparationError;
}

export async function convertHeicToJpeg(file: File): Promise<File> {
  const { heicTo } = await import("heic-to/csp");
  const blob = await heicTo({
    blob: file,
    type: "image/jpeg",
    quality: JPEG_QUALITY
  });

  return new File([blob], jpgFileName(file.name), {
    type: "image/jpeg",
    lastModified: file.lastModified
  });
}

export async function convertDngToJpeg(file: File): Promise<File> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const jpegBytes = findLargestEmbeddedJpeg(bytes);

  if (!jpegBytes) {
    throw new ImagePreparationError(
      "This DNG/RAW file does not include a browser-readable JPG preview. Please export it as JPG, PNG, or HEIC first."
    );
  }

  const convertedFile = new File([jpegBytes], convertedFileName(file.name), {
    type: "image/jpeg",
    lastModified: file.lastModified
  });

  await assertImageCanLoad(convertedFile);

  return convertedFile;
}

export async function assertImageCanLoad(file: File): Promise<void> {
  const objectUrl = URL.createObjectURL(file);

  try {
    const image = new window.Image();
    image.src = objectUrl;
    await image.decode();
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

export async function normalizeImageForCrop(file: File): Promise<File> {
  if (isDngImage(file)) {
    return convertDngToJpeg(file);
  }

  if (!(await isHeicImage(file))) {
    return file;
  }

  const convertedFile = await convertHeicToJpeg(file);
  await assertImageCanLoad(convertedFile);

  return convertedFile;
}
