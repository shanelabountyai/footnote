// POST /api/answers (task 2.6): question in, verified answer out, stored as an Answer row. Role from the session
// (D-12; a `role` or `caller` field in the body is stripped by the schema), 409 on a stale corpus snapshot (D-9).
// A request with `Authorization` skips the session and is checked against the ApiKey table (task 4.1, D-48); without one, requireUser.
import { z } from 'zod';
import { requireUser } from '@/core/auth/session';
import { db } from '@/core/db';
import { answer } from '@/lib/answer/compose';
import { apiCaller, keyCaller, keyForOrg } from '@/lib/answer/caller';
import { denseRetriever } from '@/lib/retrieval/retriever';
import { snapshotId } from '@/lib/retrieval/snapshot';

export const dynamic = 'force-dynamic';

const Body = z.object({
  question: z.string().trim().min(1).max(2000),
  org: z.string().min(1),
  options: z.object({ corpusSnapshot: z.string().optional() }).optional(),
});

export async function POST(req: Request) {
  const authorization = req.headers.get('authorization');
  const session = authorization ? null : await requireUser();
  const key = authorization ? await keyCaller(authorization) : null;
  if (key instanceof Response) return key;
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: 'Body needs { question, org }.' }, { status: 400 });
  const { question, org, options } = parsed.data;

  const who = key ? await keyForOrg(key, { slug: org }) : await apiCaller(session!, { slug: org });
  if (who instanceof Response) return who;

  const snapshot = snapshotId();
  if (options?.corpusSnapshot && options.corpusSnapshot !== snapshot) {
    return Response.json({ error: 'Corpus snapshot mismatch.', corpusSnapshot: snapshot }, { status: 409 });
  }

  const retriever = denseRetriever(snapshot); // D-46 default
  const a = await answer(who.caller, question, { retriever, snapshot });
  await db.answer.create({
    data: {
      id: a.answerId, orgId: who.caller.orgId, userId: who.userId, question, callerRole: who.caller.role,
      snapshot, retriever: a.retriever, model: a.usage?.model ?? null, thetaScore: a.gate.score, theta: a.gate.theta,
      status: a.status, refusalCode: a.refusal?.code ?? null, sentences: a.sentences, citations: a.citations,
      droppedSentences: a.droppedSentences,
    },
  });
  return Response.json(a, { status: 201 });
}
