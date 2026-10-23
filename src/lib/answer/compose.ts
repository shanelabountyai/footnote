// Answer composer (task 2.5): retrieve → θ gate → assertBudget → model call → schema → verify. The only path that
// returns sentences, and every one of them has been through verifyCitations (non-negotiable 1). The call itself is
// `callMessages` (D-19a).
import { randomUUID } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Caller, RetrievedChunk, Retriever } from '@/lib/retrieval/retriever';
import { anthropicKey, callMessages } from '@/lib/llm/anthropic';
import { assertBudget, BudgetExceededError, recordCall } from '@/lib/spend/budget';
import { costMicroUsd, prices } from '@/lib/spend/prices';
import { type GateResult, noRelevantPassage, thetaGate } from './gate';
import { parseAnswerOutput } from './output';
import { buildPrompt } from './prompt';
import { type DocMeta, type Verified, verifyCitations } from './verify';

export const DISCLAIMER = 'Footnote quotes IRS publications and firm documents. It does not give tax or legal advice.'; // D-2
export const ANSWER_MODEL = 'claude-sonnet-5-5'; // D-19, O-1
export const ANSWER_K = 10;
export const MAX_TOKENS = 2048;

type RefusalCode = NonNullable<Verified['refusal']>['code'] | 'BUDGET_EXCEEDED';
/** One message per code. A permission-scoped miss gets the same text as a true miss, so it says nothing about hidden documents (D-13). */
export const REFUSAL_MESSAGES: Record<RefusalCode, string> = {
  NO_RELEVANT_PASSAGE: 'No passage in the documents answers this question.',
  INSUFFICIENT_SUPPORT: 'The documents were searched, but no sentence of an answer could be backed by a verified quotation.',
  BUDGET_EXCEEDED: 'Answering this question would go over the spending limit, so it was not sent to the model.',
  OUT_OF_SCOPE: 'Footnote reports what the documents say, not what you should do; the recommendation part of this question is not answered.',
};

export type Answer = Omit<Verified, 'refusal'> & {
  answerId: string;
  refusal: { code: RefusalCode; message: string } | null;
  corpusSnapshot: string;
  retriever: Retriever['name'];
  gate: GateResult;
  /** Null when the model was never called (θ refusal, or nothing retrieved). */
  usage: { model: string; inputTokens: number; outputTokens: number; costUsd: number } | null;
  disclaimer: string;
};

export type AnswerOptions = {
  retriever: Retriever; snapshot: string; model?: string; runId?: string | null; answerId?: string;
  docs?: Record<string, DocMeta>;
  /** false = record the gate but call the model anyway (eval `--theta=off`, task 3.7/3.8: θ′ is derived later from
   *  the stored score with zero calls). Never false on the API path. */
  enforceGate?: boolean;
};

let cachedDocs: Record<string, DocMeta> | undefined;
/** D-7 metadata: the manifest for public documents, the memo front matter for private ones (edition = its revision date, D-14a). */
export function loadDocMeta(root = 'corpus'): Record<string, DocMeta> {
  const m = JSON.parse(readFileSync(join(root, 'manifest.json'), 'utf8')) as { documents: ({ docId: string } & DocMeta)[] };
  const docs: Record<string, DocMeta> = {};
  for (const d of m.documents) docs[d.docId] = { title: d.title, edition: d.edition, revisionDate: d.revisionDate, supersededBy: d.supersededBy ?? null };
  const priv = join(root, 'private');
  for (const f of (readdirSync(priv, { recursive: true }) as string[]).filter((f) => f.endsWith('.md'))) {
    const head = /^---\n([\s\S]*?)\n---\n/.exec(readFileSync(join(priv, f), 'utf8'))?.[1] ?? '';
    const field = (k: string) => new RegExp(`^${k}: (.*)$`, 'm').exec(head)?.[1]?.trim() ?? '';
    const revisionDate = field('revisionDate');
    docs[field('docId')] = { title: field('title'), edition: revisionDate, revisionDate, supersededBy: null };
  }
  return docs;
}

/** Over-estimates on purpose (≈ 3 chars per token, plus the full max_tokens ceiling), so the cap check errs toward refusing. */
export const estimateAnswerMicroUsd = (model: string, promptChars: number) => costMicroUsd(model, Math.ceil(promptChars / 3), MAX_TOKENS);

/** The composer's prompt: each chunk carries its document's edition (D-14a). Exported so the eval harness can estimate
 *  a run from the same prompt the composer will send (task 3.7). */
export const buildAnswerPrompt = (question: string, hits: RetrievedChunk[], docs: Record<string, DocMeta>) =>
  buildPrompt(question, hits.map((c) => ({ ...c, edition: docs[c.docId]?.edition ?? '' })));

export async function answer(caller: Caller, question: string, opts: AnswerOptions): Promise<Answer> {
  const { retriever, snapshot, model = ANSWER_MODEL, runId = null, answerId = randomUUID(), enforceGate = true } = opts;
  if (prices.models[model]?.runtimeAllowed === false) throw new Error(`${model} is not a runtime model (D-4)`);
  const finish = (v: Omit<Verified, 'refusal'> & { refusal: { code: RefusalCode } | null }, gate: GateResult, usage: Answer['usage'] = null): Answer => ({
    ...v, answerId, refusal: v.refusal && { ...v.refusal, message: REFUSAL_MESSAGES[v.refusal.code] },
    corpusSnapshot: snapshot, retriever: retriever.name, gate, usage, disclaimer: DISCLAIMER,
  });

  const hits = await retriever.search(caller, question, ANSWER_K);
  const gate = thetaGate(retriever.name, hits); // on the value search returned: a copy drops denseTop (D-17b)
  if ((enforceGate && !gate.pass) || !hits.length) return finish(noRelevantPassage(), gate);

  const docs = opts.docs ?? (cachedDocs ??= loadDocMeta());
  const { system, user } = buildAnswerPrompt(question, hits, docs);
  anthropicKey(); // a missing key throws before the budget check, as before
  try {
    await assertBudget({ purpose: 'answer', model, estimateMicroUsd: estimateAnswerMicroUsd(model, system.length + user.length), runId, answerId });
  } catch (e) {
    if (!(e instanceof BudgetExceededError)) throw e;
    return finish({ status: 'refused', refusal: { code: 'BUDGET_EXCEEDED' }, sentences: [], citations: [], droppedSentences: 0 }, gate); // D-18b
  }

  const { text, inputTokens, outputTokens } = await callMessages({ model, maxTokens: MAX_TOKENS, system, user });
  const parsed = parseAnswerOutput(text);
  const row = await recordCall({
    purpose: 'answer', model, inputTokens, outputTokens,
    outcome: parsed.ok ? 'ok' : 'schema_invalid', runId, answerId,
  });
  const usage = { model, inputTokens: row.inputTokens, outputTokens: row.outputTokens, costUsd: row.costMicroUsd / 1e6 };

  const verified: Verified = parsed.ok
    ? verifyCitations(parsed.output, hits, docs)
    : { status: 'refused', refusal: { code: 'INSUFFICIENT_SUPPORT' }, sentences: [], citations: [], droppedSentences: 0 };
  return finish(verified, gate, usage);
}
