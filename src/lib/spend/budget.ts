// Spend caps enforced before the call (D-18): $25 whole build, $3 per eval run, $0.10 per answer.
// Design ported from OpsAgent src/opsagent/ledger.py (guard() before every call, BudgetExceeded, spend as a view
// over logged calls); re-expressed over the ModelCall table (D-23).
import { db } from '@/core/db';
import type { ModelCallOutcome, ModelPurpose } from '@/generated/prisma/client';
import { costMicroUsd } from './prices';

export const CAPS_MICRO_USD = { build: 25_000_000, run: 3_000_000, answer: 100_000 } as const;
export type CapScope = keyof typeof CAPS_MICRO_USD;

export class BudgetExceededError extends Error {
  readonly code = 'BUDGET_EXCEEDED' as const;
  constructor(readonly scope: CapScope, readonly spentMicroUsd: number, readonly estimateMicroUsd: number) {
    super(`BUDGET_EXCEEDED: ${scope} cap $${CAPS_MICRO_USD[scope] / 1e6} — spent $${spentMicroUsd / 1e6} + estimate $${estimateMicroUsd / 1e6}`);
  }
}

type Scope = { runId?: string | null; answerId?: string | null };

/** Micro-USD of completed calls, optionally within one run or one answer. Refused rows never count; a paid call
 * whose output failed the schema does. */
export async function spentMicroUsd(where: Scope = {}): Promise<number> {
  const r = await db.modelCall.aggregate({ _sum: { costMicroUsd: true }, where: { outcome: { not: 'budget_exceeded' }, ...where } });
  return r._sum.costMicroUsd ?? 0;
}

/**
 * Refuses, logs and throws BEFORE any call whose estimate would push the build, the run or the answer over its cap.
 * The refusal is a `budget_exceeded` row carrying the estimate, so the scorecard can count what was not spent.
 */
export async function assertBudget(call: { purpose: ModelPurpose; model: string; estimateMicroUsd: number } & Scope): Promise<void> {
  const checks: [CapScope, Scope][] = [['build', {}]];
  if (call.runId) checks.push(['run', { runId: call.runId }]);
  if (call.answerId) checks.push(['answer', { answerId: call.answerId }]);
  for (const [scope, where] of checks) {
    const spent = await spentMicroUsd(where);
    if (spent + call.estimateMicroUsd > CAPS_MICRO_USD[scope]) {
      await db.modelCall.create({
        data: { purpose: call.purpose, model: call.model, outcome: 'budget_exceeded', costMicroUsd: call.estimateMicroUsd, runId: call.runId ?? null, answerId: call.answerId ?? null },
      });
      throw new BudgetExceededError(scope, spent, call.estimateMicroUsd);
    }
  }
}

/** Records a completed call, priced from config/prices.json. Every live call ends here (D-23). */
export async function recordCall(call: { purpose: ModelPurpose; model: string; inputTokens: number; outputTokens?: number; outcome?: Exclude<ModelCallOutcome, 'budget_exceeded'> } & Scope) {
  const outputTokens = call.outputTokens ?? 0;
  return db.modelCall.create({
    data: {
      purpose: call.purpose, model: call.model, outcome: call.outcome ?? 'ok', inputTokens: call.inputTokens, outputTokens,
      costMicroUsd: costMicroUsd(call.model, call.inputTokens, outputTokens),
      runId: call.runId ?? null, answerId: call.answerId ?? null,
    },
  });
}
