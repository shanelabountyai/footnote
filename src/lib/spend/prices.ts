// Pinned vendor prices (D-18). Read from config/prices.json, which Session 0 filled from the pricing pages with
// the date checked. Nothing here guesses: an unknown model throws.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

type ModelPrice = { inputPerMTok: number; outputPerMTok: number; runtimeAllowed?: boolean };
type EmbeddingPrice = { perMTok: number; freeTokens: number };
export type Prices = { checkedAt: string; models: Record<string, ModelPrice>; embeddings: Record<string, EmbeddingPrice> };

export const prices: Prices = JSON.parse(readFileSync(join(process.cwd(), 'config/prices.json'), 'utf8'));

/** A price older than this fails `npm run spend` with a warning (D-18). */
export const PRICE_MAX_AGE_DAYS = 60;

export function priceAgeDays(now: Date = new Date()): number {
  return Math.floor((now.getTime() - Date.parse(prices.checkedAt)) / 86_400_000);
}

/** Cost in integer micro-USD. Per-MTok price × tokens is already micro-USD (10^6 / 10^6), so no float division. */
export function costMicroUsd(model: string, inputTokens: number, outputTokens = 0): number {
  const m = prices.models[model];
  if (m) return Math.round(inputTokens * m.inputPerMTok + outputTokens * m.outputPerMTok);
  const e = prices.embeddings[model];
  if (e) return Math.round(inputTokens * e.perMTok);
  throw new Error(`no price for model "${model}" in config/prices.json — add it from the vendor page, never from memory`);
}
