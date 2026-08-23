// Seeds src/content/{nodes,thirds} from source/Fractalism_Complete.md using scripts/manifest.mjs.
// Run: node scripts/split-book.mjs
// The generated files are committed; after seeding, the content collections are the
// living copy and may be edited directly. Re-running this script overwrites them.

import { readFileSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { NODES, THIRDS } from './manifest.mjs';

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

THIRDS.forEach((t, i) => {
  const raw = sections.get(t.heading);
  if (raw === undefined) { missing.push(t.heading); return; }
  const { epigraph, body } = extractEpigraph(cleanBody(raw));
  const fm = [
    '---',
    `name: ${y(t.name)}`,
    `epithet: ${y(t.epithet)}`,
    `kinship: ${y(t.kinship)}`,
    `order: ${i}`,
    epigraph ? `epigraph: ${y(epigraph)}` : null,
    `personifies: ${y(t.personifies)}`,
    `tending: ${y(t.tending)}`,
    `fraying: ${y(t.fraying)}`,
    `fractal: ${JSON.stringify(t.fractal)}`,
    `relatedThirds: [${t.relatedThirds.map(y).join(', ')}]`,
    `relatedNodes: [${t.relatedNodes.map(y).join(', ')}]`,
    '---',
  ].filter(Boolean).join('\n');
  writeFileSync(join(thirdsDir, `${t.slug}.md`), `${fm}\n\n${body}\n`);
});

if (missing.length) {
  console.error('MISSING HEADINGS:\n' + missing.map((m) => `  - ${m}`).join('\n'));
  process.exit(1);
}
console.log(`Wrote ${NODES.length} nodes and ${THIRDS.length} thirds.`);
