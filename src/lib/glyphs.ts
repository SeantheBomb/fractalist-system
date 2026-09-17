// Standing Thirds glyphs as iterated function systems.
// Each Self-Kin figure is a classic fractal whose rule enacts its Local Rule. Every figure
// above that tier is bred from its parents' *rules*, not their drawings: Dyad-Kin by union,
// Skein-Kin by thinned union, Culture-Kin by morph. Rendered client-side as a density plot.

import graph from '../data/thirds-graph.json';

type Map6 = [number, number, number, number, number, number, number]; // a b c d e f p
type Graph = Record<string, { kinship: string; parents: string[] }>;

const rs = (s: number, th: number, e: number, f: number, p: number): Map6 =>
  [Math.cos(th) * s, -Math.sin(th) * s, Math.sin(th) * s, Math.cos(th) * s, e, f, p];
const sc = (s: number, e: number, f: number, p: number): Map6 => [s, 0, 0, s, e, f, p];

export interface SelfGlyph { hue: string; family: string; why: string; maps: Map6[] }

export const SELF_GLYPHS: Record<string, SelfGlyph> = {
  'the-spark': { hue: 'fire', family: 'Golden spiral', why: 'Each turn feeds the next at a fixed ratio — compounding, drawn.',
    maps: [rs(0.88, 0.35, 0, 0, 0.82), rs(0.3, 0, 1, 0, 0.18)] },
  'the-tide': { hue: 'water', family: 'Vicsek cross', why: 'Every arm returns to the same center.',
    maps: [[0, 0], [-2 / 3, 0], [2 / 3, 0], [0, -2 / 3], [0, 2 / 3]].map(([e, f]) => sc(1 / 3, e, f, 0.2)) },
  'the-mark': { hue: 'wind', family: 'Koch curve', why: 'Its length depends entirely on the yardstick you measure it with.',
    maps: [rs(1 / 3, 0, 0, 0, 0.25), rs(1 / 3, Math.PI / 3, 1 / 3, 0, 0.25), rs(1 / 3, -Math.PI / 3, 0.5, Math.sqrt(3) / 6, 0.25), rs(1 / 3, 0, 2 / 3, 0, 0.25)] },
  'the-salve': { hue: 'wind', family: 'Sierpinski carpet', why: 'Remove the middle and the hole recurs at every scale.',
    maps: [0, 1, 2].flatMap((i) => [0, 1, 2].filter((j) => !(i === 1 && j === 1)).map((j) => sc(1 / 3, i / 3, j / 3, 1 / 8))) },
  'the-nearest-light': { hue: 'wind', family: 'Sierpinski triangle', why: 'Drawn by the chaos game: the first dots are noise, and only frequency reveals the form.',
    maps: [sc(0.5, 0, 0, 1 / 3), sc(0.5, 0.5, 0, 1 / 3), sc(0.5, 0.25, Math.sqrt(3) / 4, 1 / 3)] },
  'the-keepsake': { hue: 'water', family: 'Cantor dust', why: 'Keep the ends, discard the middle, and repeat.',
    maps: [[0, 0], [2 / 3, 0], [0, 2 / 3], [2 / 3, 2 / 3]].map(([e, f]) => sc(1 / 3, e, f, 0.25)) },
  'the-easier-door': { hue: 'fire', family: 'Heighway dragon', why: 'The hardest shape here, built from the easiest question: fold it in half.',
    maps: [[0.5, -0.5, 0.5, 0.5, 0, 0, 0.5], [-0.5, -0.5, 0.5, -0.5, 1, 0, 0.5]] },
  'the-mask': { hue: 'earth', family: 'Pentaflake', why: 'A self made entirely of copies of its own outline.',
    maps: (() => {
      const r = (3 - Math.sqrt(5)) / 2;
      return [...[0, 1, 2, 3, 4].map((k) => { const a = Math.PI / 2 + (k * 2 * Math.PI) / 5; return sc(r, (1 - r) * Math.cos(a), (1 - r) * Math.sin(a), 1 / 6); }), rs(r, Math.PI / 5, 0, 0, 1 / 6)];
    })() },
  'the-mirror': { hue: 'water', family: 'Mirror kaleidoscope', why: 'An asymmetric rule, given its whole shape by the mirrors around it.',
    maps: (() => {
      const [a, b, c, d, e, f] = rs(0.46, 0.4, 0.5, 0.5, 0);
      return [[a, b, c, d, e, f, 0.25], [-a, -b, c, d, -e, f, 0.25], [a, b, -c, -d, e, -f, 0.25], [-a, -b, -c, -d, -e, -f, 0.25]] as Map6[];
    })() },
  'the-namer': { hue: 'fire', family: 'Lévy C curve', why: 'The classic L-system: a sentence rewritten until it becomes a shape.',
    maps: [[0.5, 0.5, -0.5, 0.5, 0, 0, 0.5], [0.5, -0.5, 0.5, 0.5, 0.5, -0.5, 0.5]] },
  'the-riverbed': { hue: 'earth', family: 'Barnsley fern', why: 'Change the odds on four rules and the whole fern changes.',
    maps: [[0, 0, 0, 0.16, 0, 0, 0.01], [0.85, 0.04, -0.04, 0.85, 0, 1.6, 0.85], [0.2, -0.26, 0.23, 0.22, 0, 1.6, 0.07], [-0.15, 0.28, 0.26, 0.24, 0, 0.44, 0.07]] },
  'the-gardener': { hue: 'earth', family: 'Gosper island', why: 'Seven copies of itself that fill the whole room, brightest where attention lands.',
    maps: (() => {
      const s = 1 / Math.sqrt(7), th = Math.atan(Math.sqrt(3) / 5), d = Math.sqrt(3) / Math.sqrt(7);
      return [rs(s, th, 0, 0, 0.4), ...[0, 1, 2, 3, 4, 5].map((k) => rs(s, th, d * Math.cos(th + (k * Math.PI) / 3), d * Math.sin(th + (k * Math.PI) / 3), 0.1))];
    })() },
};

