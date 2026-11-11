// Tiny HTML-to-text helpers shared by the grounding build (scripts/), the card
// seed script and the Worker (D23, D29). Regex-based: the pages we read are
// server-rendered and well-formed, and the Worker can't afford a DOM.

const ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
  '#39': "'",
};

export function decodeEntities(text: string): string {
  return text
    .replace(/&#x([0-9a-f]+);/gi, (_, hex: string) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec: string) => String.fromCodePoint(parseInt(dec, 10)))
    .replace(/&([a-z#0-9]+);/gi, (match, name: string) => ENTITIES[name] ?? match);
}

/** Block-level closers become line breaks; everything else is dropped. */
export function stripTags(html: string): string {
  return decodeEntities(
    html
      .replace(/<!--[\s\S]*?-->/g, '')
      .replace(/<\/(p|li|div|tr|section|h\d)>/gi, '\n')
      .replace(/<\/t[dh]>/gi, ' ')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<[^>]+>/g, ''),
  )
    .split('\n')
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .join('\n');
}
