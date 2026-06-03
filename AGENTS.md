# AI Agent & IDE Context — Our Story

This file provides rules, patterns, and context for any AI coding agent (Cursor, Copilot, Claude, Gemini, etc.) working on this project. Read this file before generating any code.

---

## Project Summary

**Our Story** is a single-page relationship memories website built with Next.js 15 (App Router). All content is inline-editable via a password-protected edit mode. Content persistence uses Upstash Redis or split JSON files (backend selectable via env), images live in Cloudinary. It deploys to Vercel.

Key docs:
- `README.md` — project overview and setup
- `ARCHITECTURE.md` — detailed technical architecture, data model, component contracts
- `PHASES.md` — ordered build phases with acceptance criteria

---

## Critical Rules

### 1. Framework & Version
- **Next.js 15** with App Router. Do NOT use Pages Router patterns.
- **React 19**. Use the latest React APIs.
- All route handlers use the App Router convention: `app/api/*/route.ts` exporting named functions (`GET`, `POST`, `PATCH`, `DELETE`).
- **Async params**: In all dynamic routes, `params` is a Promise — always `await` it:
  ```ts
  export async function PATCH(req: Request, { params }: { params: Promise<{ key: string }> }) {
    const { key } = await params;
  }
  ```

### 2. Server vs Client Components
- **Default is server component.** Do NOT add `"use client"` unless the component needs browser APIs, hooks, or event handlers.
- Components that MUST be `"use client"`:
  - `components/providers/*` (use React context/hooks)
  - `components/edit/*` (use event handlers + useEdit context)
  - `components/sections/*` (use useContent + useEdit hooks)
  - `components/ui/EditBar.tsx` (interactive)
  - `components/ui/Modal.tsx` (interactive)
  - `components/ui/Nav.tsx` (scroll event handling)
  - `app/error.tsx` (must be client component per Next.js requirement)
- Components that are server components:
  - `app/layout.tsx`
  - `app/page.tsx`
  - `app/loading.tsx`

### 3. TypeScript
- Strict mode is ON. No `any` types anywhere.
- All interfaces live in `lib/types.ts`. Import from there, don't redefine.
- Use `ContentKey` type and `CONTENT_KEYS` constant when validating API keys.

### 4. Styling
- **Tailwind CSS v4** with CSS-first config.
- Config lives in `app/globals.css` using `@theme` blocks — there is NO `tailwind.config.js`.
- Custom colors are defined in `@theme` and used as standard Tailwind classes: `bg-cream`, `text-rose`, `border-gold`, etc.
- Font variables `--font-cormorant` and `--font-dm-sans` are set by `next/font/google` in `layout.tsx`.
- Use `font-serif` for Cormorant Garamond, `font-sans` for DM Sans (mapped in `@theme`).

### 5. Data Access
- Redis client: `@upstash/redis` with `Redis.fromEnv()`.
- Content is stored as 8 keys: `content:hero`, `content:milestones`, `content:dates`, `content:gallery`, `content:story`, `content:profiles`, `content:letter`, `content:dreams`.
- `getContent(key)` reads from the active backend; in Redis mode, missing keys fall back to `data/defaults/<key>.json`.
- `setContent(key, value)` writes to the active backend (`redis` or `json`, based on `CONTENT_STORAGE_MODE`).
- `getAllContent()` fetches all 8 keys in parallel from the active backend.

### 6. Authentication
- NextAuth v5 (`next-auth@beta`).
- Config in `lib/auth.ts`, exports `{ handlers, auth, signIn, signOut }`.
- Credentials provider with single password (compared to `process.env.EDIT_PASSWORD`).
- JWT strategy, 7-day expiry.
- **Every mutation API route** must check `const session = await auth()` and return `NextResponse.json({ error: "Unauthorized" }, { status: 401 })` if null.

### 7. Image Handling
- All images use `next/image` with explicit `width`, `height`, and `sizes` props.
- Hero image gets `priority={true}`.
- Cloudinary upload: client gets signature from `POST /api/upload`, then uploads directly to Cloudinary.
- Old images are deleted via `DELETE /api/image/[publicId]` when replaced.
- `CLOUDINARY_API_SECRET` is server-only — never import `lib/cloudinary.ts` in a client component.

### 8. Content Updates
- Updates are **optimistic**: local state changes instantly.
- Network sync is **debounced** at 300ms per content key.
- `flushAll()` cancels debounce timers and fires all pending PATCHes immediately.
- The ContentProvider tracks pending updates in a `Map<ContentKey, { timer, value }>`.

---

## Code Patterns