const METHOD: Record<string, 'union' | 'thin' | 'morph'> = { dyad: 'union', skein: 'thin', culture: 'morph' };

export function glyphHue(slug: string): string {
  const g = graph as Graph;
  const kin = g[slug]?.kinship;
  return kin === 'self' ? `var(--k-${SELF_GLYPHS[slug]?.hue ?? 'earth'})` : `var(--k-${kin})`;
}

// ---- math ----
function rng(seed: number) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
function hash(s: string) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
const det = (m: Map6) => Math.abs(m[0] * m[3] - m[1] * m[2]);
const normP = (maps: Map6[]): Map6[] => { const t = maps.reduce((s, m) => s + m[6], 0) || 1; return maps.map((m) => [m[0], m[1], m[2], m[3], m[4], m[5], m[6] / t]); };

function iterate(maps: Map6[], n: number, r: () => number, visit: (x: number, y: number) => void) {
  const cum: number[] = []; let acc = 0;
  for (const m of maps) { acc += m[6]; cum.push(acc); }
  let x = 0, y = 0;
  for (let i = 0; i < n; i++) {
    const u = r() * acc; let k = 0;
    while (k < cum.length - 1 && u > cum[k]) k++;
    const m = maps[k]; const nx = m[0] * x + m[1] * y + m[4]; y = m[2] * x + m[3] * y + m[5]; x = nx;
    if (i > 24) visit(x, y);
  }
}

// Fit the attractor into [-1, 1] so parents share one frame; a uniform-scale conjugation
// keeps each rule's linear part and only moves its translation.
function normalize(maps: Map6[]): Map6[] {
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  iterate(maps, 6000, rng(7), (x, y) => { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; });
  const span = Math.max(x1 - x0, y1 - y0);
  if (!(span > 1e-9)) return normP(maps);
  const s = 2 / span, cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
  return normP(maps.map(([a, b, c, d, e, f, p]) => [a, b, c, d, s * (a * cx + b * cy + e - cx), s * (c * cx + d * cy + f - cy), p]));
}

// One radian isn't a symmetry of any Self-Kin glyph (they repeat at 60°, 72°, 90°, 120°, 180°),
// so a figure fused with itself can never collapse back into its parent.
function turn(maps: Map6[], th = 1): Map6[] {
  const C = Math.cos(th), S = Math.sin(th);
  return maps.map(([a, b, c, d, e, f, p]) => {
    const a1 = C * a - S * c, b1 = C * b - S * d, c1 = S * a + C * c, d1 = S * b + C * d;
    return [a1 * C - b1 * S, a1 * S + b1 * C, c1 * C - d1 * S, c1 * S + d1 * C, C * e - S * f, S * e + C * f, p];
  });
}

function fuse(A: Map6[], B: Map6[], method: 'union' | 'thin' | 'morph'): Map6[] {
  if (method === 'morph') {
    const sa = [...A].sort((m, n) => det(n) - det(m)), sb = [...B].sort((m, n) => det(n) - det(m));
    return normalize(Array.from({ length: Math.max(sa.length, sb.length) }, (_, i) =>
      sa[i % sa.length].map((v, j) => (v + sb[i % sb.length][j]) / 2) as Map6));
  }
  let maps: Map6[] = [...A, ...B].map((m) => [m[0], m[1], m[2], m[3], m[4], m[5], m[6] / 2]);
  if (method === 'thin') {
    const S = maps.reduce((s, m) => s + det(m), 0), target = 0.82;
    if (S > target) { const k = Math.sqrt(target / S); maps = maps.map(([a, b, c, d, e, f, p]) => [a * k, b * k, c * k, d * k, e, f, p]); }
  }
  return normalize(maps);
}

