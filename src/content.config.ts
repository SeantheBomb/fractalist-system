import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const nodes = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/nodes' }),
  schema: z.object({
    title: z.string(),
    part: z.string(),
    order: z.number(),
    epigraph: z.string().optional(),
    summary: z.string(),
    related: z.array(z.string()).default([]),
  }),
});

const thirds = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/thirds' }),
  schema: z.object({
    name: z.string(),
    epithet: z.string(),
    kinship: z.enum(['unaligned', 'self', 'dyad', 'skein']),
    order: z.number(),
    epigraph: z.string().optional(),
    personifies: z.string(),
    tending: z.string(),
    fraying: z.string(),
    fractal: z.object({ type: z.string(), hue: z.string() }),
    relatedThirds: z.array(z.string()).default([]),
    relatedNodes: z.array(z.string()).default([]),
  }),
});

export const collections = { nodes, thirds };
