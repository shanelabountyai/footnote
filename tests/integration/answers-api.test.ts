// Task 2.6 acceptance: POST /api/answers takes the role from the session (a role in the body is ignored), answers 409
// on a stale snapshot, stores an Answer row; GET /api/answers/:id replays it with no fetch at all (D-23).
// Fetch is stubbed per URL: Voyage gets the fake embedder, Anthropic a canned reply. No network, no spend.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { POST } from '@/app/api/answers/route';
import { GET } from '@/app/api/answers/[id]/route';
import { db } from '@/core/db';
import { chunkCorpus, type Page } from '@/lib/corpus/chunk';
import { indexChunks, indexEmbeddings } from '@/lib/retrieval/indexer';
import type { FootnoteRole } from '@/lib/retrieval/retriever';
import { snapshotId } from '@/lib/retrieval/snapshot';
import { EMBED_DIM, EMBED_MODEL, type Embedder } from '@/lib/retrieval/voyage';
import { resetAuthTables, signInAs } from '../helpers/auth';
import { makeOrg } from '../helpers/org';

const fakeEmbed: Embedder = async (texts) =>
  texts.map((t) => {
    const v = new Array<number>(EMBED_DIM).fill(0);
    for (const w of t.toLowerCase().match(/[a-z]+/g) ?? []) {
      let h = 0;
      for (const ch of w) h = (h * 31 + ch.charCodeAt(0)) % EMBED_DIM;
      v[h]! += 1;
    }
    const n = Math.hypot(...v) || 1;
    return v.map((x) => x / n);
  });

const PUBLIC = 'p463-2025';
const PARTNER = 'll-partner-risk-note-prairiewind-2026-01';
const PAGES: Page[] = [
  { docId: PUBLIC, tier: 'public', page: 3, text: 'Mileage Records\nKeep a mileage log for business use of your car. Record the date and the miles.' },
  { docId: PARTNER, tier: 'partner', page: 1, text: 'Mileage Records\nKeep a mileage log for business use of your car. Record the date, the miles and the client.' },
];
const SNAP = snapshotId();
const QUESTION = 'Keep a mileage log for business use of your car. Record the date and the miles?';
const QUOTE = 'Keep a mileage log for business use of your car.';
const ANTHROPIC = 'https://api.anthropic.com/v1/messages';

let orgSlug: string;
let orgId: string;
let sent: { url: string; body: string }[];

const replyCiting = (chunkId: string) => JSON.stringify({ sentences: [{ sentence: 'Keep a mileage log.', chunkIds: [chunkId], quotes: [QUOTE] }] });
function stubFetch(answerText = replyCiting(`${PUBLIC}:3:1`)) {
  sent = [];
  vi.stubGlobal('fetch', vi.fn(async (url: string, init: RequestInit) => {
    sent.push({ url, body: init.body as string });
    if (url === ANTHROPIC) return Response.json({ content: [{ type: 'text', text: answerText }], usage: { input_tokens: 500, output_tokens: 40 } });
    const { input } = JSON.parse(init.body as string) as { input: string[] };
    const vs = await fakeEmbed(input, 'query');
    return Response.json({ data: vs.map((embedding, index) => ({ embedding, index })), usage: { total_tokens: 12 } });
  }));
}

async function staff(role: FootnoteRole, email: string) {
  const user = await db.user.create({ data: { email } });
  await db.staffRole.create({ data: { orgId, userId: user.id, role } });
  return user;
}
const post = (body: unknown) => POST(new Request('http://localhost/api/answers', { method: 'POST', body: JSON.stringify(body) }));
const get = (id: string) => GET(new Request(`http://localhost/api/answers/${id}`), { params: Promise.resolve({ id }) });

