import { userTurn } from '../worker/src/ask';
import {
  buildCardIndex,
  cardUrlsFromSitemap,
  editDistance,
  formatCard,
  loadIndex,
  matchCards,
  parseCardPage,
  refreshCards,
  rulesWordsFrom,
  storeIndex,
  tokenize,
  type Card,
  type StoredIndex,
} from '../worker/src/cards';
import { fitExtras, selectRulings, type DevRuling } from '../worker/src/devRulings';

// Synthetic page in the official layout (D29); the text is invented.
const PAGE = `<html><body><main><nav><a href="/cards">← Back to Cards</a></nav><div>
<article class="a"><header class="h"><p class="s">Base Set<!-- --> · <!-- -->MZ1<!-- --> #<!-- -->25</p>
<h1 class="n">Test Bird</h1><div><span class="t"><span class="i" style="mask-image:url(/brand/aura/air.png)"></span>Air</span><span>Rare</span><span>Creature</span></div></header>
<dl><div><dt>Cost</dt><dd>6</dd></div><div><dt>Influence</dt><dd>4</dd></div><div><dt>Artist</dt><dd>Someone</dd></div><div><dt>Aura Enhanceable</dt><dd>Yes</dd></div></dl>
<div class="r"><span>Traits</span><span>Cryptid</span><span>Aerial</span></div>
<div class="r"><span>Keywords</span><span>Soar</span></div>
<section class="ab"><h3>Gust</h3><p>[Tap 1 Air Aura]: Move this creature.</p></section>
<blockquote>Flavour text that should be dropped.</blockquote>
<nav><a href="/card/MZ1/24">← #24</a></nav></article></div></main></body></html>`;

function card(name: string, set = 'MZ1', num = 1): Card {
  return { name, set, setName: 'Set', num, url: `u/${set}/${num}`, line: '', text: '' };
}

describe('parseCardPage', () => {
  it('reads name, set, type line, stats, rows and abilities, dropping artist and flavour', () => {
    const c = parseCardPage(PAGE, 'https://www.metazootcg.com/card/MZ1/25');
    expect(c).toEqual({
      name: 'Test Bird',
      set: 'MZ1',
      setName: 'Base Set',
      num: 25,
      url: 'https://www.metazootcg.com/card/MZ1/25',
      line: 'Air Creature, Rare',
      text: [
        'Cost 6 · Influence 4 · Aura Enhanceable Yes',
        'Traits Cryptid, Aerial · Keywords Soar',
        'Gust: [Tap 1 Air Aura]: Move this creature.',
      ].join('\n'),
    });
    expect(formatCard(c!)).toBe(
      `### Test Bird (Base Set MZ1 #25) — Air Creature, Rare\n${c!.text}`,
    );
  });

  it('reads strategy card text, which has no ability name', () => {
    const strategy = PAGE.replace(
      /<section class="ab">[\s\S]*?<\/section>/,
      '<section><p>You may give +3 Influence to a creature in each lane.</p></section>',
    );
    expect(parseCardPage(strategy, 'x')?.text.split('\n').at(-1)).toBe(
      'You may give +3 Influence to a creature in each lane.',
    );
  });

  it('rejects pages that are not card pages', () => {
    expect(parseCardPage('<main><h1>Cards</h1></main>', 'x')).toBeNull();
  });
});

describe('cardUrlsFromSitemap', () => {
  it('keeps only card pages, deduped', () => {
    const xml = `<urlset><url><loc>https://www.metazootcg.com/cards</loc></url>
      <url><loc>https://www.metazootcg.com/card/MZ1/1</loc></url>
      <url><loc>https://www.metazootcg.com/card/MZ2/10</loc><lastmod>x</lastmod></url>
      <url><loc>https://www.metazootcg.com/card/MZ1/1</loc></url></urlset>`;
    expect(cardUrlsFromSitemap(xml)).toEqual([
      'https://www.metazootcg.com/card/MZ1/1',
      'https://www.metazootcg.com/card/MZ2/10',
    ]);
  });
});

describe('matching helpers', () => {
  it('tokenizes like players type', () => {
    expect(tokenize('Does Stormbringer’s ability work with the Three-Legged Crow?')).toEqual([
      'stormbringer',
      'ability',
      'work',
      'three',
      'legged',
      'crow',
    ]);
  });

  it('measures typos, including transpositions, and gives up early', () => {
    expect(editDistance('stormbriner', 'stormbringer')).toBe(1);
    expect(editDistance('pukwudige', 'pukwudgie')).toBe(1);
    expect(editDistance('abc', 'xyzxyz')).toBe(3);
  });
});

