// Reconciles source/Derivation_Map.json with source/Fractalism_Complete.md.
// Run: node scripts/reconcile.mjs [--accept] [--strict]
//
// The map lays Fractalism out as a formal system:
//   alphabet   the Loop Tongue
//   axioms     the primitive moves
//   rules      how a move becomes another move
//   theorems   the practices, each traced to the moves it is made of. Where a chapter is a
//              table, each row is recorded as one move applied to one named pattern.
// Beside it sits the ground: descriptions of the world the moves stand on (the one
// operation, the pillars, the Standpoint), and the guides, which advise which move to make.
//
// The map keys on node slugs and on short anchor phrases, never on chapter numbers, so the
// manuscript can be reordered freely. This script only reads the manuscript; it never
// re-seeds src/content.
//
// It reports four kinds of disagreement:
//   untraced  a chapter the map says nothing about
//   stale     a trace pointing at a chapter that is gone
//   drifted   a trace whose anchor phrase is no longer in its chapter
//   changed   a chapter whose text differs from when its trace was last accepted
//
// A trace's verdict says what kind of chapter it is: a foundation states part of the
// ground, the alphabet defines the notation, an interpretation argues the system maps onto
// something, and derived, partial or orphan say how far the moves account for a practice.
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
const PRACTICE = ['derived', 'partial', 'orphan'];
const moveIds = ids([...map.axioms, ...(map.derivedMoves ?? [])], 'move');
const claimIds = ids(map.ground.claims, 'claim');
const standIds = ids(map.ground.standpoint, 'standpoint');
const groundIds = new Set([...claimIds, ...standIds]);
const guideIds = ids(map.guides, 'guide');
const scales = new Set(map.alphabet.scales);

// The manuscript against the manifest.
const headings = new Set(NODES.map((n) => n.heading));
const unmapped = [...sections.keys()].filter((h) => !headings.has(h) && h !== 'Table of Contents');
const missing = NODES.filter((n) => !sections.has(n.heading)).map((n) => n.slug);

// Is each thing stated where the map says, and how widely is it sourced?
const stated = (a) => {
  const unstated = (a.statedIn ?? []).filter(({ node, anchor }) => {
    if (!bySlug.has(node)) { errors.push(`"${a.id}" is stated in unknown node "${node}"`); return false; }
    const t = textOf(node);
    return !t || !t.includes(plain(anchor));
  }).map((s) => s.node);
  const books = [...new Set((a.sources ?? []).map((s) => s.book))];
  return { ...a, books: books.length, unstated };
};

for (const a of map.axioms) for (const g of a.onGround ?? []) if (!groundIds.has(g)) errors.push(`axiom "${a.id}" stands on unknown ground "${g}"`);
for (const d of map.derivedMoves ?? []) for (const f of d.from) if (!map.axioms.some((a) => a.id === f)) errors.push(`derived move "${d.id}" comes from unknown axiom "${f}"`);
for (const r of map.rules) if (r.ground && !groundIds.has(r.ground)) errors.push(`rule "${r.id}" stands on unknown ground "${r.ground}"`);
for (const s of map.ground.standpoint) for (const f of s.from) if (!claimIds.has(f)) errors.push(`"${s.id}" comes from unknown claim "${f}"`);
for (const g of map.guides) for (const f of g.from) if (!groundIds.has(f)) errors.push(`guide "${g.id}" comes from unknown ground "${f}"`);
for (const p of map.ground.pillars ?? []) if (!groundIds.has(p.is)) errors.push(`pillar "${p.name}" names unknown ground "${p.is}"`);
for (const s of map.exempt?.nodes ?? []) if (!bySlug.has(s)) errors.push(`exempt list names unknown node "${s}"`);
for (const p of map.parked?.parts ?? []) if (!PARTS[p]) errors.push(`parked list names unknown part "${p}"`);
for (const s of map.parked?.nodes ?? []) if (!bySlug.has(s)) errors.push(`parked list names unknown node "${s}"`);

