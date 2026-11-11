// Seed the rules Worker's card store: npm run cards:seed (D29)
//
// Crawls every card page listed in metazootcg.com's sitemap (about one page a
// second; card pages are allowed by robots.txt, /api is not) and writes
// worker/src/cards.generated.json (gitignored: card text isn't ours to
// republish). Re-running only fetches cards missing from that file.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { SITE, cardUrlsFromSitemap, parseCardPage, type Card } from '../worker/src/cards.ts';

const OUT = join(import.meta.dirname, '..', 'worker', 'src', 'cards.generated.json');
const DELAY_MS = 800;
const HEADERS = { 'user-agent': 'CasterCompanion-build/1.0' };

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function getText(url: string): Promise<string> {
  const res = await fetch(url, { headers: HEADERS });
  if (!res.ok) throw new Error(`GET ${url} -> ${res.status}`);
  return res.text();
}

async function main(): Promise<void> {
  const known: Card[] = existsSync(OUT) ? (JSON.parse(readFileSync(OUT, 'utf8')) as Card[]) : [];
  const have = new Set(known.map((c) => c.url));
  const urls = cardUrlsFromSitemap(await getText(`${SITE}/sitemap.xml`));
  const missing = urls.filter((u) => !have.has(u));
  console.log(
    `${urls.length} cards in sitemap, ${known.length} already seeded, ${missing.length} to fetch`,
  );

  const failed: string[] = [];
  for (const [i, url] of missing.entries()) {
    try {
      const card = parseCardPage(await getText(url), url);
      if (card) known.push(card);
      else failed.push(url);
    } catch (error) {
      failed.push(url);
      console.warn(error instanceof Error ? error.message : error);
    }
    if ((i + 1) % 25 === 0) {
      writeFileSync(OUT, JSON.stringify(known), 'utf8'); // checkpoint
      console.log(`  ${i + 1}/${missing.length}`);
    }
    await sleep(DELAY_MS);
  }

  known.sort((a, b) => a.set.localeCompare(b.set) || a.num - b.num);
  writeFileSync(OUT, JSON.stringify(known), 'utf8');
  const kb = Math.round(JSON.stringify(known).length / 1024);
  console.log(`Wrote ${OUT}: ${known.length} cards, ${kb} KB`);
  if (failed.length) console.log(`Couldn't parse ${failed.length}:\n  ${failed.join('\n  ')}`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
