// Response schema for POST /api/answers, as documented in docs/n9-contract.md (task 4.4). The doc's examples are
// parsed against this by tests/unit/n9-contract.test.ts. Strict, so a field added to `Answer` without a doc update fails.
import { z } from 'zod';

const Citation = z.strictObject({
  id: z.string(), docId: z.string(), title: z.string(), edition: z.string().min(1), revisionDate: z.string().min(1),
  supersededBy: z.string().nullable(), location: z.strictObject({ page: z.number().int(), section: z.string().nullable() }),
  chunkId: z.string(), quote: z.string().min(1), score: z.number(), tier: z.enum(['public', 'staff', 'engagement', 'partner']),
});

export const AnswerResponseSchema = z.strictObject({
  answerId: z.string(),
  status: z.enum(['answered', 'partial', 'refused']),
  refusal: z.strictObject({
    code: z.enum(['NO_RELEVANT_PASSAGE', 'INSUFFICIENT_SUPPORT', 'OUT_OF_SCOPE', 'BUDGET_EXCEEDED']), message: z.string(),
  }).nullable(),
  sentences: z.array(z.strictObject({ text: z.string(), citations: z.array(z.string()).min(1), superseded: z.string().nullable() })),
  citations: z.array(Citation),
  droppedSentences: z.number().int().min(0),
  corpusSnapshot: z.string(),
  retriever: z.enum(['fts', 'dense', 'hybrid']),
  gate: z.strictObject({ score: z.number().nullable(), theta: z.number(), pass: z.boolean() }),
  usage: z.strictObject({ model: z.string(), inputTokens: z.number().int(), outputTokens: z.number().int(), costUsd: z.number() }).nullable(),
  disclaimer: z.string(),
});
