// Live θ-gate check (task 2.4, θ 0.52 from 4.0 / D-46): the held-out U questions through dense + thetaGate against the dev index. Below θ
// nothing after the gate runs, so the `answer` rows in the ledger must not move. One Voyage query embed per question.
import { readFileSync } from 'node:fs';
import { db } from '@/core/db';
import { thetaGate } from '@/lib/answer/gate';
import { type Caller, denseRetriever } from '@/lib/retrieval/retriever';
import { snapshotId } from '@/lib/retrieval/snapshot';

const IDS = process.argv.slice(2).length ? process.argv.slice(2) : ['GU-06', 'GU-07', 'GU-08'];
type Golden = { id: string; question: string; callerRole: Caller['role'] };
const golden = (JSON.parse(readFileSync('eval/golden.json', 'utf8')) as Golden[]).filter((g) => IDS.includes(g.id));
const snapshot = snapshotId();
const org = await db.org.findUniqueOrThrow({ where: { slug: 'ledger-lane' } });
const runId = `gate-check:${new Date().toISOString().slice(0, 10)}`;
const dense = denseRetriever(snapshot, { runId });
// GU-08 (dense top 0.544) sits between 0.52 and 0.559: it reaches the model now, by D-46.
const EXPECT_PASS: Record<string, boolean> = { 'GU-06': false, 'GU-07': false, 'GU-08': true };

const answerRows = () => db.modelCall.count({ where: { purpose: 'answer' } });
const before = await answerRows();
let ok = true;
for (const g of golden) {
  const gate = thetaGate('dense', await dense.search({ orgId: org.id, role: g.callerRole }, g.question, 10));
  ok &&= (EXPECT_PASS[g.id] ?? false) === gate.pass;
  console.log(`${g.id} ${g.callerRole}: dense top ${gate.score!.toFixed(3)} vs θ ${gate.theta} → ${gate.pass ? 'PASS to model' : 'refused / NO_RELEVANT_PASSAGE'}`);
}
const after = await answerRows();
console.log(`answer ModelCall rows: ${before} → ${after}`);
await db.$disconnect();
process.exit(ok && after === before ? 0 : 1);
