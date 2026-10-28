// Who is asking, for the answer API (task 2.6, D-12, D-26). The role comes from the StaffRole row for the session's
// user in that org, never from the request body. The route's first await is requireUser (FR-06), which sends a missing
// session to /login; here, a user with no StaffRole in the org gets 404 ("not yours" ≡ "not found").
// A service key (task 4.1, D-48) is the other way in: the role is the ApiKey row's, never the body's.
import { z } from 'zod';
import type { SessionCtx } from '@/core/auth/session';
import { db } from '@/core/db';
import { hashToken } from '@/core/tokens';
import type { Citation } from '@/lib/answer/verify';
import { tiersFor, type Caller } from '@/lib/retrieval/retriever';

export type ApiCaller = { userId: string | null; caller: Caller };

export async function apiCaller(s: SessionCtx, org: { slug: string } | { id: string }): Promise<ApiCaller | Response> {
  const orgId = 'id' in org ? org.id : (await db.org.findUnique({ where: { slug: org.slug }, select: { id: true } }))?.id;
  const row = orgId && (await db.staffRole.findUnique({ where: { orgId_userId: { orgId, userId: s.userId } } }));
  if (!row) return notFound();
  return { userId: s.userId, caller: { orgId: row.orgId, role: row.role } };
}

/**
 * The read check for one stored answer (D-26, D-13), shared by `GET /api/answers/:id` and the audit page (task 4.2):
 * staff in the answer's org, and their tiers cover every cited chunk. Anything else is null, so callers answer 404.
 */
export async function readableAnswer(s: SessionCtx, id: string) {
  if (!z.uuid().safeParse(id).success) return null;
  const row = await db.answer.findUnique({ where: { id } });
  if (!row) return null;
  const who = await apiCaller(s, { id: row.orgId });
  if (who instanceof Response) return null;
  const allowed = tiersFor(who.caller.role);
  return (row.citations as Citation[]).every((c) => allowed.includes(c.tier)) ? { row, who } : null;
}

export const notFound = () => Response.json({ error: 'Not found.' }, { status: 404 });

/** `Authorization: Bearer <key>`: unknown or revoked → 401, checked before the body is read. */
export async function keyCaller(authorization: string): Promise<ApiCaller | Response> {
  const key = /^Bearer (\S+)$/.exec(authorization)?.[1];
  const row = key && (await db.apiKey.findUnique({ where: { keyHash: hashToken(key) } }));
  if (!row || row.revokedAt) return Response.json({ error: 'Invalid API key.' }, { status: 401 });
  return { userId: null, caller: { orgId: row.orgId, role: row.role } };
}

/** A live key names one org; asking about another is 404, like a user with no StaffRole there. */
export async function keyForOrg(who: ApiCaller, org: { slug: string }): Promise<ApiCaller | Response> {
  const row = await db.org.findUnique({ where: { slug: org.slug }, select: { id: true } });
  return row?.id === who.caller.orgId ? who : notFound();
}
