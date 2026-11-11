// Pure helpers for building the Rules Worker's reference text (feature 7, D23).

/** Lines that are card-image debris rather than rules prose. */
function isDebris(line: string): boolean {
  if (line.length < 3) return true;
  if (/^[\d\s+\-.,:]+$/.test(line)) return true; // costs, influence, page numbers
  if (/GameQbator|MetaTwo Enterprises|©|©/.test(line)) return true; // card copyright lines
  if (/\bMZ1\b|\d{3}\/214/.test(line)) return true; // collector numbers
  if (/^(?:[A-Z] ){3,}/.test(line)) return true; // letter-spaced type lines: "C R E AT U R E"
  if (/^(?:Inc\.|Labs|LLC|\|)$/.test(line)) return true; // split copyright fragments
  const words = line.split(' ');
  if (words.filter((w) => /^\d+$/.test(w)).length / words.length > 0.4) return true; // card grids
  // Overlapping text from stacked card images: many lowercase→uppercase flips inside words.
  const flips = line.match(/[a-z][A-Z]/g)?.length ?? 0;
  if (flips >= 3 && flips / line.length > 0.02) return true;
  return false;
}

/** Cleans `pdftotext` output: drops card-image debris and collapses blank lines. */
export function cleanPdfText(raw: string): string {
  const kept: string[] = [];
  for (const rawLine of raw.replace(/\r\n/g, '\n').replace(/\f/g, '\n').split('\n')) {
    const line = rawLine
      .replace(/�/g, '•') // bullets come out as replacement characters
      .replace(/[ \t]+/g, ' ')
      .trim();
    if (line === '') {
      if (kept.length > 0 && kept[kept.length - 1] !== '') kept.push('');
      continue;
    }
    if (!isDebris(line)) kept.push(line);
  }
  // Drop lone short lines left between blanks (stray card names, labels).
  const out = kept.filter((line, i) => {
    const isolated = (kept[i - 1] ?? '') === '' && (kept[i + 1] ?? '') === '';
    return !(isolated && line.split(' ').length <= 2 && line.length < 24 && !/[.:?]$/.test(line));
  });
  return out
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

const ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
  '#39': "'",
};

function decodeEntities(text: string): string {
  return text
    .replace(/&#x([0-9a-f]+);/gi, (_, hex: string) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec: string) => String.fromCodePoint(parseInt(dec, 10)))
    .replace(/&([a-z#0-9]+);/gi, (match, name: string) => ENTITIES[name] ?? match);
}

function stripTags(html: string): string {
  return decodeEntities(
    html
      .replace(/<\/(p|li|div)>/gi, '\n')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<[^>]+>/g, ''),
  )
    .split('\n')
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .join('\n');
}

export interface CompendiumEntry {
  title: string;
  text: string;
}

/**
 * Pulls the entries off the official Errata & Compendium page. Each entry is
 * an <article> with an <h3> title followed by paragraphs.
 */
export function extractCompendium(html: string): CompendiumEntry[] {
  const entries: CompendiumEntry[] = [];
  for (const [, article = ''] of html.matchAll(/<article\b[^>]*>([\s\S]*?)<\/article>/gi)) {
    const heading = /<h3\b[^>]*>([\s\S]*?)<\/h3>([\s\S]*)/i.exec(article);
    if (!heading) continue;
    const title = stripTags(heading[1] ?? '');
    const text = stripTags(heading[2] ?? '');
    if (title && text) entries.push({ title, text });
  }
  return entries;
}

export interface GroundingSources {
  fullRules: string;
  quickPlay: string;
  compendium: CompendiumEntry[];
}

/** The single text block the Worker sends to the model with every question. */
export function assembleGrounding({ fullRules, quickPlay, compendium }: GroundingSources): string {
  const entries = compendium.map(({ title, text }) => `### ${title}\n${text}`).join('\n\n');
  return [
    '## OFFICIAL ERRATA & COMPENDIUM (overrides the rulebooks)',
    entries,
    '## FULL RULEBOOK (base set)',
    fullRules,
    '## QUICK PLAY RULES',
    quickPlay,
  ].join('\n\n');
}

/** Rough token estimate (about 4 characters per token for English). */
export const estimateTokens = (text: string) => Math.round(text.length / 4);
