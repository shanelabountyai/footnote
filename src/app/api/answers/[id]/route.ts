// GET /api/answers/:id (task 2.6, D-23): the stored answer and its ModelCall rows, read back with zero model calls.
// A caller whose tiers do not cover every cited chunk gets 404, the same as an id that does not exist (D-13).
import { requireUser } from '@/core/auth/session';
import { db } from '@/core/db';
import { notFound, readableAnswer } from '@/lib/answer/caller';
import { DISCLAIMER, REFUSAL_MESSAGES } from '@/lib/answer/compose';
import type { Citation } from '@/lib/answer/verify';

export const dynamic = 'force-dynamic';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireUser();
  const { id } = await params;
  const found = await readableAnswer(session, id);
  if (!found) return notFound();
  const { row } = found;
  const citations = row.citations as Citation[];

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
