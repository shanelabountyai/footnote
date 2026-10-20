// Live answer check (task 2.5): golden questions through the default composer (hybrid, Sonnet) against the dev index.
// Prints each answer with its verified citations and the cost from its ModelCall row. One query embed + at most one answer call per question.
import { readFileSync } from 'node:fs';
import { db } from '@/core/db';
import { answer } from '@/lib/answer/compose';
import { type Caller, denseRetriever, ftsRetriever, hybridRetriever } from '@/lib/retrieval/retriever';
import { snapshotId } from '@/lib/retrieval/snapshot';

const IDS = process.argv.slice(2).length ? process.argv.slice(2) : ['GA-01'];
type Golden = { id: string; question: string; callerRole: Caller['role'] };
const golden = (JSON.parse(readFileSync('eval/golden.json', 'utf8')) as Golden[]).filter((g) => IDS.includes(g.id));
const snapshot = snapshotId();
const org = await db.org.findUniqueOrThrow({ where: { slug: 'ledger-lane' } });
const runId = `answer-check:${new Date().toISOString().slice(0, 10)}`;
const retriever = hybridRetriever(ftsRetriever(snapshot), denseRetriever(snapshot, { runId }));

for (const g of golden) {
  const a = await answer({ orgId: org.id, role: g.callerRole }, g.question, { retriever, snapshot, runId });
  console.log(`\n${g.id} ${g.callerRole}: ${a.status}${a.refusal ? ` / ${a.refusal.code}` : ''} (dense top ${a.gate.score?.toFixed(3)} vs θ ${a.gate.theta}, dropped ${a.droppedSentences})`);
  for (const s of a.sentences) console.log(`  • ${s.text} [${s.citations.join(', ')}]`);
  for (const c of a.citations) console.log(`  ${c.id} ${c.docId} p.${c.location.page} (${c.edition}, rev ${c.revisionDate}): "${c.quote}"`);
  if (a.usage) console.log(`  ${a.usage.model}: ${a.usage.inputTokens} in / ${a.usage.outputTokens} out, $${a.usage.costUsd.toFixed(4)}`);
  console.log(`  ${a.disclaimer}`);
}
await db.$disconnect();
