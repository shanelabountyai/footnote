import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { db } from '@/core/db';
import { assertBudget, BudgetExceededError, CAPS_MICRO_USD, recordCall, spentMicroUsd } from '@/lib/spend/budget';
import { costMicroUsd, PRICE_MAX_AGE_DAYS, priceAgeDays, prices } from '@/lib/spend/prices';

beforeEach(() => db.modelCall.deleteMany());
afterAll(() => db.$disconnect());

describe('prices (D-18)', () => {
  it('prices a Sonnet 5.5 answer in micro-USD from config/prices.json, no floats stored', () => {
    // 3,500 in × $2/MTok + 350 out × $10/MTok = 7,000 + 3,500 micro-USD = $0.0105
    expect(costMicroUsd('claude-sonnet-5-5', 3500, 350)).toBe(10_500);
    expect(costMicroUsd('voyage-4-lite', 1_000_000)).toBe(20_000); // $0.02 per MTok
  });
  it('refuses to price an unknown model', () => {
    expect(() => costMicroUsd('claude-made-up-9', 1, 1)).toThrow(/no price for model/);
  });
  it('flags a price table older than 60 days', () => {
    expect(priceAgeDays(new Date(prices.checkedAt))).toBe(0);
    expect(priceAgeDays(new Date(Date.parse(prices.checkedAt) + 61 * 86_400_000))).toBeGreaterThan(PRICE_MAX_AGE_DAYS);
  });
});

describe('assertBudget (D-18): refused before the call, logged as BUDGET_EXCEEDED', () => {
  it('refuses a call that would exceed the $0.10 per-answer cap and logs the refusal', async () => {
    await recordCall({ purpose: 'answer', model: 'claude-sonnet-5-5', inputTokens: 45_000, outputTokens: 500, answerId: 'ans_1' }); // $0.095
    expect(await spentMicroUsd({ answerId: 'ans_1' })).toBe(95_000);
    const err = await assertBudget({ purpose: 'answer', model: 'claude-sonnet-5-5', estimateMicroUsd: 10_000, answerId: 'ans_1' }).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(BudgetExceededError);
    expect((err as BudgetExceededError).code).toBe('BUDGET_EXCEEDED');
    expect((err as BudgetExceededError).scope).toBe('answer');
    const refused = await db.modelCall.findMany({ where: { outcome: 'budget_exceeded' } });
    expect(refused).toHaveLength(1);
    expect(refused[0]!.costMicroUsd).toBe(10_000);
    expect(await spentMicroUsd({ answerId: 'ans_1' })).toBe(95_000); // the refusal did not spend
  });
  it('a paid call whose output failed the schema still counts as spend (task 2.2)', async () => {
    await recordCall({ purpose: 'answer', model: 'claude-sonnet-5-5', inputTokens: 3500, outputTokens: 350, answerId: 'ans_3', outcome: 'schema_invalid' });
    expect((await db.modelCall.findFirstOrThrow()).outcome).toBe('schema_invalid');
    expect(await spentMicroUsd({ answerId: 'ans_3' })).toBe(10_500);
  });
  it('lets a call through under every cap', async () => {
    await expect(assertBudget({ purpose: 'embed', model: 'voyage-4-lite', estimateMicroUsd: 7, runId: 'run_1' })).resolves.toBeUndefined();
    expect(await db.modelCall.count()).toBe(0);
  });
  it('enforces the $3 per-run cap across purposes within one run', async () => {
    await recordCall({ purpose: 'judge', model: 'claude-opus-5-5', inputTokens: 700_000, outputTokens: 5_000, runId: 'run_2' }); // $2.90
    const err = await assertBudget({ purpose: 'answer', model: 'claude-sonnet-5-5', estimateMicroUsd: 200_000, runId: 'run_2' }).catch((e: unknown) => e);
    expect((err as BudgetExceededError).scope).toBe('run');
    expect(CAPS_MICRO_USD.run).toBe(3_000_000);
  });
});
