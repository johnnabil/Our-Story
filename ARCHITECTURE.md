# Architecture — Our Story

This document describes the technical architecture in enough detail for any developer or AI agent to implement, modify, or debug any part of the system. Read this before writing code.

---

## 1. Project Structure

```
our-story/
├── app/
│   ├── layout.tsx              # Root layout: fonts, providers, metadata
│   ├── page.tsx                # Main page: composes all 7 sections
│   ├── loading.tsx             # Suspense fallback (skeleton)
│   ├── error.tsx               # Error boundary with retry
│   ├── globals.css             # Tailwind v4 @theme + global styles
│   └── api/
│       ├── auth/[...nextauth]/route.ts
│       ├── content/
│       │   ├── route.ts                # GET all content
│       │   └── [key]/route.ts          # PATCH one content key
│       ├── upload/route.ts             # POST: Cloudinary signature
│       └── image/[publicId]/route.ts   # DELETE: Cloudinary cleanup
├── components/
│   ├── providers/
│   │   ├── ContentProvider.tsx         # Global content state + save logic
│   │   └── EditProvider.tsx            # Edit mode toggle + auth gate
│   ├── edit/
│   │   ├── EditableText.tsx
│   │   ├── EditableImage.tsx
│   │   ├── EditableDate.tsx
│   │   ├── EditableTags.tsx
│   │   └── EditableRichText.tsx
│   ├── sections/
│   │   ├── Hero.tsx
│   │   ├── Countdowns.tsx
│   │   ├── Gallery.tsx
│   │   ├── Story.tsx
│   │   ├── Profiles.tsx
│   │   ├── Letter.tsx
│   │   └── Dreams.tsx
│   └── ui/
│       ├── EditBar.tsx
│       ├── Modal.tsx
│       └── Nav.tsx
├── lib/
│   ├── types.ts                # All TypeScript interfaces
│   ├── kv.ts                   # Storage backend helpers (Redis + split JSON)
│   ├── cloudinary.ts           # Upload signature + image destroy
│   └── auth.ts                 # NextAuth v5 config
├── data/
│   └── defaults/
│       ├── hero.json
│       ├── milestones.json
│       ├── dates.json
│       ├── gallery.json
│       ├── story.json
│       ├── profiles.json
│       ├── letter.json
│       └── dreams.json         # Split fallback content by key
├── .env.local.example
├── next.config.ts
├── postcss.config.mjs
├── tsconfig.json
├── package.json
└── vercel.json
```

---

## 2. Data Model

All site content uses the same 8 logical content keys across backends. In Redis mode, keys are stored as below:

```
Redis Key              → TypeScript Interface
───────────────────────────────────────────
content:hero           → Hero
content:milestones     → Milestone[]
content:dates          → ImportantDate[]
content:gallery        → GalleryPhoto[]
content:story          → StoryEntry[]
content:profiles       → { her: Profile; him: Profile }
content:letter         → Letter
content:dreams         → Dream[]
```

In JSON mode, each logical key maps to one file: `data/defaults/<key>.json`.

### Key Interfaces

```ts
interface Hero {
  names: { her: string; him: string };
  quote: string;
  subtitle: string;
  photoUrl: string;
  photoPublicId: string;    // Cloudinary public_id for cleanup
}

interface GalleryPhoto {
  url: string;
  caption: string;
  category: "romantic" | "fun" | "travel" | "walks" | "car" | "everyday";
  publicId: string;         // Cloudinary public_id for cleanup
}

interface Profile {
  name: string;
  role: string;
  photoUrl: string;
  photoPublicId: string;    // Cloudinary public_id for cleanup
  personality: string[];
  favourites: Record<string, string>;
  hobbies: string[];
  gifts: string;
  note: string;
}

interface StoryEntry {
  id: string;               // UUID
  date: string;             // ISO date
  title: string;
  body: string;
}

interface Dream {
  id: string;               // UUID
  icon: string;             // Emoji
  title: string;
  desc: string;
  category: "travel" | "experience" | "milestone" | "everyday";
  done: boolean;
}

interface Milestone { label: string; name: string; date: string; icon: string; }
interface ImportantDate { name: string; date: string; icon: string; }
interface Letter { salutation: string; body: string; signature: string; }
```

Valid content keys (for API validation):
```ts
const CONTENT_KEYS = ["hero","milestones","dates","gallery","story","profiles","letter","dreams"] as const;
```

---

## 3. Data Flow

### Read Path (page load)
```
Browser mount
  → ContentProvider useEffect
    → GET /api/content
      → getAllContent() in lib/kv.ts
        → resolve backend from CONTENT_STORAGE_MODE
        → json backend: read 8 files from data/defaults/<key>.json
        → redis backend: 8x parallel Redis GET
          → missing Redis keys fall back to data/defaults/<key>.json
      → returns SiteContent JSON
    → setState(content)
  → sections render with content
```

