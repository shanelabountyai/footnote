import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { expect, test, type BrowserContext } from '@playwright/test';
import pg from 'pg';

// Task 4.2: the partner-only audit view, against the production build. Rows are written directly; no model call.
const db = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 1 });
test.afterAll(() => db.end());

const citation = {
  id: 'c1', docId: 'p15-2025', title: 'Publication 15', edition: 'For use in 2025', revisionDate: '2024-12-01',
  supersededBy: 'p15-2026', location: { page: 12, section: null }, chunkId: 'k1', quote: 'Deposit taxes by the 15th.', score: 0.6, tier: 'public',
};
const superseded = 'Cites only a superseded edition: Publication 15 (For use in 2025).';

async function seed() {
  const org = randomUUID();
  const slug = `e2e-audit-${org.slice(0, 8)}`;
  await db.query('INSERT INTO "Org" (id, slug, name, "updatedAt") VALUES ($1, $2, $2, now())', [org, slug]);
  const tokens: Record<string, string> = {};
  for (const role of ['partner', 'front_desk']) {
    const [user, token] = [randomUUID(), randomBytes(32).toString('base64url')];
    await db.query('INSERT INTO "User" (id, email, "updatedAt") VALUES ($1, $2, now())', [user, `${slug}-${role}@example.test`]);
    await db.query(`INSERT INTO "Membership" ("orgId", "userId", role, "updatedAt") VALUES ($1, $2, 'member', now())`, [org, user]);
    await db.query('INSERT INTO "StaffRole" ("orgId", "userId", role) VALUES ($1, $2, $3)', [org, user, role]);
    await db.query(
      `INSERT INTO "Session" (hash, "userId", "authAt", "createdAt", "expiresAt") VALUES ($1, $2, now(), now(), now() + interval '1 hour')`,
      [createHash('sha256').update(token).digest('hex'), user],
    );
    tokens[role] = token;
  }
  const answered = randomUUID();
  await db.query(
    `INSERT INTO "Answer" (id, "orgId", question, "callerRole", snapshot, retriever, model, "thetaScore", theta, status, sentences, citations, "droppedSentences")
     VALUES ($1, $2, 'When are deposits due?', 'partner', 'sha256:e2eaudit', 'dense', 'claude-sonnet-5-5', 0.6, 0.52, 'answered', $3, $4, 0),
            ($5, $2, 'What is the meaning of life?', 'front_desk', 'sha256:e2eaudit', 'dense', NULL, 0.3, 0.52, 'refused', '[]', '[]', 0)`,
    [answered, org, JSON.stringify([{ text: 'Deposits are due by the 15th.', citations: ['c1'], superseded }]), JSON.stringify([citation]), randomUUID()],
  );
  await db.query(`UPDATE "Answer" SET "refusalCode" = 'NO_RELEVANT_PASSAGE' WHERE "orgId" = $1 AND status = 'refused'`, [org]);
  await db.query(`INSERT INTO "ModelCall" (id, purpose, model, "costMicroUsd", "answerId") VALUES ($2, 'answer', 'claude-sonnet-5-5', 4200, $1)`, [answered, randomUUID()]);
  return { slug, answered, tokens };
}

const signIn = (context: BrowserContext, token: string) =>
  context.addCookies([{ name: '__Host-session', value: token, domain: 'localhost', path: '/', secure: true }]);

test('the answer list shows caller, status, refusal, snapshot and cost to a partner; front_desk gets 404', async ({ page, context }) => {
  const { slug, tokens } = await seed();
  await signIn(context, tokens.partner);
  expect((await page.goto(`/o/${slug}/answers`))!.status()).toBe(200);
  const answered = page.getByRole('row', { name: /When are deposits due\?/ });
  await expect(answered).toContainText('answered');
  await expect(answered).toContainText('sha256:e2eaudit');
  await expect(answered).toContainText('$0.0042');
  await expect(page.getByRole('row', { name: /meaning of life/ })).toContainText('NO_RELEVANT_PASSAGE');

  await context.clearCookies();
  await signIn(context, tokens.front_desk);
  expect((await page.goto(`/o/${slug}/answers`))!.status()).toBe(404);
});

test('the answer detail shows each sentence with doc, edition, page, quote and the superseded label; front_desk gets 404', async ({ page, context }) => {
  const { slug, answered, tokens } = await seed();
  await signIn(context, tokens.partner);
  expect((await page.goto(`/o/${slug}/answers/${answered}`))!.status()).toBe(200);
  await expect(page.getByText('Deposits are due by the 15th.')).toBeVisible();
  await expect(page.getByText(/Publication 15, For use in 2025 \(revised 2024-12-01\), p\. 12/)).toBeVisible();
  await expect(page.getByText('Deposit taxes by the 15th.')).toBeVisible();
  await expect(page.getByText(superseded)).toBeVisible();

  await context.clearCookies();
  await signIn(context, tokens.front_desk);
  expect((await page.goto(`/o/${slug}/answers/${answered}`))!.status()).toBe(404);
});