beforeEach(async () => {
  await resetAuthTables();
  const org = await makeOrg('answers-a');
  orgSlug = org.slug;
  orgId = org.id;
  await indexChunks(SNAP, orgId, chunkCorpus(PAGES));
  await indexEmbeddings(SNAP, orgId, EMBED_MODEL, fakeEmbed, 'answers-index');
  vi.stubEnv('ANTHROPIC_API_KEY', 'test-key');
  vi.stubEnv('VOYAGE_API_KEY', 'test-key');
  stubFetch();
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe('POST /api/answers (task 2.6)', () => {
  it('takes the role from the session: a partner role in the body is ignored, no partner chunk reaches the prompt', async () => {
    const u = await staff('front_desk', 'desk@example.test');
    await signInAs(u.id);
    const res = await post({ question: QUESTION, org: orgSlug, role: 'partner', caller: { role: 'partner', orgId }, options: { corpusSnapshot: SNAP } });
    expect(res.status).toBe(201);
    const a = await res.json();
    expect(a).toMatchObject({ status: 'answered', corpusSnapshot: SNAP, retriever: 'dense' });
    expect(a.citations.map((c: { tier: string }) => c.tier)).toEqual(['public']);

    const prompt = sent.find((s) => s.url === ANTHROPIC)!.body;
    expect(prompt).toContain(`${PUBLIC}:3:1`);
    expect(prompt).not.toContain(PARTNER);
    expect(await db.answer.findUnique({ where: { id: a.answerId } })).toMatchObject({ callerRole: 'front_desk', userId: u.id, orgId, status: 'answered', model: a.usage.model });
  });

  it('answers 409 on a corpus snapshot mismatch, before any fetch or row', async () => {
    const u = await staff('front_desk', 'desk@example.test');
    await signInAs(u.id);
    const res = await post({ question: QUESTION, org: orgSlug, options: { corpusSnapshot: 'sha256:stale' } });
    expect(res.status).toBe(409);
    expect(await res.json()).toMatchObject({ corpusSnapshot: SNAP });
    expect(sent).toHaveLength(0);
    expect(await db.answer.count()).toBe(0);
  });

  it('no session redirects to /login (requireUser, FR-06), 404 for a user with no StaffRole in the org, 400 on a bad body', async () => {
    await expect(post({ question: QUESTION, org: orgSlug })).rejects.toThrow('redirect /login');
    const outsider = await db.user.create({ data: { email: 'out@example.test' } });
    await signInAs(outsider.id);
    expect((await post({ question: QUESTION, org: orgSlug })).status).toBe(404);
    expect((await post({ question: QUESTION, org: 'no-such-org' })).status).toBe(404);
    expect((await post({ org: orgSlug })).status).toBe(400);
    expect(sent).toHaveLength(0);
  });
});

describe('GET /api/answers/:id (task 2.6)', () => {
  it('replays the stored answer and its ModelCall rows with zero fetches', async () => {
    const u = await staff('front_desk', 'desk@example.test');
    await signInAs(u.id);
    const a = await (await post({ question: QUESTION, org: orgSlug })).json();

    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const res = await get(a.answerId);
    expect(res.status).toBe(200);
    const r = await res.json();
    expect(r).toMatchObject({ answerId: a.answerId, question: QUESTION, status: a.status, refusal: null, sentences: a.sentences, citations: a.citations, corpusSnapshot: SNAP, gate: a.gate, disclaimer: a.disclaimer });
    expect(r.modelCalls).toMatchObject([{ purpose: 'answer', outcome: 'ok', inputTokens: 500, outputTokens: 40, answerId: a.answerId }]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('a θ refusal replays with its message and no model call', async () => {
    const u = await staff('front_desk', 'desk@example.test');
    await signInAs(u.id);
    const a = await (await post({ question: 'What is the capital of France?', org: orgSlug })).json();
    expect(a.refusal.code).toBe('NO_RELEVANT_PASSAGE');
    const r = await (await get(a.answerId)).json();
    expect(r).toMatchObject({ status: 'refused', refusal: a.refusal, gate: a.gate, modelCalls: [] });
  });

  it('404s an answer citing a tier the caller cannot read, the same as an unknown id', async () => {
    const partner = await staff('partner', 'partner@example.test');
    const desk = await staff('front_desk', 'desk@example.test');
    stubFetch(replyCiting(`${PARTNER}:1:1`));
    await signInAs(partner.id);
    const a = await (await post({ question: QUESTION, org: orgSlug })).json();
    expect(a.citations.map((c: { tier: string }) => c.tier)).toEqual(['partner']);
    expect((await get(a.answerId)).status).toBe(200);

    await signInAs(desk.id);
    const hidden = await get(a.answerId);
    const missing = await get('00000000-0000-4000-8000-000000000000');
    expect([hidden.status, missing.status]).toEqual([404, 404]);
    expect(await hidden.json()).toEqual(await missing.json());
  });
});
