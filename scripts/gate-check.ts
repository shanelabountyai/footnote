// Live θ-gate check (task 2.4): the held-out U questions through hybrid + thetaGate against the dev index. Below θ
// nothing after the gate runs, so the `answer` rows in the ledger must not move. One Voyage query embed per question.
import { readFileSync } from 'node:fs';
import { db } from '@/core/db';
import { thetaGate } from '@/lib/answer/gate';
import { type Caller, denseRetriever, ftsRetriever, hybridRetriever } from '@/lib/retrieval/retriever';
import { snapshotId } from '@/lib/retrieval/snapshot';

const IDS = process.argv.slice(2).length ? process.argv.slice(2) : ['GU-06', 'GU-07', 'GU-08'];
type Golden = { id: string; question: string; callerRole: Caller['role'] };
const golden = (JSON.parse(readFileSync('eval/golden.json', 'utf8')) as Golden[]).filter((g) => IDS.includes(g.id));
const snapshot = snapshotId();
const org = await db.org.findUniqueOrThrow({ where: { slug: 'ledger-lane' } });
const runId = `gate-check:${new Date().toISOString().slice(0, 10)}`;
const hybrid = hybridRetriever(ftsRetriever(snapshot), denseRetriever(snapshot, { runId }));

const answerRows = () => db.modelCall.count({ where: { purpose: 'answer' } });
const before = await answerRows();
let ok = true;
for (const g of golden) {
  const gate = thetaGate('hybrid', await hybrid.search({ orgId: org.id, role: g.callerRole }, g.question, 10));
  ok &&= !gate.pass;
  console.log(`${g.id} ${g.callerRole}: dense top ${gate.score!.toFixed(3)} vs θ ${gate.theta} → ${gate.pass ? 'PASS to model' : 'refused / NO_RELEVANT_PASSAGE'}`);
}
const after = await answerRows();
console.log(`answer ModelCall rows: ${before} → ${after}`);
await db.$disconnect();
process.exit(ok && after === before ? 0 : 1);