const memo: Record<string, Map6[] | null> = {};
function system(slug: string): Map6[] | null {
  if (slug in memo) return memo[slug];
  const node = (graph as Graph)[slug];
  let result: Map6[] | null = null;
  if (node?.kinship === 'self' && SELF_GLYPHS[slug]) {
    result = normalize(normP(SELF_GLYPHS[slug].maps));
  } else if (node && METHOD[node.kinship] && node.parents.length === 2) {
    const [pa, pb] = node.parents;
    const A = system(pa); let B = system(pb);
    if (A && B) {
      if (pa === pb) B = normalize(turn(B));
      result = fuse(A, B, METHOD[node.kinship]);
    }
  }
  return (memo[slug] = result);
}

// ---- rendering ----
function draw(canvas: HTMLCanvasElement) {
  const slug = canvas.dataset.slug!;
  const maps = system(slug);
  if (!maps) return;
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const W = Math.max(40, Math.round((canvas.clientWidth || 200) * dpr));
  canvas.width = W; canvas.height = W;
  const seed = hash(slug);
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  iterate(maps, 3000, rng(seed ^ 99), (x, y) => { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; });
  const span = Math.max(x1 - x0, y1 - y0) || 1, pad = W * 0.08, size = W - 2 * pad;
  const ox = pad + (size - ((x1 - x0) / span) * size) / 2, oy = pad + (size - ((y1 - y0) / span) * size) / 2;
  const grid = new Float32Array(W * W); let max = 0;
  const n = Math.min(90000, Math.max(8000, W * W * 0.5));
  iterate(maps, n, rng(seed), (x, y) => {
    const px = (ox + ((x - x0) / span) * size) | 0, py = (W - 1 - (oy + ((y - y0) / span) * size)) | 0;
    if (px >= 0 && py >= 0 && px < W && py < W) { const v = ++grid[py * W + px]; if (v > max) max = v; }
  });
  const hex = getComputedStyle(canvas).getPropertyValue('--hue').trim() || '#6b7062';
  const R = parseInt(hex.slice(1, 3), 16), G = parseInt(hex.slice(3, 5), 16), B = parseInt(hex.slice(5, 7), 16);
  const ctx = canvas.getContext('2d')!, img = ctx.createImageData(W, W), L = Math.log1p(Math.max(1, max * 0.5));
  for (let i = 0; i < grid.length; i++) {
    if (!grid[i]) continue;
    const a = Math.min(1, Math.pow(Math.log1p(grid[i]) / L, 0.7));
    img.data[i * 4] = R; img.data[i * 4 + 1] = G; img.data[i * 4 + 2] = B; img.data[i * 4 + 3] = 40 + a * 215;
  }
  ctx.putImageData(img, 0, 0);
}

// Glyphs draw when they scroll into view. Weaving pages clone hidden cards, and a cloned
// canvas carries no pixels, so newly added canvases are picked up too.
export function initGlyphs() {
  const drawn = new WeakSet<HTMLCanvasElement>();
  const queue: HTMLCanvasElement[] = [];
  let pumping = false;
  const pump = () => {
    if (pumping) return; pumping = true;
    const step = () => {
      const t0 = performance.now();
      while (queue.length && performance.now() - t0 < 12) { const c = queue.shift()!; draw(c); drawn.add(c); }
      if (queue.length) requestAnimationFrame(step); else pumping = false;
    };
    requestAnimationFrame(step);
  };
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      const c = e.target as HTMLCanvasElement;
      if (e.isIntersecting && !drawn.has(c) && !queue.includes(c)) { queue.push(c); io.unobserve(c); }
    }
    pump();
  }, { rootMargin: '200px' });
  const watch = (root: ParentNode) => root.querySelectorAll<HTMLCanvasElement>('canvas.glyph').forEach((c) => { if (!drawn.has(c)) io.observe(c); });
  watch(document);
  new MutationObserver((muts) => {
    for (const m of muts) m.addedNodes.forEach((n) => {
      if (n instanceof HTMLCanvasElement && n.matches('canvas.glyph')) { if (!drawn.has(n)) io.observe(n); }
      else if (n instanceof Element) watch(n);
    });
  }).observe(document.body, { childList: true, subtree: true });
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    document.querySelectorAll<HTMLCanvasElement>('canvas.glyph').forEach((c) => { if (drawn.has(c)) queue.push(c); });
    pump();
  });
}
