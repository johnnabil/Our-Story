# HEIC to JPG Conversion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let editors select HEIC or HEIF photos and have them silently converted to JPG before the existing crop and Cloudinary upload flow.

**Architecture:** Conversion runs only in the browser, before `ImageCropperModal` receives the selected file. `EditableImage` remains the orchestration point: it detects HEIC/HEIF files, converts them to a JPEG `File`, then opens the cropper with the converted file. Upload signatures, Cloudinary upload, image cleanup, and persisted content stay unchanged.

**Tech Stack:** Next.js 15 App Router, React 19, TypeScript strict mode, `heic-to` for browser HEIC/HEIF decoding, existing Cloudinary signed upload flow.

---

## File Structure

- Modify: `package.json`
  - Add the `heic-to` dependency.
- Modify: `bun.lock`
  - Updated by `bun install`.
- Create: `lib/image-conversion.ts`
  - Client-safe helpers for HEIC/HEIF detection and JPEG conversion.
- Modify: `components/edit/EditableImage.tsx`
  - Convert selected HEIC/HEIF files before opening `ImageCropperModal`.
  - Keep conversion silent unless it fails.

## Design Decisions

- Conversion is automatic and silent.
- HEIC and HEIF are detected by MIME type, extension fallback, and `heic-to`'s `isHeic(file)` helper.
- Converted output is always `image/jpeg` with quality `0.92`, matching the existing cropper JPEG output quality.
- Converted filenames use the original basename plus `.jpg`, for example `IMG_1234.HEIC` becomes `IMG_1234.jpg`.
- `MAX_FILE_SIZE` enforcement remains in `uploadImage()` after crop. The selected original file is not rejected before conversion because a HEIC can become a larger JPG after conversion/cropping.
- If conversion fails, no upload is attempted and the existing inline error area displays `Could not convert this HEIC image. Please choose another photo.`

---

### Task 1: Add HEIC Conversion Dependency

**Files:**
- Modify: `package.json`
- Modify: `bun.lock`

- [ ] **Step 1: Install `heic-to`**

Run:

```bash
bun install heic-to
```

Expected:

- `package.json` includes `"heic-to"` in `dependencies`.
- `bun.lock` is updated.

- [ ] **Step 2: Verify dependency metadata**

Run:

```bash
bun pm ls heic-to
```

Expected:

- Output includes the installed `heic-to` package.

- [ ] **Step 3: Commit dependency update**

Skip this step if the checkout has no `.git` directory.

```bash
git add package.json bun.lock
git commit -m "chore: add heic conversion dependency"
```

---

### Task 2: Create Client Image Conversion Helper

**Files:**
- Create: `lib/image-conversion.ts`

- [ ] **Step 1: Create the helper**

Add:

```ts
import { heicTo, isHeic } from "heic-to";

const HEIC_MIME_TYPES = new Set(["image/heic", "image/heif"]);
const HEIC_EXTENSIONS = [".heic", ".heif"];
const JPEG_QUALITY = 0.92;

function hasHeicExtension(fileName: string) {
  const normalizedName = fileName.toLowerCase();

  return HEIC_EXTENSIONS.some((extension) => normalizedName.endsWith(extension));
}

function jpgFileName(originalName: string) {
  const baseName = originalName.replace(/\.[^/.]+$/, "");

  return `${baseName || "image"}.jpg`;
}

export async function isHeicImage(file: File): Promise<boolean> {
  if (HEIC_MIME_TYPES.has(file.type) || hasHeicExtension(file.name)) {
    return true;
  }

  return isHeic(file);
}

export async function convertHeicToJpeg(file: File): Promise<File> {
  const jpegBlob = await heicTo({
    blob: file,
    type: "image/jpeg",
    quality: JPEG_QUALITY
  });

  const blob = Array.isArray(jpegBlob) ? jpegBlob[0] : jpegBlob;

  if (!blob) {
    throw new Error("HEIC conversion returned no image data");
  }

  return new File([blob], jpgFileName(file.name), {
    type: "image/jpeg",
    lastModified: file.lastModified
  });
}

export async function normalizeImageForCrop(file: File): Promise<File> {
  if (!(await isHeicImage(file))) {
    return file;
  }

  return convertHeicToJpeg(file);
}
```

- [ ] **Step 2: Run TypeScript/build check**

Run:

```bash
bun run build
```

Expected:

