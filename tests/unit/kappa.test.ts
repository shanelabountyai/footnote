// Task 3.5: Cohen's κ is a pure function; κ against Shane is computed once 3.4's grades exist.
import { describe, expect, it } from 'vitest';
import { cohenKappa } from '@/lib/eval/kappa';

const rep = <T,>(x: T, k: number) => Array<T>(k).fill(x);
const YN = ['yes', 'no'] as const;

describe('cohenKappa (task 3.5)', () => {
  it('textbook 2×2: 20 yes/yes, 5 yes/no, 10 no/yes, 15 no/no → pₒ 0.7, pₑ 0.5, κ 0.4', () => {
    const a = [...rep('yes', 25), ...rep('no', 25)];
    const b = [...rep('yes', 20), ...rep('no', 5), ...rep('yes', 10), ...rep('no', 15)];
    const r = cohenKappa(a, b, YN);
    expect(r.n).toBe(50);
    expect(r.observed).toBeCloseTo(0.7, 12);
    expect(r.expected).toBeCloseTo(0.5, 12);
    expect(r.kappa).toBeCloseTo(0.4, 12);
  });

  it('perfect agreement over three labels is 1; chance-level agreement is 0', () => {
    const L = ['supported', 'partial', 'unsupported'] as const;
    const a = ['supported', 'partial', 'unsupported', 'supported'] as const;
    expect(cohenKappa(a, a, L).kappa).toBe(1);
    expect(cohenKappa(['yes', 'yes', 'no', 'no'], ['yes', 'no', 'yes', 'no'], YN).kappa).toBeCloseTo(0, 12);
  });

  it('both raters on one label: κ is null (pₑ = 1), raw agreement 1', () => {
    expect(cohenKappa(rep('yes', 5), rep('yes', 5), YN)).toEqual({ kappa: null, observed: 1, expected: 1, n: 5 });
  });

  it('throws on unequal lengths, no ratings, or a label outside the set', () => {
    expect(() => cohenKappa(['yes'], ['yes', 'no'], YN)).toThrow(/1 vs 2/);
    expect(() => cohenKappa([], [], YN)).toThrow(/no ratings/);
    expect(() => cohenKappa(['yes', 'maybe' as 'yes'], ['yes', 'no'], YN)).toThrow(/maybe/);
  });
});
