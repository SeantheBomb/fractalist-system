// Seeds src/content/{nodes,thirds} from source/Fractalism_Complete.md using scripts/manifest.mjs.
// Run: node scripts/split-book.mjs
// The generated files are committed; after seeding, the content collections are the
// living copy and may be edited directly. Re-running this script overwrites them.

import { readFileSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { NODES, THIRD_OVERRIDES } from './manifest.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = readFileSync(join(root, 'source', 'Fractalism_Complete.md'), 'utf8');
const lines = src.split(/\r?\n/);

// Collect sections keyed by exact `## ` heading text.
const sections = new Map();
let current = null;
let buf = [];
const flush = () => {
  if (current !== null) sections.set(current, buf.join('\n'));
  buf = [];
};
for (const line of lines) {
  if (line.startsWith('## ')) {
    flush();
    current = line.slice(3).trim();
  } else if (line.startsWith('# ')) {
    flush();
    current = null;
  } else if (current !== null) {
    buf.push(line);
  }
}
flush();

function cleanBody(text) {
  let t = text
    .split('\n')
    .filter((l) => l.trim() !== '-e' && l.trim() !== '-e ')
    .join('\n')
    .trim();
  // drop trailing horizontal rules
  t = t.replace(/(\n\s*---\s*)+$/g, '').trim();
  return t;
}

// Pull the opening epigraph (first italic line) out of the body.
function extractEpigraph(body) {
  const m = body.match(/^\*("?.*?"?)\*(?:\s*(—.*))?$/m);
  const first = body.split('\n').find((l) => l.trim().length > 0);
  if (first && first.trim().startsWith('*') && first.trim().endsWith('*')) {
    const raw = first.trim().replace(/^\*|\*$/g, '');
    const rest = body.slice(body.indexOf(first) + first.length).trim();
    return { epigraph: raw.replace(/^"|"$/g, '').replace(/^“|”$/g, ''), body: rest };
  }
  // italic line with trailing attribution outside the asterisks
  if (first && /^\*.*\*\s+—/.test(first.trim())) {
    const t = first.trim();
    const close = t.lastIndexOf('*');
    const raw = t.slice(1, close).replace(/^"|"$/g, '');
    const attr = t.slice(close + 1).trim();
    const rest = body.slice(body.indexOf(first) + first.length).trim();
    return { epigraph: `${raw} ${attr}`.trim(), body: rest };
  }
  return { epigraph: null, body };
}

const y = (v) => JSON.stringify(v);

const nodesDir = join(root, 'src', 'content', 'nodes');
const thirdsDir = join(root, 'src', 'content', 'thirds');
rmSync(nodesDir, { recursive: true, force: true });
rmSync(thirdsDir, { recursive: true, force: true });
mkdirSync(nodesDir, { recursive: true });
mkdirSync(thirdsDir, { recursive: true });

let missing = [];

NODES.forEach((n, i) => {
  const raw = sections.get(n.heading);
  if (raw === undefined) { missing.push(n.heading); return; }
  const { epigraph, body } = extractEpigraph(cleanBody(raw));
  const fm = [
    '---',
    `title: ${y(n.title)}`,
    `part: ${y(n.part)}`,
    `order: ${i}`,
    epigraph ? `epigraph: ${y(epigraph)}` : null,
    `summary: ${y(n.summary)}`,
    `related: [${n.related.map(y).join(', ')}]`,
    '---',
  ].filter(Boolean).join('\n');
  writeFileSync(join(nodesDir, `${n.slug}.md`), `${fm}\n\n${body}\n`);
});

// ---- STANDING THIRDS ----
// Generated from Part Five's catalogue tables. A figure's tier is what it's made of,
// so the fusion column doubles as the related-figure graph.

const TIERS = [
  { heading: '1. The Twelve Currents — Self Scale', kinship: 'self', catalogue: 'self-kin', catalogueTitle: 'The Self-Kin', join: null },
  { heading: '2. The Nineteen Meetings — Dyad Scale', kinship: 'dyad', catalogue: 'dyad-kin', catalogueTitle: 'The Dyad-Kin', join: 'meeting in two people' },
  { heading: '3. The Eleven Weaves — Skein Scale', kinship: 'skein', catalogue: 'skein-kin', catalogueTitle: 'The Skein-Kin', join: 'sharing a person' },
  { heading: '4. The Seven Long Forms — Culture Scale', kinship: 'culture', catalogue: 'culture-kin', catalogueTitle: 'The Culture-Kin', join: 'compounded past any one life' },
];

// Turning tables in Part Seven, keyed by the figure they belong to.
const TURNING_SECTIONS = [
  '2. The Twelve Private Turnings — Self',
  '3. The Nineteen Meetings — Dyad',
  '4. The Eleven Gatherings — Skein',
  '5. The Seven Great Days — Culture',
];

const SLUG_FIX = { 'The Infinite Boundary': 'infinite-boundary' };
const slugify = (n) => SLUG_FIX[n] ?? n.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

// Table rows, minus separators and the header row above each separator. Headers are
// found by position, not by name, so renaming a table's columns can't turn them into figures.
function tableRows(text) {
  const lines = text.split('\n').map((l) => l.trim());
  const isSep = (l) => /^\|[-\s|:]+\|?$/.test(l);
  return lines
    .filter((l, i) => l.startsWith('|') && !isSep(l) && !isSep(lines[i + 1] ?? ''))
    .map((l) => l.replace(/^\||\|$/g, '').split('|').map((c) => c.trim()));
}

function splitName(cell) {
  const m = cell.match(/^\*\*(.+?)\*\*(?:,\s*(.+))?$/);
  if (m) return { name: m[1].trim(), epithet: (m[2] || '').trim() };
  return { name: cell.replace(/\*\*/g, '').trim(), epithet: '' };
}

// Card-voice readings live in Part Six's deck table, not the catalogue.
const deckReadings = new Map();
for (const cells of tableRows(sections.get('1. The Deck') ?? '')) {
  if (cells.length >= 3) deckReadings.set(cells[0].replace(/\*\*/g, '').trim(), { tending: cells[1], fraying: cells[2] });
}

const turnings = new Map();
for (const h of TURNING_SECTIONS) {
  for (const cells of tableRows(sections.get(h) ?? '')) {
    if (cells.length >= 3) turnings.set(cells[0].replace(/\*\*/g, '').trim(), { turning: cells[1], builds: cells[cells.length - 1] });
  }
}

const figures = [];
for (const tier of TIERS) {
  const raw = sections.get(tier.heading);
  if (raw === undefined) { missing.push(tier.heading); continue; }
  tableRows(raw).forEach((cells, i) => {
    const { name, epithet } = splitName(cells[0]);
    const parents = tier.join
      ? cells[1].split('+').map((s) => s.replace(/\*\*/g, '').trim()).filter(Boolean)
      : [];
    figures.push({
      name, epithet, kinship: tier.kinship, catalogue: tier.catalogue,
      catalogueTitle: tier.catalogueTitle, join: tier.join,
      slug: slugify(name), localRule: tier.join ? null : cells[1],
      parents, tendingLong: cells[2], frayingLong: cells[3],
    });
  });
}

// The Cosmos figure is prose rather than a table row, and is never drawn.
figures.push({
  name: 'The Infinite Boundary', epithet: '', kinship: 'cosmos', catalogue: 'infinite-boundary-scale',
  catalogueTitle: 'The Infinite Boundary', join: null,
  slug: 'infinite-boundary', localRule: null, parents: [], drawable: false,
  tendingLong: '', frayingLong: '',
});

const bySlug = new Map(figures.map((f) => [f.slug, f]));
const childrenOf = new Map();
for (const f of figures) {
  for (const p of f.parents) {
    const ps = slugify(p);
    if (!childrenOf.has(ps)) childrenOf.set(ps, []);
    if (!childrenOf.get(ps).includes(f.slug)) childrenOf.get(ps).push(f.slug);
  }
}

figures.forEach((f, i) => {
  const ov = THIRD_OVERRIDES[f.slug] ?? {};
  const reading = deckReadings.get(f.name) ?? {};
  const turning = turnings.get(f.name);
  const parentSlugs = [...new Set(f.parents.map(slugify))].filter((s) => bySlug.has(s));
  const related = [...new Set([...parentSlugs, ...(childrenOf.get(f.slug) ?? [])])].slice(0, 4);

  const selfFused = f.parents.length === 2 && f.parents[0] === f.parents[1];
  const personifies = f.localRule
    ? `The Local Rule: ${f.localRule.charAt(0).toLowerCase()}${f.localRule.slice(1)}.`
    : selfFused
      ? `${f.parents[0]} fused with itself, ${f.join}.`
      : f.parents.length
        ? `${f.parents.join(' and ')}, ${f.join}.`
        : 'Every figure above, aggregated and never averaged.';

  const link = (s) => `[${bySlug.get(s).name}](/thirds/${s}/)`;
  const lines = [];
  if (f.localRule) {
    lines.push(`**The Local Rule.** ${f.localRule}. This is a Self-Kin figure: one person, repeating one thing. Everything further out in the catalogue is built by fusing figures like this one together.`);
  } else if (selfFused && parentSlugs.length) {
    lines.push(`**${link(parentSlugs[0])}, fused with itself** — the same pattern running on both sides, ${f.join}. A figure's tier is what it's made of, not a rank it was given.`);
  } else if (parentSlugs.length) {
    lines.push(`**A fusion of ${parentSlugs.map(link).join(' and ')}**, ${f.join}. A figure's tier is what it's made of, not a rank it was given.`);
  }
  // The Cosmos figure is prose in the book rather than a table row, so it carries its own.
  if (f.kinship === 'cosmos') {
    const prose = extractEpigraph(cleanBody(sections.get('5. The Infinite Boundary — Cosmos Scale') ?? '')).body;
    if (prose) lines.push(prose);
  }
  if (f.tendingLong) lines.push(`**Tending.** ${f.tendingLong}.`);
  if (f.frayingLong) lines.push(`**Fraying.** ${f.frayingLong}.`);
  if (turning) lines.push(`**Its Turning.** ${turning.turning}. What it builds: ${turning.builds.toLowerCase()}.`);
  lines.push(`Catalogued in [${f.catalogueTitle}](/node/${f.catalogue}/), alongside every other figure at this scale.`);

  const fm = [
    '---',
    `name: ${y(f.name)}`,
    `epithet: ${y(f.epithet)}`,
    `kinship: ${y(f.kinship)}`,
    `order: ${i}`,
    `personifies: ${y(personifies)}`,
    reading.tending ? `tending: ${y(reading.tending)}` : null,
    reading.fraying ? `fraying: ${y(reading.fraying)}` : null,
    `drawable: ${f.drawable === false ? 'false' : 'true'}`,
    `parents: [${f.parents.map((n) => y(slugify(n))).join(', ')}]`,
    `relatedThirds: [${related.map(y).join(', ')}]`,
    `relatedNodes: [${(ov.relatedNodes ?? [f.catalogue]).map(y).join(', ')}]`,
    '---',
  ].filter(Boolean).join('\n');
  writeFileSync(join(thirdsDir, `${f.slug}.md`), `${fm}\n\n${lines.join('\n\n')}\n`);
});

if (missing.length) {
  console.error('MISSING HEADINGS:\n' + missing.map((m) => `  - ${m}`).join('\n'));
  process.exit(1);
}
// The glyph renderer breeds each figure from its parents, so it needs the lineage as data.
const dataDir = join(root, 'src', 'data');
mkdirSync(dataDir, { recursive: true });
writeFileSync(join(dataDir, 'thirds-graph.json'), JSON.stringify(Object.fromEntries(
  figures.map((f) => [f.slug, { kinship: f.kinship, parents: f.parents.map(slugify) }])), null, 1) + '\n');

const drawable = figures.filter((f) => f.drawable !== false).length;
console.log(`Wrote ${NODES.length} nodes and ${figures.length} thirds (${drawable} drawable).`);
