// `npm run eval:kappa` (tasks 3.5 + 3.6). κ of each judge against Shane's grades in `eval/grades.md`, joined by the
// `<!-- key answerId:idx -->` comments to SentenceJudgment. Stored rows only, zero model calls. Grades are
// Claude-drafted and Shane-approved (D-39), so every figure is labelled "enriched sample, Claude-assisted grades".
import { readFileSync } from 'node:fs';
import { db } from '@/core/db';
import { cohenKappa, KAPPA_TARGET } from '@/lib/eval/kappa';

const LABELS = ['supported', 'partial', 'unsupported'] as const;
type Label = (typeof LABELS)[number];
const RUNS = { opus: 'answers:hybrid:claude-sonnet-5-5:theta-on:2026-10-23T1646', sonnet: 'rejudge:claude-sonnet-5-5:2026-10-23T1646' };

const sheet = readFileSync('eval/grades.md', 'utf8');
const grades = [...sheet.matchAll(/## (S-\d+)[^\n]*\n\n<!-- key ([0-9a-f-]{36}):(\d+) -->[\s\S]*?\ngrade: (\w+)/g)]
  .map((m) => ({ sid: m[1]!, answerId: m[2]!, idx: Number(m[3]), grade: m[4] as Label }));
if (grades.length !== 20) throw new Error(`expected 20 graded sentences, got ${grades.length}`);
for (const g of grades) if (!LABELS.includes(g.grade)) throw new Error(`${g.sid}: grade ${g.grade}`);

console.log('κ vs Shane — enriched sample, Claude-assisted grades (D-37, D-39)\n');
for (const [name, runId] of Object.entries(RUNS)) {
  const rows = await db.sentenceJudgment.findMany({ where: { runId, answerId: { in: grades.map((g) => g.answerId) } } });
  const pairs: { sid: string; shane: Label; judge: Label }[] = [];
  let missing = 0;
  for (const g of grades) {
    const ok = rows.filter((r) => r.answerId === g.answerId && r.sentenceIndex === g.idx && r.outcome === 'ok');
    if (ok.length > 1) throw new Error(`${name} ${g.sid}: ${ok.length} ok rows`);
    if (ok.length === 0) { missing++; continue; }
    pairs.push({ sid: g.sid, shane: g.grade, judge: ok[0]!.verdict as Label });
  }
  const k = cohenKappa(pairs.map((p) => p.shane), pairs.map((p) => p.judge), LABELS);
  const counts = (xs: Label[]) => LABELS.map((l) => `${l[0]}${xs.filter((x) => x === l).length}`).join('/');
  console.log(`${name.padEnd(6)} ${runId}`);
  console.log(`  n ${k.n} (${missing} without a usable verdict)  raw agreement ${(k.observed * 100).toFixed(0)}%  p_e ${k.expected.toFixed(3)}  κ ${k.kappa === null ? 'null (p_e = 1)' : k.kappa.toFixed(2)}  target ≥ ${KAPPA_TARGET}`);
  console.log(`  Shane ${counts(pairs.map((p) => p.shane))}  judge ${counts(pairs.map((p) => p.judge))}`);
  for (const p of pairs.filter((p) => p.shane !== p.judge)) console.log(`  disagree ${p.sid}: Shane ${p.shane}, judge ${p.judge}`);
  console.log();
}
await db.$disconnect();
