import { parseAskResponse, type AskOutcome } from '@/domain/rulings';

import { ASK_TIMEOUT_MS, RULES_APP_TOKEN, RULES_ASK_URL } from './askConfig';

interface AskOptions {
  url?: string | null;
  token?: string;
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
}

/** Sends a question to the rules Worker. Never throws; failures come back as errors. */
export async function askRuling(question: string, options: AskOptions = {}): Promise<AskOutcome> {
  const {
    url = RULES_ASK_URL,
    token = RULES_APP_TOKEN,
    timeoutMs = ASK_TIMEOUT_MS,
    fetchImpl = fetch,
  } = options;
  if (!url) return { kind: 'error', error: 'disabled' };

  const controller = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);
  try {
    const res = await fetchImpl(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-app-token': token },
      body: JSON.stringify({ question }),
      signal: controller.signal,
    });
    const body: unknown = await res.json().catch(() => null);
    return parseAskResponse(body);
  } catch {
    // fetch rejects with a TypeError when there's no network.
    return { kind: 'error', error: timedOut ? 'timeout' : 'offline' };
  } finally {
    clearTimeout(timer);
  }
}
