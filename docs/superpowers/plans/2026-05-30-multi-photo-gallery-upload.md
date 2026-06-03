# Multi-Photo Gallery Upload Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let editors add several gallery photos from one modal action while preserving crop, category, caption, Cloudinary upload, and optimistic content persistence.

**Architecture:** Keep the feature inside the existing client-side gallery editing flow. `Gallery` will maintain a modal-local upload queue, crop one selected file at a time with the existing `ImageCropperModal`, upload queued files to Cloudinary with the existing `uploadImage()` helper, then append all successful photos to the `gallery` content key with one `updateContent("gallery", nextGallery)` call.

**Tech Stack:** Next.js 15 App Router, React 19, TypeScript strict mode, existing `next/image`, `ImageCropperModal`, Cloudinary signed upload flow, and `ContentProvider` optimistic persistence.

---

## File Structure

- Modify: `components/sections/Gallery.tsx`
  - Replace the single-photo add modal state with a typed queue.
  - Accept multiple files from the file input.
  - Crop queued files individually.
  - Allow per-photo caption/category before upload.
  - Upload all ready files and append them to `gallery` in one content update.
- No API changes
  - `/api/upload` already returns a signature for each direct Cloudinary upload.
  - `/api/content/[key]` already persists the full gallery array.
- No type changes
  - Existing `GalleryPhoto` shape is sufficient: `url`, `caption`, `category`, `publicId`.

## Design Decisions

- The modal button text should become `Add photos`.
- File input uses `multiple` with `accept="image/*"`.
- Each selected file becomes a local queue item with:
  - stable `id`
  - `originalFile`
  - optional `croppedFile`
  - `caption`
  - `category`
  - `status`
  - optional `error`
- Default caption uses the file basename, for example `beach-trip.jpg` becomes `beach trip`.
- Default category starts as the modal-level selected category and can be changed per queued image.
- Cropping remains explicit and per image. Selecting a file opens crop immediately for the first queued item; each queued item also has a `Crop` button.
- Upload is all-or-nothing for content persistence: only call `updateContent()` after every queued upload succeeds. If one upload fails, show the failing item error and do not append a partial set.
- Do not delete Cloudinary assets on failed batch append because no gallery content has been changed. If all uploads succeeded but `updateContent()` later fails in debounce persistence, that matches existing optimistic behavior.
- Keep the implementation inside `Gallery.tsx` for the first version. Extracting a new component can happen later if the modal grows further.

---

### Task 1: Add Queue Types And Helpers

**Files:**
- Modify: `components/sections/Gallery.tsx`

- [ ] **Step 1: Add local queue types below constants**

Add below `const AUTO_ROTATE_MS = 1800;`:

```ts
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
```

- [ ] **Step 2: Add helper functions below the queue types**

Add:

```ts
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
```

- [ ] **Step 3: Run build to catch helper issues**

Run:

```bash
bun run build
```

Expected:

- Build passes.
- If TypeScript reports that `crypto.randomUUID()` is unavailable, replace `createQueueId()` with:

```ts
function createQueueId(file: File, index: number) {
  return `${file.name}-${file.lastModified}-${file.size}-${index}-${Date.now()}`;
}
```

- [ ] **Step 4: Commit helper setup**

Skip if the checkout has no `.git` directory.

```bash
git add components/sections/Gallery.tsx
git commit -m "feat: add gallery upload queue helpers"
```

---

### Task 2: Replace Single-Photo Modal State With Queue State

**Files:**
- Modify: `components/sections/Gallery.tsx`

- [ ] **Step 1: Replace add-photo state declarations**

Find:

```ts
const [newCaption, setNewCaption] = useState("");
const [newCategory, setNewCategory] = useState<GalleryCategory>("romantic");
const [newFile, setNewFile] = useState<File | null>(null);
const [cropSourceFile, setCropSourceFile] = useState<File | null>(null);
```

Replace with:

