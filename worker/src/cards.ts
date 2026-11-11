// Card text for interaction questions (D29). Pure: parsing official card pages,
// matching card names in a question, and formatting matched cards for the
// prompt. The Worker, its Cron and scripts/seed-cards.ts all share this file.

import { stripTags } from './html.ts';

export const SITE = 'https://www.metazootcg.com';

export interface Card {
  name: string;
  /** Set code, e.g. "MZ1". */
  set: string;
  /** Set name, e.g. "Base Set". */
  setName: string;
  num: number;
  url: string;
  /** Aura, type and rarity, e.g. "Air Creature, Rare". */
  line: string;
  /** Stats, traits, keywords and abilities, one per line. */
  text: string;
}

/** Card page URLs listed in the site's sitemap.xml. */
export function cardUrlsFromSitemap(xml: string): string[] {
  const urls = [
    ...xml.matchAll(/<loc>\s*(https:\/\/www\.metazootcg\.com\/card\/[^<\s]+)\s*<\/loc>/g),
  ];
  return [...new Set(urls.map((m) => m[1] ?? ''))].filter(Boolean);
}

function inner(html: string, tag: string): string | undefined {
  return new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)</${tag}>`, 'i').exec(html)?.[1];
}

/** Text of each <span> in a run of sibling spans (icons are empty and dropped). */
function spanTexts(html: string): string[] {
  return stripTags(html.replace(/<\/span>/gi, '|'))
    .replace(/\n/g, ' ')
    .split('|')
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * Reads one card page (D29). Layout: <article><header><p>Base Set · MZ1 #25</p>
 * <h1>name</h1><div>aura/rarity/type spans</div></header><dl>stats</dl>,
 * label+value span rows (Traits, Keywords…), one <section><h3>ability</h3><p>
 * per ability, and a flavour-text <blockquote>, which is dropped.
 */
export function parseCardPage(html: string, url: string): Card | null {
  const article = inner(html, 'article');
  const header = article && inner(article, 'header');
  if (!article || !header) return null;

  const name = stripTags(inner(header, 'h1') ?? '').replace(/\n/g, ' ');
  const setLine = stripTags(inner(header, 'p') ?? '').replace(/\n/g, ' ');
  const setMatch = /^(.*?)\s*·\s*([A-Z0-9]+)\s*#\s*(\d+)/.exec(setLine);
  if (!name || !setMatch) return null;
  const [, setName = '', set = '', num = '0'] = setMatch;

  const tags = spanTexts(header.split(/<\/h1>/i)[1] ?? '');
  const lineParts = tags.filter(
    (t) => !/rare|common|holo|legend|hidden|alternate|alt art|promo/i.test(t),
  );
  const rarity = tags.filter((t) => !lineParts.includes(t)).join(' ');
  const line = [lineParts.join(' '), rarity].filter(Boolean).join(', ');

  const body = article.split(/<\/header>/i)[1] ?? '';
  const lines: string[] = [];

  const stats = [...body.matchAll(/<dt\b[^>]*>([\s\S]*?)<\/dt>\s*<dd\b[^>]*>([\s\S]*?)<\/dd>/gi)]
    .map(([, dt = '', dd = '']) => [stripTags(dt), stripTags(dd).replace(/\n/g, ' ')] as const)
    .filter(([label]) => label !== 'Artist')
    .map(([label, value]) => `${label} ${value}`);
  if (stats.length) lines.push(stats.join(' · '));

  // Label + value span rows: <div><span>Traits</span><span>Cryptid</span>…</div>
  const rows: string[] = [];
  for (const [, row = ''] of body.matchAll(
    /<div\b[^>]*>((?:\s*<span\b[^>]*>[\s\S]*?<\/span>)+)\s*<\/div>/gi,
  )) {
    const [label, ...values] = spanTexts(row);
    if (label && values.length) rows.push(`${label} ${values.join(', ')}`);
  }
  if (rows.length) lines.push(rows.join(' · '));

  // Abilities: <section><h3>name</h3><p>text</p></section>. Strategy cards have
  // no ability name: <section><p>text</p></section>.
  for (const [, section = ''] of body.matchAll(/<section\b[^>]*>([\s\S]*?)<\/section>/gi)) {
    const named = /^\s*<h3\b[^>]*>([\s\S]*?)<\/h3>([\s\S]*)$/i.exec(section);
    const title = named ? stripTags(named[1] ?? '').replace(/\n/g, ' ') : '';
    const text = stripTags(named ? (named[2] ?? '') : section).replace(/\n/g, ' ');
    if (title || text) lines.push(title && text ? `${title}: ${text}` : title || text);
  }

  return { name, set, setName, num: Number(num), url, line, text: lines.join('\n') };
}

// ---------------------------------------------------------------------------
// Matching (D29). Recall over precision: players don't capitalize or quote
// names, misspell them, and use part of a name ("goofus", "the crow"). Sending
// a few irrelevant cards costs ~80 tokens each; missing a needed card ruins
// the answer. So: fuzzy, partial, rarity-weighted, and fill every slot.

export const MAX_CARDS = 5;

const STOPWORDS = new Set(
  (
    'a an the of and or but if then than so to in on at by for from with without into onto ' +
    'is are was were be been being am do does did done can could will would should shall may might must ' +
    'i me my mine you your yours we our us they their them he him his she her it its this that these those ' +
    'what which who whom whose when where why how there here not no yes vs versus about also just only ' +
    'card cards get got has have had any all some each every one two other another same both'
  ).split(' '),
);

/** Lowercased word tokens, possessives dropped, stopwords removed. */
export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[‘’ʼ`]/g, "'")
    .replace(/'s\b/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .split(' ')
    .filter((t) => t && !STOPWORDS.has(t));
}

