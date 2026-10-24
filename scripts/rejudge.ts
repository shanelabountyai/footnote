// `npm run eval:rejudge -- --model=<judge model>` (task 3.6, D-19). Re-judges the 20 sentences of `eval/grades.md` (by
// their `<!-- key answerId:idx -->` comments) with another judge model, into SentenceJudgment under its own run id, so
// its κ against Shane can be set beside Opus's. Prints counts and spend only, never verdicts: Shane may still be grading.
// Idempotent: a sentence already judged by this model and prompt is skipped.
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { parseArgs } from 'node:util';
import { db } from '@/core/db';
import type { Citation } from '@/lib/answer/verify';
import { estimateJudgeMicroUsd, judge, JUDGE_SYSTEM_PROMPT } from '@/lib/eval/judge';
import { chunksById } from '@/lib/retrieval/retriever';

const SOURCE_RUN = 'answers:hybrid:claude-sonnet-5-5:theta-on:2026-10-23T1646';
const { values: args } = parseArgs({ options: { model: { type: 'string', default: 'claude-sonnet-5-5' } } });
const model = args.model!;
const runId = `rejudge:${model}:${SOURCE_RUN.split(':').at(-1)}`;
const promptHash = createHash('sha256').update(JUDGE_SYSTEM_PROMPT).digest('hex').slice(0, 12);
const usd = (micro: number) => `$${(micro / 1e6).toFixed(4)}`;

const keys = [...readFileSync('eval/grades.md', 'utf8').matchAll(/<!-- key ([0-9a-f-]{36}):(\d+) -->/g)].map((m) => ({ answerId: m[1]!, idx: Number(m[2]) }));
if (keys.length !== 20) throw new Error(`expected 20 keys in eval/grades.md, got ${keys.length}`);

let estimate = 0, spent = 0, judged = 0, skipped = 0, invalid = 0;
for (const { answerId, idx } of keys) {
  if (await db.sentenceJudgment.findFirst({ where: { answerId, sentenceIndex: idx, model, promptHash } })) { skipped++; continue; }
  const a = await db.answer.findUniqueOrThrow({ where: { id: answerId } });
  if (a.runId !== SOURCE_RUN) throw new Error(`${answerId} is from ${a.runId}, not ${SOURCE_RUN}`);
  const s = (a.sentences as { text: string; citations: string[] }[])[idx]!;
  const cites = s.citations.map((id) => (a.citations as Citation[]).find((c) => c.id === id)!);
  // Same org + tier predicate as retrieval (non-negotiable 3), as the question's own caller.
  const byId = new Map((await chunksById(a.snapshot, { orgId: a.orgId, role: a.callerRole }, cites.map((c) => c.chunkId))).map((c) => [c.chunkId, c]));
  estimate += estimateJudgeMicroUsd(model, JUDGE_SYSTEM_PROMPT.length + s.text.length + [...byId.values()].reduce((n, c) => n + c.text.length, 0));
  const r = await judge(s.text, cites, cites.map((c) => byId.get(c.chunkId)!), { model, runId, answerId });
  await db.sentenceJudgment.create({ data: {
    runId, answerId, sentenceIndex: idx, model, promptHash, outcome: r.ok ? 'ok' : 'schema_invalid',
    verdict: r.ok ? r.verdict.verdict : null, quoteIsRule: r.ok ? r.verdict.quoteIsRule : null,
    editionStated: r.ok ? r.verdict.editionStated : null, reason: r.ok ? r.verdict.reason : r.reason,
  } });
  spent += Math.round(r.usage.costUsd * 1e6); judged++; if (!r.ok) invalid++;
}
console.log(`${runId}: judged ${judged}, skipped ${skipped} (already stored), schema_invalid ${invalid}; spend ${usd(spent)} (rough estimate ${usd(estimate)}). Verdicts are in SentenceJudgment, not printed.`);
await db.$disconnect();
