import { askRuling } from '../src/features/rules/askClient';

function jsonResponse(body: unknown) {
  return Promise.resolve({ json: () => Promise.resolve(body) } as Response);
}

describe('askRuling', () => {
  it('posts the question with the app token and parses the answer', async () => {
    const fetchImpl = jest.fn((_url: string, _init: RequestInit) =>
      jsonResponse({ answer: 'Yes.' }),
    );
    const outcome = await askRuling('Is it?', {
      url: 'https://w.example/ask',
      token: 'tok',
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    expect(outcome).toEqual({ kind: 'answer', text: 'Yes.' });
    const [url, init] = fetchImpl.mock.calls[0]!;
    expect(url).toBe('https://w.example/ask');
    expect(init.method).toBe('POST');
    expect((init.headers as Record<string, string>)['x-app-token']).toBe('tok');
    expect(JSON.parse(init.body as string)).toEqual({ question: 'Is it?' });
  });

  it('reports the Worker as disabled until it is configured', async () => {
    expect(await askRuling('q', { url: null })).toEqual({ kind: 'error', error: 'disabled' });
  });

  it('maps a network failure to offline', async () => {
    const fetchImpl = jest.fn(() => Promise.reject(new TypeError('Network request failed')));
    expect(
      await askRuling('q', { url: 'https://w.example/ask', fetchImpl: fetchImpl as never }),
    ).toEqual({ kind: 'error', error: 'offline' });
  });

  it('times out a slow answer', async () => {
    jest.useFakeTimers();
    try {
      const fetchImpl = jest.fn(
        (_url: string, init: RequestInit) =>
          new Promise<Response>((_resolve, reject) => {
            init.signal?.addEventListener('abort', () => reject(new Error('aborted')));
          }),
      );
      const pending = askRuling('q', {
        url: 'https://w.example/ask',
        timeoutMs: 1000,
        fetchImpl: fetchImpl as unknown as typeof fetch,
      });
      jest.advanceTimersByTime(1000);
      expect(await pending).toEqual({ kind: 'error', error: 'timeout' });
    } finally {
      jest.useRealTimers();
    }
  });

  it('treats a non-JSON body as unknown', async () => {
    const fetchImpl = jest.fn(() =>
      Promise.resolve({ json: () => Promise.reject(new SyntaxError('bad')) } as Response),
    );
    expect(
      await askRuling('q', { url: 'https://w.example/ask', fetchImpl: fetchImpl as never }),
    ).toEqual({ kind: 'error', error: 'unknown' });
  });
});
