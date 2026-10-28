// Who is asking, for the answer API (task 2.6, D-12, D-26). The role comes from the StaffRole row for the session's
// user in that org, never from the request body. The route's first await is requireUser (FR-06), which sends a missing
// session to /login; here, a user with no StaffRole in the org gets 404 ("not yours" ≡ "not found").
// A service key (task 4.1, D-48) is the other way in: the role is the ApiKey row's, never the body's.
import type { SessionCtx } from '@/core/auth/session';
import { db } from '@/core/db';
import { hashToken } from '@/core/tokens';
import type { Caller } from '@/lib/retrieval/retriever';

export type ApiCaller = { userId: string | null; caller: Caller };

export async function apiCaller(s: SessionCtx, org: { slug: string } | { id: string }): Promise<ApiCaller | Response> {
  const orgId = 'id' in org ? org.id : (await db.org.findUnique({ where: { slug: org.slug }, select: { id: true } }))?.id;
  const row = orgId && (await db.staffRole.findUnique({ where: { orgId_userId: { orgId, userId: s.userId } } }));
  if (!row) return notFound();
  return { userId: s.userId, caller: { orgId: row.orgId, role: row.role } };
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
