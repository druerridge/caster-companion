// Build the Rules Worker's reference text: npm run grounding
//
// Reads the rulebook PDFs from OfflineDocumentRulesReferences/ (gitignored),
// fetches the official Errata & Compendium page, and writes
// worker/src/grounding.generated.txt (gitignored). Needs `pdftotext`, which
// ships with Git for Windows. See docs/decisions.md D23.
import { spawnSync } from 'node:child_process';
import { existsSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { assembleGrounding, cleanPdfText, estimateTokens, extractCompendium } from './grounding.ts';

const ROOT = join(import.meta.dirname, '..');
const REFS = join(ROOT, 'OfflineDocumentRulesReferences');
const OUT = join(ROOT, 'worker', 'src', 'grounding.generated.txt');
const ERRATA_URL = 'https://www.metazootcg.com/how-to-play/errata';

const PDFTOTEXT_CANDIDATES = [
  'pdftotext',
  'C:\\Program Files\\Git\\mingw64\\bin\\pdftotext.exe',
  'C:\\Program Files (x86)\\Git\\mingw64\\bin\\pdftotext.exe',
];

function pdfToText(pdf: string): string {
  if (!existsSync(pdf)) throw new Error(`Missing ${pdf}`);
  for (const exe of PDFTOTEXT_CANDIDATES) {
    const result = spawnSync(exe, ['-enc', 'UTF-8', pdf, '-'], {
      encoding: 'utf8',
      maxBuffer: 64 * 1024 * 1024,
    });
    if (result.error) continue; // not found; try the next location
    if (result.status !== 0) throw new Error(`pdftotext failed on ${pdf}:\n${result.stderr}`);
    return result.stdout;
  }
  throw new Error('pdftotext not found. Install Git for Windows or poppler-utils.');
}

async function main(): Promise<void> {
  const fullRules = cleanPdfText(pdfToText(join(REFS, 'metazoo-full-base-set-rules.pdf')));
  const quickPlay = cleanPdfText(pdfToText(join(REFS, 'metazoo-quick-play-demo-rules.pdf')));

  const res = await fetch(ERRATA_URL, { headers: { 'user-agent': 'CasterCompanion-build/1.0' } });
  if (!res.ok) throw new Error(`GET ${ERRATA_URL} -> ${res.status}`);
  const compendium = extractCompendium(await res.text());
  if (compendium.length === 0) throw new Error('No compendium entries found; page layout changed?');

  const text = assembleGrounding({ fullRules, quickPlay, compendium });
  writeFileSync(OUT, text, 'utf8');
  console.log(
    `Wrote ${OUT}\n  compendium entries: ${compendium.length}\n  ~${estimateTokens(text)} tokens`,
  );
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