/** Optimal-string-alignment distance, giving up (returning max + 1) past `max`. */
export function editDistance(a: string, b: string, max = 2): number {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  let prev2: number[] = [];
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    let rowMin = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      let d = Math.min((prev[j] ?? 0) + 1, (cur[j - 1] ?? 0) + 1, (prev[j - 1] ?? 0) + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        d = Math.min(d, (prev2[j - 2] ?? 0) + 1); // transposition
      }
      cur[j] = d;
      rowMin = Math.min(rowMin, d);
    }
    if (rowMin > max) return max + 1;
    prev2 = prev;
    prev = cur;
  }
  return prev[b.length] ?? max + 1;
}

/** How well question word `q` matches card-name word `v` (0 = no match). */
export function wordSimilarity(q: string, v: string): number {
  if (q === v) return 1;
  if (q === `${v}s` || q === `${v}es` || v === `${q}s` || v === `${q}es`) return 1;
  if (Math.min(q.length, v.length) >= 4 && (v.startsWith(q) || q.startsWith(v))) return 0.85;
  const longest = Math.max(q.length, v.length);
  if (Math.min(q.length, v.length) < 4) return 0;
  const dist = editDistance(q, v, 2);
  if (dist > 2) return 0; // gave up: not a typo of this word
  const sim = 1 - dist / longest;
  return sim >= (longest >= 5 ? 0.7 : 0.8) ? sim : 0;
}

/** Two question words run together vs one name word: exact, or one typo in a long word. */
function joinedSimilarity(pair: string, v: string): number {
  if (pair === v) return 1;
  return v.length >= 7 && editDistance(pair, v, 1) === 1 ? 1 - 1 / v.length : 0;
}

/** Which of a-z and 0-9 occur in the word, as bits. */
export function letterMask(word: string): number {
  let mask = 0;
  for (let i = 0; i < word.length; i++) {
    const c = word.charCodeAt(i);
    const bit = c >= 97 && c <= 122 ? c - 97 : c >= 48 && c <= 57 ? 26 + ((c - 48) % 6) : -1;
    if (bit >= 0) mask |= 1 << bit;
  }
  return mask;
}

function popcount(n: number): number {
  let count = 0;
  for (let x = n >>> 0; x; x &= x - 1) count++;
  return count;
}

export interface CardIndex {
  /** One entry per distinct name (newest printing). */
  cards: Card[];
  /** Name word -> weight (IDF over card names) and the cards that contain it. */
  vocab: Map<string, { idf: number; cards: number[] }>;
  /** Vocabulary words bucketed by length, for cheap fuzzy lookups. */
  byLength: Map<number, string[]>;
  /** Letter-set bitmask per vocabulary word (see letterMask). */
  masks: Map<string, number>;
  /** Joined adjacent name words ("stormbringer" from "storm bringer") -> word pairs. */
  joined: Map<string, [string, string]>;
  /** Words common in the rules text; question words among them count less. */
  rulesWords: Set<string>;
}

/** Counts words in the rules text; those seen at least `min` times are "rules words". */
export function rulesWordsFrom(grounding: string, min = 5): Set<string> {
  const counts = new Map<string, number>();
  for (const word of tokenize(grounding)) counts.set(word, (counts.get(word) ?? 0) + 1);
  return new Set([...counts].filter(([, n]) => n >= min).map(([w]) => w));
}

