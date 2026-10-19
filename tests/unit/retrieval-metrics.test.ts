import { describe, expect, it } from 'vitest';
import { hitRanks, median, recallAt, reciprocalRank } from '@/lib/eval/retrieval-metrics';

const c = (docId: string, page: number, pageTolerance = 1) => ({ docId, page, pageTolerance });

describe('retrieval metrics', () => {
  it('matches by doc and page within tolerance, deduping (doc, page)', () => {
    const rows = [{ docId: 'x', page: 9 }, { docId: 'a', page: 3 }, { docId: 'b', page: 7 }];
    expect(hitRanks([c('a', 4), c('a', 4), c('b', 9)], rows)).toEqual([2, null]);
    expect(hitRanks([c('b', 8)], rows)).toEqual([3]);
  });
  it('recall@k is the share of citations in the top k; MRR uses the first hit', () => {
    expect(recallAt([2, null], 1)).toBe(0);
    expect(recallAt([2, null], 5)).toBe(0.5);
    expect(recallAt([1, 4], 5)).toBe(1);
    expect(reciprocalRank([4, 2])).toBe(0.5);
    expect(reciprocalRank([null])).toBe(0);
  });
  it('median of odd, even and empty lists', () => {
    expect(median([3, 1, 2])).toBe(2);
    expect(median([4, 1, 2, 3])).toBe(2.5);
    expect(median([])).toBe(0);
  });
});
