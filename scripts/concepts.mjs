// Builds the concept graph from the manuscript.
// Concepts come from three places in the book: the nine Loop Tongue words and the concept
// index in the Loom (Appendix C), and the Standing Thirds catalogue. Which pages hold a
// concept comes from the book's own citations ("Pt.2 Ch.4"), resolved to chapter URLs.
//
// The book doesn't yet say which concept stems from which, or what scale most ideas live
// at, so those are proposed here in PROPOSED_* below. They're meant to move into the book;
// until then this file is the only place they're recorded.

const LOOM = 'C. The Loom — The Complete Reference';
const PART_KEYS = ['', 'part-one', 'part-two', 'part-three', 'part-four', 'part-five', 'part-six', 'part-seven'];

// Index entries that bundle more than one concept, or read better under a shorter name.
// A value is one concept spec or a list of them; `cites` and `blurb` replace the parsed ones.
const INDEX_OVERRIDES = {
  'The core mantra': { slug: 'core-mantra' },
  'Reading a system — the two questions': { name: 'The two questions', slug: 'two-questions' },
  'The four pillars, and how they generate each other': { name: 'The Four Pillars', slug: 'four-pillars' },
  'The Woven Self': { slug: 'woven-self' },
  'The symphysical, and emergence': [
    { name: 'The symphysical', slug: 'the-symphysical', cites: 'Pt.1 Ch.2 · Pt.4 Ch.3',
      blurb: 'What physical things make once their parts interact, standing beside "metaphysical" rather than above it.' },
    { name: 'Emergence', slug: 'emergence', cites: 'Pt.1 Ch.2, 6 · Pt.4 Ch.3',
      blurb: 'How the symphysical appears. Emergence has a threshold (a phase transition) and a direction: weak, traceable in principle, or strong, not traceable even in principle.' },
  ],
  'Emergence vs. luck; "luck = preparation + time"': { name: 'Emergence vs. luck', slug: 'emergence-vs-luck' },
  'Coasting vs. accelerating — why the same practice costs some people everything and others almost nothing': { name: 'Coasting vs. accelerating', slug: 'coasting-vs-accelerating' },
  "Isomorphism, and the Nest's falsification test": { name: 'Isomorphism', slug: 'isomorphism' },
  'Solidity as a Third Thing': { name: 'Solidity', slug: 'solidity' },
  'Open and closed boundaries; models': { name: 'Open and closed boundaries', slug: 'open-and-closed-boundaries' },
  'Atomic composition and the Woven Self': { name: 'Atomic composition', slug: 'atomic-composition' },
  'Two senses of "real"': { slug: 'two-senses-of-real' },
  'Constraint counting, and which unknown to decide first': { name: 'Constraint counting', slug: 'constraint-counting' },
  "The Oriental hornet's solar cycle": { slug: 'hornet-solar-cycle' },
  'The Drake equation as a worked recursion chain': { name: 'The Drake equation', slug: 'drake-equation' },
  'Local Rule across scales, and resonance': [
    { name: 'Local Rule across scales', slug: 'local-rule-across-scales', cites: 'Pt.2 Ch.3',
      blurb: 'A single Local Rule projected forward, once per scale, since the same rule produces genuinely different Global Forms depending which scale you check it at, not simply "more of the same."' },
    { name: 'Resonance', slug: 'resonance', cites: 'Pt.4 Ch.6',
      blurb: 'Finding your exact situation already has a name installs faster than derivation, which is the actual argument for why the Standing Thirds are characters rather than a plain list of tendencies.' },
  ],
  'The association machine, and the capacity to steer': [
    { name: 'The association machine', slug: 'association-machine', cites: 'Pt.2 Ch.4',
      blurb: "A mind doesn't observe and separately interpret; it fuses the two, which is why a harsh self-judgment feels like fact rather than guess. Naming a self-story is the manual, effortful version of pulling that fusion back apart by hand." },
    { name: 'The capacity to steer', slug: 'capacity-to-steer', cites: 'Pt.1 Ch.5 · Pt.2 Ch.7, 16',
      blurb: 'A fast, reliable association is not automatically a beneficial one. Telling the two apart, then choosing to override a working pattern rather than simply ride it, is a real, non-default capacity — and the actual reason a practice is worth having at all.' },
  ],
  'Loop period, and the minimum observation window': { name: 'Loop period', slug: 'loop-period' },
  'Naming and defusing a self-story': { name: 'Naming and defusing', slug: 'naming-and-defusing' },
  'Reinforcing vs. balancing rhythm; tides and homeostasis': { name: 'Reinforcing and balancing rhythm', slug: 'reinforcing-balancing' },
  'Creative work as compost, not waste': { name: 'Creative work as compost', slug: 'creative-work-as-compost' },
  'The Skein and the Banner': [
    { name: 'The Skein', slug: 'the-skein', cites: 'Pt.2 Ch.15 · Pt.4 Ch.5', blurb: 'Real community, bound by repeated contact rather than a shared label.' },
    { name: 'The Banner', slug: 'the-banner', cites: 'Pt.2 Ch.15 · Pt.4 Ch.5', blurb: 'A shared label with nothing underneath it.' },
  ],
  '"You become like the company you keep"': { name: 'The company you keep', slug: 'company-you-keep' },
  'Why the practices work at all': { name: 'Why the practices work', slug: 'why-practices-work' },
  'The origin story (the Seven Iterations)': { name: 'The Seven Iterations', slug: 'seven-iterations' },
  'Belief, language, and code as one category': { name: 'Belief, language, and code', slug: 'belief-language-code' },
  'Not self-help, not organization-building': { name: 'Not self-help', slug: 'not-self-help' },
  'The Standing Thirds': { slug: 'standing-thirds', cites: 'Pt.5 Ch.0–5', blurb: 'Patterns given faces. Five kinships, one per scale, no exceptions.' },
  'Weaving': { slug: 'weaving', blurb: 'Reading a situation from four distances. Progressive reveal is the core technique.' },
  'Going to Ground; conservation of mass; becoming a Third': [
    { name: 'Going to Ground', slug: 'going-to-ground', cites: 'Pt.5 Ch.7' },
    { name: 'Becoming a Third', slug: 'becoming-a-third', cites: 'Pt.5 Ch.8' },
  ],
  // Already a Standing Third; its citations fold into that figure.
  'The Infinite Boundary': { mergeInto: 'infinite-boundary' },
};

