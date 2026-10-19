// Retrieval metrics for `eval:retrieval` (task 1.11). Page-level match (PRD): a retrieved chunk hits an expected
// citation when the docId matches and its page is within the citation's pageTolerance. Expected citations are
// deduplicated by (docId, page), so two fragments on one page count once.
export type ExpectedCitation = { docId: string; page: number; pageTolerance: number };
export type Ranked = { docId: string; page: number };

/** 1-based rank of the first chunk hitting each distinct expected citation, or null when none in `rows`. */
export function hitRanks(expected: ExpectedCitation[], rows: Ranked[]): (number | null)[] {
  const distinct = [...new Map(expected.map((c) => [`${c.docId}#${c.page}`, c])).values()];
  return distinct.map((c) => {
    const i = rows.findIndex((r) => r.docId === c.docId && Math.abs(r.page - c.page) <= c.pageTolerance);
    return i < 0 ? null : i + 1;
  });
}

/** Share of a question's distinct expected citations found in the top k. */
export const recallAt = (ranks: (number | null)[], k: number) => ranks.filter((r) => r !== null && r <= k).length / ranks.length;

/** Reciprocal rank of the first hit of any expected citation; 0 when nothing hits. */
export function reciprocalRank(ranks: (number | null)[]): number {
  const hits = ranks.filter((r): r is number => r !== null);
  return hits.length ? 1 / Math.min(...hits) : 0;
}

export const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
export function median(xs: number[]): number {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m]! : (s[m - 1]! + s[m]!) / 2;
}
