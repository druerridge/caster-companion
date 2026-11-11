// Evaluate card matching and rulings locally (D29, Phase 1):
//   node scripts/eval-cards.ts <questions.json> [model] [out.json]
//
// questions.json: [{ "question": "...", "cards": ["Expected Card", ...], "answer": "staff ruling" }]
// Keep question files out of the repo (e.g. OfflineDocumentRulesReferences/):
// they may hold other people's Discord messages.
//
// For each question: prints which expected cards the matcher missed (recall),
// then asks Gemini through the real Worker handler, using the key in
// worker/.dev.vars, and records the answer next to the expected ruling.
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { handleAsk } from '../worker/src/ask.ts';
import { buildCardIndex, matchCards, rulesWordsFrom, type Card } from '../worker/src/cards.ts';

interface EvalCase {
  question: string;
  cards?: string[];
  answer?: string;
}

const ROOT = join(import.meta.dirname, '..');
const [questionsPath, model = 'gemini-3.5-flash-lite', outPath] = process.argv.slice(2);
if (!questionsPath) {
  console.error('usage: node scripts/eval-cards.ts <questions.json> [model] [out.json]');
  process.exit(1);
}

const PACE_MS = 4500; // stay under the free tier's 15 requests a minute
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const norm = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

async function main(): Promise<void> {
  const cases = JSON.parse(readFileSync(questionsPath!, 'utf8')) as EvalCase[];
  const grounding = readFileSync(join(ROOT, 'worker', 'src', 'grounding.generated.txt'), 'utf8');
  const all = JSON.parse(
    readFileSync(join(ROOT, 'worker', 'src', 'cards.generated.json'), 'utf8'),
  ) as Card[];
  const index = buildCardIndex(all, rulesWordsFrom(grounding));
  const key = /^GEMINI_API_KEY=(.+)$/m
    .exec(readFileSync(join(ROOT, 'worker', '.dev.vars'), 'utf8'))?.[1]
    ?.trim();
  if (!key) throw new Error('No GEMINI_API_KEY in worker/.dev.vars');

  const results = [];
  let expected = 0;
  let found = 0;
  for (const [i, c] of cases.entries()) {
    const t0 = performance.now();
    const matched = matchCards(c.question, index).map((card) => card.name);
    const matchMs = performance.now() - t0;
    const missing = (c.cards ?? []).filter(
      (want) => !matched.some((m) => norm(m).includes(norm(want)) || norm(want).includes(norm(m))),
    );
    expected += c.cards?.length ?? 0;
    found += (c.cards?.length ?? 0) - missing.length;

    const reply = await handleAsk(
      {
        method: 'POST',
        path: '/ask',
        header: (name) => (name === 'x-app-token' ? 'eval' : null),
        ip: 'eval',
        bodyText: () => Promise.resolve(JSON.stringify({ question: c.question })),
      },
      { GEMINI_API_KEY: key, APP_TOKEN: 'eval', GEMINI_MODEL: model },
      {
        fetch: (input, init) => fetch(input, init),
        limiter: { limit: () => Promise.resolve({ success: true }) },
        grounding,
        cards: process.env.EVAL_NO_CARDS ? undefined : () => Promise.resolve(index),
      },
    );
    const answer = 'answer' in reply.body ? reply.body.answer : `ERROR ${reply.body.error}`;
    results.push({ ...c, matched, missing, matchMs: Math.round(matchMs * 10) / 10, got: answer });
    console.log(`\n#${i + 1} ${c.question}`);
    console.log(
      `  matched: ${matched.join(' | ') || '(none)'}${missing.length ? `  MISSING: ${missing.join(', ')}` : ''}`,
    );
    console.log(`  got:      ${answer.replace(/\n+/g, ' ')}`);
    if (c.answer) console.log(`  expected: ${c.answer.replace(/\n+/g, ' ')}`);
    await sleep(PACE_MS);
  }
  console.log(`\nCard recall: ${found}/${expected} (${model})`);
  if (outPath) writeFileSync(outPath, JSON.stringify(results, null, 2), 'utf8');
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
