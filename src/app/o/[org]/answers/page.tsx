import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireOrg } from '@/core/authz/guards';
import { db } from '@/core/db';
import { apiCaller } from '@/lib/answer/caller';

export const metadata = { title: 'Answers' };

/** Partner-only audit list (task 4.2). Partners hold every tier, so no row here is hidden from them (D-12). */
export default async function Answers({ params }: { params: Promise<{ org: string }> }) {
  const ctx = await requireOrg((await params).org);
  const who = await apiCaller(ctx.session, { id: ctx.orgId });
  if (who instanceof Response || who.caller.role !== 'partner') notFound();

  // ponytail: newest 200, no paging; add a cursor when an org outgrows one screen.
  const rows = await db.answer.findMany({
    where: { orgId: ctx.orgId }, orderBy: { createdAt: 'desc' }, take: 200,
    select: { id: true, createdAt: true, question: true, callerRole: true, status: true, refusalCode: true, snapshot: true },
  });
  const costs = await db.modelCall.groupBy({ by: ['answerId'], where: { answerId: { in: rows.map((r) => r.id) } }, _sum: { costMicroUsd: true } });
  const cost = new Map(costs.map((c) => [c.answerId, c._sum.costMicroUsd ?? 0]));

  return (
    <main>
      <h1>Answers</h1>
      {rows.length === 0 ? <p>No answers yet.</p> : (
        <table>
          <thead>
            <tr><th>Asked (UTC)</th><th>Question</th><th>Caller</th><th>Status</th><th>Refusal</th><th>Snapshot</th><th>Cost</th></tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td>{r.createdAt.toISOString().slice(0, 16).replace('T', ' ')}</td>
                <td><Link href={`/o/${ctx.slug}/answers/${r.id}`}>{r.question}</Link></td>
                <td>{r.callerRole}</td>
                <td>{r.status}</td>
                <td>{r.refusalCode ?? ''}</td>
                <td><code>{r.snapshot.slice(0, 19)}</code></td>
                <td>${((cost.get(r.id) ?? 0) / 1e6).toFixed(4)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  );
}
