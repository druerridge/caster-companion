// Developer rulings (D29): short paraphrases of rulings MetaZoo's developer
// gave on the official Discord, picked per question within a token budget.
// The data lives in OfflineDocumentRulesReferences/dev-rulings.json
// (gitignored) and is bundled by `npm run grounding`.

import { tokenize, type Card } from './cards.ts';

export interface DevRuling {
  /** Short topic, used in citations: [Dev Ruling: <title>]. */
  title: string;
  /** Card names the ruling is about (matched against the question's cards). */
  cards: string[];
  /** Distinctive words that suggest the ruling is relevant. */
  terms: string[];
  text: string;
}

/**
 * Request-size budget for card text + dev rulings, in tokens (D29). The base
 * prompt is 15,977 tokens; 250k tokens/min ÷ 15 requests/min = 16,666, so up to
 * ~690 extra tokens keeps the per-minute ceiling at 15 questions.
 */
export const EXTRA_TOKEN_BUDGET = 600; // leaves ~90 tokens for section headers

/** Conservative token estimate: measured ~3.75 characters per token on card text. */
export const estimateTokens = (text: string) => Math.ceil(text.length / 3.5);

const key = (name: string) => tokenize(name).join(' ');

/**
 * Rulings relevant to the question, best first: a ruling about one of the
 * matched cards scores 3, each of its terms in the question scores 1, and it
 * needs at least 2 to be included.
 */
export function selectRulings(question: string, cards: Card[], rulings: DevRuling[]): DevRuling[] {
  const words = new Set(tokenize(question));
  const has = (term: string) =>
    tokenize(term).every((t) => words.has(t) || words.has(`${t}s`) || words.has(t.replace(/s$/, '')));
  const cardKeys = new Set(cards.map((c) => key(c.name)));
  return rulings
    .map((r) => ({
      r,
      score: (r.cards.some((n) => cardKeys.has(key(n))) ? 3 : 0) + r.terms.filter(has).length,
    }))
    .filter(({ score }) => score >= 2)
    .sort((a, b) => b.score - a.score)
    .map(({ r }) => r);
}

export const formatRuling = (r: DevRuling) => `### ${r.title}\n${r.text}`;

/**
 * Fits matched cards first (best first), then rulings, into the token budget.
 * Cards come first because missing a card's text is the worse failure.
 */
export function fitExtras(
  cards: Card[],
  rulings: DevRuling[],
  formatCard: (c: Card) => string,
  budget = EXTRA_TOKEN_BUDGET,
): { cards: Card[]; rulings: DevRuling[] } {
  let left = budget;
  const take = <T>(items: T[], format: (t: T) => string) =>
    items.filter((item) => {
      const cost = estimateTokens(format(item)) + 2;
      if (cost > left) return false;
      left -= cost;
      return true;
    });
  const keptCards = take(cards, formatCard);
  return { cards: keptCards, rulings: take(rulings, formatRuling) };
}