// Traces.
const traced = new Set();
const traces = map.traces.map((t) => {
  if (traced.has(t.node)) errors.push(`node "${t.node}" is traced twice`);
  traced.add(t.node);
  if (!VERDICTS.includes(t.verdict)) errors.push(`trace "${t.node}" has unknown verdict "${t.verdict}"`);
  for (const f of t.guides ?? []) if (!guideIds.has(f)) errors.push(`trace "${t.node}" names unknown guide "${f}"`);
  for (const f of t.states ?? []) if (!groundIds.has(f)) errors.push(`trace "${t.node}" states unknown ground "${f}"`);
  for (const mv of t.moves ?? []) {
    const [move, scale] = mv.split('@');
    if (!moveIds.has(move) || !scales.has(scale)) errors.push(`trace "${t.node}" has unknown move "${mv}"`);
  }
  if (PRACTICE.includes(t.verdict) && !(t.moves ?? []).length) errors.push(`practice "${t.node}" is traced to no moves`);
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

// Applications: one move, one named pattern, one scale. Checked by name against the text.
const applications = (map.applications ?? []).map((a) => {
  if (!moveIds.has(a.move) || !scales.has(a.scale)) errors.push(`application "${a.turning}" has unknown move or scale`);
  const text = textOf(a.node);
  return { ...a, lost: text === null || !text.includes(plain(a.turning)) || !text.includes(plain(a.figure)) };
});

const exempt = new Set(map.exempt?.nodes ?? []);
const parkedParts = new Set(map.parked?.parts ?? []);
const parkedSlugs = new Set(map.parked?.nodes ?? []);
const isParked = (n) => parkedParts.has(n.part) || parkedSlugs.has(n.slug);
const present = NODES.filter((n) => sections.has(n.heading));
const brief = (n) => ({ slug: n.slug, title: n.title, part: n.part, href: `/node/${n.slug}/` });
const parked = present.filter((n) => isParked(n) && !traced.has(n.slug)).map(brief);
const untraced = present.filter((n) => !traced.has(n.slug) && !exempt.has(n.slug) && !isParked(n)).map(brief);

const usesMove = (id, scale) => traces.filter((t) => (t.moves ?? []).some((mv) => {
  const [m, s] = mv.split('@');
  return m === id && (!scale || s === scale);
})).map((t) => t.node);
const foundations = (id) => traces.filter((t) => (t.states ?? []).includes(id)).map((t) => t.node);

const axioms = map.axioms.map((a) => {
  const s = stated(a);
  return { ...s, thin: s.books < 3, nodes: usesMove(a.id),
    applied: Object.fromEntries(map.alphabet.scales.map((sc) => [sc, applications.filter((x) => x.move === a.id && x.scale === sc).length])),
    byScale: Object.fromEntries(map.alphabet.scales.map((sc) => [sc, usesMove(a.id, sc).length])) };
});
const derivedMoves = (map.derivedMoves ?? []).map((a) => ({ ...stated(a), nodes: usesMove(a.id),
  byScale: Object.fromEntries(map.alphabet.scales.map((sc) => [sc, usesMove(a.id, sc).length])) }));
const claims = map.ground.claims.map((c) => {
  const s = stated(c);
  return { ...s, thin: s.books < 3, foundations: foundations(c.id),
    gives: [...map.ground.standpoint.filter((x) => x.from.includes(c.id)).map((x) => x.id),
      ...map.guides.filter((g) => g.from.includes(c.id)).map((g) => g.id)] };
});
const standpoint = map.ground.standpoint.map((c) => ({ ...stated(c), foundations: foundations(c.id),
  gives: map.guides.filter((g) => g.from.includes(c.id)).map((g) => g.id) }));
const guides = map.guides.map((g) => ({ ...g, nodes: traces.filter((t) => (t.guides ?? []).includes(g.id)).map((t) => t.node) }));

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
  lostApplications: applications.filter((a) => a.lost).map((a) => `${a.turning} (${a.figure})`),
  unreviewed: count((t) => t.flags.includes('unreviewed')),
  unusedAxioms: axioms.filter((a) => a.nodes.length === 0).map((a) => a.id),
  thinAxioms: axioms.filter((a) => a.thin).map((a) => a.id),
  thinGround: claims.filter((c) => c.thin).map((c) => c.id),
  unstated: [...axioms, ...derivedMoves, ...claims, ...standpoint].filter((a) => a.unstated.length > 0).map((a) => a.id),
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

const { traces: _t, axioms: _a, derivedMoves: _d, guides: _g, applications: _ap, ground, ...rest } = map;
writeFileSync(
  join(root, 'src', 'data', 'derivation.json'),
  JSON.stringify({ ...rest, axioms, derivedMoves, ground: { ...ground, claims, standpoint }, guides, applications,
    traces: traces.map(({ now, seen, ...t }) => t), untraced, parkedNodes: parked, report }, null, 2) + '\n',
);

const list = (label, xs) => { if (xs.length) console.log(`  ${label}: ${xs.join(', ')}`); };
console.log(`Derivation map vs manuscript (${map.status})`);
console.log(`  ${report.chapters} chapters: ${report.traced} traced, ${report.untraced} untraced, ${report.parked} parked, ${report.exempt} exempt`);
console.log(`  ${VERDICTS.filter((v) => report.verdicts[v]).map((v) => `${report.verdicts[v]} ${v}`).join(', ')}`);
console.log(`  moves: ${[...axioms, ...derivedMoves].map((a) => `${a.id} in ${a.nodes.length}`).join(', ')}`);
if (applications.length) console.log(`  applied to named patterns: ${axioms.map((a) => `${a.id} ${Object.values(a.applied).reduce((x, y) => x + y, 0)}`).join(', ')}`);
list('stale', report.stale);
list('drifted', traces.filter((t) => t.missingAnchors.length).map((t) => `${t.node} ("${t.missingAnchors.join('", "')}")`));
list('changed since accepted', report.changed);
list('applications no longer in the text', report.lostApplications);
if (report.unreviewed) console.log(`  not yet accepted: ${report.unreviewed}`);
list('unused axioms', report.unusedAxioms);
list('thinly sourced axioms', report.thinAxioms);
list('thinly sourced ground', report.thinGround);
list('not found where stated', report.unstated);
list('manuscript headings with no node', report.unmappedHeadings);
list('nodes with no manuscript heading', report.missingChapters);
list('errors', report.errors);

if (args.has('--strict') && (errors.length || report.stale.length || report.drifted.length || report.lostApplications.length)) process.exit(1);
