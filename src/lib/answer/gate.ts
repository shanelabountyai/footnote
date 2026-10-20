// θ gate (task 2.4, D-17/D-17a). Runs after retrieval and before any model call: below θ the answer is a refusal and
// the model is never called. θ reads the top dense cosine, which dense and hybrid both surface; fts has no cosine.
import type { Hits, RetrieverName } from '@/lib/retrieval/retriever';
import type { Verified } from './verify';

/** Calibrated on GA-01..07 + GU-01..04 (D-17a): midpoint of median A 0.614 and median U 0.520. */
export const THETA_DENSE = 0.559;

/** What the audit row stores. `score` is null only for fts, where the gate does not apply (D-17b). */
export type GateResult = { score: number | null; theta: number; pass: boolean };

export function thetaGate(retriever: RetrieverName, hits: Hits, theta = THETA_DENSE): GateResult {
  if (retriever === 'fts') return { score: null, theta, pass: true };
  // A missing score on dense/hybrid means the Hits value was copied; passing it through would skip the gate silently.
  if (typeof hits.denseTop !== 'number') throw new Error(`thetaGate: ${retriever} hits carry no denseTop`);
  return { score: hits.denseTop, theta, pass: hits.denseTop >= theta };
}

/** The gate's refusal. Same shape and code as every other no-passage miss, so it never hints at hidden tiers (D-13). */
export const noRelevantPassage = (): Verified => ({ status: 'refused', refusal: { code: 'NO_RELEVANT_PASSAGE' }, sentences: [], citations: [], droppedSentences: 0 });
