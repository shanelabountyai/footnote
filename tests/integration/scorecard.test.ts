// Task 3.9 acceptance: the scorecard reads stored rows only (no fetch), and schema-invalid answer calls are counted
// apart from model refusals (D-44).
import { randomUUID } from 'node:crypto';
import { afterAll, afterEach, describe, expect, it, vi } from 'vitest';
import { db } from '@/core/db';
import { buildScorecard, type Cell } from '@/lib/eval/scorecard';
import { snapshotId } from '@/lib/retrieval/snapshot';

const runId = 'scorecard-test';
const cell: Cell = { runId, retriever: 'dense', model: 'claude-haiku-5-5', judge: null, theta: 'off' };
const base = { orgId: randomUUID(), userId: null, runId, snapshot: snapshotId(), retriever: 'dense', theta: 0.559, sentences: [], citations: [], droppedSentences: 0, status: 'refused' as const };

afterEach(async () => {
  vi.unstubAllGlobals();
  await db.answer.deleteMany({ where: { runId } });
  await db.modelCall.deleteMany({ where: { runId } });
});
afterAll(() => db.$disconnect());

describe('buildScorecard (task 3.9)', () => {
  it('makes zero fetch calls and splits refusals into pre-call, schema_invalid and model', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const bad = randomUUID();
    await db.answer.createMany({ data: [
      { ...base, id: randomUUID(), goldenId: 'GU-01', question: 'q', callerRole: 'front_desk', model: null, thetaScore: 0.5, refusalCode: 'NO_RELEVANT_PASSAGE' },
      { ...base, id: bad, goldenId: 'GA-01', question: 'q', callerRole: 'front_desk', model: 'claude-haiku-5-5', thetaScore: 0.69, refusalCode: 'INSUFFICIENT_SUPPORT' },
      { ...base, id: randomUUID(), goldenId: 'GA-02', question: 'q', callerRole: 'front_desk', model: 'claude-haiku-5-5', thetaScore: 0.55, refusalCode: 'INSUFFICIENT_SUPPORT' },
    ] });
    await db.modelCall.create({ data: { purpose: 'answer', model: 'claude-haiku-5-5', outcome: 'schema_invalid', costMicroUsd: 1, runId, answerId: bad } });

    const md = await buildScorecard({ snapshot: base.snapshot, cells: [cell], date: '2026-10-28' });

    expect(fetchMock).not.toHaveBeenCalled();
    expect(md).toContain('0/2 (0%); refused by cause: pre-call 0, schema_invalid 1, model 1');
    expect(md).toContain('| dense+haiku θ off | 0.559 | 1/1 (100%) | 1/1 (100%) |'); // GU-01 below θ′ → pre-call
    expect(md).toContain('**JUDGE UNCALIBRATED**');
  });
});
