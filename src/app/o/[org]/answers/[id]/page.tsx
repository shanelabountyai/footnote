import { notFound } from 'next/navigation';
import { requireOrg } from '@/core/authz/guards';
import { db } from '@/core/db';
import { readableAnswer } from '@/lib/answer/caller';
import { DISCLAIMER, REFUSAL_MESSAGES } from '@/lib/answer/compose';
import type { Citation, VerifiedSentence } from '@/lib/answer/verify';

export const metadata = { title: 'Answer' };

/** One stored answer, read-only, through the same check as GET /api/answers/:id (D-26), and partner-only (task 4.2). */
export default async function AnswerAudit({ params }: { params: Promise<{ org: string; id: string }> }) {
  const ctx = await requireOrg((await params).org);
  const found = await readableAnswer(ctx.session, (await params).id);
  if (!found || found.row.orgId !== ctx.orgId || found.who.caller.role !== 'partner') notFound();
  const { row } = found;
  const sentences = row.sentences as VerifiedSentence[];
  const byId = new Map((row.citations as Citation[]).map((c) => [c.id, c]));
  const cost = await db.modelCall.aggregate({ where: { answerId: row.id }, _sum: { costMicroUsd: true } });
  const code = row.refusalCode as keyof typeof REFUSAL_MESSAGES | null;

  return (
    <main>
      <h1>Answer</h1>
      <p><strong>Question:</strong> {row.question}</p>
      <dl>
        <dt>Asked (UTC)</dt><dd>{row.createdAt.toISOString().slice(0, 16).replace('T', ' ')}</dd>
        <dt>Caller role</dt><dd>{row.callerRole}</dd>
        <dt>Status</dt><dd>{row.status}</dd>
        <dt>Snapshot</dt><dd><code>{row.snapshot}</code></dd>
        <dt>Retriever / model</dt><dd>{row.retriever} / {row.model ?? 'no model call'}</dd>
        <dt>Gate</dt><dd>{row.thetaScore === null ? 'n/a' : `${row.thetaScore.toFixed(3)} against θ ${row.theta}`}</dd>
        <dt>Dropped sentences</dt><dd>{row.droppedSentences}</dd>
        <dt>Cost</dt><dd>${((cost._sum.costMicroUsd ?? 0) / 1e6).toFixed(4)}</dd>
      </dl>
      {code && <p role="status">Refused ({code}): {REFUSAL_MESSAGES[code]}</p>}
      <ol>
        {sentences.map((s, i) => (
          <li key={i}>
            <p>{s.text}</p>
            {s.superseded && <p><em>{s.superseded}</em></p>}
            <ul>
              {s.citations.map((cid) => {
                const c = byId.get(cid);
                return c && (
                  <li key={cid}>
                    {c.title}, {c.edition} (revised {c.revisionDate}), p. {c.location.page}
                    {c.supersededBy && <> · superseded by {c.supersededBy}</>}
                    <blockquote>{c.quote}</blockquote>
                  </li>
                );
              })}
            </ul>
          </li>
        ))}
      </ol>
      <p><small>{DISCLAIMER}</small></p>
    </main>
  );
}
