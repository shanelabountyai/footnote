import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { expect, test } from '@playwright/test';
import pg from 'pg';

// Task 4.3: the ask page against the production build. POST /api/answers is stubbed at the browser's fetch boundary,
// so this spec checks what the page renders, not what the pipeline decides (that is covered by the eval and API tests).
const db = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 1 });
test.afterAll(() => db.end());

const disclaimer = 'Footnote quotes IRS publications and firm documents. It does not give tax or legal advice.';
const base = { answerId: 'a1', corpusSnapshot: 'sha256:e2eask', disclaimer, droppedSentences: 0 };
const answered = {
  ...base, status: 'answered', refusal: null,
  sentences: [{ text: 'Deposits are due by the 15th.', citations: ['c1'], superseded: null }],
  citations: [{ id: 'c1', title: 'Publication 15', edition: 'For use in 2025', revisionDate: '2024-12-01', location: { page: 12, section: null }, quote: 'Deposit taxes by the 15th.' }],
};
const refused = {
  ...base, status: 'refused', sentences: [], citations: [],
  refusal: { code: 'NO_RELEVANT_PASSAGE', message: 'No passage in the documents answers this question.' },
};

async function signedIn(context: import('@playwright/test').BrowserContext) {
  const [org, user, token] = [randomUUID(), randomUUID(), randomBytes(32).toString('base64url')];
  const slug = `e2e-ask-${org.slice(0, 8)}`;
  await db.query('INSERT INTO "Org" (id, slug, name, "updatedAt") VALUES ($1, $2, $2, now())', [org, slug]);
  await db.query('INSERT INTO "User" (id, email, "updatedAt") VALUES ($1, $2, now())', [user, `${slug}@example.test`]);
  await db.query(`INSERT INTO "Membership" ("orgId", "userId", role, "updatedAt") VALUES ($1, $2, 'member', now())`, [org, user]);
  await db.query('INSERT INTO "StaffRole" ("orgId", "userId", role) VALUES ($1, $2, $3)', [org, user, 'front_desk']);
  await db.query(
    `INSERT INTO "Session" (hash, "userId", "authAt", "createdAt", "expiresAt") VALUES ($1, $2, now(), now(), now() + interval '1 hour')`,
    [createHash('sha256').update(token).digest('hex'), user],
  );
  await context.addCookies([{ name: '__Host-session', value: token, domain: 'localhost', path: '/', secure: true }]);
  return slug;
}

for (const [name, body] of [['an answered question', answered], ['a refusal', refused]] as const) {
  test(`${name} shows the disclaimer and snapshot id`, async ({ page, context }) => {
    const slug = await signedIn(context);
    await page.route('**/api/answers', (route) => route.fulfill({ status: 201, json: body }));
    await page.goto(`/o/${slug}/ask`);
    await page.getByLabel('Question').fill('When are deposits due?');
    await page.getByRole('button', { name: 'Ask' }).click();
    const answer = page.getByRole('region', { name: 'Answer' });
    await expect(answer.getByText(disclaimer)).toBeVisible();
    await expect(answer.getByText('sha256:e2eask')).toBeVisible();
    if (body.refusal) {
      await expect(answer.getByText(body.refusal.message)).toBeVisible();
    } else {
      await expect(answer.getByText('Deposits are due by the 15th.')).toBeVisible();
      await expect(answer.getByText(/Publication 15, For use in 2025 \(revised 2024-12-01\), p\. 12/)).toBeVisible();
      await expect(answer.getByText('Deposit taxes by the 15th.')).toBeVisible();
    }
  });
}
