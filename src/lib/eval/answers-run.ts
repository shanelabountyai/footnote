// Pre-run estimate for `eval:answers` (task 3.7, D-35). The run refuses to start when answers plus judge calls could
// exceed the $3 run cap (D-18). Answers are priced at the composer's own ceiling on the exact prompt it will send.
// Sentences are unknown before the call, so the judge side assumes SENTENCES_PER_ANSWER per answered question, each
// judged against its JUDGE_CHUNKS largest retrieved chunks. assertBudget still checks every call against the cap.
import { estimateAnswerMicroUsd } from '@/lib/answer/compose';
import { estimateJudgeMicroUsd, JUDGE_SYSTEM_PROMPT } from '@/lib/eval/judge';

export const SENTENCES_PER_ANSWER = 3; // the most any hand-10 answer had (D-35)
export const JUDGE_CHUNKS = 3; // cited chunks per sentence; hand-10 sentences cite 1–2
const JUDGE_MARKUP_CHARS = 1_000; // the sentence, its quotes and the wrapper tags

/** `callsModel` false = refused at θ or nothing retrieved, so no answer call and no judge call. */
export type PlannedQuestion = { callsModel: boolean; promptChars: number; chunkChars: number[] };

export function estimateRunMicroUsd(qs: PlannedQuestion[], answerModel: string, judgeModel: string) {
  let answers = 0;
  let judges = 0;
  for (const q of qs.filter((x) => x.callsModel)) {
    answers += estimateAnswerMicroUsd(answerModel, q.promptChars);
    const context = [...q.chunkChars].sort((a, b) => b - a).slice(0, JUDGE_CHUNKS).reduce((a, b) => a + b, 0);
    judges += SENTENCES_PER_ANSWER * estimateJudgeMicroUsd(judgeModel, JUDGE_SYSTEM_PROMPT.length + JUDGE_MARKUP_CHARS + context);
  }
  return { answers, judges, total: answers + judges, calling: qs.filter((x) => x.callsModel).length };
}
