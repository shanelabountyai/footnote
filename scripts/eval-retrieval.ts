// `npm run eval:retrieval` (task 1.11): recall@1/5/10 and MRR per retriever on the verified A, M and V questions of
// eval/golden.json, by slice, plus the top-score distributions for A vs U (the θ input, D-17). Every question is embedded
// in ONE Voyage call up front (ledgered under this run id), and dense/hybrid read from that, so the run makes one call.
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { db } from '@/core/db';
import { type ExpectedCitation, hitRanks, mean, median, recallAt, reciprocalRank } from '@/lib/eval/retrieval-metrics';
import { type Caller, denseRetriever, ftsRetriever, hybridRetriever, type Retriever } from '@/lib/retrieval/retriever';
import { snapshotId } from '@/lib/retrieval/snapshot';
import type { Embedder } from '@/lib/retrieval/voyage';
import { voyageEmbed } from '@/lib/retrieval/voyage';

type Golden = { id: string; slice: string; question: string; callerRole: Caller['role']; expected: { citations: ExpectedCitation[] } };
const K = 10;
const golden = JSON.parse(readFileSync('eval/golden.json', 'utf8')) as Golden[];
const unverified = execFileSync('python3', ['tools/check_golden.py'], { encoding: 'utf8' })
  .split('\n').filter((l) => l.startsWith('UNVERIFIED ')).map((l) => l.slice(11).trim());
const CALIBRATION = new Set(['GA-01', 'GA-02', 'GA-03', 'GA-04', 'GA-05', 'GA-06', 'GA-07', 'GU-01', 'GU-02', 'GU-03', 'GU-04']); // D-17

const snapshot = snapshotId();
const date = new Date().toISOString().slice(0, 10);
const runId = `eval:retrieval:${date}`;
const org = await db.org.findUniqueOrThrow({ where: { slug: 'ledger-lane' } });

// Recall rows: verified questions with expected citations in A, M, V; P (private, answerable) reported as its own row.
const scored = golden.filter((g) => 'AMVP'.includes(g.slice) && g.expected.citations.length && !unverified.includes(g.id));
const asked = golden.filter((g) => scored.includes(g) || g.slice === 'U');
const vectors = await voyageEmbed(asked.map((g) => g.question), 'query', { runId });
const byText = new Map(asked.map((g, i) => [g.question, vectors[i]!]));
const cached: Embedder = async (texts) => texts.map((t) => byText.get(t) ?? (() => { throw new Error(`not pre-embedded: ${t}`); })());

const fts = ftsRetriever(snapshot);
const dense = denseRetriever(snapshot, { embed: cached });
const retrievers: Retriever[] = [fts, dense, hybridRetriever(fts, dense)];

const perQuestion: Record<string, unknown>[] = [];
for (const g of asked) {
  const row: Record<string, unknown> = { id: g.id, slice: g.slice, callerRole: g.callerRole };
  for (const r of retrievers) {
    const rows = await r.search({ orgId: org.id, role: g.callerRole }, g.question, K);
    const ranks = scored.includes(g) ? hitRanks(g.expected.citations, rows) : null;
    row[r.name] = { topScore: rows[0]?.score ?? 0, returned: rows.length, ranks, top: rows.map((c) => `${c.docId}#${c.page}`) };
  }
  perQuestion.push(row);
}
await db.$disconnect();

type Cell = { topScore: number; returned: number; ranks: (number | null)[] | null };
const cell = (q: Record<string, unknown>, r: string) => q[r] as Cell;
const fmt = (x: number) => x.toFixed(3);
const table: Record<string, Record<string, Record<string, number>>> = {};
console.log(`eval:retrieval — snapshot ${snapshot.slice(0, 19)}…, k = ${K}, page ± tolerance match, ${unverified.length} UNVERIFIED excluded (${unverified.join(', ') || 'none'})`);
console.log(`\n| retriever | slice | n | recall@1 | recall@5 | recall@10 | MRR |\n|---|---|---|---|---|---|---|`);
for (const r of retrievers) {
  table[r.name] = {};
  for (const [label, slices] of [['A', 'A'], ['M', 'M'], ['V', 'V'], ['A+M+V', 'AMV'], ['P (private)', 'P']] as const) {
    const qs = perQuestion.filter((q) => slices.includes(q.slice as string) && cell(q, r.name).ranks);
    const ranks = qs.map((q) => cell(q, r.name).ranks!);
    const m = { n: qs.length, recall1: mean(ranks.map((x) => recallAt(x, 1))), recall5: mean(ranks.map((x) => recallAt(x, 5))), recall10: mean(ranks.map((x) => recallAt(x, 10))), mrr: mean(ranks.map(reciprocalRank)) };
    table[r.name]![label] = m;
    console.log(`| ${r.name} | ${label} | ${m.n} | ${fmt(m.recall1)} | ${fmt(m.recall5)} | ${fmt(m.recall10)} | ${fmt(m.mrr)} |`);
  }
}

// θ input (D-17): top-1 score per question, A vs U, all and calibration split. An empty fts result scores 0.
const scores: Record<string, unknown> = {};
console.log(`\n| retriever | A median top (n) | U median top (n) | A min–max | U min–max | calib A median | calib U median | θ midpoint (calib) |\n|---|---|---|---|---|---|---|---|`);
for (const r of retrievers) {
  const top = (slice: string, calib: boolean) => perQuestion.filter((q) => q.slice === slice && (!calib || CALIBRATION.has(q.id as string))).map((q) => cell(q, r.name).topScore);
  const [a, u, ca, cu] = [top('A', false), top('U', false), top('A', true), top('U', true)];
  const theta = (median(ca) + median(cu)) / 2;
  scores[r.name] = { A: a, U: u, calibrationA: ca, calibrationU: cu, medianA: median(a), medianU: median(u), thetaMidpoint: theta };
  const range = (xs: number[]) => `${fmt(Math.min(...xs))}–${fmt(Math.max(...xs))}`;
  console.log(`| ${r.name} | ${fmt(median(a))} (${a.length}) | ${fmt(median(u))} (${u.length}) | ${range(a)} | ${range(u)} | ${fmt(median(ca))} | ${fmt(median(cu))} | ${fmt(theta)} |`);
}

mkdirSync('eval/results', { recursive: true });
const out = `eval/results/retrieval-${snapshot.replace('sha256:', '').slice(0, 12)}-${date}.json`;
writeFileSync(out, JSON.stringify({ snapshot, date, runId, k: K, match: 'docId and page within pageTolerance', unverified, table, scores, perQuestion }, null, 1) + '\n');
console.log(`\nwrote ${out}`);