/** Precomputes everything matching needs. Run once per card-store load. */
export function buildCardIndex(all: Card[], rulesWords: Set<string> = new Set()): CardIndex {
  const newest = new Map<string, Card>();
  for (const card of all) {
    const key = tokenize(card.name).join(' ') || card.name.toLowerCase();
    const seen = newest.get(key);
    if (!seen || card.set > seen.set || (card.set === seen.set && card.num > seen.num)) {
      newest.set(key, card);
    }
  }
  const cards = [...newest.values()];
  const containing = new Map<string, Set<number>>();
  const joined = new Map<string, [string, string]>();
  cards.forEach((card, i) => {
    const words = tokenize(card.name);
    for (const w of words) containing.set(w, (containing.get(w) ?? new Set()).add(i));
    for (let k = 0; k + 1 < words.length; k++) {
      const [a = '', b = ''] = [words[k], words[k + 1]];
      joined.set(a + b, [a, b]);
    }
  });
  const vocab = new Map<string, { idf: number; cards: number[] }>();
  const byLength = new Map<number, string[]>();
  for (const [word, ids] of containing) {
    vocab.set(word, { idf: Math.log((cards.length + 1) / ids.size), cards: [...ids] });
    byLength.set(word.length, [...(byLength.get(word.length) ?? []), word]);
  }
  const masks = new Map([...vocab.keys()].map((w) => [w, letterMask(w)]));
  return { cards, vocab, byLength, masks, joined, rulesWords };
}

/**
 * The cards a question most likely refers to, best first, up to `max`. Each
 * card-name word takes its best match against the question's words (exact,
 * plural, prefix, typo, or split/joined), weighted by how rare the word is
 * among card names. Free slots go to the next-best near matches.
 */
export function matchCards(question: string, index: CardIndex, max = MAX_CARDS): Card[] {
  const words = tokenize(question);
  // Candidate question terms: each word, plus adjacent pairs joined ("storm bringer").
  const weightOf = (w: string) => (index.rulesWords.has(w) ? 0.4 : 1);
  const terms = words.map((w) => ({ text: w, weight: weightOf(w), joined: false }));
  for (let i = 0; i + 1 < words.length; i++) {
    const [a = '', b = ''] = [words[i], words[i + 1]];
    terms.push({ text: a + b, weight: Math.min(weightOf(a), weightOf(b)), joined: true });
  }

  const best = new Map<string, number>(); // name word -> best weighted similarity
  const credit = (word: string, score: number) => {
    if (score > (best.get(word) ?? 0)) best.set(word, score);
  };
  for (const { text, weight, joined } of terms) {
    const mask = letterMask(text);
    for (let len = text.length - 2; len <= text.length + 2; len++) {
      for (const v of index.byLength.get(len) ?? []) {
        // Each edit flips at most two letters in the set, so >4 differing letters means >2 edits.
        if (popcount(mask ^ (index.masks.get(v) ?? 0)) > 4) continue;
        // A joined pair must match a whole name word, not a prefix of one.
        const sim = joined ? joinedSimilarity(text, v) : wordSimilarity(text, v);
        if (sim >= 0.7) credit(v, sim * weight);
      }
    }
    if (!joined && text.length >= 4) {
      for (const v of index.vocab.keys()) {
        if (Math.abs(v.length - text.length) > 2 && (v.startsWith(text) || text.startsWith(v))) {
          if (Math.min(v.length, text.length) >= 4) credit(v, 0.85 * weight);
        }
      }
    }
    // A question word that matches two joined name words ("stormbringer" vs "storm bringer").
    const pair = index.joined.get(text);
    if (pair) for (const w of pair) credit(w, weight);
  }

  const scores = new Map<number, { score: number; words: number }>();
  for (const [word, sim] of best) {
    const entry = index.vocab.get(word);
    if (!entry) continue;
    for (const id of entry.cards) {
      const s = scores.get(id) ?? { score: 0, words: 0 };
      scores.set(id, { score: s.score + entry.idf * sim, words: s.words + 1 });
    }
  }
  return [...scores]
    .map(([id, { score, words: n }]) => ({ id, score: n >= 2 ? score * 1.25 : score }))
    .sort((a, b) => b.score - a.score)
    .slice(0, max)
    .map(({ id }) => index.cards[id])
    .filter((c): c is Card => c !== undefined);
}

/** How a card appears in the prompt's CARD TEXT block. */
export function formatCard(card: Card): string {
  const head = `### ${card.name} (${card.setName} ${card.set} #${card.num})`;
  return [card.line ? `${head} — ${card.line}` : head, card.text].filter(Boolean).join('\n');
}
