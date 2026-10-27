// `npm run eval:kappa` (tasks 3.5 + 3.6). κ of each judge against Shane's grades in `eval/grades.md`, joined by the
// `<!-- key answerId:idx -->` comments to SentenceJudgment. Stored rows only, zero model calls. Grades are
// Sheet 1 is Claude-drafted and Shane-approved (D-39, "enriched sample, Claude-assisted"); sheet 2 is graded unassisted
// (D-41). κ is printed per sheet and pooled; an ungraded sheet is skipped.
import { existsSync, readFileSync } from 'node:fs';
import { db } from '@/core/db';
import { cohenKappa, KAPPA_TARGET } from '@/lib/eval/kappa';

const LABELS = ['supported', 'partial', 'unsupported'] as const;
type Label = (typeof LABELS)[number];
const RUNS = { opus: 'answers:hybrid:claude-sonnet-5-5:theta-on:2026-10-23T1646', sonnet: 'rejudge:claude-sonnet-5-5:2026-10-23T1646' };

const SHEETS = { 'sheet 1 (enriched, Claude-assisted, D-39)': 'eval/grades.md', 'sheet 2 (unassisted, D-41)': 'eval/grades-2.md' };
const bySheet = Object.entries(SHEETS).flatMap(([label, file]) => {
  if (!existsSync(file)) return [];
  const gs = [...readFileSync(file, 'utf8').matchAll(/## (S-\d+)[^\n]*\n\n<!-- key ([0-9a-f-]{36}):(\d+) -->[\s\S]*?\ngrade: (\w*)/g)]
    .map((m) => ({ sid: m[1]!, answerId: m[2]!, idx: Number(m[3]), grade: m[4] as Label }));
  if (gs.length !== 20) throw new Error(`${file}: expected 20 sentences, got ${gs.length}`);
  const blank = gs.filter((g) => !g.grade).length;
  if (blank) { console.log(`${file}: ${blank} of 20 ungraded, skipped\n`); return []; }
  for (const g of gs) if (!LABELS.includes(g.grade)) throw new Error(`${file} ${g.sid}: grade ${g.grade}`);
  return [{ label, gs }];
});
const sets = bySheet.length > 1 ? [...bySheet, { label: 'pooled', gs: bySheet.flatMap((b) => b.gs) }] : bySheet;

for (const { label, gs: grades } of sets) for (const [name, runId] of Object.entries(RUNS)) {
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
  if (pairs.length === 0) continue;
  console.log(`${label} · ${name} · ${runId}`);
  console.log(`  n ${k.n} (${missing} without a usable verdict)  raw agreement ${(k.observed * 100).toFixed(0)}%  p_e ${k.expected.toFixed(3)}  κ ${k.kappa === null ? 'null (p_e = 1)' : k.kappa.toFixed(2)}  target ≥ ${KAPPA_TARGET}`);
  console.log(`  Shane ${counts(pairs.map((p) => p.shane))}  judge ${counts(pairs.map((p) => p.judge))}`);
  for (const p of pairs.filter((p) => p.shane !== p.judge)) console.log(`  disagree ${p.sid}: Shane ${p.shane}, judge ${p.judge}`);
  console.log();
}
await db.$disconnect();