```ts
const [defaultNewCategory, setDefaultNewCategory] =
  useState<GalleryCategory>("romantic");
const [queuedPhotos, setQueuedPhotos] = useState<QueuedPhoto[]>([]);
const [cropQueueId, setCropQueueId] = useState<string | null>(null);
```

- [ ] **Step 2: Add crop item derivation near `activeSlide`**

After:

```ts
const activeSlide = filtered[selectedSlideIndex] ?? null;
```

Add:

```ts
const cropQueueItem =
  cropQueueId !== null
    ? queuedPhotos.find((queuedPhoto) => queuedPhoto.id === cropQueueId) ?? null
    : null;
const readyQueuedPhotos = queuedPhotos.filter(
  (queuedPhoto) => queuedPhoto.croppedFile !== null,
);
```

- [ ] **Step 3: Add modal reset helper before `handlePhotoDelete`**

Add:

```ts
const resetAddModal = () => {
  setIsAddModalOpen(false);
  setDefaultNewCategory("romantic");
  setQueuedPhotos([]);
  setCropQueueId(null);
  setIsCropModalOpen(false);
  setUploadError(null);
};
```

- [ ] **Step 4: Replace old modal close cleanup calls**

Replace any modal-close cleanup that calls these removed setters:

```ts
setNewCaption("");
setNewCategory("romantic");
setNewFile(null);
setCropSourceFile(null);
setIsCropModalOpen(false);
setUploadError(null);
```

With:

```ts
resetAddModal();
```

- [ ] **Step 5: Run build**

Run:

```bash
bun run build
```

Expected:

- Build fails until the old submit handler and JSX are replaced in later tasks.
- The only expected failures are references to removed identifiers such as `newCaption`, `newCategory`, `newFile`, and `cropSourceFile`.

---

### Task 3: Add Queue Mutation Handlers

**Files:**
- Modify: `components/sections/Gallery.tsx`

- [ ] **Step 1: Replace `handleAddPhoto` with queue handlers**

Replace the existing `handleAddPhoto` function with:

```ts
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
  setIsCropModalOpen(Boolean(nextQueuedPhotos[0]));
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
    setIsCropModalOpen(false);
  }
};

const openCropperForQueuedPhoto = (id: string) => {
  setCropQueueId(id);
  setIsCropModalOpen(true);
  setUploadError(null);
};
```

- [ ] **Step 2: Add batch submit handler after queue handlers**

Add:

```ts
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
```

- [ ] **Step 3: Run build**

Run:

```bash
bun run build
```

Expected:

- Build still fails until JSX references are updated.
- No failures should mention the removed `handleAddPhoto` once Task 4 is complete.

---

### Task 4: Replace Add Modal UI With Multi-Photo Queue UI

**Files:**
- Modify: `components/sections/Gallery.tsx`

- [ ] **Step 1: Change header button text**

Change:

```tsx
Add photo
```

To:

```tsx
Add photos
```

- [ ] **Step 2: Replace modal form opening tag**

Change:

```tsx
<form
  className="space-y-3"
  onSubmit={(event) => void handleAddPhoto(event)}
>
```

To:

```tsx
<form
  className="space-y-4"
  onSubmit={(event) => void handleAddQueuedPhotos(event)}
>
```

- [ ] **Step 3: Replace the old caption/category/file inputs**

Replace the existing modal fields from `Caption` through the `newFile` ready/help text with:

```tsx
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
    accept="image/*"
    multiple
    onChange={handleFilesSelected}
    className="mt-1 w-full rounded-md border border-gold/35 bg-cream px-3 py-2 text-sm text-text"
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
            onClick={() => openCropperForQueuedPhoto(queuedPhoto.id)}
            disabled={isUploading}
            className="rounded border border-rose/30 px-3 py-2 text-xs text-rose transition hover:bg-rose/10 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {queuedPhoto.croppedFile ? "Recrop" : "Crop"}
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
```

- [ ] **Step 4: Update submit button disabled state and label**

Change:

```tsx
disabled={isUploading}
```

To:

```tsx
disabled={isUploading || !queuedPhotos.length}
```

Change:

```tsx
{isUploading ? "Uploading..." : "Add"}
```

