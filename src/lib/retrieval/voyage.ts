// Voyage embeddings over plain fetch (O-2, O-12): no package, key read from process.env at call time so code that
// never embeds needs no key. Every call goes through assertBudget before and recordCall after (D-18, D-23).
import { assertBudget, recordCall } from '@/lib/spend/budget';
import { costMicroUsd } from '@/lib/spend/prices';

export const EMBED_MODEL = 'voyage-4-lite';
export const EMBED_DIM = 1024;
const URL = 'https://api.voyageai.com/v1/embeddings';

export type InputType = 'document' | 'query';
/** Embeds texts in order. Swappable so tests run without the network or the ledger's money. */
export type Embedder = (texts: string[], inputType: InputType, scope?: { runId?: string | null; answerId?: string | null }) => Promise<number[][]>;

/** Over-estimates on purpose (≈ 3 chars per token; English prose runs nearer 4), so the cap check errs toward refusing. */
const estimateTokens = (texts: string[]) => Math.ceil(texts.reduce((n, t) => n + t.length, 0) / 3);

export const voyageEmbed: Embedder = async (texts, inputType, scope = {}) => {
  const key = process.env.VOYAGE_API_KEY;
  if (!key) throw new Error('VOYAGE_API_KEY is not set — paste it into .env.local (O-12); fts needs no key');
  await assertBudget({ purpose: 'embed', model: EMBED_MODEL, estimateMicroUsd: costMicroUsd(EMBED_MODEL, estimateTokens(texts)), ...scope });
  const res = await fetch(URL, {
    method: 'POST',
    headers: { authorization: `Bearer ${key}`, 'content-type': 'application/json' },
    body: JSON.stringify({ input: texts, model: EMBED_MODEL, input_type: inputType, output_dimension: EMBED_DIM, truncation: false }),
  });
  if (!res.ok) throw new Error(`voyage ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const body = (await res.json()) as { data: { embedding: number[]; index: number }[]; usage: { total_tokens: number } };
  await recordCall({ purpose: 'embed', model: EMBED_MODEL, inputTokens: body.usage.total_tokens, ...scope });
  return body.data.sort((a, b) => a.index - b.index).map((d) => d.embedding);
};
