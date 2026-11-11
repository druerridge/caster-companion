// Where the app sends ruling questions (feature 7, D23). The Worker holds the
// Gemini key; nothing here is secret. APP_TOKEN must match worker/wrangler.toml.

/** The deployed Worker's /ask endpoint; null until the Worker is deployed. */
export const RULES_ASK_URL: string | null = null;

export const RULES_APP_TOKEN = 'cc-rules-v1-7f3a9c';

/** Give up on an answer after this long. */
export const ASK_TIMEOUT_MS = 20_000;