### Write Path (inline edit)
```
User edits field (e.g., hero title)
  → EditableText.onBlur
    → section calls updateContent("hero", newHero)
      → ContentProvider:
        1. Optimistic: setState immediately
        2. Debounced (300ms): PATCH /api/content/hero
          → API route validates session
          → setContent("hero", newHero) in lib/kv.ts
          → active backend write (Redis key or data/defaults/hero.json)
```

### Image Upload Path
```
User clicks EditableImage
  → file input opens → user selects file
  → POST /api/upload (get Cloudinary signature)
  → POST https://api.cloudinary.com/v1_1/{cloud}/image/upload
    (signed upload with timestamp + signature)
  → Cloudinary returns { secure_url, public_id }
  → If old publicId exists:
      DELETE /api/image/{oldPublicId}
        → cloudinary.uploader.destroy(oldPublicId)
  → onChange(secure_url, public_id) → updateContent
```

### Flush Path ("Save All")
```
User clicks "Save All"
  → ContentProvider.flushAll()
    → cancel all pending debounce timers
    → fire all queued PATCH requests immediately
    → await all promises
```

---

## 4. Authentication

- **NextAuth v5** with credentials provider
- Single password: input compared against `process.env.EDIT_PASSWORD`
- JWT strategy, `maxAge: 7 * 24 * 60 * 60` (7 days)
- Auth check: `const session = await auth()` in API routes
- Client side: `useSession()` from `next-auth/react`
- The `authorize` function returns `{ id: "admin", name: "Admin" }` on success, `null` on failure

### Protected routes
All mutation routes (`PATCH`, `POST /upload`, `DELETE /image`) must call `auth()` and return `401` if no session.

---

## 5. Provider Architecture

### ContentProvider (`"use client"`)
```
Context value:
  - content: SiteContent | null
  - isLoading: boolean
  - updateContent(key: ContentKey, value: any): void
  - flushAll(): Promise<void>

Internal state:
  - pendingUpdates: Map<ContentKey, { timer: NodeJS.Timeout, value: any }>
```

**Rules:**
- `updateContent` applies the update to local state immediately (optimistic)
- schedules a debounced PATCH (300ms) for that key
- if a new update arrives for the same key before debounce fires, the old timer is canceled
- `flushAll` cancels all timers and fires all pending PATCHes in parallel

### EditProvider (`"use client"`)
```
Context value:
  - isEditing: boolean
  - toggleEdit(): void
  - canEdit: boolean     // derived from session !== null
```

**Rules:**
- `toggleEdit()` when not authenticated → triggers `signIn("credentials")` modal
- `toggleEdit()` when authenticated → flips `isEditing`

### Provider nesting in layout.tsx
```tsx
<SessionProvider>
  <ContentProvider>
    <EditProvider>
      {children}
    </EditProvider>
  </ContentProvider>
</SessionProvider>
```

---

## 6. Editable Component Contracts

Every editable component follows this pattern:
- Accepts `value` + `onChange` props
- Reads `isEditing` from `useEdit()` context
- **Edit mode**: renders an interactive input variant
- **View mode**: renders plain display-only markup

### EditableText
| Prop | Type | Notes |
|------|------|-------|
| `value` | `string` | Current text |
| `onChange` | `(v: string) => void` | Called on blur |
| `as` | `keyof JSX.IntrinsicElements` | Render element (default `"p"`) |
| `className` | `string?` | Styling |

Edit mode: `contenteditable` div. Must strip HTML on paste (`e.clipboardData.getData("text/plain")`), read `innerText` on blur, set `suppressContentEditableWarning`. Styled with subtle rose border + pencil icon on hover.

### EditableImage
| Prop | Type | Notes |
|------|------|-------|
| `src` | `string` | Current image URL |
| `alt` | `string` | Alt text |
| `onChange` | `(url: string, publicId: string) => void` | After upload |
| `currentPublicId` | `string?` | For cleanup of old image |
| `width` / `height` | `number` | Image dimensions |
| `className` | `string?` | Styling |

Edit mode: camera overlay on hover, triggers file input → signed Cloudinary upload → deletes old image if `currentPublicId` exists → calls `onChange`.

### EditableDate
| Prop | Type | Notes |
|------|------|-------|
| `value` | `string` | ISO date string |
| `onChange` | `(v: string) => void` | On change |

Edit mode: `<input type="date">`. View mode: `Intl.DateTimeFormat` formatted.

### EditableTags
| Prop | Type | Notes |
|------|------|-------|
| `tags` | `string[]` | Current tags |
| `onChange` | `(tags: string[]) => void` | On add/remove |

Edit mode: × delete per tag, + add button with inline input.

### EditableRichText
| Prop | Type | Notes |
|------|------|-------|
| `value` | `string` | Multiline text |
| `onChange` | `(v: string) => void` | On blur |
| `placeholder` | `string?` | Placeholder text |