describe('matchCards (recall first)', () => {
  const index = buildCardIndex(
    [
      card('Goofus Bird', 'MZ1', 7),
      card('Piasa Bird', 'MZ1', 25),
      card('Thunderbird', 'MZ1', 30),
      card('Stormbringer', 'MZ1', 170),
      card('Three-Legged Crow', 'MZ2', 10),
      card('Archive', 'MZ1', 1),
      card('Pukwudgie, Homeland Protector', 'MZ2', 50),
      card('New York City Sewers', 'MZ3', 60),
      card('Thermal Column', 'MZ2', 70),
      card('Bulk Up', 'MZ2', 80),
      card('Sword of Surtr', 'MZ3', 90),
      card('Dingbell Toolkit', 'MZ3', 91),
      card('Goofus Bird', 'MZ3', 5), // reprint
    ],
    rulesWordsFrom(
      'creature creature creature creature creature lane lane lane lane lane soar soar soar soar soar',
    ),
  );
  const names = (q: string) => matchCards(q, index).map((c) => c.name);

  it.each([
    ['does goofus work with piasa', ['Goofus Bird', 'Piasa Bird']],
    ['stormbriner vs the crow', ['Stormbringer', 'Three-Legged Crow']],
    ['can archive move a soar creature', ['Archive']],
    [
      'pukwudige into a lane with ny city sewers',
      ['Pukwudgie, Homeland Protector', 'New York City Sewers'],
    ],
    ['if i play bulk up with thermal colum is it cheaper', ['Bulk Up', 'Thermal Column']],
    ['does the dingbell trigger on any lane', ['Dingbell Toolkit']],
    ['sword of surtur is unique right', ['Sword of Surtr']],
    ['storm bringer with thunder bird', ['Stormbringer', 'Thunderbird']],
  ])('%s', (question, wanted) => {
    const got = names(question);
    for (const w of wanted) expect(got).toContain(w);
  });

  it('caps at 5, dedupes reprints to the newest, and fills free slots with near matches', () => {
    const got = matchCards('goofus bird vs piasa bird vs thunderbird', index);
    expect(got.length).toBeLessThanOrEqual(5);
    expect(got.filter((c) => c.name === 'Goofus Bird')).toEqual([
      expect.objectContaining({ set: 'MZ3', num: 5 }),
    ]);
    expect(matchCards('what does bird mean', index).length).toBeGreaterThan(1);
  });

  it('does not treat unrelated long words as typos (gave-up distance is not a match)', () => {
    const idx = buildCardIndex([card('Grootslang— The Formidable'), card('Archive')]);
    expect(
      matchCards('if multiple moves happen in a turn would archive add +2 each time', idx).map(
        (c) => c.name,
      ),
    ).toEqual(['Archive']);
  });

  it('returns nothing when no name is anywhere near the question', () => {
    expect(names('how many aura can i have in play')).toEqual([]);
  });
});

describe('userTurn', () => {
  it('puts card text ahead of the question, and leaves plain questions alone', () => {
    expect(userTurn('q?')).toBe('q?');
    const text = userTurn('q?', [{ ...card('Archive'), line: 'Air Caster', text: 'Cost 2' }]);
    expect(text).toMatch(/^=== CARD TEXT/);
    expect(text).toContain('### Archive (Set MZ1 #1) — Air Caster\nCost 2');
    expect(text.endsWith('=== QUESTION ===\n\nq?')).toBe(true);
  });
});

describe('stored index (D29)', () => {
  it('round-trips: a loaded index matches like a freshly built one', () => {
    const all = [
      card('Goofus Bird', 'MZ1', 7),
      card('Piasa Bird', 'MZ1', 25),
      card('Goofus Bird', 'MZ3', 5),
    ];
    const stored = JSON.parse(JSON.stringify(storeIndex(all))) as StoredIndex;
    expect(stored.cards).toHaveLength(2);
    expect(stored.otherUrls).toEqual(['u/MZ1/7']);
    const q = 'does goofus work with piasa';
    expect(matchCards(q, loadIndex(stored))).toEqual(matchCards(q, buildCardIndex(all)));
  });
});

