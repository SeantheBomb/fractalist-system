// Builds the map's nested galaxy from the concept graph.
//
// Every body has one home orbit: a cluster, inside a topic, around a single core. Concepts
// and pages are peers, grouped by which pages hold which concepts and by lineage, with each
// level clustered inside its parent. Standing Thirds are placed by what they personify
// rather than by their catalogue pages: the twelve Self-Kin are linked to an idea by hand,
// and every fused figure inherits its home from its ancestors — sitting between two topics
// when its ancestry is split across them.

// The reader's own knowledge is the center everything else orbits.
const CORE_PAGE = 'what-you-already-know';
const CORE_COMPANIONS = ['infinite-boundary'];

// Proposed: the idea each Self-Kin figure personifies. Meant to move into the book.
export const SELF_KIN_PERSONIFIES = {
  'the-spark': 'reinforcing-balancing',
  'the-tide': 'balance-is-a-wave',
  'the-mark': 'open-and-closed-boundaries',
  'the-salve': 'leverage',
  'the-nearest-light': 'association-machine',
  'the-keepsake': 'woven-self',
  'the-easier-door': 'complicated-vs-complex',
  'the-mask': 'naming-and-defusing',
  'the-mirror': 'company-you-keep',
  'the-namer': 'word-vs-label',
  'the-riverbed': 'creative-work-as-compost',
  'the-gardener': 'seed',
};

// Proposed top-level topic names. A computed topic takes the name of the highest-ranked key
// concept it contains, so a name survives the clustering reshuffling around it.
export const TOPIC_NAMES = [
  ['woven-self', 'The Woven Self'],
  ['position-speed-acceleration', 'Motion and Leverage'],
  ['leverage', 'Leverage'],
  ['the-braid', 'Community and Name'],
  ['the-symphysical', 'What Is Real'],
  ['weaving', 'Weaving'],
  ['standing-thirds', 'The Standing Thirds'],
  ['local-rule', 'Local Rule and the Nest'],
  ['loop', 'The Loop'],
  ['third-thing', 'The Third Thing'],
  ['reinforcing-balancing', 'Rhythm'],
  ['the-dyad', 'The Dyad'],
  ['why-practices-work', 'Why It Works'],
];

// Pages that list nearly everything, or nothing, aren't placed.
const EXCLUDED_PAGES = new Set(['the-loom', 'quick-reference']);

// Tuned by reading the result: coarser splits merged unrelated practices, finer ones scattered them.
export const OPTS = { TOPIC_RES: 1.0, CLUSTER_RES: 1.4, MAX_TOPIC_SHARE: 0.25, MIN_TOPIC: 8 };
const TOPIC_RES = () => OPTS.TOPIC_RES;
const CLUSTER_RES = () => OPTS.CLUSTER_RES;
const MAX_TOPIC_SHARE = () => OPTS.MAX_TOPIC_SHARE;
const MIN_TOPIC = () => OPTS.MIN_TOPIC;

function louvain(ids, edges, resolution) {
  let nodes = ids.slice();
  let links = edges.map((e) => e.slice());
  const levels = [];
  for (let level = 0; level < 10; level++) {
    const adj = new Map(nodes.map((n) => [n, new Map()]));
    for (const [a, b, w] of links) {
      if (a === b) { adj.get(a).set(a, (adj.get(a).get(a) ?? 0) + 2 * w); continue; }
      adj.get(a).set(b, (adj.get(a).get(b) ?? 0) + w);
      adj.get(b).set(a, (adj.get(b).get(a) ?? 0) + w);
    }
    const degree = new Map();
    let m2 = 0;
    for (const n of nodes) { let d = 0; for (const w of adj.get(n).values()) d += w; degree.set(n, d); m2 += d; }
    if (!m2) break;
    const comm = new Map(nodes.map((n) => [n, n]));
    const total = new Map(nodes.map((n) => [n, degree.get(n)]));
    let moved = false;
    for (let pass = 0, improved = true; improved && pass < 40; pass++) {
      improved = false;
      for (const n of nodes) {
        const d = degree.get(n), from = comm.get(n);
        total.set(from, total.get(from) - d);
        const toward = new Map();
        for (const [nb, w] of adj.get(n)) { if (nb !== n) toward.set(comm.get(nb), (toward.get(comm.get(nb)) ?? 0) + w); }
        const gain = (c) => (toward.get(c) ?? 0) - (resolution * d * (total.get(c) ?? 0)) / m2;
        let best = from, bestGain = gain(from);
        for (const c of toward.keys()) { const g = gain(c); if (g > bestGain + 1e-9) { bestGain = g; best = c; } }
        total.set(best, (total.get(best) ?? 0) + d);
        if (best !== from) { comm.set(n, best); improved = true; moved = true; }
      }
    }
    levels.push(new Map(comm));
    const communities = new Set(comm.values());
    if (!moved || communities.size === nodes.length) break;
    const merged = new Map();
    for (const [a, b, w] of links) {
      const ca = comm.get(a), cb = comm.get(b);
      const key = ca <= cb ? `${ca}|${cb}` : `${cb}|${ca}`;
      merged.set(key, (merged.get(key) ?? 0) + w);
    }
    nodes = [...communities];
    links = [...merged].map(([k, w]) => [...k.split('|'), w]);
  }
  const groups = new Map();
  for (const id of ids) {
    let c = id;
    for (const l of levels) c = l.get(c) ?? c;
    if (!groups.has(c)) groups.set(c, []);
    groups.get(c).push(id);
  }
  return [...groups.values()].sort((a, b) => b.length - a.length || a[0].localeCompare(b[0]));
}

