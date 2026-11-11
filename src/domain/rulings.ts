// Rules Lookup (feature 7, D23): the contract between the app and the rules
// Worker, plus the pure helpers both sides share. No React imports: the
// Cloudflare Worker bundles this file too.

export const MAX_QUESTION_CHARS = 500;

export type QuestionCheck =
  { ok: true; question: string } | { ok: false; reason: 'empty' | 'too_long' };

/** Trims the question and checks it is non-empty and within the length cap. */
export function validateQuestion(raw: unknown): QuestionCheck {
  if (typeof raw !== 'string') return { ok: false, reason: 'empty' };
  const question = raw.trim();
  if (question.length === 0) return { ok: false, reason: 'empty' };
  if (question.length > MAX_QUESTION_CHARS) return { ok: false, reason: 'too_long' };
  return { ok: true, question };
}

/** Errors the Worker can return in `{ error }`. */
export type WorkerError =
  | 'invalid' // bad request body or question
  | 'unauthorized' // missing/wrong app token
  | 'rate_limited' // too many questions from this device in the last minute
  | 'quota' // Gemini's free daily quota is used up
  | 'disabled' // the owner switched the Worker off
  | 'blocked' // Gemini refused to answer
  | 'upstream' // Gemini failed some other way
  | 'not_found';

/** Errors only the app can detect. */
export type ClientError = 'offline' | 'timeout' | 'unknown';

export type AskError = WorkerError | ClientError;

export type AskOutcome = { kind: 'answer'; text: string } | { kind: 'error'; error: AskError };

const WORKER_ERRORS: readonly WorkerError[] = [
  'invalid',
  'unauthorized',
  'rate_limited',
  'quota',
  'disabled',
  'blocked',
  'upstream',
  'not_found',
];

function isWorkerError(value: unknown): value is WorkerError {
  return typeof value === 'string' && (WORKER_ERRORS as readonly string[]).includes(value);
}

/** Interprets a Worker response body. Anything unexpected counts as 'unknown'. */
export function parseAskResponse(body: unknown): AskOutcome {
  if (typeof body === 'object' && body !== null) {
    const { answer, error } = body as { answer?: unknown; error?: unknown };
    if (typeof answer === 'string' && answer.trim().length > 0) {
      return { kind: 'answer', text: cleanAnswer(answer) };
    }
    if (isWorkerError(error)) return { kind: 'error', error };
  }
  return { kind: 'error', error: 'unknown' };
}

/**
 * React Native's Text can't render Markdown, and the model sometimes uses it
 * despite being asked not to. Strips emphasis and headings; turns list markers
 * into bullets.
 */
export function cleanAnswer(text: string): string {
  return text
    .replace(/\r\n/g, '\n')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/__(.+?)__/g, '$1')
    .replace(/^#{1,6}[ \t]+/gm, '')
    .replace(/^[ \t]*[-*][ \t]+/gm, '• ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export interface ErrorCopy {
  title: string;
  message: string;
  /** Offer to send the question to an external chat app instead. */
  offerHandoff: boolean;
}

/** What to tell the player for each error. */
export function errorCopy(error: AskError): ErrorCopy {
  switch (error) {
    case 'offline':
      return {
        title: 'No connection',
        message: 'Asking a ruling needs internet. Check your connection and try again.',
        offerHandoff: false,
      };
    case 'rate_limited':
      return {
        title: 'Slow down',
        message: 'Too many questions in the last minute. Try again shortly.',
        offerHandoff: false,
      };
    case 'invalid':
      return {
        title: "Couldn't ask that",
        message: `Questions must be 1 to ${MAX_QUESTION_CHARS} characters.`,
        offerHandoff: false,
      };
    case 'quota':
      return {
        title: 'Daily limit reached',
        message: "Today's free answers are used up. Ask a chat app instead?",
        offerHandoff: true,
      };
    case 'disabled':
      return {
        title: 'Rules lookup is off',
        message: 'In-app answers are switched off for now. Ask a chat app instead?',
        offerHandoff: true,
      };
    case 'blocked':
      return {
        title: 'No answer',
        message: "The AI wouldn't answer that one. Try rewording, or ask a chat app.",
        offerHandoff: true,
      };
    case 'timeout':
      return {
        title: 'Taking too long',
        message: 'The answer took too long. Try again, or ask a chat app.',
        offerHandoff: true,
      };
    case 'unauthorized':
    case 'not_found':
    case 'upstream':
    case 'unknown':
      return {
        title: "Couldn't get an answer",
        message: 'Something went wrong. Try again, or ask a chat app.',
        offerHandoff: true,
      };
  }
}

export type HandoffProvider = 'chatgpt' | 'claude';

/** Prefixes the question the way the owner asks it by hand. */
export function handoffPrompt(question: string): string {
  const q = question.trim();
  return /^in metazoo\b/i.test(q) ? q : `In MetaZoo 2025, ${q}`;
}

/** A link that opens the chat app with the question prefilled. */
export function handoffUrl(provider: HandoffProvider, question: string): string {
  const q = encodeURIComponent(handoffPrompt(question));
  switch (provider) {
    case 'chatgpt':
      return `https://chatgpt.com/?q=${q}`;
    case 'claude':
      return `https://claude.ai/new?q=${q}`;
  }
}

/** The full rules as a web page (feature 6, D22; the PDF only downloads on Android). */
export const RULEBOOK_URL = 'https://www.metazootcg.com/how-to-play/rules/full';

/** The official Errata & Compendium page. */
export const ERRATA_URL = 'https://www.metazootcg.com/how-to-play/errata';

export type AnswerSegment =
  { kind: 'text'; text: string } | { kind: 'link'; label: string; url: string };

/**
 * Text-fragment link (`#:~:text=`): Chrome scrolls to and highlights the
 * phrase. Dashes and commas are syntax in fragments, so they're escaped too.
 */
function textFragment(phrase: string): string {
  return encodeURIComponent(phrase).replace(/-/g, '%2D');
}

// The Worker asks the model to cite as [Rulebook: …] or [Compendium: …];
// parentheses are accepted too in case it drifts.
const CITATION =
  /\[(Rulebook|Compendium): ([^\]\n]{1,80})\]|\((Rulebook|Compendium): ([^)\n]{1,80})\)/g;

/**
 * Splits an answer into plain text and source links. The model only names a
 * section; the URL always comes from this list, so it can't invent links.
 * Compendium entries deep-link to their heading; the rulebook page is images,
 * so rulebook citations open the page itself.
 */
export function linkCitations(text: string): AnswerSegment[] {
  const segments: AnswerSegment[] = [];
  let last = 0;
  for (const match of text.matchAll(CITATION)) {
    const [whole, bracketSource, bracketTitle, parenSource, parenTitle] = match;
    const source = bracketSource ?? parenSource;
    const title = (bracketTitle ?? parenTitle ?? '').trim();
    const start = match.index ?? 0;
    if (start > last) segments.push({ kind: 'text', text: text.slice(last, start) });
    segments.push({
      kind: 'link',
      label: `${source}: ${title}`,
      url: source === 'Compendium' ? `${ERRATA_URL}#:~:text=${textFragment(title)}` : RULEBOOK_URL,
    });
    last = start + whole.length;
  }
  if (last < text.length) segments.push({ kind: 'text', text: text.slice(last) });
  return segments;
}