const SCALES = ['self', 'dyad', 'skein', 'culture', 'cosmos'];

// Proposed scale for index concepts. "every" means the book applies it at every scale.
const PROPOSED_SCALE = {
  'woven-self': 'self', 'naming-and-defusing': 'self', 'association-machine': 'self', 'capacity-to-steer': 'self',
  'atomic-composition': 'self', 'the-sacrifice-trap': 'self', 'creative-work-as-compost': 'self',
  'coasting-vs-accelerating': 'self', 'core-mantra': 'self', 'two-senses-of-real': 'self',
  'the-dyad': 'dyad', 'the-trust-triangle': 'dyad', 'interpersonal-complementarity': 'dyad',
  'solving-for-the-third-leg': 'dyad', 'mutuality-not-accounting': 'dyad',
  'the-skein': 'skein', 'the-banner': 'skein', 'company-you-keep': 'skein', 'fractal-resistance': 'skein',
  'beyond-telling': 'culture', 'belief-language-code': 'culture',
  'the-long-visitor': 'cosmos', 'drake-equation': 'cosmos',
  'the-braid': 'every', 'fusion-depth': 'every', 'the-two-pole-rule': 'every', 'local-rule-across-scales': 'every',
  'isomorphism': 'every', 'standing-thirds': 'every', 'weaving': 'every', 'weather-climate-terrain': 'every',
};

