import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { db } from '@/core/db';
import { chunkCorpus, type Page } from '@/lib/corpus/chunk';
import { indexChunks, indexEmbeddings } from '@/lib/retrieval/indexer';
import { chunksById, denseRetriever, ftsRetriever, hybridRetriever, type RetrievedChunk, rrf, tiersFor } from '@/lib/retrieval/retriever';
import { snapshotId } from '@/lib/retrieval/snapshot';
import { EMBED_DIM, type Embedder, fetchWithRetry, voyageEmbed } from '@/lib/retrieval/voyage';
import { makeOrg } from '../helpers/org';

/** Hashed bag of words, L2-normalised: deterministic, no network, no spend. Shared words → higher cosine. */
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

const PAGES: Page[] = [
  { docId: 'pub-a', tier: 'public', page: 1, text: 'Mileage Records\nKeep a mileage log for business use of your car. Record the date and the miles.' },
  { docId: 'pub-a', tier: 'public', page: 2, text: 'Payroll Deposits\nSemiweekly depositors deposit employment taxes on Wednesday or Friday.' },
  { docId: 'memo-p', tier: 'partner', page: 1, text: 'Partner Note\nThe mileage log policy for the partner tier says partners audit every mileage log quarterly.' },
];
const SNAP = 'sha256:test';
let orgA: string, orgB: string;

beforeEach(async () => {
  await db.corpusChunk.deleteMany();
  await db.modelCall.deleteMany();
  await db.org.deleteMany({ where: { slug: { in: ['ret-a', 'ret-b'] } } });
  orgA = (await makeOrg('ret-a')).id;
  orgB = (await makeOrg('ret-b')).id;
});
afterEach(() => vi.unstubAllGlobals());
afterAll(() => db.$disconnect());

describe('corpus:index is idempotent (task 1.7 acceptance)', () => {
  it('re-running the chunk index writes 0 rows', async () => {
    const chunks = chunkCorpus(PAGES);
    expect(await indexChunks(SNAP, orgA, chunks)).toBe(chunks.length);
    expect(await indexChunks(SNAP, orgA, chunks)).toBe(0);
    expect(await indexChunks('sha256:next', orgA, chunks)).toBe(chunks.length); // a new snapshot is new rows (NN-5)
  });
  it('re-running the embedding index writes 0 rows', async () => {
    const chunks = chunkCorpus(PAGES);
    await indexChunks(SNAP, orgA, chunks);
    expect(await indexEmbeddings(SNAP, orgA, 'fake', fakeEmbed, 'r1', 2)).toBe(chunks.length);
    expect(await indexEmbeddings(SNAP, orgA, 'fake', fakeEmbed, 'r1', 2)).toBe(0);
  });
});

describe('retrievers filter by org and tier inside the query (D-12)', () => {
  beforeEach(async () => {
    await indexChunks(SNAP, orgA, chunkCorpus(PAGES));
    await indexChunks(SNAP, orgB, chunkCorpus(PAGES.slice(1, 2))); // org B has only the payroll chunk
    await indexEmbeddings(SNAP, orgA, 'fake', fakeEmbed, 'r1');
  });
  const dense = () => denseRetriever(SNAP, { embed: fakeEmbed, model: 'fake' });

  it('tiersFor matches D-12', () => {
    expect(tiersFor('front_desk')).toEqual(['public', 'staff']);
    expect(tiersFor('bookkeeper')).toEqual(['public', 'staff', 'engagement']);
    expect(tiersFor('partner')).toEqual(['public', 'staff', 'engagement', 'partner']);
    expect(tiersFor('service')).toEqual(['public']);
  });

  for (const make of [() => ftsRetriever(SNAP), dense, () => hybridRetriever(ftsRetriever(SNAP), dense())]) {
    it(`${make().name}: the partner memo is the best match for a partner and absent for front_desk`, async () => {
      const r = make();
      const q = 'mileage log'; // in both docs; fts ANDs every term (websearch_to_tsquery)
      const partner = await r.search({ orgId: orgA, role: 'partner' }, q, 5);
      expect(partner[0]!.docId).toBe('memo-p');
      const frontDesk = await r.search({ orgId: orgA, role: 'front_desk' }, q, 5);
      expect(frontDesk.map((c) => c.docId)).not.toContain('memo-p');
      expect(frontDesk[0]!.docId).toBe('pub-a');
    });
    it(`${make().name}: denseTop is the dense leg's top-1 cosine (D-17a), absent on fts`, async () => {
      const caller = { orgId: orgA, role: 'partner' as const };
      const got = await make().search(caller, 'mileage log', 5);
      if (make().name === 'fts') return expect(got.denseTop).toBeUndefined();
      const d = await dense().search(caller, 'mileage log', 5);
      expect(got.denseTop).toBe(d[0]!.score);
      expect(d.denseTop).toBe(d[0]!.score);
    });
    it(`${make().name}: another org's chunks never come back`, async () => {
      const got = await make().search({ orgId: orgB, role: 'partner' }, 'mileage log', 5);
      expect(got.map((c) => c.docId)).not.toContain('memo-p');
      expect(got.every((c) => !/mileage/i.test(c.text))).toBe(true);
    });
  }
});

