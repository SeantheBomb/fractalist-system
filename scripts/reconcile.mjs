// Reconciles source/Derivation_Map.json with source/Fractalism_Complete.md.
// Run: node scripts/reconcile.mjs [--accept] [--strict]
//
// The map says which axioms each theorem and mantra comes from and which mantras each
// chapter comes from. A theorem is something the axioms make unavoidable; a mantra is the
// shortest instruction that follows. It keys on node slugs and on short anchor phrases, never on chapter numbers, so the
// manuscript can be reordered freely. This script only reads the manuscript; it never
// re-seeds src/content.
//
// It reports four kinds of disagreement:
//   untraced  a chapter the map says nothing about
//   stale     a trace pointing at a chapter that is gone
//   drifted   a trace whose anchor phrase is no longer in its chapter
//   changed   a chapter whose text differs from when its trace was last accepted
//
// A trace's verdict says what kind of chapter it is: a foundation states axioms, the
// alphabet defines the notation, an interpretation argues the system maps onto something,
// and derived, partial or orphan say how far the mantras account for a practice.
//
// --accept records the current text of every traced chapter as reviewed.
// --strict exits non-zero on broken references, stale traces or drifted anchors.
// The resolved map and the report are written to src/data/derivation.json for the site.

import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { NODES, PARTS } from './manifest.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const MAP_PATH = join(root, 'source', 'Derivation_Map.json');
const args = new Set(process.argv.slice(2));

const map = JSON.parse(readFileSync(MAP_PATH, 'utf8'));
const lines = readFileSync(join(root, 'source', 'Fractalism_Complete.md'), 'utf8').split(/\r?\n/);

// Sections keyed by exact `## ` heading text, the same way split-book.mjs reads them.
const sections = new Map();
let current = null;
let buf = [];
const flush = () => {
  if (current !== null) sections.set(current, buf.join('\n'));
  buf = [];
};
for (const line of lines) {
  if (line.startsWith('## ')) { flush(); current = line.slice(3).trim(); }
  else if (line.startsWith('# ')) { flush(); current = null; }
  else if (current !== null) buf.push(line);
}
flush();

const plain = (s) => s.replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/\s+/g, ' ').trim();
const hash = (s) => createHash('sha1').update(plain(s)).digest('hex').slice(0, 10);

const bySlug = new Map(NODES.map((n) => [n.slug, n]));
const textOf = (slug) => {
  const n = bySlug.get(slug);
  return n && sections.has(n.heading) ? plain(sections.get(n.heading)) : null;
};

const errors = [];
const ids = (list, what) => {
  const seen = new Set();
  for (const x of list) {
    if (seen.has(x.id)) errors.push(`duplicate ${what} id "${x.id}"`);
    seen.add(x.id);
  }
  return seen;
};
const VERDICTS = ['foundation', 'alphabet', 'interpretation', 'derived', 'partial', 'orphan'];
const axiomIds = ids(map.axioms, 'axiom');
const theoremIds = ids(map.theorems ?? [], 'theorem');
const groundIds = new Set([...axiomIds, ...theoremIds]);
const mantraIds = ids(map.mantras, 'mantra');

// The manuscript against the manifest.
const headings = new Set(NODES.map((n) => n.heading));
const unmapped = [...sections.keys()].filter((h) => !headings.has(h) && h !== 'Table of Contents');
const missing = NODES.filter((n) => !sections.has(n.heading)).map((n) => n.slug);

// Axioms and theorems: are they stated where the map says, and how widely are they sourced?
const ground = (a) => {
  const unstated = (a.statedIn ?? []).filter(({ node, anchor }) => {
    if (!bySlug.has(node)) { errors.push(`"${a.id}" is stated in unknown node "${node}"`); return false; }
    const t = textOf(node);
    return !t || !t.includes(plain(anchor));
  }).map((s) => s.node);
  const books = [...new Set((a.sources ?? []).map((s) => s.book))];
  return { ...a, books: books.length, unstated,
    mantras: map.mantras.filter((m) => m.from.includes(a.id)).map((m) => m.id) };
};
const axioms = map.axioms.map((a) => {
  const g = ground(a);
  return { ...g, thin: g.books < 3, theorems: (map.theorems ?? []).filter((t) => t.from.includes(a.id)).map((t) => t.id) };
});
const theorems = (map.theorems ?? []).map(ground);
for (const t of map.theorems ?? []) for (const f of t.from) if (!axiomIds.has(f)) errors.push(`theorem "${t.id}" comes from unknown axiom "${f}"`);

for (const m of map.mantras) for (const f of m.from) if (!groundIds.has(f)) errors.push(`mantra "${m.id}" comes from unknown axiom or theorem "${f}"`);
for (const p of map.pillars ?? []) for (const f of [p.is, ...(p.derivedFrom ?? [])].filter(Boolean)) if (!groundIds.has(f)) errors.push(`pillar "${p.name}" names unknown axiom or theorem "${f}"`);
for (const s of map.exempt?.nodes ?? []) if (!bySlug.has(s)) errors.push(`exempt list names unknown node "${s}"`);
for (const p of map.parked?.parts ?? []) if (!PARTS[p]) errors.push(`parked list names unknown part "${p}"`);
for (const s of map.parked?.nodes ?? []) if (!bySlug.has(s)) errors.push(`parked list names unknown node "${s}"`);

