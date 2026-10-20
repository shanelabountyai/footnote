// Task 2.5 acceptance: the whole pipeline with fetch stubbed — retrieve, θ gate, budget, model call, schema, verify —
// and the ledger row each path leaves. Fake embedder, so no network and no spend.
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { db } from '@/core/db';
import { ANSWER_MODEL, answer, DISCLAIMER, loadDocMeta, REFUSAL_MESSAGES } from '@/lib/answer/compose';
import { chunkCorpus, type Page } from '@/lib/corpus/chunk';
import { indexChunks, indexEmbeddings } from '@/lib/retrieval/indexer';
import { type Caller, denseRetriever, ftsRetriever, hybridRetriever } from '@/lib/retrieval/retriever';
import { EMBED_DIM, type Embedder } from '@/lib/retrieval/voyage';
import { CAPS_MICRO_USD } from '@/lib/spend/budget';
import { costMicroUsd } from '@/lib/spend/prices';
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

const PAGES: Page[] = [
  { docId: 'pub-a', tier: 'public', page: 3, text: 'Mileage Records\nKeep a mileage log for business use of your car. Record the date and the miles.' },
  { docId: 'pub-a', tier: 'public', page: 4, text: 'Payroll Deposits\nSemiweekly depositors deposit employment taxes on Wednesday or Friday.' },
];
const DOCS = { 'pub-a': { title: 'Publication A', edition: 'For use in 2026', revisionDate: '2026-01-15' } };
const SNAP = 'sha256:compose-test';
const QUESTION = 'Keep a mileage log for business use of your car?';
const QUOTE = 'Keep a mileage log for business use of your car.';

let caller: Caller;
const retriever = () => hybridRetriever(ftsRetriever(SNAP), denseRetriever(SNAP, { embed: fakeEmbed, model: 'fake' }));
const reply = (text: string, usage = { input_tokens: 812, output_tokens: 64 }) =>
  vi.fn(async () => Response.json({ content: [{ type: 'text', text }], usage, stop_reason: 'end_turn' }));
const answerRows = () => db.modelCall.findMany({ where: { purpose: 'answer' } });

beforeEach(async () => {
  await db.corpusChunk.deleteMany();
  await db.modelCall.deleteMany();
  await db.org.deleteMany({ where: { slug: 'compose-a' } });
  const org = await makeOrg('compose-a');
  caller = { orgId: org.id, role: 'front_desk' };
  await indexChunks(SNAP, org.id, chunkCorpus(PAGES));
  await indexEmbeddings(SNAP, org.id, 'fake', fakeEmbed, 'compose-index');
  vi.stubEnv('ANTHROPIC_API_KEY', 'test-key');
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});
afterAll(() => db.$disconnect());

