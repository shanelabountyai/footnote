// Task 3.3: gate scoring is a pure function over verdicts; the live run is scripts/judge-gate.ts.
import { describe, expect, it } from 'vitest';
import { JUDGE_SYSTEM_PROMPT, JUDGE_SYSTEM_PROMPT_NO_KINDS } from '@/lib/eval/judge';
import { scoreGate } from '@/lib/eval/judge-gate';

const F = [
  { id: 'P1', kind: 'changed_number', plantedIndex: 1 },
  { id: 'P2', kind: 'changed_number', plantedIndex: 0 },
  { id: 'P3', kind: 'wrong_edition', plantedIndex: 0 },
  { id: 'C1', kind: 'control', plantedIndex: null },
  { id: 'C2', kind: 'control', plantedIndex: null },
];

describe('scoreGate (task 3.3)', () => {
  it('counts unsupported and partial on the planted sentence as caught; anything else on a control condemns it', () => {
    const r = scoreGate(F, {
      P1: [undefined, 'partial'], P2: ['supported'], P3: ['schema_invalid'],
      C1: ['supported', 'supported'], C2: ['supported', 'schema_invalid'],
    });
    expect(r).toMatchObject({ caught: 1, n: 3, missed: ['P2', 'P3'], condemned: ['C2'], controls: 2, pass: false });
    expect(r.byKind).toEqual({ changed_number: { caught: 1, n: 2 }, wrong_edition: { caught: 0, n: 1 } });
  });

  it('passes at ≥ 95% caught with every control clean, and throws on a missing planted verdict', () => {
    expect(scoreGate(F, { P1: [undefined, 'unsupported'], P2: ['unsupported'], P3: ['partial'], C1: ['supported'], C2: ['supported'] }).pass).toBe(true);
    expect(() => scoreGate(F, { P1: ['unsupported'], P2: ['unsupported'], P3: ['partial'], C1: ['supported'], C2: ['supported'] })).toThrow(/P1 sentence 1/);
  });

  it('the D-32 rubric drops only the error-kind list', () => {
    expect(JUDGE_SYSTEM_PROMPT_NO_KINDS).not.toBe(JUDGE_SYSTEM_PROMPT);
    expect(JUDGE_SYSTEM_PROMPT_NO_KINDS).not.toMatch(/inverted condition/);
    expect(JUDGE_SYSTEM_PROMPT_NO_KINDS).toMatch(/or the quotes contradict it\.\n/);
  });
});
