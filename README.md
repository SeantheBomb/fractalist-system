# Fractalist System

A living, nonlinear home for the **Fractalism** materials — the complete practitioner's handbook,
explorable by relation instead of order, with the Standing Thirds gallery and the interactive
Weaving practice.

**Live site:** https://fractalist-system.pages.dev

> We build the world by repeating what we cannot see.

## What's here

- **The Book** — every chapter of the handbook as a graph of nodes, each with curated
  "follow your thread" relations, plus a linear reading order for anyone who wants the straight road.
- **The Map** — a constellation view of every topic by relation; pages you've visited stay lit
  (stored only in your browser).
- **The Standing Thirds** — eighteen personified patterns, each drawn as its own deterministic
  generative fractal (see `src/lib/fractals.ts`).
- **Weavings** — the daily Single Pull (date-seeded: everyone draws the same card on a given day)
  and the guided Four-Point Weaving, revealed one card at a time, with shareable spread links.

## Stack

- [Astro](https://astro.build) static site, content collections driven by markdown frontmatter
- Cloudflare Pages + a single Pages Function (`functions/api/t.ts`) writing anonymous page-to-page
  traffic to Workers Analytics Engine — no cookies, no identifiers
- No client framework; the interactive pieces are small vanilla scripts

## Working on it

```sh
npm install
npm run dev       # local dev at localhost:4321
npm run build     # static build to dist/
npx wrangler pages deploy dist   # deploy
```

### Content model

The canonical text lives in `source/Fractalism_Complete.md`. It was split once into
`src/content/nodes/` (chapters) and `src/content/thirds/` (the Standing Thirds) by
`node scripts/split-book.mjs`, using the curated graph in `scripts/manifest.mjs`.

**The content collections are the living copy** — edit them directly. Re-running the split script
re-seeds from the book and overwrites those edits, so treat it as a bootstrap tool, not a build step.

Each node's frontmatter carries its `related` links — that's the entire nonlinear graph. Adding a
topic is: add a markdown file, link it from a few related nodes, done. Record meaningful changes on
the Iterations page (`src/pages/iterations.astro`).

## License

Code is MIT licensed. The Fractalism text (everything in `source/` and `src/content/`) is
[CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) — repeat it, revise it, hand it
forward, with attribution and the same license. That's not just permission; it's the method.