// Traces.
const traced = new Set();
const traces = map.traces.map((t) => {
  if (traced.has(t.node)) errors.push(`node "${t.node}" is traced twice`);
  traced.add(t.node);
  for (const f of t.from) if (!mantraIds.has(f)) errors.push(`trace "${t.node}" comes from unknown mantra "${f}"`);
  for (const f of t.states ?? []) if (!groundIds.has(f)) errors.push(`trace "${t.node}" states unknown axiom or theorem "${f}"`);
  if (!VERDICTS.includes(t.verdict)) errors.push(`trace "${t.node}" has unknown verdict "${t.verdict}"`);
  const n = bySlug.get(t.node);
  const text = textOf(t.node);
  const flags = [];
  let now = null;
  if (!n || text === null) flags.push('stale');
  else {
    now = hash(text);
    if ((t.anchors ?? []).some((a) => !text.includes(plain(a)))) flags.push('drifted');
    if (!t.seen) flags.push('unreviewed');
    else if (t.seen !== now) flags.push('changed');
  }
  return { ...t, title: n?.title ?? t.node, part: n?.part ?? null, href: `/node/${t.node}/`, flags, now,
    missingAnchors: text === null ? [] : (t.anchors ?? []).filter((a) => !text.includes(plain(a))) };
});

const exempt = new Set(map.exempt?.nodes ?? []);
const parkedParts = new Set(map.parked?.parts ?? []);
const parkedSlugs = new Set(map.parked?.nodes ?? []);
const isParked = (n) => parkedParts.has(n.part) || parkedSlugs.has(n.slug);
const present = NODES.filter((n) => sections.has(n.heading));
const brief = (n) => ({ slug: n.slug, title: n.title, part: n.part, href: `/node/${n.slug}/` });
const parked = present.filter((n) => isParked(n) && !traced.has(n.slug)).map(brief);
const untraced = present.filter((n) => !traced.has(n.slug) && !exempt.has(n.slug) && !isParked(n)).map(brief);

const mantras = map.mantras.map((m) => ({ ...m, nodes: traces.filter((t) => t.from.includes(m.id)).map((t) => t.node) }));
const count = (f) => traces.filter(f).length;
const report = {
  chapters: present.length,
  traced: traces.length,
  verdicts: Object.fromEntries(VERDICTS.map((v) => [v, count((t) => t.verdict === v)])),
  untraced: untraced.length,
  parked: parked.length,
  exempt: exempt.size,
  stale: traces.filter((t) => t.flags.includes('stale')).map((t) => t.node),
  drifted: traces.filter((t) => t.flags.includes('drifted')).map((t) => t.node),
  changed: traces.filter((t) => t.flags.includes('changed')).map((t) => t.node),
  unreviewed: count((t) => t.flags.includes('unreviewed')),
  unusedMantras: mantras.filter((m) => m.nodes.length === 0).map((m) => m.id),
  unusedAxioms: [...axioms.filter((a) => a.mantras.length + a.theorems.length === 0), ...theorems.filter((t) => t.mantras.length === 0)].map((a) => a.id),
  thinAxioms: axioms.filter((a) => a.thin).map((a) => a.id),
  unstatedAxioms: [...axioms, ...theorems].filter((a) => a.unstated.length > 0).map((a) => a.id),
  unmappedHeadings: unmapped,
  missingChapters: missing,
  errors,
};

if (args.has('--accept')) {
  for (const t of map.traces) {
    const r = traces.find((x) => x.node === t.node);
    if (r?.now && !r.flags.includes('drifted')) t.seen = r.now;
  }
  writeFileSync(MAP_PATH, JSON.stringify(map, null, 2) + '\n');
}

const withFoundations = (a) => ({ ...a, foundations: traces.filter((t) => (t.states ?? []).includes(a.id)).map((t) => t.node) });
const { traces: _t, axioms: _a, theorems: _th, mantras: _m, ...rest } = map;
writeFileSync(
  join(root, 'src', 'data', 'derivation.json'),
  JSON.stringify({ ...rest, axioms: axioms.map(withFoundations), theorems: theorems.map(withFoundations), mantras, traces: traces.map(({ now, seen, ...t }) => t), untraced, parkedNodes: parked, report }, null, 2) + '\n',
);

const list = (label, xs) => { if (xs.length) console.log(`  ${label}: ${xs.join(', ')}`); };
console.log(`Derivation map vs manuscript (${map.status})`);
console.log(`  ${report.chapters} chapters: ${report.traced} traced, ${report.untraced} untraced, ${report.parked} parked, ${report.exempt} exempt`);
console.log(`  ${VERDICTS.filter((v) => report.verdicts[v]).map((v) => `${report.verdicts[v]} ${v}`).join(', ')}`);
list('stale', report.stale);
list('drifted', traces.filter((t) => t.missingAnchors.length).map((t) => `${t.node} ("${t.missingAnchors.join('", "')}")`));
list('changed since accepted', report.changed);
if (report.unreviewed) console.log(`  not yet accepted: ${report.unreviewed}`);
list('unused mantras', report.unusedMantras);
list('unused axioms or theorems', report.unusedAxioms);
list('thinly sourced axioms', report.thinAxioms);
list('not found where stated', report.unstatedAxioms);
list('manuscript headings with no node', report.unmappedHeadings);
list('nodes with no manuscript heading', report.missingChapters);
list('errors', report.errors);

if (args.has('--strict') && (errors.length || report.stale.length || report.drifted.length)) process.exit(1);