Edit mode: `<textarea>` with auto-resize. View mode: `<p>` with `white-space: pre-wrap`.

---

## 7. Section Specifications

### Hero
- Full viewport: `min-h-screen`, gradient background
- Circular photo: `EditableImage` 280×280, `rounded-full`
- Two names side-by-side: `EditableText` as `h1`, serif
- Subtitle: `EditableText` as `p`
- Quote: `EditableText` as `blockquote`, italic serif
- Scroll indicator arrow at bottom

### Countdowns
- Milestones: horizontal card row, each with icon + label + "X days until…" + years elapsed
- Anniversary recurrence: compute next occurrence from today (`getNextOccurrence(date)`)
- Edit mode: editable dates/labels, add/remove cards
- Important Dates: grid below milestones
- Edit mode: add-date modal

### Gallery
- Tab filters: All + 6 categories
- Grid: CSS `column-count` (3 desktop / 2 tablet / 1 mobile)
- Photo cards: rounded corners, caption overlay on hover (gradient)
- Lightbox: full-screen modal, prev/next navigation, close button
- Edit mode: delete button per photo, add-photo button, category dropdown per photo
- On delete: call `DELETE /api/image/[publicId]` then remove from content array

### Story (Timeline)
- Vertical timeline: dot + connecting line
- Alternating left/right on desktop, stacked on mobile
- Each entry: `EditableDate`, `EditableText` title, `EditableRichText` body
- Sorted by date (oldest first)
- Edit mode: add entry (top), delete per card

### Profiles
- Two-column grid → stacks on mobile
- Per profile: circular `EditableImage` (200×200), name, role (`EditableText`), personality (`EditableTags`), favourites key-value table (all values `EditableText`, add/remove rows), hobbies (`EditableTags`), gifts (`EditableRichText`), note (`EditableRichText`)

### Letter
- Parchment card: `bg-parchment`, max-w `680px`, centered, subtle border/shadow
- Auto-date (today, read-only)
- Salutation, body, signature — all editable (body as `EditableRichText`, serif font)

### Dreams
- Card grid: 3 cols desktop / 2 tablet / 1 mobile
- Each card: editable emoji icon, title, description, category badge
- Done toggle: click → checkmark overlay, card dims opacity
- Done items sorted to bottom
- Edit mode: add dream modal, delete per card

---

## 8. Design System

### Colors (Tailwind v4 `@theme`)
```
cream:       #faf7f2     (page background)
warm-white:  #fffef9     (card backgrounds)
parchment:   #f0e8d8     (letter section, accents)
rose:        #c9747a     (primary accent, edit borders)
rose-light:  #e8b4b8     (hover states)
rose-deep:   #8b4a50     (active states, deep accents)
gold:        #c4a055     (secondary accent, icons)
gold-light:  #e8d5a3     (badges, highlights)
text:        #2a2118     (primary text)
text-muted:  #7a6a58     (secondary text)
text-light:  #b0a090     (captions, placeholders)
border:      rgba(196,160,85,0.25) (dividers)
```

### Typography
- **Headings, quotes, letter**: Cormorant Garamond (serif) — weights 300–700
- **Body, labels, UI**: DM Sans (sans-serif) — weights 400, 500, 700
- Loaded via `next/font/google`, injected as CSS variables `--font-cormorant`, `--font-dm-sans`

### Responsive Breakpoints
- Mobile: `< 768px` — single column, stacked layout
- Tablet: `768px–1024px` — 2-column gallery, profile grid adjusts
- Desktop: `> 1024px` — full multi-column layouts

---

## 9. API Route Specifications

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/content` | No | Returns full `SiteContent` |
| `PATCH` | `/api/content/[key]` | Yes | Updates one content key |
| `POST` | `/api/upload` | Yes | Returns Cloudinary upload signature |
| `DELETE` | `/api/image/[publicId]` | Yes | Destroys a Cloudinary image |
| `GET/POST` | `/api/auth/[...nextauth]` | — | NextAuth handler |

### Error responses
- `401` — no valid session (for protected routes)
- `400` — invalid content key or malformed body
- `500` — server error (Redis or Cloudinary failure)

---

## 10. Key Implementation Rules

1. **Server components by default.** Only add `"use client"` to: providers, editable components, interactive sections, `EditBar`, `Modal`, `Gallery` (lightbox), `error.tsx`.
2. **No `any` types.** Use strict TypeScript throughout.
3. **All images use `next/image`** with explicit `width`, `height`, and `sizes`. Hero image gets `priority`.
4. **Async params are awaited** in all dynamic route handlers (Next.js 15 requirement).
5. **Cloudinary API secret is server-only.** Never import `lib/cloudinary.ts` in client components.
6. **Debounce is 300ms** per content key. New edits to the same key cancel the previous timer.
7. **Optimistic updates**: state changes are instant, network syncs in background.
8. **Image cleanup**: always delete old Cloudinary image when replacing or removing a photo.
