// GET /api/answers/:id (task 2.6, D-23): the stored answer and its ModelCall rows, read back with zero model calls.
// A caller whose tiers do not cover every cited chunk gets 404, the same as an id that does not exist (D-13).
import { z } from 'zod';
import { requireUser } from '@/core/auth/session';
import { db } from '@/core/db';
import { apiCaller, notFound } from '@/lib/answer/caller';
import { DISCLAIMER, REFUSAL_MESSAGES } from '@/lib/answer/compose';
import type { Citation } from '@/lib/answer/verify';
import { tiersFor } from '@/lib/retrieval/retriever';

export const dynamic = 'force-dynamic';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireUser();
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) return notFound();
  const row = await db.answer.findUnique({ where: { id } });
  if (!row) return notFound();
  const who = await apiCaller(session, { id: row.orgId });
  if (who instanceof Response) return who;
  const citations = row.citations as Citation[];
  const allowed = tiersFor(who.caller.role);
  if (!citations.every((c) => allowed.includes(c.tier))) return notFound();

  const modelCalls = await db.modelCall.findMany({ where: { answerId: id }, orderBy: { createdAt: 'asc' } });
  const code = row.refusalCode as keyof typeof REFUSAL_MESSAGES | null;
  return Response.json({
    answerId: row.id, createdAt: row.createdAt, question: row.question, status: row.status,
    refusal: code && { code, message: REFUSAL_MESSAGES[code] }, sentences: row.sentences, citations,
    droppedSentences: row.droppedSentences, corpusSnapshot: row.snapshot, retriever: row.retriever,
    gate: { score: row.thetaScore, theta: row.theta, pass: row.thetaScore === null || row.thetaScore >= row.theta },
    disclaimer: DISCLAIMER, modelCalls,
  });
}