// Proposed lineage. `stemsFrom`: grows out of. `fusionOf`: made by combining.
// The Loop Tongue words are drawn from their own definitions ("Fold: a Local Rule returning
// to you after traveling through a Nest"). Standing Thirds lineage comes from the book.
const PROPOSED_LINEAGE = {
  'third-thing': { stemsFrom: ['loop'] },
  'global-form': { stemsFrom: ['local-rule'] },
  'nest': { stemsFrom: ['local-rule', 'global-form'] },
  'leverage': { stemsFrom: ['loop'] },
  'fold': { stemsFrom: ['local-rule', 'nest'] },
  'tree': { stemsFrom: ['loop'] },
  'core-mantra': { stemsFrom: ['loop', 'tree'] },
  'four-pillars': { fusionOf: ['loop', 'third-thing', 'nest', 'leverage'] },
  'two-questions': { fusionOf: ['complicated-vs-complex', 'position-speed-acceleration'] },
  'elegance': { stemsFrom: ['complicated-vs-complex'] },
  'woven-self': { stemsFrom: ['third-thing'] },
  'the-symphysical': { stemsFrom: ['third-thing'] },
  'emergence': { stemsFrom: ['third-thing'] },
  'emergence-vs-luck': { stemsFrom: ['emergence'] },
  'coasting-vs-accelerating': { stemsFrom: ['position-speed-acceleration'] },
  'solving-for-the-third-leg': { stemsFrom: ['fusion-depth'] },
  'mutuality-not-accounting': { stemsFrom: ['third-thing'] },
  'balance-is-a-wave': { stemsFrom: ['reinforcing-balancing'] },
  'isomorphism': { stemsFrom: ['nest'] },
  'distortion-scales-with-distance': { stemsFrom: ['fold'] },
  'fusion-depth': { stemsFrom: ['standing-thirds'] },
  'the-two-pole-rule': { stemsFrom: ['standing-thirds'] },
  'weather-climate-terrain': { stemsFrom: ['weaving', 'loop-period'] },
  'the-long-visitor': { stemsFrom: ['infinite-boundary'] },
  'the-fold-and-the-force': { stemsFrom: ['fold', 'infinite-boundary'] },
  'solidity': { stemsFrom: ['the-symphysical'] },
  'open-and-closed-boundaries': { stemsFrom: ['word-vs-label', 'elegance'] },
  'atomic-composition': { stemsFrom: ['woven-self', 'leverage'] },
  'two-senses-of-real': { stemsFrom: ['third-thing'] },
  'floral-electric-fields': { stemsFrom: ['the-symphysical', 'fold'] },
  'constraint-counting': { stemsFrom: ['leverage'] },
  'sign-flipping-couplings': { stemsFrom: ['emergence'] },
  'hornet-solar-cycle': { stemsFrom: ['reinforcing-balancing'] },
  'signed-loop-polarity': { stemsFrom: ['loop', 'reinforcing-balancing'] },
  'shared-edge-leverage': { stemsFrom: ['leverage'] },
  'drake-equation': { stemsFrom: ['local-rule', 'global-form'] },
  'local-rule-across-scales': { stemsFrom: ['local-rule', 'nest'] },
  'resonance': { stemsFrom: ['standing-thirds'] },
  'capacity-to-steer': { stemsFrom: ['association-machine'] },
  'loop-period': { stemsFrom: ['loop', 'position-speed-acceleration'] },
  'naming-and-defusing': { stemsFrom: ['woven-self', 'association-machine'] },
  'the-sacrifice-trap': { stemsFrom: ['position-speed-acceleration'] },
  'the-trust-triangle': { stemsFrom: ['the-dyad'] },
  'the-dyad': { stemsFrom: ['third-thing'] },
  'the-skein': { stemsFrom: ['third-thing'] },
  'the-banner': { stemsFrom: ['word-vs-label'] },
  'the-braid': { fusionOf: ['the-skein', 'the-banner'] },
  'company-you-keep': { stemsFrom: ['the-skein'] },
  'standing-thirds': { stemsFrom: ['third-thing'] },
  'weaving': { stemsFrom: ['standing-thirds'] },
  'going-to-ground': { stemsFrom: ['fold'] },
  'becoming-a-third': { stemsFrom: ['standing-thirds', 'going-to-ground'] },
};

// Terms of art that are safe to find in running text. Used to link a concept's first
// mention on the pages that cite it, and to report pages that use it without a citation.
const ALIASES = {
  'loop': 'Loop(?! Tongue)', 'third-thing': 'Third Thing', 'seed': 'Seed', 'local-rule': 'Local Rule',
  'global-form': 'Global Form', 'nest': 'Nest', 'leverage': 'Leverage', 'fold': 'Fold', 'tree': 'Tree',
  'the-braid': 'Braid', 'the-banner': 'Banner', 'the-trust-triangle': 'Trust Triangle',
  'the-sacrifice-trap': 'Sacrifice Trap', 'fractal-resistance': 'Fractal Resistance', 'woven-self': 'Woven Self',
  'standing-thirds': 'Standing Thirds', 'the-symphysical': 'symphysical', 'going-to-ground': 'Going to Ground',
  'becoming-a-third': 'Becoming a Third', 'the-long-visitor': 'Long Visitor', 'seven-iterations': 'Seven Iterations',
  'four-pillars': '[Ff]our [Pp]illars', 'beyond-telling': '[Bb]eyond [Tt]elling', 'creative-work-as-compost': 'Compost Heap',
  'naming-and-defusing': 'Naming and Defusing', 'emergence': 'emergence', 'elegance': '[Ee]legance',
  'weaving': 'Weaving', 'weather-climate-terrain': 'Weather, Climate,? (?:and )?Terrain',
  'infinite-boundary': 'Infinite Boundary',
};

