// Who is asking, for the answer API (task 2.6, D-12, D-26). The role comes from the StaffRole row for the session's
// user in that org, never from the request body. The route's first await is requireUser (FR-06), which sends a missing
// session to /login; here, a user with no StaffRole in the org gets 404 ("not yours" ≡ "not found").
import type { SessionCtx } from '@/core/auth/session';
import { db } from '@/core/db';
import type { Caller } from '@/lib/retrieval/retriever';

export type ApiCaller = { userId: string; caller: Caller };

export async function apiCaller(s: SessionCtx, org: { slug: string } | { id: string }): Promise<ApiCaller | Response> {
  const orgId = 'id' in org ? org.id : (await db.org.findUnique({ where: { slug: org.slug }, select: { id: true } }))?.id;
  const row = orgId && (await db.staffRole.findUnique({ where: { orgId_userId: { orgId, userId: s.userId } } }));
  if (!row) return notFound();
  return { userId: s.userId, caller: { orgId: row.orgId, role: row.role } };
}

export const notFound = () => Response.json({ error: 'Not found.' }, { status: 404 });