To:

```tsx
{isUploading
  ? `Uploading ${queuedPhotos.length}...`
  : `Add ${queuedPhotos.length || ""} photo${queuedPhotos.length === 1 ? "" : "s"}`}
```

- [ ] **Step 5: Run build**

Run:

```bash
bun run build
```

Expected:

- Build still fails until the cropper props are updated in Task 5.
- There should be no references to `newCaption`, `newCategory`, or `newFile`.

---

### Task 5: Wire Cropper To Queue Items

**Files:**
- Modify: `components/sections/Gallery.tsx`

- [ ] **Step 1: Replace bottom `ImageCropperModal` props**

Replace:

```tsx
<ImageCropperModal
  isOpen={isCropModalOpen}
  file={cropSourceFile}
  title="Crop Photo"
  aspectRatio={4 / 3}
  defaultPreset="free"
  onCancel={() => {
    setIsCropModalOpen(false);
    setCropSourceFile(null);
  }}
  onApply={(croppedFile) => {
    setNewFile(croppedFile);
    setCropSourceFile(null);
    setIsCropModalOpen(false);
  }}
/>
```

With:

```tsx
<ImageCropperModal
  isOpen={isCropModalOpen}
  file={cropQueueItem?.originalFile ?? null}
  title="Crop Photo"
  aspectRatio={4 / 3}
  defaultPreset="free"
  onCancel={() => {
    setIsCropModalOpen(false);
    setCropQueueId(null);
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
    setIsCropModalOpen(false);
  }}
/>
```

- [ ] **Step 2: Remove stale state references**

Run:

```bash
rg "newCaption|newCategory|newFile|cropSourceFile|handleAddPhoto" components/sections/Gallery.tsx
```

Expected:

- No matches.

- [ ] **Step 3: Run build**

Run:

```bash
bun run build
```

Expected:

- Build passes.

- [ ] **Step 4: Commit gallery multi-upload implementation**

Skip if the checkout has no `.git` directory.

```bash
git add components/sections/Gallery.tsx
git commit -m "feat: support multi-photo gallery uploads"
```

---

### Task 6: Manual Browser Verification

**Files:**
- Verify: `components/sections/Gallery.tsx`

- [ ] **Step 1: Start dev server**

Run:

```bash
bun run dev
```

Expected:

- Dev server starts on `http://localhost:3000` or the next available port.

- [ ] **Step 2: Open the app**

Open the local URL in the in-app browser.

Expected:

- Gallery section renders.
- Edit bar renders.

- [ ] **Step 3: Verify batch add flow**

Use `.env.local` values with a valid edit password and Cloudinary credentials, then:

1. Enter edit mode.
2. Open Gallery.
3. Click `Add photos`.
4. Select at least three image files.
5. Crop each selected file.
6. Edit one caption.
7. Change one category.
8. Click the add button.

Expected:

- Upload progress disables modal controls.
- Modal closes after uploads complete.
- New photos appear in the gallery.
- The active filter resets to `All`.

- [ ] **Step 4: Verify validation**

Repeat the flow, but leave one selected image uncropped.

Expected:

- Submit does not upload.
- Error reads `Crop every selected photo before uploading.`
- Previously cropped queue items remain in the modal.

- [ ] **Step 5: Verify persistence**

Click `Save All`, refresh the page, then return to Gallery.

Expected:

- Newly added photos remain after refresh.
- Captions and categories match the modal input.

- [ ] **Step 6: Verify responsive layout**

Check widths `375px`, `768px`, and `1280px`.

Expected:

- Modal queue rows do not overflow horizontally.
- Buttons remain clickable.
- Gallery carousel still scrolls and lightbox still opens.

---

## Self-Review

- Spec coverage: The plan covers selecting multiple files, cropping each, editing captions/categories, uploading all, appending to existing content, validation, and persistence verification.
- Placeholder scan: No `TBD`, vague "handle edge cases", or undefined implementation steps remain.
- Type consistency: Queue types, state names, handler names, and JSX references use the same identifiers across tasks.
