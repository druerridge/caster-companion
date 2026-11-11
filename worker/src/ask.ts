// Rules Worker core (feature 7, D23). Pure apart from the injected `fetch` and
// rate limiter, so Jest can drive it without the Workers runtime.

import { validateQuestion, type WorkerError } from '../../src/domain/rulings.ts';

export const DEFAULT_MODEL = 'gemini-3.5-flash-lite';
export const MAX_OUTPUT_TOKENS = 600;
export const GEMINI_TIMEOUT_MS = 25_000;

export interface AskEnv {
  GEMINI_API_KEY: string;
  /** Shared with the app; obfuscation against drive-by traffic, not a secret. */
  APP_TOKEN: string;
  /** "on" turns the Worker off. */
  KILL_SWITCH?: string;
  GEMINI_MODEL?: string;
}

export interface RateLimiter {
  limit(options: { key: string }): Promise<{ success: boolean }>;
}

/** The parts of an HTTP request the handler needs. */
export interface AskRequest {
  method: string;
  path: string;
  header: (name: string) => string | null;
  ip: string;
  bodyText: () => Promise<string>;
}

export interface AskReply {
  status: number;
  body: { answer: string } | { error: WorkerError };
}

export interface AskDeps {
  fetch: typeof fetch;
  limiter: RateLimiter;
  /** Rulebook + errata text the model answers from. */
  grounding: string;
}

export const SYSTEM_PROMPT = `You are a rules assistant for the MetaZoo trading card game (the 2025 relaunch by GameQbator Labs / MetaTwo). Players ask you ruling questions mid-game.

Answer from the official reference text below. It contains the full rulebook, the quick play rules, and the official Errata & Compendium. The Errata & Compendium overrides the rulebooks where they disagree. The rulebook text was extracted from a PDF, so card images appear as scrambled fragments; ignore those.

Rules for your answers:
- Answer only questions about playing MetaZoo. Politely decline anything else.
- Lead with a direct answer in one sentence, then explain briefly. Keep it under 150 words.
- Cite each source you relied on in square brackets, using its exact heading from the reference text: [Rulebook: Give/Gain/Have & Has/Deal] or [Compendium: Replacement Effects]. Use "Rulebook" for both rulebooks and "Compendium" for Errata & Compendium entries. Never write URLs; the app turns citations into links.
- If the reference text doesn't settle it, say so plainly and give your best reading, marked as unofficial.
- Plain text only: no Markdown, no headings, no bold. Short dashes for lists are fine.`;

function reply(status: number, body: AskReply['body']): AskReply {
  return { status, body };
}

/** The generateContent request body for a question. */
export function buildGeminiRequest(question: string, grounding: string) {
  return {
    systemInstruction: {
      parts: [{ text: `${SYSTEM_PROMPT}\n\n=== OFFICIAL REFERENCE TEXT ===\n${grounding}` }],
    },
    contents: [{ role: 'user', parts: [{ text: question }] }],
    generationConfig: { maxOutputTokens: MAX_OUTPUT_TOKENS, temperature: 0.2 },
  };
}

/** Maps a Gemini HTTP status + JSON body to our reply. */
export function readGeminiReply(status: number, json: unknown): AskReply {
  if (status === 429) return reply(503, { error: 'quota' });
  if (status < 200 || status >= 300) return reply(502, { error: 'upstream' });

  const data = json as {
    promptFeedback?: { blockReason?: string };
    candidates?: { content?: { parts?: { text?: unknown }[] }; finishReason?: string }[];
  };
  if (data?.promptFeedback?.blockReason) return reply(200, { error: 'blocked' });
  const candidate = data?.candidates?.[0];
  const text = (candidate?.content?.parts ?? [])
    .map((part) => (typeof part.text === 'string' ? part.text : ''))
    .join('')
    .trim();
  if (text.length > 0) return reply(200, { answer: text });
  if (candidate?.finishReason === 'SAFETY' || candidate?.finishReason === 'PROHIBITED_CONTENT') {
    return reply(200, { error: 'blocked' });
  }
  return reply(502, { error: 'upstream' });
}

/** Handles one request to the Worker. */
export async function handleAsk(req: AskRequest, env: AskEnv, deps: AskDeps): Promise<AskReply> {
  if (req.path !== '/ask') return reply(404, { error: 'not_found' });
  if (req.method !== 'POST') return reply(405, { error: 'invalid' });
  if (env.KILL_SWITCH === 'on') return reply(503, { error: 'disabled' });
  if (req.header('x-app-token') !== env.APP_TOKEN) return reply(401, { error: 'unauthorized' });

  const { success } = await deps.limiter.limit({ key: req.ip });
  if (!success) return reply(429, { error: 'rate_limited' });

  let raw: unknown;
  try {
    raw = (JSON.parse(await req.bodyText()) as { question?: unknown })?.question;
  } catch {
    return reply(400, { error: 'invalid' });
  }
  const check = validateQuestion(raw);
  if (!check.ok) return reply(400, { error: 'invalid' });

  const model = env.GEMINI_MODEL || DEFAULT_MODEL;
  try {
    const res = await deps.fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-goog-api-key': env.GEMINI_API_KEY },
        body: JSON.stringify(buildGeminiRequest(check.question, deps.grounding)),
        signal: AbortSignal.timeout(GEMINI_TIMEOUT_MS),
      },
    );
    const json: unknown = await res.json().catch(() => null);
    return readGeminiReply(res.status, json);
  } catch {
    return reply(502, { error: 'upstream' });
  }
}