export function buildGalaxy({ concepts, pageTitles, pageSummaries }) {
  const bySlug = new Map(concepts.map((c) => [c.slug, c]));
  const figures = concepts.filter((c) => c.kind === 'figure');
  const ideas = concepts.filter((c) => c.kind !== 'figure');
  const cid = (s) => `c:${s}`;
  const pid = (s) => `p:${s}`;

  // ---- peers and their links, figures aside ----
  const edges = [];
  const pagesWithIdeas = new Set();
  for (const c of ideas) {
    for (const p of c.treatedIn) if (!EXCLUDED_PAGES.has(p) && p !== CORE_PAGE) { edges.push([cid(c.slug), pid(p), 1]); pagesWithIdeas.add(p); }
    for (const p of c.mentionedIn) if (!EXCLUDED_PAGES.has(p) && p !== CORE_PAGE) { edges.push([cid(c.slug), pid(p), 0.4]); pagesWithIdeas.add(p); }
    for (const parent of [...c.stemsFrom, ...c.fusionOf]) if (bySlug.get(parent)?.kind !== 'figure') edges.push([cid(c.slug), cid(parent), 1.5]);
  }
  const peers = [...ideas.map((c) => cid(c.slug)), ...[...pagesWithIdeas].sort().map(pid)];
  const weight = new Map(peers.map((p) => [p, 0]));
  for (const [a, b, w] of edges) { weight.set(a, weight.get(a) + w); weight.set(b, weight.get(b) + w); }
  const inside = (set) => edges.filter(([a, b]) => set.has(a) && set.has(b));

  // ---- topics, balanced ----
  let topics = louvain(peers, edges, TOPIC_RES());
  const tooBig = peers.length * MAX_TOPIC_SHARE();
  topics = topics.flatMap((t) => (t.length > tooBig ? louvain(t, inside(new Set(t)), CLUSTER_RES()) : [t]));
  for (;;) {
    topics.sort((a, b) => b.length - a.length);
    const small = topics.findIndex((t) => t.length < MIN_TOPIC());
    if (small < 0 || topics.length <= 1) break;
    const [lonely] = topics.splice(small, 1);
    const members = new Set(lonely);
    const pull = topics.map((t) => {
      const set = new Set(t);
      return edges.reduce((s, [a, b, w]) => s + ((members.has(a) && set.has(b)) || (members.has(b) && set.has(a)) ? w : 0), 0);
    });
    const target = pull.indexOf(Math.max(...pull));
    topics[target] = topics[target].concat(lonely);
  }

  const anchorOf = (ids) => ids.filter((i) => i.startsWith('c:')).sort((a, b) => weight.get(b) - weight.get(a))[0] ?? ids[0];
  const nameOf = (id) => (id.startsWith('c:') ? bySlug.get(id.slice(2)).name : pageTitles[id.slice(2)]);

  const usedNames = new Set();
  const topicList = topics.map((members, i) => {
    const set = new Set(members);
    const named = TOPIC_NAMES.find(([key, name]) => set.has(cid(key)) && !usedNames.has(name));
    if (named) usedNames.add(named[1]);
    const clusters = louvain(members, inside(set), CLUSTER_RES()).map((m, j) => ({
      id: `t${i}c${j}`, name: nameOf(anchorOf(m)), anchor: anchorOf(m), bodies: m,
    }));
    return { id: `t${i}`, name: named ? named[1] : nameOf(anchorOf(members)), named: !!named, anchor: anchorOf(members), clusters };
  });

  const homeOf = new Map();
  for (const t of topicList) for (const c of t.clusters) for (const b of c.bodies) homeOf.set(b, { topic: t.id, cluster: c.id });

  // ---- Standing Thirds: home by what they personify ----
  const ancestorsOf = (slug, seen = []) => {
    const f = bySlug.get(slug);
    if (SELF_KIN_PERSONIFIES[slug]) return [slug];
    return (f?.fusionOf ?? []).flatMap((p) => ancestorsOf(p, seen));
  };
  const problems = [];
  const bridges = [];
  for (const f of figures) {
    if (CORE_COMPANIONS.includes(f.slug)) continue;
    const homes = ancestorsOf(f.slug).map((s) => homeOf.get(cid(SELF_KIN_PERSONIFIES[s])));
    if (!homes.length || homes.some((h) => !h)) { problems.push(`${f.slug}: no home through its ancestry`); continue; }
    const byTopic = new Map();
    for (const h of homes) byTopic.set(h.topic, (byTopic.get(h.topic) ?? []).concat(h));
    const ranked = [...byTopic].sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]));
    const clusterIn = (hs) => {
      const count = new Map();
      for (const h of hs) count.set(h.cluster, (count.get(h.cluster) ?? 0) + 1);
      return [...count].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0][0];
    };
    const id = cid(f.slug);
    if (ranked.length === 1) {
      const home = { topic: ranked[0][0], cluster: clusterIn(ranked[0][1]) };
      homeOf.set(id, home);
      topicList.find((t) => t.id === home.topic).clusters.find((c) => c.id === home.cluster).bodies.push(id);
    } else {
      bridges.push({ id, between: [ranked[0][0], ranked[1][0]], clusters: [clusterIn(ranked[0][1]), clusterIn(ranked[1][1])] });
    }
  }
  if (problems.length) throw new Error('Galaxy problems:\n' + problems.map((p) => `  - ${p}`).join('\n'));

  // ---- bodies ----
  const bodies = {};
  const describe = (id) => {
    if (id.startsWith('p:')) {
      const s = id.slice(2);
      return { kind: 'page', title: pageTitles[s], href: `/node/${s}/`, blurb: pageSummaries[s] ?? '' };
    }
    const c = bySlug.get(id.slice(2));
    return { kind: c.kind, title: c.name, href: c.href, blurb: c.blurb, scale: c.scale };
  };
  for (const [id, home] of homeOf) bodies[id] = { ...describe(id), ...home, weight: +(weight.get(id) ?? 1).toFixed(2) };
  for (const b of bridges) bodies[b.id] = { ...describe(b.id), bridge: b.between, bridgeClusters: b.clusters, weight: 2 };
  const core = { id: pid(CORE_PAGE), ...describe(pid(CORE_PAGE)), companions: CORE_COMPANIONS.map((s) => ({ id: cid(s), ...describe(cid(s)) })) };

  // ---- dyads: pairs that share something, inside one cluster ----
  const dyads = [];
  const seen = new Set();
  const addDyad = (a, b, kind) => {
    const ha = homeOf.get(a), hb = homeOf.get(b);
    if (!ha || !hb || ha.cluster !== hb.cluster) return;
    const key = a < b ? `${a}|${b}` : `${b}|${a}`;
    if (seen.has(key)) return;
    seen.add(key);
    dyads.push([a, b, kind]);
  };
  for (const c of ideas) {
    for (const p of c.treatedIn) addDyad(cid(c.slug), pid(p), 'treats');
    for (const p of c.mentionedIn) addDyad(cid(c.slug), pid(p), 'mentions');
    for (const p of c.stemsFrom) addDyad(cid(c.slug), cid(p), 'stems');
    for (const p of c.fusionOf) addDyad(cid(c.slug), cid(p), 'fuses');
  }
  for (const f of figures) for (const p of new Set(f.fusionOf)) addDyad(cid(f.slug), cid(p), 'fuses');
  for (const [s, idea] of Object.entries(SELF_KIN_PERSONIFIES)) addDyad(cid(s), cid(idea), 'personifies');

  return {
    core,
    topics: topicList.map(({ id, name, anchor, clusters }) => ({ id, name, anchor, clusters })),
    bodies,
    bridges: bridges.map((b) => b.id),
    dyads,
  };
}