### Adding a new section
1. Create `components/sections/NewSection.tsx` with `"use client"`.
2. Import and use `useContent()` and `useEdit()` hooks.
3. Use the appropriate `Editable*` components for each field.
4. Add a corresponding section in `app/page.tsx` with an `id` attribute for nav.
5. Add the nav link in `components/ui/Nav.tsx`.

### Adding a new content key
1. Add the interface to `lib/types.ts`.
2. Add the key to `SiteContent` interface.
3. Add the key to `CONTENT_KEYS` array.
4. Add default values to `data/defaults/<key>.json` for the new key.
5. The API routes, KV helpers, and providers will automatically support it.

### Adding a new editable component
1. Create in `components/edit/`.
2. Must be `"use client"`.
3. Must read `isEditing` from `useEdit()`.
4. Must accept `value` + `onChange` props (at minimum).
5. Render interactive variant in edit mode, read-only in view mode.
6. Follow the visual style: subtle rose border in edit mode, pencil/edit icon on hover.

---

## Naming Conventions

| Item | Convention | Example |
|------|-----------|---------|
| Components | PascalCase | `EditableText.tsx` |
| Hooks | camelCase, prefixed `use` | `useContent()`, `useEdit()` |
| API routes | lowercase kebab-case dirs | `app/api/content/[key]/route.ts` |
| CSS variables | kebab-case, prefixed `--color-` or `--font-` | `--color-rose`, `--font-serif` |
| Redis keys | `content:` prefix | `content:hero` |
| TypeScript types | PascalCase | `SiteContent`, `GalleryPhoto` |

---

## Common Mistakes to Avoid

1. **Don't use `getServerSession()`** — that's NextAuth v4. Use `auth()` from `lib/auth.ts`.
2. **Don't create `tailwind.config.js`** — Tailwind v4 uses CSS-first config via `@theme` in `globals.css`.
3. **Don't use `innerHTML`** in EditableText — always use `innerText` to avoid XSS.
4. **Don't import `lib/cloudinary.ts` in client components** — it uses `CLOUDINARY_API_SECRET`.
5. **Don't forget `await params`** in dynamic route handlers — Next.js 15 requires this.
6. **Don't use `@vercel/kv`** — use `@upstash/redis` instead.
7. **Don't mutate content directly** — always go through `updateContent(key, value)` from ContentProvider.
8. **Don't forget image cleanup** — when replacing/deleting images, call the destroy endpoint.

---

## File Dependency Order

When generating files, follow this order to avoid import errors:

```
1.  package.json, next.config.ts, postcss.config.mjs, globals.css
2.  lib/types.ts
3.  lib/kv.ts (depends on types)
4.  lib/auth.ts
5.  lib/cloudinary.ts
6.  data/defaults/<key>.json files (must match each `SiteContent` key shape)
7.  app/api/auth/[...nextauth]/route.ts (depends on auth)
8.  app/api/content/route.ts (depends on kv)
9.  app/api/content/[key]/route.ts (depends on kv, auth)
10. app/api/upload/route.ts (depends on cloudinary, auth)
11. app/api/image/[publicId]/route.ts (depends on cloudinary, auth)
12. components/providers/ContentProvider.tsx (depends on types)
13. components/providers/EditProvider.tsx
14. components/edit/* (depends on EditProvider)
15. components/ui/* (depends on providers)
16. components/sections/* (depends on providers + edit components)
17. app/layout.tsx (wraps providers)
18. app/page.tsx (composes sections)
19. app/loading.tsx, app/error.tsx
```

---

## Testing Checklist

When verifying a phase or making changes, run through:

```bash
# 1. Type check + build
bun run build

# 2. Dev server
bun run dev

# 3. Visual check
# Open http://localhost:3000 in browser
# Verify all sections render
# Check responsive at 375px, 768px, 1280px widths

# 4. Edit flow (requires .env.local with real values)
# Click Edit → enter password → verify edit mode
# Edit text fields → verify save
# Upload image → verify appears
# Click Save All → refresh → verify persistence
```

---

## Environment Setup

Copy `.env.local.example` to `.env.local` and fill in:

| Variable | Where to get it |
|---|---|
| `NEXTAUTH_SECRET` | Run `openssl rand -base64 32` |
| `EDIT_PASSWORD` | Choose any password |
| `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` | Cloudinary dashboard → cloud name |
| `CLOUDINARY_API_KEY` | Cloudinary dashboard → API key |
| `CLOUDINARY_API_SECRET` | Cloudinary dashboard → API secret |
| `UPSTASH_REDIS_REST_URL` | Upstash console → REST URL |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash console → REST token |

Without Redis env vars (and with `CONTENT_STORAGE_MODE=auto`), the site uses `data/defaults/<key>.json` for reads/writes. Cloudinary vars are still required for image upload/replace.
