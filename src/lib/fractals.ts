// Deterministic generative fractal glyphs for the Standing Thirds.
// Each generator draws into a 200x200 viewBox and returns SVG inner markup.
// Seeded by the Third's slug, so every build renders the same figure.

type Rng = () => number;

function mulberry32(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashSeed(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

const f2 = (n: number) => n.toFixed(2);

interface BranchOpts {
  spread: number;      // angle between children (radians)
  bias: number;        // constant lean added each level
  jitter: number;      // random angle noise
  ratio: number;       // child length ratio
  children: number;    // branches per node
  depth: number;
  width: number;
}

function tree(rng: Rng, x: number, y: number, angle: number, len: number, o: BranchOpts, out: string[]) {
  if (o.depth <= 0 || len < 2) return;
  const x2 = x + Math.cos(angle) * len;
  const y2 = y + Math.sin(angle) * len;
  out.push(`<line x1="${f2(x)}" y1="${f2(y)}" x2="${f2(x2)}" y2="${f2(y2)}" stroke-width="${f2(Math.max(0.5, o.width))}" opacity="${f2(0.5 + 0.5 * (o.depth / 8))}"/>`);
  const n = o.children;
  for (let i = 0; i < n; i++) {
    const t = n === 1 ? 0 : i / (n - 1) - 0.5;
    const a = angle + t * o.spread + o.bias + (rng() - 0.5) * o.jitter;
    tree(rng, x2, y2, a, len * (o.ratio + (rng() - 0.5) * 0.06), { ...o, depth: o.depth - 1, width: o.width * 0.72 }, out);
  }
}

// ---- generators ----

function driftTree(rng: Rng): string[] {
  const out: string[] = [];
  tree(rng, 100, 195, -Math.PI / 2, 52, { spread: 1.5, bias: 0.12, jitter: 0.9, ratio: 0.68, children: 2, depth: 8, width: 2.6 }, out);
  return out;
}

function twinSpires(rng: Rng): string[] {
  const out: string[] = [];
  const seed = (rng() * 1e9) | 0;
  // The same pattern, arrived at twice, with no road between — identical seed, two places.
  for (const cx of [52, 148]) {
    const r = mulberry32(seed);
    tree(r, cx, 190, -Math.PI / 2, 44, { spread: 1.1, bias: 0, jitter: 0.25, ratio: 0.66, children: 2, depth: 7, width: 2.2 }, out);
  }
  out.push('<line x1="88" y1="196" x2="112" y2="196" stroke-width="0.8" opacity="0.25" stroke-dasharray="2 5"/>');
  return out;
}

function koch(x1: number, y1: number, x2: number, y2: number, depth: number, out: string[]) {
  if (depth === 0) {
    out.push(`<line x1="${f2(x1)}" y1="${f2(y1)}" x2="${f2(x2)}" y2="${f2(y2)}" stroke-width="1"/>`);
    return;
  }
  const dx = (x2 - x1) / 3, dy = (y2 - y1) / 3;
  const ax = x1 + dx, ay = y1 + dy;
  const bx = x1 + 2 * dx, by = y1 + 2 * dy;
  const px = ax + dx * 0.5 - dy * Math.sqrt(3) / 2;
  const py = ay + dy * 0.5 + dx * Math.sqrt(3) / 2;
  koch(x1, y1, ax, ay, depth - 1, out);
  koch(ax, ay, px, py, depth - 1, out);
  koch(px, py, bx, by, depth - 1, out);
  koch(bx, by, x2, y2, depth - 1, out);
}

function crystal(): string[] {
  const out: string[] = [];
  const cx = 100, cy = 108, r = 78;
  const pts = [0, 1, 2].map((i) => {
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / 3;
    return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
  });
  koch(pts[0][0], pts[0][1], pts[2][0], pts[2][1], 3, out);
  koch(pts[2][0], pts[2][1], pts[1][0], pts[1][1], 3, out);
  koch(pts[1][0], pts[1][1], pts[0][0], pts[0][1], 3, out);
  return out;
}

function flame(rng: Rng): string[] {
  const out: string[] = [];
  tree(rng, 100, 198, -Math.PI / 2, 58, { spread: 1.7, bias: 0, jitter: 0.55, ratio: 0.62, children: 3, depth: 6, width: 3 }, out);
  return out;
}

function delta(rng: Rng): string[] {
  const out: string[] = [];
  tree(rng, 100, 8, Math.PI / 2, 50, { spread: 1.35, bias: 0, jitter: 0.18, ratio: 0.7, children: 2, depth: 8, width: 2.6 }, out);
  out.push('<line x1="20" y1="196" x2="180" y2="196" stroke-width="1.2" opacity="0.4"/>');
  return out;
}

function windswept(rng: Rng): string[] {
  const out: string[] = [];
  tree(rng, 70, 196, -Math.PI / 2 + 0.25, 50, { spread: 1.0, bias: 0.26, jitter: 0.3, ratio: 0.7, children: 2, depth: 8, width: 2.6 }, out);
  for (let i = 0; i < 4; i++) {
    const y = 30 + rng() * 60;
    out.push(`<path d="M ${f2(110 + rng() * 20)} ${f2(y)} q 20 ${f2(-4 - rng() * 6)} 55 ${f2(-2 - rng() * 8)}" fill="none" stroke-width="0.8" opacity="0.35"/>`);
  }
  return out;
}

function fern(rng: Rng): string[] {
  // Barnsley fern via IFS, plotted as sparse strokes.
  let x = 0, y = 0;
  const pts: string[] = [];
  for (let i = 0; i < 1400; i++) {
    const r = rng();
    let nx: number, ny: number;
    if (r < 0.01) { nx = 0; ny = 0.16 * y; }
    else if (r < 0.86) { nx = 0.85 * x + 0.04 * y; ny = -0.04 * x + 0.85 * y + 1.6; }
    else if (r < 0.93) { nx = 0.2 * x - 0.26 * y; ny = 0.23 * x + 0.22 * y + 1.6; }
    else { nx = -0.15 * x + 0.28 * y; ny = 0.26 * x + 0.24 * y + 0.44; }
    x = nx; y = ny;
    if (i > 10) pts.push(`M${f2(100 + x * 34)} ${f2(198 - y * 19)}h0.9`);
  }
  return [`<path d="${pts.join('')}" stroke-width="0.9" opacity="0.8" fill="none"/>`];
}

function interweave(rng: Rng): string[] {
  const out: string[] = [];
  tree(rng, 10, 100, 0, 46, { spread: 1.5, bias: 0.05, jitter: 0.3, ratio: 0.68, children: 2, depth: 7, width: 2.4 }, out);
  tree(rng, 190, 100, Math.PI, 46, { spread: 1.5, bias: -0.05, jitter: 0.3, ratio: 0.68, children: 2, depth: 7, width: 2.4 }, out);
  return out;
}

function lattice(rng: Rng): string[] {
  const out: string[] = [];
  const diamond = (cx: number, cy: number, r: number, depth: number) => {
    out.push(`<path d="M ${f2(cx)} ${f2(cy - r)} L ${f2(cx + r)} ${f2(cy)} L ${f2(cx)} ${f2(cy + r)} L ${f2(cx - r)} ${f2(cy)} Z" fill="none" stroke-width="${f2(0.5 + depth * 0.4)}" opacity="${f2(0.35 + depth * 0.16)}"/>`);
    if (depth <= 0) return;
    // a joint is only trusted once tested: children connect at the tips, smaller each time
    for (const [dx, dy] of [[0, -r], [r, 0], [0, r], [-r, 0]]) {
      diamond(cx + dx * 1.42, cy + dy * 1.42, r * 0.42, depth - 1);
    }
  };
  diamond(100, 100, 46, 2);
  return out;
}

function ringOfCircles(cx: number, cy: number, r: number, n: number, depth: number, out: string[], phase = 0) {
  out.push(`<circle cx="${f2(cx)}" cy="${f2(cy)}" r="${f2(r)}" fill="none" stroke-width="${f2(0.5 + depth * 0.35)}" opacity="${f2(0.3 + depth * 0.18)}"/>`);
  if (depth <= 0) return;
  for (let i = 0; i < n; i++) {
    const a = phase + (i * 2 * Math.PI) / n;
    ringOfCircles(cx + Math.cos(a) * r, cy + Math.sin(a) * r, r * 0.38, n, depth - 1, out, a);
  }
}

function mandala(): string[] {
  const out: string[] = [];
  ringOfCircles(100, 100, 52, 6, 2, out);
  return out;
}

function hollowMandala(): string[] {
  const out: string[] = [];
  // the same shape, slightly off-center, rendered only in fragments — the outline of attention
  const g: string[] = [];
  ringOfCircles(106, 96, 52, 6, 2, g);
  out.push(`<g stroke-dasharray="5 7">${g.join('')}</g>`);
  out.push('<circle cx="100" cy="100" r="2" opacity="0.5"/>');
  return out;
}

function spiralBloom(rng: Rng): string[] {
  const out: string[] = [];
  const pts: string[] = [];
  let a = 0, r = 3;
  const cx = 100, cy = 105;
  let last = [cx + r, cy];
  while (r < 82) {
    a += 0.14; r *= 1.012;
    const x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r;
    pts.push(`M${f2(last[0])} ${f2(last[1])}L${f2(x)} ${f2(y)}`);
    last = [x, y];
    // each turn, the story grows a new embellishment — larger every time
    if (Math.abs((a % (Math.PI / 2))) < 0.14 && r > 14) {
      const bl = r * 0.28;
      const ba = a + Math.PI / 2 + (rng() - 0.5) * 0.4;
      tree(rng, x, y, ba, bl, { spread: 1.2, bias: 0.1, jitter: 0.4, ratio: 0.6, children: 2, depth: 3, width: 1 }, out);
    }
  }
  out.push(`<path d="${pts.join('')}" fill="none" stroke-width="1.4" opacity="0.8"/>`);
  return out;
}

function chain(rng: Rng): string[] {
  // the same motif, handed down faithfully — each generation smaller, none distorted
  const out: string[] = [];
  const seed = (rng() * 1e9) | 0;
  let x = 26, size = 60;
  for (let i = 0; i < 4; i++) {
    const r = mulberry32(seed);
    tree(r, x, 130 + i * 18, -Math.PI / 2, size * 0.55, { spread: 1.2, bias: 0, jitter: 0.2, ratio: 0.64, children: 2, depth: 6, width: 2 }, out);
    x += size * 0.95;
    size *= 0.62;
  }
  out.push('<line x1="20" y1="196" x2="180" y2="196" stroke-width="0.8" opacity="0.3"/>');
  return out;
}

function ridgeLine(rng: Rng, y: number, rough: number, opacity: number, out: string[]) {
  let pts: [number, number][] = [[0, y], [200, y + (rng() - 0.5) * 20]];
  for (let it = 0; it < 6; it++) {
    const next: [number, number][] = [];
    for (let i = 0; i < pts.length - 1; i++) {
      const [x1, y1] = pts[i], [x2, y2] = pts[i + 1];
      next.push([x1, y1]);
      next.push([(x1 + x2) / 2, (y1 + y2) / 2 + (rng() - 0.5) * rough]);
    }
    next.push(pts[pts.length - 1]);
    pts = next;
    rough *= 0.55;
  }
  out.push(`<path d="M${pts.map(([x, yy]) => `${f2(x)} ${f2(yy)}`).join('L')}" fill="none" stroke-width="1.1" opacity="${f2(opacity)}"/>`);
}

function ridge(rng: Rng): string[] {
  const out: string[] = [];
  ridgeLine(rng, 70, 70, 0.85, out);
  ridgeLine(rng, 105, 52, 0.55, out);
  ridgeLine(rng, 140, 40, 0.3, out);
  return out;
}

function carpet(): string[] {
  // Sierpinski carpet drawn as its holes — the silences are the structure
  const out: string[] = [];
  const hole = (x: number, y: number, s: number, depth: number) => {
    const t = s / 3;
    out.push(`<rect x="${f2(x + t)}" y="${f2(y + t)}" width="${f2(t)}" height="${f2(t)}" opacity="${f2(0.25 + depth * 0.25)}"/>`);
    if (depth <= 0) return;
    for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) {
      if (i === 1 && j === 1) continue;
      hole(x + i * t, y + j * t, t, depth - 1);
    }
  };
  out.push('<rect x="19" y="19" width="162" height="162" fill="none" stroke-width="1" opacity="0.5"/>');
  hole(19, 19, 162, 2);
  return out;
}

function chorus(rng: Rng): string[] {
  // no single body: many small voices, each a tiny starburst, all pulled
  // toward one shared arc that speaks for all of them at once.
  const out: string[] = [];
  const n = 9;
  const voices: [number, number][] = [];
  for (let i = 0; i < n; i++) {
    const x = 22 + rng() * 156;
    const y = 120 + rng() * 62;
    voices.push([x, y]);
    const rays = 5 + Math.floor(rng() * 3);
    const r0 = 3 + rng() * 2;
    for (let k = 0; k < rays; k++) {
      const a = (k / rays) * Math.PI * 2 + rng() * 0.4;
      const r1 = r0 + 2 + rng() * 2;
      out.push(`<line x1="${f2(x + Math.cos(a) * r0)}" y1="${f2(y + Math.sin(a) * r0)}" x2="${f2(x + Math.cos(a) * r1)}" y2="${f2(y + Math.sin(a) * r1)}" stroke-width="0.9" opacity="0.7"/>`);
    }
  }
  // the shared "we": one arc every voice is quietly pulled toward
  out.push('<path d="M 20 58 Q 100 22 180 58" fill="none" stroke-width="1.6" opacity="0.9"/>');
  for (const [x, y] of voices) {
    const t = (x - 20) / 160;
    const ax = 20 + t * 160;
    const ay = 58 - Math.sin(t * Math.PI) * 36;
    out.push(`<line x1="${f2(x)}" y1="${f2(y)}" x2="${f2(ax)}" y2="${f2(ay)}" stroke-width="0.5" opacity="0.22" stroke-dasharray="1 4"/>`);
  }
  return out;
}

function boundary(): string[] {
  // the one deliberately non-fractal glyph: no branching, no repetition,
  // nothing left outside the totality for a name to compress away.
  const out: string[] = [];
  out.push('<circle cx="100" cy="100" r="84" fill="none" stroke-width="1.6" opacity="0.85"/>');
  out.push('<circle cx="100" cy="100" r="72" fill="none" stroke-width="0.6" opacity="0.28" stroke-dasharray="1 6"/>');
  out.push('<circle cx="100" cy="100" r="1.6" opacity="0.9"/>');
  return out;
}

const GENERATORS: Record<string, (rng: Rng) => string[]> = {
  driftTree, twinSpires, crystal: () => crystal(), flame, delta, windswept, fern,
  interweave, lattice, mandala: () => mandala(), hollowMandala: () => hollowMandala(),
  spiralBloom, chain, ridge, carpet: () => carpet(), chorus, boundary: () => boundary(),
};

export const HUES: Record<string, string> = {
  fire: 'var(--k-fire)',
  water: 'var(--k-water)',
  wind: 'var(--k-wind)',
  earth: 'var(--k-earth)',
  dyad: 'var(--k-dyad)',
  skein: 'var(--k-skein)',
  culture: 'var(--k-culture)',
  cosmos: 'var(--k-cosmos)',
};

export function fractalSvg(type: string, hue: string, seedKey: string): string {
  const gen = GENERATORS[type];
  const rng = mulberry32(hashSeed(seedKey));
  const body = gen ? gen(rng).join('') : '';
  const color = HUES[hue] ?? 'currentColor';
  return `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" role="img"><g stroke="${color}" fill="${color}" stroke-linecap="round">${body}</g></svg>`;
}
