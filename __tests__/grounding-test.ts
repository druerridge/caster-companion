import {
  assembleGrounding,
  cleanPdfText,
  extractCompendium,
  extractPageSections,
} from '../scripts/grounding';

describe('cleanPdfText', () => {
  it('keeps rules prose and drops card-image debris', () => {
    const raw = [
      'Winning the Game',
      'Players compete to win missions and earn Mission Points (MP).',
      '',
      '� 1 Caster',
      '',
      'MZ1 107/214 � EN i Sonderflex',
      '�2025 GameQbator Labs Inc. | MetaTwo Enterprises LLC',
      'C R E AT U R E Cryptid � Beast',
      '3 5',
      '78 12 310 31 23 53 53 Giant Salamander',
      'crSeeadtiumreesntoarryeRqiuftipmOennSt uwcecreessSfhual',
      '',
      '',
      '',
      'Give indicates "until end of round."',
    ].join('\n');
    expect(cleanPdfText(raw)).toBe(
      [
        'Winning the Game',
        'Players compete to win missions and earn Mission Points (MP).',
        '',
        '• 1 Caster',
        '',
        'Give indicates "until end of round."',
      ].join('\n'),
    );
  });
});

describe('extractCompendium', () => {
  it('reads each article as a titled entry and decodes entities', () => {
    const html = `
      <h2>Compendium</h2>
      <article class="x"><h3 class="y">Crocotta</h3><div><p>Does it work in a razed lane? No.</p></div></article>
      <article><h3>&#8220;Cannot&#8221; Effects &amp; More</h3><div><p>Line one.</p><p>Line&#39;s two.</p></div></article>
      <article><p>no heading</p></article>`;
    expect(extractCompendium(html)).toEqual([
      { title: 'Crocotta', text: 'Does it work in a razed lane? No.' },
      { title: '“Cannot” Effects & More', text: "Line one.\nLine's two." },
    ]);
  });
});

describe('extractPageSections', () => {
  it('splits <main> at h2/h3 headings and remembers the h2 group', () => {
    const html = `<header><h2>Nav</h2><p>menu</p></header>
      <main><h1>Organized Play</h1><script>x()</script>
        <h2>How Tournaments Play</h2><p>Swiss.</p>
        <h3 id="m">Official Mulligan Policy</h3><p>Bottom up to (2).</p>
        <h3>Match Points</h3><table><tr><th>Result</th><th>Points</th></tr><tr><td>Win</td><td>3</td></tr></table>
        <h2>Build a Local Community</h2><h3>Requirements</h3><p>A store.</p>
      </main>`;
    expect(extractPageSections(html)).toEqual([
      { group: 'How Tournaments Play', title: 'How Tournaments Play', text: 'Swiss.' },
      {
        group: 'How Tournaments Play',
        title: 'Official Mulligan Policy',
        text: 'Bottom up to (2).',
      },
      { group: 'How Tournaments Play', title: 'Match Points', text: 'Result Points\nWin 3' },
      { group: 'Build a Local Community', title: 'Requirements', text: 'A store.' },
    ]);
  });
});

describe('assembleGrounding', () => {
  it('labels web pages with their citation form', () => {
    const text = assembleGrounding({
      fullRules: 'FULL',
      quickPlay: 'QUICK',
      compendium: [],
      pages: [
        {
          label: 'Organized Play',
          sections: [{ group: 'g', title: 'Official Mulligan Policy', text: 'Bottom.' }],
        },
      ],
    });
    expect(text).toContain('cite as [Organized Play: <heading>]');
    expect(text).toContain('### Official Mulligan Policy\nBottom.');
  });

  it('puts the compendium first and labels every source', () => {
    const text = assembleGrounding({
      fullRules: 'FULL',
      quickPlay: 'QUICK',
      compendium: [{ title: 'Unique', text: 'One copy.' }],
    });
    expect(text.indexOf('COMPENDIUM')).toBeLessThan(text.indexOf('FULL RULEBOOK'));
    expect(text).toContain('### Unique\nOne copy.');
    expect(text).toContain('QUICK');
  });
});