describe('answer() end to end (task 2.5)', () => {
  it('answers with a verified citation, the disclaimer and one ok ledger row', async () => {
    const out = JSON.stringify({ sentences: [{ sentence: 'Keep a mileage log for business use.', chunkIds: ['pub-a:3:1'], quotes: [QUOTE] }] });
    const fetchMock = reply(out);
    vi.stubGlobal('fetch', fetchMock);

    const a = await answer(caller, QUESTION, { retriever: retriever(), snapshot: SNAP, docs: DOCS, runId: 'run-1' });

    expect(a.status).toBe('answered');
    expect(a.refusal).toBeNull();
    expect(a.citations).toEqual([expect.objectContaining({ docId: 'pub-a', edition: 'For use in 2026', revisionDate: '2026-01-15', location: { page: 3, section: 'Mileage Records' }, quote: QUOTE })]);
    expect(a.disclaimer).toBe(DISCLAIMER);
    expect(a.corpusSnapshot).toBe(SNAP);
    expect(a.gate.pass).toBe(true);

    const [url, init] = fetchMock.mock.calls[0]! as unknown as [string, RequestInit];
    expect(url).toBe('https://api.anthropic.com/v1/messages');
    expect((init.headers as Record<string, string>)['x-api-key']).toBe('test-key');
    const sent = JSON.parse(init.body as string);
    expect(sent.model).toBe(ANSWER_MODEL);
    expect(sent.messages[0].content).toContain('<chunk id="pub-a:3:1" tier="public" edition="For use in 2026">');

    const rows = await answerRows();
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ outcome: 'ok', model: ANSWER_MODEL, inputTokens: 812, outputTokens: 64, runId: 'run-1', answerId: a.answerId, costMicroUsd: costMicroUsd(ANSWER_MODEL, 812, 64) });
    expect(a.usage).toEqual({ model: ANSWER_MODEL, inputTokens: 812, outputTokens: 64, costUsd: costMicroUsd(ANSWER_MODEL, 812, 64) / 1e6 });
  });

  it('below θ refuses NO_RELEVANT_PASSAGE with no fetch and no answer row', async () => {
    const fetchMock = reply('{}');
    vi.stubGlobal('fetch', fetchMock);
    const a = await answer(caller, 'What is the capital of France?', { retriever: retriever(), snapshot: SNAP, docs: DOCS });
    expect(a).toMatchObject({ status: 'refused', refusal: { code: 'NO_RELEVANT_PASSAGE', message: REFUSAL_MESSAGES.NO_RELEVANT_PASSAGE }, usage: null, disclaimer: DISCLAIMER });
    expect(a.gate.pass).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(await answerRows()).toHaveLength(0);
  });

  it('output that fails the schema is refused INSUFFICIENT_SUPPORT and logged schema_invalid, cost counted', async () => {
    vi.stubGlobal('fetch', reply('Here is the answer: {"sentences": []}'));
    const a = await answer(caller, QUESTION, { retriever: retriever(), snapshot: SNAP, docs: DOCS });
    expect(a).toMatchObject({ status: 'refused', refusal: { code: 'INSUFFICIENT_SUPPORT', message: REFUSAL_MESSAGES.INSUFFICIENT_SUPPORT }, sentences: [] });
    const rows = await answerRows();
    expect(rows).toMatchObject([{ outcome: 'schema_invalid', answerId: a.answerId }]);
    expect(rows[0]!.costMicroUsd).toBeGreaterThan(0);
  });

  it('a paraphrased quote is dropped by the verifier, not trusted', async () => {
    const out = JSON.stringify({ sentences: [{ sentence: 'Log your miles.', chunkIds: ['pub-a:3:1'], quotes: ['Always keep a log of miles.'] }] });
    vi.stubGlobal('fetch', reply(out));
    const a = await answer(caller, QUESTION, { retriever: retriever(), snapshot: SNAP, docs: DOCS });
    expect(a).toMatchObject({ status: 'refused', refusal: { code: 'INSUFFICIENT_SUPPORT' }, droppedSentences: 1, citations: [] });
  });

  it('an oversized chunk set is refused BUDGET_EXCEEDED with no fetch, the row carrying the estimate (task 2.8)', async () => {
    const fetchMock = reply('{}');
    vi.stubGlobal('fetch', fetchMock);
    const inner = retriever();
    const oversized: typeof inner = { name: inner.name, search: async (...args) => {
      const hits = await inner.search(...args);
      for (const c of hits) c.text += ' filler'.repeat(10_000); // in place, so denseTop survives (D-17b)
      return hits;
    } };
    const a = await answer(caller, QUESTION, { retriever: oversized, snapshot: SNAP, docs: DOCS, runId: 'run-big' });
    expect(a).toMatchObject({ status: 'refused', refusal: { code: 'BUDGET_EXCEEDED', message: REFUSAL_MESSAGES.BUDGET_EXCEEDED }, usage: null, sentences: [] });
    expect(a.gate.pass).toBe(true);
    expect(fetchMock).not.toHaveBeenCalled();
    const rows = await answerRows();
    expect(rows).toMatchObject([{ outcome: 'budget_exceeded', answerId: a.answerId, runId: 'run-big', inputTokens: 0 }]);
    expect(rows[0]!.costMicroUsd).toBeGreaterThan(CAPS_MICRO_USD.answer);
  });

  it('refuses a model that is not allowed at runtime before retrieving (D-4)', async () => {
    await expect(answer(caller, QUESTION, { retriever: retriever(), snapshot: SNAP, docs: DOCS, model: 'claude-fable-5-1' })).rejects.toThrow(/not a runtime model/);
  });
});

describe('loadDocMeta', () => {
  it('reads public metadata from the manifest and private metadata from memo front matter', () => {
    const docs = loadDocMeta();
    expect(docs['p334-2025']).toEqual({ title: expect.stringContaining('Publication 334'), edition: 'For use in preparing 2025 returns', revisionDate: '2026-02-10', supersededBy: null });
    expect(docs['p463-2024']?.supersededBy).toBe('p463-2025');
    expect(docs['ll-inj-01-printer']).toEqual({ title: 'Printer and scanner queue etiquette', edition: '2025-09-22', revisionDate: '2025-09-22', supersededBy: null });
    expect(Object.values(docs).every((d) => d.edition && d.revisionDate && d.title)).toBe(true);
  });
});