// Single common words could match ordinary prose, so their uncited uses are only reported.
// Every other alias is a capitalized or multi-word term of art, and counts as a mention.
const REPORT_ONLY = new Set(['loop', 'seed', 'nest', 'fold', 'tree', 'leverage', 'emergence', 'elegance', 'weaving']);

// Reference pages list nearly everything by design; counting them would tie every concept to every other.
const HUB_PAGES = new Set(['the-loom', 'quick-reference']);

const slugifyName = (n) => n.toLowerCase().replace(/[“”"']/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const CITE = /Pt\.(\d)(?:\s+Ch\.([\d–\-]+(?:,\s*\d+(?:[–\-]\d+)?)*)|,\s*all chapters|\s+throughout)(\s*\([^)]*\))?|Appendix ([A-D])/g;

// Links the first mention of each concept a chapter holds to that concept's page. Only
// concepts the graph already places on the page are linked, so the text always agrees with
// the "Concepts on this page" panel. Headings, existing links, code, and HTML are left alone.
export function linkConcepts(body, page, graph) {
  const held = (graph.pageConcepts[page] ?? [])
    .map((s) => graph.concepts.find((c) => c.slug === s))
    .filter((c) => c?.aliases?.length)
    .map((c) => ({ c, re: new RegExp(c.aliases[0], 'g') }));
  if (!held.length) return body;
  const linked = new Set();
  const PROTECTED = /\[[^\]]*\]\([^)]*\)|`[^`]*`|<[^>]+>/g;

  return body.split('\n').map((line) => {
    if (/^\s*#/.test(line) || linked.size === held.length) return line;
    const guarded = [...line.matchAll(PROTECTED)].map((m) => [m.index, m.index + m[0].length]);
    const hits = [];
    for (const { c, re } of held) {
      if (linked.has(c.slug)) continue;
      re.lastIndex = 0;
      for (const m of line.matchAll(re)) {
        const [s, e] = [m.index, m.index + m[0].length];
        if (guarded.some(([a, b]) => s < b && e > a) || hits.some((h) => s < h.e && e > h.s)) continue;
        hits.push({ s, e, c });
        linked.add(c.slug);
        break;
      }
    }
    return hits.sort((a, b) => b.s - a.s).reduce((out, { s, e, c }) =>
      `${out.slice(0, s)}<a class="concept-link" href="${c.href}">${out.slice(s, e)}</a>${out.slice(e)}`, line);
  }).join('\n');
}

export function buildConcepts({ sections, NODES, figures }) {
  const problems = [];
  const report = { uncited: [], unresolved: [] };

  // ---- chapter lookup: "Pt.2 Ch.4" → node slug ----
  const byPartChapter = new Map();
  const byPart = new Map();
  for (const n of NODES) {
    const num = n.heading.match(/^(\d+|[A-D])\.\s/)?.[1];
    if (num) byPartChapter.set(`${n.part}:${num}`, n.slug);
    if (!byPart.has(n.part)) byPart.set(n.part, []);
    byPart.get(n.part).push(n.slug);
  }
  function resolve(text, where) {
    const out = [];
    for (const m of text.matchAll(CITE)) {
      if (m[4]) { const s = byPartChapter.get(`appendix:${m[4]}`); s ? out.push(s) : report.unresolved.push(`${where}: Appendix ${m[4]}`); continue; }
      const part = PART_KEYS[+m[1]];
      if (!m[2]) { out.push(...(byPart.get(part) ?? [])); continue; }
      for (const piece of m[2].split(',').map((p) => p.trim())) {
        const [a, b] = piece.split(/[–\-]/).map(Number);
        for (let ch = a; ch <= (Number.isNaN(b) || b === undefined ? a : b); ch++) {
          const s = byPartChapter.get(`${part}:${ch}`);
          s ? out.push(s) : report.unresolved.push(`${where}: Pt.${m[1]} Ch.${ch}`);
        }
      }
    }
    return out;
  }
  const clean = (text) => text.replace(CITE, '').replace(/\s*·\s*/g, ' ').replace(/\(\s*[;,\s]*\)/g, '')
    .replace(/\s+([.,;])/g, '$1').replace(/\s{2,}/g, ' ').trim().replace(/[.\s]+$/, '');
  const sentence = (text) => (text && !/[.!?]$/.test(text) ? `${text}.` : text);

  const loom = sections.get(LOOM) ?? '';
  const concepts = new Map();
  const add = (c) => {
    if (concepts.has(c.slug)) problems.push(`duplicate concept slug: ${c.slug}`);
    concepts.set(c.slug, { perScale: null, scale: null, blurb: '', ...c, appearsOn: new Set(c.appearsOn ?? []), mentionedIn: new Set() });
  };

  // ---- the nine words, and where each sits at every scale ----
  const words = loom.split('### The nine words')[1]?.split('###')[0] ?? '';
  for (const line of words.split('\n').filter((l) => l.startsWith('| **'))) {
    const [term, meaning, treated] = line.replace(/^\||\|$/g, '').split('|').map((c) => c.trim());
    const name = term.replace(/\*\*/g, '');
    add({ slug: slugifyName(name), name, kind: 'word', blurb: meaning, scale: 'every', appearsOn: resolve(treated, name) });
  }
  const grid = loom.split('### Every word at every scale')[1]?.split('**How to read the gaps')[0] ?? '';
  for (const line of grid.split('\n').filter((l) => l.startsWith('| **'))) {
    const cells = line.replace(/^\||\|$/g, '').split('|').map((c) => c.trim());
    const c = concepts.get(slugifyName(cells[0].replace(/\*\*/g, '')));
    if (!c) { problems.push(`scale grid row with no word: ${cells[0]}`); continue; }
    c.perScale = Object.fromEntries(SCALES.map((s, i) => {
      const cell = cells[i + 1] ?? '';
      const open = /\*open\*/.test(cell);
      resolve(cell, `${c.name} at ${s}`).forEach((p) => c.appearsOn.add(p));
      return [s, open ? null : clean(cell)];
    }));
  }

  // ---- the concept index ----
  const index = loom.split('### Concepts, and where to find them')[1] ?? '';
  const pending = [];
  for (const line of index.split('\n').filter((l) => l.startsWith('**'))) {
    const title = line.match(/^\*\*(.+?)\*\*/)[1];
    const rest = line.slice(title.length + 4).replace(/^\s*—\s*/, '');
    const ov = INDEX_OVERRIDES[title];
    if (ov?.mergeInto) { pending.push({ mergeInto: ov.mergeInto, cites: resolve(rest, title) }); continue; }
    const specs = Array.isArray(ov) ? ov : [ov ?? {}];
    for (const spec of specs) {
      const name = spec.name ?? title;
      const cites = resolve(spec.cites ?? rest, name);
      add({ slug: spec.slug ?? slugifyName(name), name, kind: 'idea', blurb: spec.blurb ?? clean(rest), appearsOn: cites });
    }
  }

  // ---- Standing Thirds ----
  const TURNING_NODE = { self: 'private-turnings', dyad: 'dyad-turnings', skein: 'skein-gatherings', culture: 'great-days', cosmos: 'the-long-visitor' };
  for (const f of figures) {
    const appears = [f.catalogue, TURNING_NODE[f.kinship]];
    if (f.drawable !== false) appears.push('the-deck');
    add({
      slug: f.slug, name: f.name, kind: 'figure', epithet: f.epithet, scale: f.kinship,
      blurb: f.blurb ?? (f.localRule ? `The Local Rule: ${f.localRule.charAt(0).toLowerCase()}${f.localRule.slice(1)}.`
        : f.parents.length ? `${[...new Set(f.parents)].join(' and ')}, fused.` : 'Every figure, aggregated and never averaged.'),
      appearsOn: appears.filter((s) => NODES.some((n) => n.slug === s)),
      fusionOf: f.parentSlugs,
    });
  }
  for (const p of pending) {
    const target = concepts.get(p.mergeInto);
    target ? p.cites.forEach((s) => target.appearsOn.add(s)) : problems.push(`merge target missing: ${p.mergeInto}`);
  }

  // ---- proposals: scale and lineage ----
  for (const [slug, scale] of Object.entries(PROPOSED_SCALE)) {
    const c = concepts.get(slug); c ? (c.scale = scale) : problems.push(`scale for unknown concept: ${slug}`);
  }
  for (const c of concepts.values()) { c.stemsFrom ??= []; c.fusionOf ??= []; }
  for (const [slug, { stemsFrom = [], fusionOf = [] }] of Object.entries(PROPOSED_LINEAGE)) {
    const c = concepts.get(slug);
    if (!c) { problems.push(`lineage for unknown concept: ${slug}`); continue; }
    for (const ref of [...stemsFrom, ...fusionOf]) if (!concepts.has(ref)) problems.push(`${slug} names unknown concept: ${ref}`);
    c.stemsFrom = stemsFrom; c.fusionOf = fusionOf;
  }

  // ---- figures appear wherever the text names them; flag uncited uses of other terms ----
  const bodies = new Map(NODES.map((n) => [n.slug, n.body ?? '']));
  for (const c of concepts.values()) {
    // Figure names are capitalised phrases ("the Spark", "Held Silence"), so matching them
    // case-sensitively finds the figure, not the everyday word. One-word names ("Escalation")
    // can't be told apart from a sentence opening, so they're left to their citations.
    const figureName = c.kind === 'figure' && c.name.includes(' ')
      ? `\\b${c.name.replace(/^The /, '[Tt]he ').replace(/[.*+?^${}()|\\]/g, (ch) => (ch === ' ' ? ch : `\\${ch}`))}\\b`
      : null;
    const pattern = figureName ?? (ALIASES[c.slug] ? `\\b(?:${ALIASES[c.slug]})\\b` : null);
    if (!pattern) continue;
    c.aliases = [pattern];
    const re = new RegExp(pattern);
    for (const [slug, body] of bodies) {
      if (HUB_PAGES.has(slug) || !re.test(body) || c.appearsOn.has(slug)) continue;
      if (!REPORT_ONLY.has(c.slug)) c.mentionedIn.add(slug);
      if (c.kind !== 'figure') report.uncited.push({ concept: c.name, page: slug });
    }
  }

  if (problems.length) throw new Error('Concept graph problems:\n' + problems.map((p) => `  - ${p}`).join('\n'));

  // ---- derived graph ----
  // `treatedIn` is what the book cites; `mentionedIn` is where the text uses the term anyway.
  const summaries = new Map(NODES.map((n) => [n.slug, n.summary]));
  const list = [...concepts.values()].map((c) => {
    const treatedIn = [...c.appearsOn].filter((s) => !HUB_PAGES.has(s));
    const mentionedIn = [...c.mentionedIn].filter((s) => !treatedIn.includes(s));
    const blurb = sentence(c.blurb || summaries.get(treatedIn[0]) || '');
    return { ...c, blurb, treatedIn, mentionedIn, appearsOn: [...treatedIn, ...mentionedIn] };
  });
  const pageConcepts = {};
  for (const c of list) for (const p of c.appearsOn) (pageConcepts[p] ??= []).push(c.slug);
  // A page shared by few concepts says more about how two concepts relate than a crowded one.
  const pageWeight = (p) => 1 / Math.log2(2 + (pageConcepts[p]?.length ?? 0));
  const conceptWeight = (c) => 1 / Math.log2(2 + c.appearsOn.length);
  const bySlug = new Map(list.map((c) => [c.slug, c]));

  for (const c of list) {
    const scores = new Map();
    for (const p of c.appearsOn) for (const other of pageConcepts[p]) {
      if (other === c.slug) continue;
      const s = scores.get(other) ?? { weight: 0, shared: [] };
      s.weight += pageWeight(p); s.shared.push(p); scores.set(other, s);
    }
    c.related = [...scores].sort((a, b) => b[1].weight - a[1].weight).slice(0, 12)
      .map(([slug, s]) => ({ slug, weight: +s.weight.toFixed(3), shared: s.shared }));
    c.growsInto = list.filter((o) => o.stemsFrom.includes(c.slug) || o.fusionOf.includes(c.slug)).map((o) => o.slug);
    c.href = c.kind === 'figure' ? `/thirds/${c.slug}/` : `/concept/${c.slug}/`;
  }

  const pageRelated = {};
  for (const [page, cs] of Object.entries(pageConcepts)) {
    const scores = new Map();
    for (const cs1 of cs) {
      const c = bySlug.get(cs1);
      for (const other of c.appearsOn) {
        if (other === page) continue;
        const s = scores.get(other) ?? { weight: 0, shared: [] };
        s.weight += conceptWeight(c); s.shared.push(cs1); scores.set(other, s);
      }
    }
    pageRelated[page] = [...scores].sort((a, b) => b[1].weight - a[1].weight).slice(0, 8)
      .map(([slug, s]) => ({ slug, weight: +s.weight.toFixed(3), shared: s.shared }));
  }

  return { concepts: list, pageConcepts, pageRelated, report };
}
