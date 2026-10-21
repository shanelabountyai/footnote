// Live task 2.10: the ten hand-answered questions (eval/hand-answers.md, D-27) through the default composer (hybrid,
// Sonnet). A citation matches when its doc is Shane's page ± 1 or the golden page ± pageTolerance. Reports only; the
// prompt and θ are not tuned on these ten (they are the Phase 3 κ anchor). ~10 answer calls under one run id.
import { readFileSync, writeFileSync } from 'node:fs';
import { db } from '@/core/db';
import { answer } from '@/lib/answer/compose';
import { type Caller, denseRetriever, ftsRetriever, hybridRetriever } from '@/lib/retrieval/retriever';
import { snapshotId } from '@/lib/retrieval/snapshot';

type Page = { docId: string; page: number; tol: number };
type Golden = { id: string; question: string; callerRole: Caller['role']; expected: { citations: { docId: string; page: number; pageTolerance: number }[]; refusal: string | null } };

// "## GA-01 (front_desk)" sections; "- doc: X" followed by "page: N".
const hand = new Map<string, Page[]>();
for (const sec of readFileSync('eval/hand-answers.md', 'utf8').split(/^## /m).slice(1)) {
  const id = sec.split(/\s/)[0]!;
  hand.set(id, [...sec.matchAll(/- doc: (\S+)\s+page: (\d+)/g)].map((m) => ({ docId: m[1]!, page: Number(m[2]), tol: 1 })));
}
const golden = (JSON.parse(readFileSync('eval/golden.json', 'utf8')) as Golden[]).filter((g) => hand.has(g.id));
if (golden.length !== 10) throw new Error(`expected 10 hand questions in golden.json, found ${golden.length}`);

const snapshot = snapshotId();
const date = new Date().toISOString().slice(0, 10);
const runId = `hand10:${date}`;
const org = await db.org.findUniqueOrThrow({ where: { slug: 'ledger-lane' } });
const retriever = hybridRetriever(ftsRetriever(snapshot), denseRetriever(snapshot, { runId }));
const near = (c: { docId: string; page: number }, ps: Page[]) => ps.some((p) => p.docId === c.docId && Math.abs(p.page - c.page) <= p.tol);

const rows: { id: string; match: boolean; codeMismatch: boolean; status: string; [k: string]: unknown }[] = [];
for (const id of hand.keys()) {
  const g = golden.find((x) => x.id === id)!;
  const a = await answer({ orgId: org.id, role: g.callerRole }, g.question, { retriever, snapshot, runId });
  const handPages = hand.get(id)!;
  const goldenPages = g.expected.citations.map((c) => ({ docId: c.docId, page: c.page, tol: c.pageTolerance }));
  const cites = a.citations.map((c) => ({ docId: c.docId, page: c.location.page, quote: c.quote, onHand: near({ docId: c.docId, page: c.location.page }, handPages), onGolden: near({ docId: c.docId, page: c.location.page }, goldenPages) }));
  const expectRefuse = handPages.length === 0;
  const match = expectRefuse ? a.status === 'refused' : a.status !== 'refused' && cites.some((c) => c.onHand || c.onGolden);
  const codeMismatch = expectRefuse && match && g.expected.refusal !== null && a.refusal?.code !== g.expected.refusal; // refused, but not by the stage golden expects
  const why = codeMismatch ? `refusal code ${a.refusal?.code} ≠ golden ${g.expected.refusal}` : match ? '' : expectRefuse ? `expected refusal, got ${a.status}` : a.status === 'refused' ? `refused ${a.refusal?.code}` : 'no citation on the hand or golden page';
  console.log(`${codeMismatch ? 'OK/CODE ' : match ? 'OK      ' : 'MISMATCH'} ${id} ${g.callerRole}: ${a.status}${a.refusal ? ` / ${a.refusal.code}` : ''} (dense top ${a.gate.score?.toFixed(3)}, dropped ${a.droppedSentences})${why ? ` — ${why}` : ''}`);
  for (const c of cites) console.log(`    ${c.onHand || c.onGolden ? '✓' : '·'} ${c.docId} p.${c.page}${c.onHand ? ' hand' : ''}${c.onGolden ? ' golden' : ''}`);
  rows.push({ id, callerRole: g.callerRole, match, codeMismatch, why, status: a.status, refusal: a.refusal, gate: a.gate, droppedSentences: a.droppedSentences, costUsd: a.usage?.costUsd ?? 0, sentences: a.sentences.map((s) => ({ text: s.text, superseded: s.superseded ?? null })), citations: cites, handPages, goldenPages });
}

const spent = await db.modelCall.aggregate({ where: { runId, purpose: 'answer', outcome: { not: 'budget_exceeded' } }, _sum: { costMicroUsd: true } });
const costUsd = (spent._sum.costMicroUsd ?? 0) / 1e6;
const count = (s: string) => rows.filter((r) => r.status === s).length;
console.log(`hand-10: ${rows.filter((r) => r.match).length} of 10 match (${rows.filter((r) => r.codeMismatch).length} with a refusal-code mismatch); answered ${count('answered')}, partial ${count('partial')}, refused ${count('refused')}; run ${runId} answer spend $${costUsd.toFixed(4)}`);
const out = `eval/results/hand10-${snapshot.replace('sha256:', '').slice(0, 12)}-${date}.json`;
writeFileSync(out, JSON.stringify({ snapshot, date, runId, costUsd, match: 'docId and page within hand ± 1 or golden ± pageTolerance', rows }, null, 1) + '\n');
console.log(`wrote ${out}`);
await db.$disconnect();
