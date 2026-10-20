import { describe, expect, it } from 'vitest';
import { noRelevantPassage, THETA_DENSE, thetaGate } from '@/lib/answer/gate';
import type { Hits } from '@/lib/retrieval/retriever';

const hits = (denseTop?: number): Hits => Object.assign([], denseTop === undefined ? {} : { denseTop });
const EPS = 1e-9;

describe('thetaGate (D-17a)', () => {
  it('θ is 0.559 on the dense cosine', () => expect(THETA_DENSE).toBe(0.559));
  for (const r of ['dense', 'hybrid'] as const) {
    it(`${r}: refuses just below θ, passes at and just above, and reports score and θ`, () => {
      expect(thetaGate(r, hits(THETA_DENSE - EPS))).toEqual({ score: THETA_DENSE - EPS, theta: THETA_DENSE, pass: false });
      expect(thetaGate(r, hits(THETA_DENSE)).pass).toBe(true);
      expect(thetaGate(r, hits(THETA_DENSE + EPS)).pass).toBe(true);
    });
    it(`${r}: a Hits value without denseTop throws instead of skipping the gate`, () => {
      expect(() => thetaGate(r, hits())).toThrow(/no denseTop/);
    });
  }
  it('fts has no cosine: the gate does not apply and the score is null (D-17b)', () => {
    expect(thetaGate('fts', hits())).toEqual({ score: null, theta: THETA_DENSE, pass: true });
  });
  it('the refusal is NO_RELEVANT_PASSAGE with nothing in it', () => {
    expect(noRelevantPassage()).toEqual({ status: 'refused', refusal: { code: 'NO_RELEVANT_PASSAGE' }, sentences: [], citations: [], droppedSentences: 0 });
  });
});