- Build may fail if `heic-to`'s return type differs from the code above.
- If it fails on `heicTo` return typing, inspect `node_modules/heic-to` type declarations and adjust only `convertHeicToJpeg()` so the returned value is narrowed to `Blob`.

- [ ] **Step 3: Commit helper**

Skip this step if the checkout has no `.git` directory.

```bash
git add lib/image-conversion.ts
git commit -m "feat: add browser heic conversion helper"
```

---

### Task 3: Wire Conversion Into Editable Image Selection

**Files:**
- Modify: `components/edit/EditableImage.tsx`

- [ ] **Step 1: Import the helper**

Change imports:

```ts
import { ImageCropperModal } from "@/components/ui/ImageCropperModal";
import { normalizeImageForCrop } from "@/lib/image-conversion";
import { uploadImage, deleteImageAsset } from "@/lib/upload";
```

- [ ] **Step 2: Add conversion state**

Near the existing state declarations, add:

```ts
const [isPreparingImage, setIsPreparingImage] = useState(false);
```

- [ ] **Step 3: Replace file change handler with async normalization**

Replace `handleFileChange` with:

```ts
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
    console.error(conversionError);
    setError("Could not convert this HEIC image. Please choose another photo.");
  } finally {
    setIsPreparingImage(false);
  }
};
```

- [ ] **Step 4: Update button disabled and text logic**

Replace the edit overlay button with:

```tsx
<button
  type="button"
  onClick={() => inputRef.current?.click()}
  disabled={isUploading || isPreparingImage || isCropModalOpen}
  className="absolute inset-0 flex items-center justify-center bg-rose-deep/35 text-sm font-medium text-warm-white opacity-0 transition hover:opacity-100 disabled:cursor-not-allowed disabled:opacity-100"
>
  {isUploading || isPreparingImage ? "Uploading..." : "Change photo"}
</button>
```

This keeps conversion silent by reusing the existing non-specific busy copy.

- [ ] **Step 5: Update file input accept list**

Replace:

```tsx
accept="image/*"
```

with:

```tsx
accept="image/*,.heic,.heif"
```

- [ ] **Step 6: Build**

Run:

```bash
bun run build
```

Expected:

- Build passes.

- [ ] **Step 7: Commit UI wiring**

Skip this step if the checkout has no `.git` directory.

```bash
git add components/edit/EditableImage.tsx
git commit -m "feat: convert heic images before cropping"
```

---

### Task 4: Manual Verification

**Files:**
- No source changes unless a verification failure is found.

- [ ] **Step 1: Start the dev server**

Run:

```bash
bun run dev
```

Expected:

- Local Next.js dev server starts, usually at `http://localhost:3000`.

- [ ] **Step 2: Verify non-HEIC flow still works**

Manual steps:

1. Open `http://localhost:3000`.
2. Enter edit mode.
3. Choose an existing JPEG or PNG image.
4. Confirm the cropper opens.
5. Apply crop.
6. Confirm Cloudinary upload succeeds and the image updates.

Expected:

- The JPEG/PNG path behaves as it did before this feature.

- [ ] **Step 3: Verify HEIC flow**

Manual steps:

1. In edit mode, choose a `.heic` or `.heif` file.
2. Confirm the cropper opens after conversion.
3. Confirm there is no explicit "Converting HEIC" message.
4. Apply crop.
5. Confirm Cloudinary upload succeeds and the image updates.

Expected:

- The selected HEIC/HEIF image appears in the cropper as a normal image.
- The uploaded asset is a JPEG-derived image.

- [ ] **Step 4: Verify conversion failure handling**

Manual steps:

1. Rename a non-image text file to `bad.heic`.
2. Select it in edit mode.

Expected:

- Cropper does not open.
- No upload request is made.
- The image area displays `Could not convert this HEIC image. Please choose another photo.`

- [ ] **Step 5: Final build**

Run:

```bash
bun run build
```

Expected:

- Build passes with no TypeScript errors.

---

## Self-Review

- Spec coverage: The plan covers silent conversion, JPEG output, cropper integration, upload compatibility, and failure handling.
- Placeholder scan: No placeholder implementation steps remain.
- Type consistency: Helper names are consistent across tasks: `isHeicImage`, `convertHeicToJpeg`, and `normalizeImageForCrop`.
- Scope check: This is one bounded feature in the image selection/upload flow. No backend endpoint is required.
