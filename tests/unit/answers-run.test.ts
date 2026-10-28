import { describe, expect, it } from 'vitest';
import { estimateAnswerMicroUsd } from '@/lib/answer/compose';
import { estimateRunMicroUsd, JUDGE_CHUNKS, SENTENCES_PER_ANSWER } from '@/lib/eval/answers-run';
import { estimateJudgeMicroUsd, JUDGE_SYSTEM_PROMPT } from '@/lib/eval/judge';

const S = 'claude-sonnet-5-5';
const O = 'claude-opus-5-5';

describe('estimateRunMicroUsd (task 3.7)', () => {
  it('prices a calling question at the answer ceiling plus SENTENCES_PER_ANSWER judge calls over its largest chunks', () => {
    const chunks = [100, 900, 300, 700];
    const e = estimateRunMicroUsd([{ callsModel: true, promptChars: 6_000, chunkChars: chunks }], S, O);
    expect(JUDGE_CHUNKS).toBe(3);
    expect(e.answers).toBe(estimateAnswerMicroUsd(S, 6_000));
    expect(e.judges).toBe(SENTENCES_PER_ANSWER * estimateJudgeMicroUsd(O, JUDGE_SYSTEM_PROMPT.length + 1_000 + 900 + 700 + 300));
    expect(e.total).toBe(e.answers + e.judges);
    expect(e.calling).toBe(1);
  });

  it('a question refused before the model costs nothing', () => {
    expect(estimateRunMicroUsd([{ callsModel: false, promptChars: 6_000, chunkChars: [900] }], S, O)).toEqual({ answers: 0, judges: 0, total: 0, calling: 0 });
  });

  it('with no judge (--judge=none, D-43) only the answer is priced', () => {
    const e = estimateRunMicroUsd([{ callsModel: true, promptChars: 6_000, chunkChars: [900, 700] }], S, null);
    expect(e).toEqual({ answers: estimateAnswerMicroUsd(S, 6_000), judges: 0, total: estimateAnswerMicroUsd(S, 6_000), calling: 1 });
  });

  it('a larger prompt never estimates lower', () => {
    const at = (chars: number) => estimateRunMicroUsd([{ callsModel: true, promptChars: chars, chunkChars: [chars / 10] }], S, O).total;
    expect(at(20_000)).toBeGreaterThan(at(2_000));
  });
});
