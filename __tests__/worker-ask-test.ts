import {
  DEFAULT_MODEL,
  buildGeminiRequest,
  handleAsk,
  readGeminiReply,
  type AskEnv,
  type AskRequest,
} from '../worker/src/ask';

const env: AskEnv = { GEMINI_API_KEY: 'test-key', APP_TOKEN: 'tok' };

function request(overrides: Partial<AskRequest> & { body?: string } = {}): AskRequest {
  const { body = JSON.stringify({ question: 'What does gain mean?' }), ...rest } = overrides;
  return {
    method: 'POST',
    path: '/ask',
    header: (name) => (name === 'x-app-token' ? 'tok' : null),
    ip: '1.2.3.4',
    bodyText: () => Promise.resolve(body),
    ...rest,
  };
}

function geminiOk(text: string) {
  return { candidates: [{ content: { parts: [{ text }] }, finishReason: 'STOP' }] };
}

function makeDeps(status = 200, json: unknown = geminiOk('Permanent.')) {
  const fetchMock = jest.fn((_url: string, _init: RequestInit) =>
    Promise.resolve({ status, json: () => Promise.resolve(json) }),
  );
  const limiter = { limit: jest.fn(() => Promise.resolve({ success: true })) };
  return {
    fetch: fetchMock as unknown as typeof fetch,
    fetchMock,
    limiter,
    grounding: 'RULES',
  };
}

describe('rules Worker', () => {
  it('answers a question via Gemini with the key, model and grounding', async () => {
    const deps = makeDeps();
    const reply = await handleAsk(request(), env, deps);
    expect(reply).toEqual({ status: 200, body: { answer: 'Permanent.' } });
    expect(deps.limiter.limit).toHaveBeenCalledWith({ key: '1.2.3.4' });

    const [url, init] = deps.fetchMock.mock.calls[0]!;
    expect(url).toBe(
      `https://generativelanguage.googleapis.com/v1beta/models/${DEFAULT_MODEL}:generateContent`,
    );
    expect((init.headers as Record<string, string>)['x-goog-api-key']).toBe('test-key');
    const body = JSON.parse(init.body as string);
    expect(body.contents[0].parts[0].text).toBe('What does gain mean?');
    expect(body.systemInstruction.parts[0].text).toContain('RULES');
  });

  it('uses the configured model', async () => {
    const deps = makeDeps();
    await handleAsk(request(), { ...env, GEMINI_MODEL: 'other-model' }, deps);
    expect(deps.fetchMock.mock.calls[0]?.[0]).toContain('/models/other-model:generateContent');
  });

  it('rejects the wrong path, method and token before doing any work', async () => {
    const deps = makeDeps();
    expect((await handleAsk(request({ path: '/' }), env, deps)).status).toBe(404);
    expect((await handleAsk(request({ method: 'GET' }), env, deps)).status).toBe(405);
    expect(await handleAsk(request({ header: () => 'nope' }), env, deps)).toEqual({
      status: 401,
      body: { error: 'unauthorized' },
    });
    expect(deps.limiter.limit).not.toHaveBeenCalled();
    expect(deps.fetchMock).not.toHaveBeenCalled();
  });

  it('honours the kill switch', async () => {
    const deps = makeDeps();
    expect(await handleAsk(request(), { ...env, KILL_SWITCH: 'on' }, deps)).toEqual({
      status: 503,
      body: { error: 'disabled' },
    });
    expect(deps.fetchMock).not.toHaveBeenCalled();
  });

  it('rate-limits per IP', async () => {
    const deps = makeDeps();
    deps.limiter.limit.mockResolvedValueOnce({ success: false });
    expect(await handleAsk(request(), env, deps)).toEqual({
      status: 429,
      body: { error: 'rate_limited' },
    });
    expect(deps.fetchMock).not.toHaveBeenCalled();
  });

  it('rejects bad bodies and questions', async () => {
    const deps = makeDeps();
    for (const body of ['not json', '{}', JSON.stringify({ question: 'x'.repeat(501) })]) {
      expect(await handleAsk(request({ body }), env, deps)).toEqual({
        status: 400,
        body: { error: 'invalid' },
      });
    }
    expect(deps.fetchMock).not.toHaveBeenCalled();
  });

  it('maps a network failure to upstream', async () => {
    const deps = makeDeps();
    deps.fetchMock.mockRejectedValueOnce(new Error('boom'));
    expect((await handleAsk(request(), env, deps)).body).toEqual({ error: 'upstream' });
  });
});

describe('readGeminiReply', () => {
  it('maps quota, failures and safety blocks', () => {
    expect(readGeminiReply(429, {}).body).toEqual({ error: 'quota' });
    expect(readGeminiReply(500, {}).body).toEqual({ error: 'upstream' });
    expect(readGeminiReply(200, { promptFeedback: { blockReason: 'SAFETY' } }).body).toEqual({
      error: 'blocked',
    });
    expect(readGeminiReply(200, { candidates: [{ finishReason: 'SAFETY' }] }).body).toEqual({
      error: 'blocked',
    });
    expect(readGeminiReply(200, { candidates: [] }).body).toEqual({ error: 'upstream' });
    expect(readGeminiReply(200, null).body).toEqual({ error: 'upstream' });
  });

  it("tells Gemini's per-minute limit apart from the daily one (D27)", () => {
    const limited = (...quotaIds: string[]) => ({
      error: {
        code: 429,
        details: [
          {
            '@type': 'type.googleapis.com/google.rpc.QuotaFailure',
            violations: quotaIds.map((quotaId) => ({ quotaId })),
          },
          { '@type': 'type.googleapis.com/google.rpc.RetryInfo', retryDelay: '14s' },
        ],
      },
    });
    expect(
      readGeminiReply(429, limited('GenerateRequestsPerMinutePerProjectPerModel-FreeTier')),
    ).toEqual({ status: 429, body: { error: 'rate_limited' } });
    expect(
      readGeminiReply(429, limited('GenerateContentInputTokensPerModelPerMinute-FreeTier')).body,
    ).toEqual({ error: 'rate_limited' });
    expect(
      readGeminiReply(429, limited('GenerateRequestsPerDayPerProjectPerModel-FreeTier')).body,
    ).toEqual({ error: 'quota' });
    expect(
      readGeminiReply(
        429,
        limited(
          'GenerateRequestsPerMinutePerProjectPerModel-FreeTier',
          'GenerateRequestsPerDayPerProjectPerModel-FreeTier',
        ),
      ).body,
    ).toEqual({ error: 'quota' });
  });

  it('joins multi-part answers', () => {
    const json = {
      candidates: [{ content: { parts: [{ text: 'Give ' }, { text: 'is temporary.' }] } }],
    };
    expect(readGeminiReply(200, json).body).toEqual({ answer: 'Give is temporary.' });
  });
});

describe('buildGeminiRequest', () => {
  it('keeps answers short and focused', () => {
    const req = buildGeminiRequest('q', 'g');
    expect(req.generationConfig.maxOutputTokens).toBeLessThanOrEqual(1000);
    expect(req.systemInstruction.parts[0]?.text).toMatch(/MetaZoo/);
  });
});
