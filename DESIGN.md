# Redesign Plan

## Scene

Someone opens a private memory box at a wooden desk in late afternoon light. The site is the box laid out carefully: photos, notes, dates, and two lives becoming one archive.

## Visual Direction

Use the existing warm archive foundation in `app/globals.css`: cream, parchment, rose, muted gold, and ink. Push it toward a physical memory object, not a theme pack.

Color strategy: full palette, softly held.

- Cream and parchment are the page.
- Cocoa or archive ink is the writing.
- Dusty rose marks affection and editing focus.
- Gold behaves like aged brass or old ink, never shiny luxury.
- A small blue or cool note can appear only as contrast in dates, labels, or tiny archival marks.

## Typography

Keep the current non-default direction unless testing proves otherwise:

- Serif: `Libre Baskerville` for headings, letters, quotes.
- Sans: `Nunito Sans` for controls, dates, metadata, editing UI.
- Avoid adding a handwritten font until the main redesign works. Use italic serif for signatures first.

## Materials

- Linen page: global background, very subtle texture.
- Photo paper: white or warm-white frame, square edges or tiny radius, strong but soft shadow.
- Letter paper: parchment, slight uneven edge effect via CSS only if cheap to implement.
- Notebook paper: profiles, with a visible center fold or gutter.
- Sticky notes: dreams, lighter and more airy.

Avoid using tape, torn edges, polaroids, stickers, script, and stains in the same section.

## Section Rules

### Hero

Dominant object: one taped photo.

- Large Polaroid-style image with slight rotation.
- Load motion: short drop and settle, no bounce.
- Names and quote stay readable before decoration.
- Hero image keeps `priority`.

### Letter

Dominant object: kept paper.

- Parchment card with generous line length control.
- Signature uses italic serif before any script font.
- Edge treatment should be CSS-only and subtle.

### Timeline

Dominant object: ink line.

- Vertical hand-drawn line effect.
- Milestones alternate between small notes and small photos if images exist.
- Scroll animation may draw the line, but content must be readable with motion disabled.

### Gallery

Dominant object: photo pile.

- Overlapping collage on desktop.
- Simple single-column or gentle masonry on mobile.
- Hover lifts photos with transform and shadow only.

### Dates

Dominant object: desk calendar slip.

- Countdown is compact and live.
- Use native date math. No new date library unless current logic is wrong.
- Date cards must stay easy to scan.

### Dreams

Dominant object: future notes.

- Lighter than the rest of the page.
- Sticky notes or thought-note shapes, not literal bubbles unless the design proves it.
- Done state should feel gently archived, not crossed out harshly.

### Profiles

Dominant object: open notebook.

- Side-by-side pages on desktop.
- Stacked pages on mobile.
- Keep skill lists and projects dense, but use notebook structure instead of generic cards.
- Label the section around becoming, not resume polish.

## Edit Mode

Edit mode should reduce decoration around active fields. Keep visible affordances clear:

- Rose focus ring.
- Plain controls.
- No animated layout while typing.
- Image replacement remains obvious.

## Implementation Order

1. Hero, Letter, Nav, EditBar.
2. Gallery.
3. Timeline.
4. Dates and countdown.
5. Dreams.
6. Profiles.
7. Responsive polish.
8. Accessibility and motion polish.

## First Slice Acceptance

- Hero reads as a physical photo object within five seconds.
- Letter feels like a kept note, not a card component.
- Edit mode still feels boring and reliable.
- Mobile has no awkward rotated-photo pileups.
- `bun run build` passes.