describe('rrf (O-8, k = 60)', () => {
  const c = (chunkId: string) => ({ chunkId }) as RetrievedChunk;
  it('sums 1/(60 + rank) across lists and keeps the top k', () => {
    const out = rrf([[c('a'), c('b')], [c('b'), c('c')]], 2);
    expect(out.map((x) => x.chunkId)).toEqual(['b', 'a']);
    expect(out[0]!.score).toBeCloseTo(1 / 62 + 1 / 61, 12);
  });
});

describe('voyageEmbed goes through the spend ledger (D-18, D-23)', () => {
  it('records token usage from the response and keeps input order', async () => {
    vi.stubEnv('VOYAGE_API_KEY', 'test-key');
    const fetchMock = vi.fn(async () => Response.json({ data: [{ embedding: [2], index: 1 }, { embedding: [1], index: 0 }], usage: { total_tokens: 1234 } }));
    vi.stubGlobal('fetch', fetchMock);
    expect(await voyageEmbed(['x', 'y'], 'document', { runId: 'run-1' })).toEqual([[1], [2]]);
    const body = JSON.parse((fetchMock.mock.calls[0] as unknown as [string, RequestInit])[1].body as string);
    expect(body).toMatchObject({ model: 'voyage-4-lite', input_type: 'document', output_dimension: 1024 });
    const row = await db.modelCall.findFirstOrThrow();
    expect(row).toMatchObject({ purpose: 'embed', model: 'voyage-4-lite', inputTokens: 1234, outputTokens: 0, runId: 'run-1', outcome: 'ok' });
  });
  it('refuses before calling when the build cap would be exceeded', async () => {
    vi.stubEnv('VOYAGE_API_KEY', 'test-key');
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    await db.modelCall.create({ data: { purpose: 'answer', model: 'claude-sonnet-5-5', costMicroUsd: 25_000_000 } });
    await expect(voyageEmbed(['x'.repeat(300)], 'query')).rejects.toThrow(/BUDGET_EXCEEDED/); // ≈ 100 tokens, 2 micro-USD over
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it('names the missing key without calling', async () => {
    vi.stubEnv('VOYAGE_API_KEY', '');
    await expect(voyageEmbed(['x'], 'query')).rejects.toThrow(/VOYAGE_API_KEY is not set/);
  });
  it('waits out a 429 (Retry-After, else 21 s) and gives up after `tries`', async () => {
    const slept: number[] = [];
    const sleep = async (ms: number) => { slept.push(ms); };
    const responses = [new Response('slow down', { status: 429, headers: { 'retry-after': '5' } }), new Response('slow down', { status: 429 }), Response.json({ ok: true })];
    const call = vi.fn(async () => responses.shift()!);
    expect((await fetchWithRetry(call, 40, sleep)).status).toBe(200);
    expect(slept).toEqual([5000, 21000]);
    const always429 = vi.fn(async () => new Response('', { status: 429 }));
    expect((await fetchWithRetry(always429, 3, sleep)).status).toBe(429);
    expect(always429).toHaveBeenCalledTimes(3);
  });
});

describe('snapshotId (D-9)', () => {
  it('matches the id corpus:check prints', () => {
    expect(snapshotId()).toMatch(/^sha256:cd1252c6[0-9a-f]{56}$/);
  });
});

describe('chunksById (task 3.3, judge gate)', () => {
  it('applies the org + tier predicate: a partner chunk asked for by id is absent for front_desk and for another org', async () => {
    await indexChunks(SNAP, orgA, chunkCorpus(PAGES));
    const ids = (await db.corpusChunk.findMany({ where: { orgId: orgA }, select: { chunkId: true } })).map((c) => c.chunkId);
    const docs = async (orgId: string, role: Parameters<typeof tiersFor>[0]) => (await chunksById(SNAP, { orgId, role }, ids)).map((c) => c.docId);
    expect(new Set(await docs(orgA, 'partner'))).toEqual(new Set(['pub-a', 'memo-p']));
    expect(new Set(await docs(orgA, 'front_desk'))).toEqual(new Set(['pub-a']));
    expect(await docs(orgB, 'partner')).toEqual([]);
  });
});
