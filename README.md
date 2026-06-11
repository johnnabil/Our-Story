# Our Story — Relationship Memories Website

A fully editable, single-page relationship memories site for couples. Every piece of content — text, images, dates, tags — is editable inline via a password-protected edit mode. Content persistence can use Cloudinary raw JSON assets, Upstash Redis, or local JSON-file mode; images live in Cloudinary, and the whole thing deploys to Vercel.

![Status](https://img.shields.io/badge/status-in%20development-yellow)

---

## Stack

| Layer | Technology | Purpose |
|---|---|---|
| Framework | **Next.js 15** (App Router, TypeScript) | Server/client rendering, API routes |
| Styling | **Tailwind CSS v4** (CSS-first `@theme`) | Utility-first styling, no JS config |
| Images | **Cloudinary** + `next-cloudinary` | Upload, transform, deliver images |
| Content Store | **Cloudinary raw JSON**, Upstash Redis, or local JSON | Editable content persistence |
| Auth | **NextAuth v5** (credentials, JWT) | Single-password edit mode protection |
| Fonts | **Cormorant Garamond** + **DM Sans** | Serif headings + sans-serif body |
| Hosting | **Vercel** | Serverless deployment |

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────┐
│                    BROWSER                          │
│  ┌─────────────┐  ┌──────────────┐  ┌───────────┐  │
│  │ ContentProv │  │  EditProv    │  │ SessionPr │  │
│  │  (context)  │  │  (context)   │  │ (next-auth│  │
│  └──────┬──────┘  └──────┬───────┘  └─────┬─────┘  │
│         │                │                │         │
│  ┌──────┴────────────────┴────────────────┴──────┐  │
│  │              7 Page Sections                  │  │
│  │  Hero · Countdowns · Gallery · Story          │  │
│  │  Profiles · Letter · Dreams                   │  │
│  │  (each uses Editable* components)             │  │
│  └───────────────────┬───────────────────────────┘  │
└──────────────────────┼──────────────────────────────┘
                       │ fetch / PATCH / POST / DELETE
┌──────────────────────┼──────────────────────────────┐
│                 API ROUTES                          │
│  GET  /api/content          → Read all content      │
│  PATCH /api/content/[key]   → Update one key        │
│  POST  /api/upload          → Cloudinary signature   │
│  DELETE /api/image/[pubId]  → Cloudinary cleanup     │
│  POST  /api/auth/[…nextauth]→ Auth handler           │
└────────┬─────────────────────────────┬──────────────┘
         │                             │
    ┌────┴────┐                  ┌─────┴──────┐
    │ Content │                  │ Cloudinary │
    │ Store   │                  │   (media)  │
    └─────────┘                  └────────────┘
```

---

## Quick Start

### Prerequisites
- Bun 1.3+
- A Cloudinary account ([cloudinary.com](https://cloudinary.com))
- An Upstash Redis database ([upstash.com](https://upstash.com)) only if you plan to use Redis mode

### Setup

```bash
# 1. Install dependencies
bun install

# 2. Copy env template and fill in your values
cp .env.local.example .env.local

# 3. Run dev server
bun run dev
```

Open [http://localhost:3000](http://localhost:3000). The site loads with default placeholder content from split files under `data/defaults/` until you start editing.

### Environment Variables

| Variable | Required | Description |
|---|---|---|
| `NEXTAUTH_SECRET` | ✅ | Random string for JWT signing |
| `NEXTAUTH_URL` | ✅ | Site URL (`http://localhost:3000` for dev) |
| `EDIT_PASSWORD` | ✅ | Password to enter edit mode |
| `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` | ✅ | Your Cloudinary cloud name |
| `CLOUDINARY_API_KEY` | ✅ | Cloudinary API key (server-only) |
| `CLOUDINARY_API_SECRET` | ✅ | Cloudinary API secret (server-only) |
| `UPSTASH_REDIS_REST_URL` | Optional* | Upstash Redis REST URL |
| `UPSTASH_REDIS_REST_TOKEN` | Optional* | Upstash Redis REST token |
| `CONTENT_STORAGE_MODE` | Optional | `auto` (default), `cloudinary`, `redis`, or `json` |

### Storage Backends

- `CONTENT_STORAGE_MODE=auto` (default): use Redis when Redis env vars are present, otherwise use split JSON files in `data/defaults/`.
- `CONTENT_STORAGE_MODE=cloudinary`: store editable content as raw JSON assets in Cloudinary under `our-story-content/`.
- `CONTENT_STORAGE_MODE=redis`: force Redis backend (errors if Redis is not configured).
- `CONTENT_STORAGE_MODE=json`: force JSON backend (reads/writes `data/defaults/<key>.json` per content key).

\* Redis vars are required when `CONTENT_STORAGE_MODE=redis`, and optional in `auto` mode.

Production caveat: JSON write mode depends on a writable persistent filesystem. On serverless platforms like Vercel, use `CONTENT_STORAGE_MODE=cloudinary` or another external writable backend.

---

## How Editing Works

1. Click the **✏️ Edit** button (bottom-right corner)
2. Enter the password → edit mode activates
3. All text, images, dates, and tags become editable inline
4. Changes save automatically (300ms debounce) to the active storage backend
5. Click **Save All** to flush all pending changes immediately
6. Click **Exit** to leave edit mode

---

## Deployment (Vercel)

```bash
# Deploy (one-off with Bun)
bunx vercel --prod
```

Set all environment variables in your Vercel project settings. For a no-Redis deployment, set `CONTENT_STORAGE_MODE=cloudinary` and provide the Cloudinary credentials. Redis credentials are required only when using `CONTENT_STORAGE_MODE=redis` (or `auto` with Redis enabled).

---

## Project Docs

| Document | Purpose |
|---|---|
| [`ARCHITECTURE.md`](./ARCHITECTURE.md) | Detailed technical architecture, data flow, component contracts |
| [`PHASES.md`](./PHASES.md) | Phased build plan with acceptance criteria |
| [`AGENTS.md`](./AGENTS.md) | AI agent / IDE copilot context and coding rules |

---

## License

Private — for personal use.
