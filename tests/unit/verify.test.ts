import { describe, expect, it } from 'vitest';
import type { AnswerOutput } from '@/lib/answer/output';
import { normalizeQuote, verifyCitations, type DocMeta } from '@/lib/answer/verify';
import type { RetrievedChunk } from '@/lib/retrieval/retriever';

const chunk = (chunkId: string, docId: string, page: number, text: string): RetrievedChunk =>
  ({ chunkId, docId, tier: 'public', page, heading: 'Recordkeeping', isTable: false, text, score: 0.7 });
const retrieved = [
  chunk('p15-2026#9#0', 'p15-2026', 9, 'Keep all records of employment\ntaxes for at least 4 years. The “lookback period” is a 12‑month span – see below.'),
  chunk('p583-2024#20#1', 'p583-2024', 20, 'Keep records for 4 years from the date the tax becomes due or is paid, whichever is later.'),
];
const docs: Record<string, DocMeta> = {
  'p15-2026': { title: 'Publication 15', edition: 'For use in 2026', revisionDate: '2025-12-18' },
  'p583-2024': { title: 'Publication 583', edition: 'Rev. December 2024', revisionDate: '2024-12-01' },
};
const s = (sentence: string, cites: [string, string][]) => ({ sentence, chunkIds: cites.map((c) => c[0]), quotes: cites.map((c) => c[1]) });
const verify = (sentences: AnswerOutput['sentences'], outOfScope?: boolean) => verifyCitations({ sentences, outOfScope }, retrieved, docs);

describe('verifyCitations (task 2.3)', () => {
  it('keeps a quote across a line break and with ASCII quotes/dashes for curly ones', () => {
    const v = verify([s('Keep them 4 years.', [['p15-2026#9#0', 'Keep all records of employment taxes for at least 4 years.']]),
      s('A lookback period exists.', [['p15-2026#9#0', 'The "lookback period" is a 12‑month span - see below.']])]);
    expect(v).toMatchObject({ status: 'answered', refusal: null, droppedSentences: 0 });
    expect(v.sentences.map((x) => x.citations)).toEqual([['c1'], ['c2']]);
  });

  it('fills edition, revisionDate, page and section from the manifest and chunk row', () => {
    const out = { sentences: [{ ...s('Four years.', [['p583-2024#20#1', 'whichever is later']]), page: 99, edition: '1999' }] };
    const v = verifyCitations(out as AnswerOutput, retrieved, docs);
    expect(v.citations).toEqual([{ id: 'c1', docId: 'p583-2024', title: 'Publication 583', edition: 'Rev. December 2024',
      revisionDate: '2024-12-01', location: { page: 20, section: 'Recordkeeping' }, chunkId: 'p583-2024#20#1',
      quote: 'whichever is later', score: 0.7, tier: 'public' }]);
  });

  it('drops a paraphrase, a chunk that was not retrieved, and a doc with no manifest entry; counts the sentences', () => {
    const v = verify([
      s('Paraphrased.', [['p15-2026#9#0', 'Employment tax records must be kept four years.']]),
      s('Not retrieved.', [['p15-2025#9#0', 'Keep all records of employment taxes']]),
      s('Kept, one of two citations survives.', [['p583-2024#20#1', 'four yrs'], ['p583-2024#20#1', 'Keep records for 4 years']]),
    ]);
    expect(v).toMatchObject({ status: 'partial', droppedSentences: 2, sentences: [{ text: 'Kept, one of two citations survives.', citations: ['c1'] }] });
    expect(v.citations).toHaveLength(1);
    expect(verifyCitations({ sentences: [s('x', [['p15-2026#9#0', 'Keep all records']])] }, retrieved, {}).status).toBe('refused');
  });

  it('refuses INSUFFICIENT_SUPPORT when every sentence fails, or there are none, even if outOfScope', () => {
    const all = verify([s('a', [['p15-2026#9#0', 'nope']]), s('b', [['zzz', 'Keep']])], true);
    expect(all).toEqual({ status: 'refused', refusal: { code: 'INSUFFICIENT_SUPPORT' }, sentences: [], citations: [], droppedSentences: 2 });
    expect(verify([])).toMatchObject({ status: 'refused', refusal: { code: 'INSUFFICIENT_SUPPORT' }, droppedSentences: 0 });
  });

  it('carries OUT_OF_SCOPE beside an answer (D-8, GU-03) and dedupes a repeated quote', () => {
    const q: [string, string] = ['p583-2024#20#1', 'Keep records for 4 years'];
    const v = verify([s('One.', [q]), s('Two.', [q])], true);
    expect(v).toMatchObject({ status: 'answered', refusal: { code: 'OUT_OF_SCOPE' } });
    expect(v.citations).toHaveLength(1);
    expect(v.sentences.map((x) => x.citations)).toEqual([['c1'], ['c1']]);
  });

  it('normalizes nothing beyond whitespace, quotes and dashes', () => {
    expect(normalizeQuote(' “a” ‘b’ –\n— ')).toBe(`"a" 'b' - -`);
    expect(normalizeQuote('Tax')).not.toBe(normalizeQuote('tax'));
  });
});