describe('refreshCards (D29)', () => {
  const url = (n: number) => `https://www.metazootcg.com/card/MZ1/${n}`;
  const sitemap = (ns: number[]) =>
    `<urlset>${ns.map((n) => `<url><loc>${url(n)}</loc></url>`).join('')}</urlset>`;
  const pageFor = (n: number) =>
    PAGE.replace('Test Bird', `Bird ${'abcdefghij'[n]}`).replace('#<!-- -->25', `#<!-- -->${n}`);

  function setup(
    stored: StoredIndex | null,
    sitemapNs: number[],
    pages: Record<string, string | number>,
  ) {
    const fetched: string[] = [];
    const puts: StoredIndex[] = [];
    const deps = {
      fetch: (u: string) => {
        fetched.push(u);
        const body = u.endsWith('sitemap.xml') ? sitemap(sitemapNs) : pages[u];
        const status = typeof body === 'number' ? body : 200;
        return Promise.resolve({
          ok: status === 200,
          status,
          text: () => Promise.resolve(String(body)),
        });
      },
      get: () => Promise.resolve(stored),
      put: (i: StoredIndex) => {
        puts.push(i);
        return Promise.resolve();
      },
    };
    return { deps, fetched, puts };
  }

  it('reports not seeded without fetching', async () => {
    const { deps, fetched } = setup(null, [1], {});
    await expect(refreshCards(deps)).resolves.toEqual({ added: [], pending: -1 });
    expect(fetched).toEqual([]);
  });

  it('adds at most the limit of missing cards and writes once', async () => {
    const stored = storeIndex([{ ...card('Bird b'), url: url(1) }]);
    const pages = { [url(2)]: pageFor(2), [url(3)]: pageFor(3), [url(4)]: pageFor(4) };
    const { deps, fetched, puts } = setup(stored, [1, 2, 3, 4], pages);
    await expect(refreshCards(deps, 2)).resolves.toEqual({
      added: ['Bird c', 'Bird d'],
      pending: 1,
    });
    expect(fetched).not.toContain(url(1));
    expect(puts).toHaveLength(1);
    expect(puts[0]?.cards.map((c) => c.name).sort()).toEqual(['Bird b', 'Bird c', 'Bird d']);
  });

  it('skips transient failures, remembers unparseable pages, and does not write when nothing changed', async () => {
    const stored = storeIndex([{ ...card('Bird b'), url: url(1) }]);
    const flaky = setup(stored, [1, 2], { [url(2)]: 503 });
    await expect(refreshCards(flaky.deps)).resolves.toEqual({ added: [], pending: 0 });
    expect(flaky.puts).toEqual([]);

    const junk = setup(stored, [1, 2], { [url(2)]: '<html>not a card</html>' });
    await refreshCards(junk.deps);
    expect(junk.puts[0]?.otherUrls).toContain(url(2));

    const same = setup(stored, [1], {});
    await refreshCards(same.deps);
    expect(same.puts).toEqual([]);
  });
});

describe('dev rulings (D29)', () => {
  const rulings: DevRuling[] = [
    {
      title: 'Archive and repeated moves',
      cards: ['Archive'],
      terms: ['move'],
      text: 'Each move counts.',
    },
    { title: 'Swapping aura', cards: [], terms: ['swap', 'aura'], text: 'Swaps are not plays.' },
    { title: 'Unrelated', cards: [], terms: ['lane'], text: 'x' },
  ];

  it('selects rulings by matched card or two matching terms, best first', () => {
    expect(
      selectRulings('can archive trigger on every move', [card('Archive')], rulings).map(
        (r) => r.title,
      ),
    ).toEqual(['Archive and repeated moves']);
    expect(selectRulings('if i swap an aura', [], rulings).map((r) => r.title)).toEqual([
      'Swapping aura',
    ]);
    expect(selectRulings('what is a lane', [], rulings)).toEqual([]);
  });

  it('fits cards before rulings within the token budget', () => {
    const big = { ...card('Archive'), text: 'x'.repeat(700) };
    const small = rulings[1]!;
    expect(fitExtras([big], [small], formatCard, 220)).toEqual({ cards: [big], rulings: [] });
    expect(fitExtras([big], [small], formatCard, 1000).rulings).toEqual([small]);
    expect(fitExtras([big], [small], formatCard, 50)).toEqual({ cards: [], rulings: [small] });
  });

  it('adds a DEV RULINGS section to the user turn', () => {
    const text = userTurn('q?', [], [rulings[1]!]);
    expect(text).toContain('### Swapping aura\nSwaps are not plays.');
    expect(text).toMatch(/=== DEV RULINGS/);
    expect(text.endsWith('=== QUESTION ===\n\nq?')).toBe(true);
  });
});
