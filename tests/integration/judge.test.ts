// Task 3.1 acceptance, live-shaped half: fetch stubbed, and the ModelCall row each path leaves.
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { db } from '@/core/db';
import { judge, JUDGE_MAX_TOKENS, JUDGE_MODEL } from '@/lib/eval/judge';
import { BudgetExceededError, CAPS_MICRO_USD } from '@/lib/spend/budget';
import { costMicroUsd } from '@/lib/spend/prices';
import { CHUNK, CITATION, SENTENCE } from '../helpers/judge-fixture';

const reply = (text: string, usage = { input_tokens: 640, output_tokens: 48 }) =>
  vi.fn(async () => Response.json({ content: [{ type: 'text', text }], usage, stop_reason: 'end_turn' }));
const VERDICT = { verdict: 'supported', quoteIsRule: true, editionStated: true, reason: 'The 15th-day rule is quoted.' };

beforeEach(async () => {
  await db.modelCall.deleteMany();
  vi.stubEnv('ANTHROPIC_API_KEY', 'test-key');
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});
afterAll(() => db.$disconnect());

describe('judge() (task 3.1)', () => {
  it('returns the verdict and leaves one ok judge row priced from config/prices.json', async () => {
    const fetchMock = reply(JSON.stringify(VERDICT));
    vi.stubGlobal('fetch', fetchMock);

    const r = await judge(SENTENCE, [CITATION], [CHUNK], { runId: 'judge-run', answerId: 'a-1' });

    expect(r).toEqual({ ok: true, verdict: VERDICT, usage: { model: JUDGE_MODEL, inputTokens: 640, outputTokens: 48, costUsd: costMicroUsd(JUDGE_MODEL, 640, 48) / 1e6 } });
    const sent = JSON.parse((fetchMock.mock.calls[0] as unknown as [string, RequestInit])[1].body as string);
    expect(sent).toMatchObject({ model: 'claude-opus-5-5', max_tokens: JUDGE_MAX_TOKENS });
    expect(sent.messages[0].content).toContain('<citation n="1" chunk="p15-2026:9:0"');
    const rows = await db.modelCall.findMany();
    expect(rows).toEqual([expect.objectContaining({ purpose: 'judge', model: JUDGE_MODEL, outcome: 'ok', inputTokens: 640, outputTokens: 48, runId: 'judge-run', answerId: 'a-1' })]);
  });

  it('logs a schema failure as schema_invalid, counts its cost, and does not retry', async () => {
    const fetchMock = reply(`Looks supported. ${JSON.stringify(VERDICT)}`);
    vi.stubGlobal('fetch', fetchMock);

    const r = await judge(SENTENCE, [CITATION], [CHUNK]);

    expect(r).toMatchObject({ ok: false, outcome: 'schema_invalid', reason: 'not a single JSON value' });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [row] = await db.modelCall.findMany();
    expect(row).toMatchObject({ purpose: 'judge', outcome: 'schema_invalid', costMicroUsd: costMicroUsd(JUDGE_MODEL, 640, 48) });
  });

  it('checks the budget before the call: over the run cap → BudgetExceededError, no fetch, a budget_exceeded row', async () => {
    await db.modelCall.create({ data: { purpose: 'judge', model: JUDGE_MODEL, costMicroUsd: CAPS_MICRO_USD.run, runId: 'full-run' } });
    const fetchMock = reply(JSON.stringify(VERDICT));
    vi.stubGlobal('fetch', fetchMock);

    await expect(judge(SENTENCE, [CITATION], [CHUNK], { runId: 'full-run' })).rejects.toBeInstanceOf(BudgetExceededError);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(await db.modelCall.count({ where: { purpose: 'judge', outcome: 'budget_exceeded', runId: 'full-run' } })).toBe(1);
  });

  it('refuses a model that is not allowed at runtime (D-4) before any call', async () => {
    vi.stubGlobal('fetch', reply('{}'));
    await expect(judge(SENTENCE, [CITATION], [CHUNK], { model: 'claude-fable-5-1' })).rejects.toThrow(/not a runtime model/);
    expect(await db.modelCall.count()).toBe(0);
  });
});
