// `npm run eval:scorecard` (task 3.9, D-45). Stored rows only, zero model calls; writes eval/results/scorecard-<snapshot>-<date>.md.
import { writeFileSync } from 'node:fs';
import { db } from '@/core/db';
import { buildScorecard, loadCells } from '@/lib/eval/scorecard';
import { snapshotId } from '@/lib/retrieval/snapshot';

const snapshot = snapshotId();
const date = new Date().toISOString().slice(0, 10);
const md = await buildScorecard({ snapshot, cells: loadCells(snapshot), date });
const out = `eval/results/scorecard-${snapshot.replace('sha256:', '').slice(0, 12)}-${date}.md`;
writeFileSync(out, md);
console.log(md);
console.log(`wrote ${out}`);
await db.$disconnect();
