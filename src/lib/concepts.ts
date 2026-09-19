import data from '../data/concepts.json';

export type ConceptKind = 'word' | 'idea' | 'figure';
export type Scale = 'self' | 'dyad' | 'skein' | 'culture' | 'world' | 'cosmos' | 'every';

export interface Concept {
  slug: string;
  name: string;
  kind: ConceptKind;
  epithet?: string;
  href: string;
  blurb: string;
  scale: Scale | null;
  perScale: Record<string, string | null> | null;
  treatedIn: string[];
  mentionedIn: string[];
  appearsOn: string[];
  stemsFrom: string[];
  fusionOf: string[];
  growsInto: string[];
  related: { slug: string; weight: number; shared: string[] }[];
  aliases?: string[];
}

export const concepts = data.concepts as Concept[];
const bySlug = new Map(concepts.map((c) => [c.slug, c]));
export const concept = (slug: string) => bySlug.get(slug);

export const conceptsOnPage = (page: string): Concept[] =>
  ((data.pageConcepts as Record<string, string[]>)[page] ?? []).map((s) => bySlug.get(s)!).filter(Boolean);

export const pagesSharingConcepts = (page: string) =>
  ((data.pageRelated as Record<string, { slug: string; shared: string[] }[]>)[page] ?? []);

export const SCALE_LABEL: Record<Scale, string> = {
  self: 'Self', dyad: 'Dyad', skein: 'Skein', culture: 'Culture', world: 'World', cosmos: 'Cosmos', every: 'Every scale',
};

export const KIND_LABEL: Record<ConceptKind, string> = {
  word: 'Loop Tongue word', idea: 'Concept', figure: 'Standing Third',
};

export const firstSentence = (text: string) => {
  const m = text.match(/^.*?[.!?](?=\s|$)/);
  return m ? m[0] : text;
};
