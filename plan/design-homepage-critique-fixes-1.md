---
goal: Fix Impeccable Homepage Critique Findings
version: 1.0
date_created: 2026-06-11
last_updated: 2026-06-11
owner: Project Maintainer
status: 'In progress'
tags: [design, frontend, ux, accessibility, polish]
---

# Introduction

![Status: In progress](https://img.shields.io/badge/status-In%20progress-yellow)

This plan converts the Impeccable critique for `app/page.tsx` into independently shippable phases. Each phase fixes a bounded set of critique findings without requiring a full-site rewrite. The target outcome is to raise the homepage from an acceptable soft CMS feel to an emotionally authored relationship memory site with safer editing, stronger visual hierarchy, and better mobile/accessibility behavior.

## 1. Requirements & Constraints

- **REQ-001**: Preserve Next.js 15 App Router conventions. Do not add Pages Router patterns.
- **REQ-002**: Preserve the existing inline-editable content model and `updateContent(key, value)` flow.
- **REQ-003**: Keep all section components that use hooks or event handlers as client components.
- **REQ-004**: Use Tailwind CSS v4 CSS-first tokens in `app/globals.css`; do not add `tailwind.config.js`.
- **REQ-005**: Keep all images rendered through `next/image` or the existing editable image component with explicit dimensions and `sizes`.
- **REQ-006**: Maintain authenticated mutation behavior in API routes. UI changes must not bypass `auth()` checks.
- **REQ-007**: Improve the critique score by addressing all P1 and P2 findings from `.impeccable/critique/2026-06-11T07-51-35Z__app-page-tsx.md`.
- **CON-001**: Do not remove any existing content key from `SiteContent`.
- **CON-002**: Avoid schema changes unless explicitly listed in a task.
- **CON-003**: Do not introduce a new UI library unless a task explicitly requires it.
- **CON-004**: Do not implement decorative gradient text, side-stripe card accents, glassmorphism as a default style, or nested cards.
- **GUD-001**: Prefer emotional section names in visitor-facing navigation and headings.
- **GUD-002**: Prefer persistent controls and captions over hover-only information.
- **GUD-003**: Use cards only when the item needs a real frame. Avoid repeating `rounded-2xl border bg-warm-white shadow-sm` across every section.
- **GUD-004**: Keep each phase deployable after completion.
- **PAT-001**: Follow existing provider hooks: `useContent()` from `components/providers/ContentProvider.tsx` and `useEdit()` from `components/providers/EditProvider.tsx`.
- **PAT-002**: Continue using existing edit components in `components/edit/` for inline-editable fields.

## 2. Implementation Steps

### Implementation Phase 1: Design Tokens And Naming Alignment

- GOAL-001: Fix palette intent and token naming so future visual work has a coherent foundation.
- INDEPENDENCE-001: This phase is independently shippable. It does not require section reordering, gallery changes, or edit safety changes.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-001 | Update `app/globals.css` `@theme` color values so token names match their visual role. Set `--color-gold` to a warm gold tone, set `--color-gold-light` to a pale warm tint, and set `--color-parchment` to a warm paper tint. Keep `--color-cream`, `--color-warm-white`, `--color-rose`, `--color-rose-light`, `--color-rose-deep`, `--color-text`, `--color-text-muted`, `--color-text-light`, and `--color-border` available. | ✅ | 2026-06-11 |
| TASK-002 | Replace any section-specific use of `bg-parchment` that depends on the current blue value with the new warm paper intent. Primary target: `components/sections/Letter.tsx`. | ✅ | 2026-06-11 |
| TASK-003 | Add a short comment above the `@theme` block in `app/globals.css` stating the palette strategy: warm paper neutrals, rose accent, gold material accent. | ✅ | 2026-06-11 |
| TASK-004 | Verify that `rg -n "bg-parchment|text-gold|border-gold|bg-gold" app components` returns usages whose visual meaning still matches the token names. | ✅ | 2026-06-11 |

### Implementation Phase 2: Narrative Spine And Navigation

- GOAL-002: Reorder the homepage and navigation around an emotional story arc instead of seven equal CMS modules.
- INDEPENDENCE-002: This phase is independently shippable. It can be completed before or after token work. It must preserve all sections.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-005 | In `app/page.tsx`, reorder sections to: `Hero`, `Letter`, `Story`, `Gallery`, `Countdowns`, `Dreams`, `Profiles`. Keep `ScrollPositionManager`, `Nav`, and `EditBar` unchanged in position. | ✅ | 2026-06-11 |
| TASK-006 | In `components/ui/Nav.tsx`, update `NAV_ITEMS` order to match `app/page.tsx`. Use visitor-facing labels: `Home`, `Letter`, `Story`, `Photos`, `Dates`, `Dreams`, `Us`. Keep ids unchanged except labels. | ✅ | 2026-06-11 |
| TASK-007 | In `components/sections/Gallery.tsx`, change the visible heading from `Gallery` to `Photos`. Do not rename the component or content key. | ✅ | 2026-06-11 |
| TASK-008 | In `components/sections/Countdowns.tsx`, change the primary section heading from `Countdowns` to `Dates We Keep`. Keep birthday and important-date subheadings. | ✅ | 2026-06-11 |
| TASK-009 | In `components/sections/Profiles.tsx`, change the visible heading from `Profiles` to `Us`. Keep edit labels `Her` and `Him` unless a content model change is separately approved. | ✅ | 2026-06-11 |
| TASK-010 | Verify `section[id]` anchors still match all nav ids: `hero`, `letter`, `story`, `gallery`, `countdowns`, `dreams`, `profiles`. | ✅ | 2026-06-11 |

### Implementation Phase 3: Gallery Memory Browsing

- GOAL-003: Make photo browsing calmer, touch-friendly, and less hover-dependent.
- INDEPENDENCE-003: This phase is independently shippable. It only modifies gallery behavior and copy.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-011 | In `components/sections/Gallery.tsx`, change `AUTO_ROTATE_MS` from `1800` to `8000`. | ✅ | 2026-06-11 |
| TASK-012 | Add `const [isAutoPlayPaused, setIsAutoPlayPaused] = useState(false);` to `Gallery`. Modify the autoplay `useEffect` guard so autoplay does not run when `isAutoPlayPaused` is true. | ✅ | 2026-06-11 |
| TASK-013 | In `components/sections/Gallery.tsx`, add a visible pause/play button near the carousel controls when `canInteract` is true. The button text must be `Pause photos` when autoplay is active and `Play photos` when paused. The button must use `aria-pressed={isAutoPlayPaused}`. | ✅ | 2026-06-11 |
| TASK-014 | Replace hover-only caption visibility in `components/sections/Gallery.tsx`. Remove `opacity-0` from the caption span and remove reliance on `.gallery-hover-target:hover .gallery-hover-caption` in `app/globals.css`. Captions must remain visible on touch devices. | ✅ | 2026-06-11 |
| TASK-015 | Reduce gallery category choice overload by hiding category chips inside a native `<select>` on mobile and keeping chips on `md` and wider screens. The mobile select must include `All` and all `GALLERY_CATEGORIES`. | ✅ | 2026-06-11 |
| TASK-016 | Ensure carousel previous/next controls use icon-like labels or visible arrow text that is clear on mobile and desktop. Existing `Prev` and `Next` may remain only if paired with accessible `aria-label` values. | ✅ | 2026-06-11 |

### Implementation Phase 4: Edit Safety, Save Status, And Recovery

- GOAL-004: Make editing personal memories safer by adding visible status and undo/recovery for destructive actions.
- INDEPENDENCE-004: This phase is independently shippable. It changes editing UX but does not require visual redesign.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-017 | In `components/providers/ContentProvider.tsx`, expose save state fields from context: `pendingKeys: ContentKey[]`, `lastSavedAt: string | null`, and `lastSaveError: string | null`. Update these fields when debounced PATCHes and `flushAll()` complete or fail. | ✅ | 2026-06-11 |
| TASK-018 | Update the exported context type in `components/providers/ContentProvider.tsx` and any related TypeScript interfaces in `lib/types.ts` only if the provider type is centralized there. Do not use `any`. | ✅ | 2026-06-11 |
| TASK-019 | In `components/ui/EditBar.tsx`, display compact save status text inside the fixed edit control while editing: `Saving...` when pending keys exist, `Saved` when `lastSavedAt` exists and no pending keys exist, and `Save failed` when `lastSaveError` is non-null. | ✅ | 2026-06-11 |
| TASK-020 | Create `components/ui/UndoToast.tsx` as a client component. Props: `message: string`, `actionLabel: string`, `onAction: () => void`, `onDismiss: () => void`. It must render a fixed bottom toast above `EditBar` and support keyboard focus. | ✅ | 2026-06-11 |
| TASK-021 | Add undo behavior for non-image destructive actions in `components/sections/Story.tsx`, `components/sections/Countdowns.tsx`, `components/sections/Dreams.tsx`, and `components/sections/Profiles.tsx`. When an item is removed, store the removed item and index locally, show `UndoToast`, and restore the item to its original index if undo is clicked. | ✅ | 2026-06-11 |
| TASK-022 | In `components/sections/Gallery.tsx`, add confirmation before `deleteImageAsset(photo.publicId)` runs. The confirmation text must clearly state that the Cloudinary image will be deleted. After confirmation, update content only after the delete request resolves or fails gracefully. | ✅ | 2026-06-11 |
| TASK-023 | Ensure all new delete/undo flows preserve current optimistic editing behavior and use `updateContent(key, value)` only. | ✅ | 2026-06-11 |

### Implementation Phase 5: Section Art Direction And Visual Rhythm

- GOAL-005: Reduce template sameness by giving each major section a distinct composition while preserving the existing content model.
- INDEPENDENCE-005: This phase is independently shippable after Phase 1 or on its own. If Phase 1 is not complete, use existing tokens without renaming them.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-024 | In `components/sections/Letter.tsx`, strengthen the paper treatment: use a narrower measure, warm paper background, serif body, subtle border, and no generic card shadow if the paper material is enough. Keep the editable fields unchanged. | ✅ | 2026-06-11 |
| TASK-025 | In `components/sections/Story.tsx`, reduce generic card feel by emphasizing the date rhythm. Move dates into a distinct date column or badge, keep alternating timeline behavior on desktop, and preserve one-column reading on mobile. | ✅ | 2026-06-11 |
| TASK-026 | In `components/sections/Countdowns.tsx`, make dates feel like compact keepsakes instead of dashboard metrics. Reduce repeated nested timer boxes where possible and establish one primary anniversary/milestone treatment plus quieter secondary date items. | ✅ | 2026-06-11 |
| TASK-027 | In `components/sections/Dreams.tsx`, replace identical cards with a checklist or map-like layout that still supports `done`, `category`, title, icon, and description. Completed dreams must remain visually distinct without relying on opacity alone. | ✅ | 2026-06-11 |
| TASK-028 | In `components/sections/Profiles.tsx`, soften the database feel of favourites. Replace the read-only favourites table with definition-list or grouped rows in view mode. Keep edit mode table or inputs if that remains more efficient. | ✅ | 2026-06-11 |
| TASK-029 | In `app/loading.tsx` and `app/error.tsx`, align loading/error states with the new visual system. Avoid repeating generic rounded card placeholders. | ✅ | 2026-06-11 |

### Implementation Phase 6: Accessibility, Mobile, And Motion Verification

- GOAL-006: Validate that the redesigned experience works for keyboard, screen-reader, and mobile users.
- INDEPENDENCE-006: This phase can run after any phase. It becomes mandatory before release.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-030 | Verify keyboard navigation for `Nav`, `EditBar`, `Modal`, `Gallery` lightbox, gallery pause/play, and all undo toasts. Escape must close open dialogs/lightboxes where applicable. |  |  |
| TASK-031 | Verify visible focus states for every interactive element introduced or modified by this plan. Use existing `focus:ring-2 focus:ring-rose/20` patterns or improve them consistently. |  |  |
| TASK-032 | Verify mobile layouts at 375px, 768px, and 1280px widths. The mobile nav, gallery controls, captions, edit button, and toast must not overlap. |  |  |
| TASK-033 | Verify text contrast for `text-text-muted`, `text-text-light`, `text-rose`, and `text-rose-deep` on `bg-cream`, `bg-warm-white`, `bg-parchment`, and caption overlays. Adjust tokens if contrast fails. |  |  |
| TASK-034 | Verify motion safety: carousel autoplay must be pausable, and no animation should use layout properties that cause jank. |  |  |
| TASK-035 | Run `bun run build` and resolve all TypeScript, lint, and Next.js build errors. | ✅ | 2026-06-11 |
| TASK-036 | Start `bun run dev`, open the site, and manually verify all seven sections render and edit mode still works. |  |  |

## 3. Alternatives

- **ALT-001**: Full visual rewrite in a single phase. Rejected because it would combine IA, visual system, gallery behavior, and edit safety into one high-risk branch.
- **ALT-002**: Only fix palette and typography. Rejected because the critique's main P1 issues are narrative structure, gallery behavior, and destructive edit safety.
- **ALT-003**: Remove sections to reduce complexity. Rejected because the existing content model and user expectation require preserving all content keys.
- **ALT-004**: Add a third-party component system. Rejected because the project already has coherent local components and Tailwind v4 styling.

## 4. Dependencies

- **DEP-001**: Existing Next.js 15 App Router project.
- **DEP-002**: Existing content provider in `components/providers/ContentProvider.tsx`.
- **DEP-003**: Existing edit provider in `components/providers/EditProvider.tsx`.
- **DEP-004**: Existing edit components in `components/edit/`.
- **DEP-005**: Existing `embla-carousel-react` gallery implementation.
- **DEP-006**: Existing Tailwind v4 theme tokens in `app/globals.css`.
- **DEP-007**: Existing Impeccable critique snapshot at `.impeccable/critique/2026-06-11T07-51-35Z__app-page-tsx.md`.

## 5. Files

- **FILE-001**: `app/page.tsx` — section order.
- **FILE-002**: `app/globals.css` — design tokens, gallery hover CSS removal, contrast adjustments.
- **FILE-003**: `app/loading.tsx` — loading state visual rhythm.
- **FILE-004**: `app/error.tsx` — error state visual rhythm.
- **FILE-005**: `components/ui/Nav.tsx` — nav order and labels.
- **FILE-006**: `components/ui/EditBar.tsx` — save status display.
- **FILE-007**: `components/ui/UndoToast.tsx` — new undo recovery UI.
- **FILE-008**: `components/ui/Modal.tsx` — only if confirmation or focus behavior requires shared modal updates.
- **FILE-009**: `components/sections/Hero.tsx` — no planned changes unless visual QA finds first-fold spacing issues.
- **FILE-010**: `components/sections/Letter.tsx` — section art direction and heading position.
- **FILE-011**: `components/sections/Story.tsx` — narrative art direction and undo for deletes.
- **FILE-012**: `components/sections/Gallery.tsx` — autoplay, captions, mobile filters, image delete confirmation.
- **FILE-013**: `components/sections/Countdowns.tsx` — heading rename, compact date treatment, undo for removals.
- **FILE-014**: `components/sections/Dreams.tsx` — checklist/map layout and undo for deletes.
- **FILE-015**: `components/sections/Profiles.tsx` — view-mode favourite layout and undo for removals.
- **FILE-016**: `components/providers/ContentProvider.tsx` — pending/save/error status.
- **FILE-017**: `lib/types.ts` — update only if shared context types require it.

## 6. Testing

- **TEST-001**: Run `bun run build` after each completed phase.
- **TEST-002**: Run `bun run dev` and verify the homepage renders at `http://localhost:3000` or the fallback port selected by Next.js.
- **TEST-003**: Verify responsive layouts at 375px, 768px, and 1280px widths.
- **TEST-004**: Verify keyboard-only access for nav, edit modal, gallery lightbox, gallery pause/play, undo toast, and all form controls.
- **TEST-005**: Verify gallery captions remain visible without hover.
- **TEST-006**: Verify gallery autoplay pauses when the pause button is activated.
- **TEST-007**: Verify non-image deletes can be undone in Story, Countdowns, Dreams, and Profiles.
- **TEST-008**: Verify gallery image deletion requires explicit confirmation before Cloudinary deletion.
- **TEST-009**: Verify `Save failed` appears when a content PATCH fails. Use a temporary local failure path or mocked failed request during manual QA.
- **TEST-010**: Verify no new occurrences of banned patterns: gradient text, side-stripe card accents, nested cards, default decorative glassmorphism.

## 7. Risks & Assumptions

- **RISK-001**: Adding provider save state can affect many consumers if context types are not updated carefully.
- **RISK-002**: Undo flows can become inconsistent if each section implements a different local pattern.
- **RISK-003**: Changing palette tokens can unintentionally reduce contrast in existing components.
- **RISK-004**: Gallery Cloudinary deletion confirmation may slow editors down if implemented too aggressively.
- **RISK-005**: Stronger art direction can break edit-mode ergonomics if editable controls become cramped.
- **ASSUMPTION-001**: The project should preserve all current content sections and keys.
- **ASSUMPTION-002**: The desired direction is warmer, more authored, and more intimate rather than more dashboard-like.
- **ASSUMPTION-003**: The edit mode is for trusted users and can use inline undo instead of heavy confirmation for every local content removal.
- **ASSUMPTION-004**: Cloudinary image deletion is irreversible enough to require confirmation.

## 8. Related Specifications / Further Reading

- `.impeccable/critique/2026-06-11T07-51-35Z__app-page-tsx.md`
- `AGENTS.md`
- `README.md`
- `ARCHITECTURE.md`
- `PHASES.md`
