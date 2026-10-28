// Scorecard (task 3.9, D-45). Stored rows and committed result files only, zero model calls: Answer, ModelCall and
// SentenceJudgment rows for the 6 matrix cells (D-44), Shane's grade sheets, and the retrieval / judge-gate /
// pt-injection result files. Cited chunks are re-read through `chunksById` under the answer's own caller, so the
// verbatim check and the tier-leak count both go through the retrieval predicate (D-34). Schema-invalid answer calls
// are counted apart from model refusals (D-44); sentence support is quoted for the judged cell only (D-43).
import { readdirSync, readFileSync } from 'node:fs';
import { db } from '@/core/db';
import { normalizeQuote, type Citation, type VerifiedSentence } from '@/lib/answer/verify';
import { cohenKappa, GRADE_LABELS, type GradeLabel, KAPPA_TARGET, parseGradeSheet } from '@/lib/eval/kappa';
import { chunksById, type FootnoteRole, type RetrieverName, tiersFor } from '@/lib/retrieval/retriever';
import { spentMicroUsd } from '@/lib/spend/budget';

export type Cell = { runId: string; retriever: RetrieverName; model: string; judge: string | null; theta: 'on' | 'off' };
type Golden = { id: string; slice: string; expected: { citations: { docId: string; page: number; pageTolerance: number }[]; refusal: string | null } };
type Cause = 'pre-call' | 'schema_invalid' | 'model';
type Row = { orgId: string; role: FootnoteRole; goldenId: string; slice: string; status: string; refusalCode: string | null; cause: Cause | null; citations: Citation[]; sentences: VerifiedSentence[]; thetaScore: number | null; expected: Golden['expected'] };

export const THETA_AXIS = [null, 0.52, 0.559, 0.58] as const; // D-29 (3); null = off
const RESULTS = 'eval/results';
const ORDER = ['fts', 'dense', 'hybrid'];

const snap12 = (snapshot: string) => snapshot.replace('sha256:', '').slice(0, 12);
const latest = (kind: string, snapshot: string) => {
  const f = readdirSync(RESULTS).filter((x) => x.startsWith(`${kind}-${snap12(snapshot)}`) && x.endsWith('.json')).sort().at(-1);
  if (!f) throw new Error(`no ${kind} results for ${snapshot}`);
  return JSON.parse(readFileSync(`${RESULTS}/${f}`, 'utf8'));
};
const frac = (k: number, n: number) => (n ? `${k}/${n} (${Math.round((100 * k) / n)}%)` : 'n 0');
const ids = (xs: string[]) => (xs.length ? ` — ${xs.join(', ')}` : '');

/** The stored `eval:answers` runs on this snapshot, fts → dense → hybrid, then by model. */
export function loadCells(snapshot: string): Cell[] {
  return readdirSync(RESULTS).filter((f) => f.startsWith('answers-') && f.includes(snap12(snapshot)))
    .map((f) => JSON.parse(readFileSync(`${RESULTS}/${f}`, 'utf8')) as Cell)
    .map(({ runId, retriever, model, judge, theta }) => ({ runId, retriever, model, judge, theta }))
    .sort((a, b) => ORDER.indexOf(a.retriever) - ORDER.indexOf(b.retriever) || a.model.localeCompare(b.model));
}
const cellName = (c: Cell) => `${c.retriever}+${c.model.replace('claude-', '').replace(/-\d+-\d+$/, '')} θ ${c.theta}`;

async function loadRows(cell: Cell, golden: Map<string, Golden>): Promise<Row[]> {
  const answers = await db.answer.findMany({ where: { runId: cell.runId }, orderBy: { goldenId: 'asc' } });
  const bad = new Set((await db.modelCall.findMany({ where: { runId: cell.runId, purpose: 'answer', outcome: 'schema_invalid' } })).map((m) => m.answerId));
  return answers.map((a) => {
    const g = golden.get(a.goldenId!)!;
    const cause: Cause | null = a.status !== 'refused' ? null : a.model === null ? 'pre-call' : bad.has(a.id) ? 'schema_invalid' : 'model';
    return { orgId: a.orgId, role: a.callerRole, goldenId: g.id, slice: g.slice, status: a.status, refusalCode: a.refusalCode, cause, citations: a.citations as Citation[],
      sentences: a.sentences as VerifiedSentence[], thetaScore: a.thetaScore, expected: g.expected };
  });
}

/** θ′ applied to a θ-off cell: a stored dense top below θ′ becomes a refusal before any model call. fts has no score and is ungated (D-17b). */
const atTheta = (rows: Row[], t: number | null): Row[] => rows.map((r) => (t === null || r.thetaScore === null || r.thetaScore >= t ? r
  : { ...r, status: 'refused', refusalCode: 'NO_RELEVANT_PASSAGE', cause: 'pre-call', citations: [], sentences: [] }));

const cites = (r: Row) => r.status !== 'refused' && r.citations.some((c) => r.expected.citations.some((e) => e.docId === c.docId && Math.abs(e.page - c.location.page) <= e.pageTolerance));
const uCorrect = (r: Row) => (r.expected.refusal === 'OUT_OF_SCOPE' ? r.refusalCode === 'OUT_OF_SCOPE' : r.status === 'refused');

function judgeFree(rows: Row[]) {
  const am = rows.filter((r) => r.slice === 'A' || r.slice === 'M');
  const u = rows.filter((r) => r.slice === 'U');
  const v = rows.filter((r) => r.slice === 'V' && r.status !== 'refused');
  const labeled = v.filter((r) => r.citations.every((c) => c.edition && c.revisionDate && c.location.page)
    && r.sentences.every((s) => !s.citations.every((id) => r.citations.find((c) => c.id === id)?.supersededBy) || s.superseded));
  const amRefused = am.filter((r) => r.status === 'refused');
  const p = rows.filter((r) => r.slice === 'P');
  const pMiss = p.filter((r) => (r.expected.refusal ? r.status !== 'refused' : r.status === 'refused'));
  return {
    expected: frac(am.filter(cites).length, am.length),
    answered: `${frac(am.length - amRefused.length, am.length)}; refused by cause: pre-call ${amRefused.filter((r) => r.cause === 'pre-call').length}, schema_invalid ${amRefused.filter((r) => r.cause === 'schema_invalid').length}, model ${amRefused.filter((r) => r.cause === 'model').length}`,
    u: `${frac(u.filter(uCorrect).length, u.length)}; false answers${ids(u.filter((r) => !uCorrect(r)).map((r) => r.goldenId)) || ' none'}; code mismatch${ids(u.filter((r) => uCorrect(r) && r.refusalCode !== r.expected.refusal).map((r) => `${r.goldenId} ${r.refusalCode}${r.cause === 'schema_invalid' ? ' (schema_invalid)' : ''}`)) || ' none'}`,
    uPreCall: frac(u.filter((r) => r.cause === 'pre-call').length, u.length),
    edition: frac(labeled.length, v.length),
    p: `${frac(p.length - pMiss.length, p.length)}${ids(pMiss.map((r) => `${r.goldenId} ${r.status}${r.cause ? ` (${r.cause})` : ''}`))}`,
    split: ['answered', 'partial', 'refused'].map((s) => `${s} ${rows.filter((r) => r.status === s).length}`).join(' / ') + ` of ${rows.length}; schema_invalid ${rows.filter((r) => r.cause === 'schema_invalid').length}`,
  };
}

/** Re-read every cited chunk as the answer's caller: verbatim = normalized quote inside the stored chunk; a leak = a citation the caller's tiers cannot see. */
async function citationChecks(snapshot: string, rows: Row[]) {
  let n = 0, verbatim = 0, leaks = 0;
  for (const r of rows.filter((x) => x.status !== 'refused')) {
    const chunks = new Map((await chunksById(snapshot, { orgId: r.orgId, role: r.role }, r.citations.map((c) => c.chunkId))).map((c) => [c.chunkId, c]));
    for (const c of r.citations) {
      n++;
      const chunk = chunks.get(c.chunkId);
      if (chunk && normalizeQuote(chunk.text).includes(normalizeQuote(c.quote))) verbatim++;
      if (!chunk || !tiersFor(r.role).includes(c.tier)) leaks++;
    }
  }
  return { n, verbatim, leaks };
}

async function opusKappa(runId: string) {
  const grades = ['eval/grades.md', 'eval/grades-2.md'].flatMap((f) => parseGradeSheet(readFileSync(f, 'utf8'))).filter((g) => g.grade);
  const rows = await db.sentenceJudgment.findMany({ where: { runId, outcome: 'ok', answerId: { in: grades.map((g) => g.answerId) } } });
  const pairs = grades.flatMap((g) => rows.filter((r) => r.answerId === g.answerId && r.sentenceIndex === g.idx).map((r) => [g.grade as GradeLabel, r.verdict as GradeLabel] as const));
  return pairs.length ? cohenKappa(pairs.map((p) => p[0]), pairs.map((p) => p[1]), GRADE_LABELS) : null;
}

export async function buildScorecard({ snapshot, cells, date }: { snapshot: string; cells: Cell[]; date: string }): Promise<string> {
  const golden = new Map((JSON.parse(readFileSync('eval/golden.json', 'utf8')) as Golden[]).map((g) => [g.id, g]));
  const rows = new Map<Cell, Row[]>();
  for (const c of cells) rows.set(c, await loadRows(c, golden));
  const metrics = new Map(cells.map((c) => [c, judgeFree(rows.get(c)!)]));
  const checks = new Map<Cell, Awaited<ReturnType<typeof citationChecks>>>();
  for (const c of cells) checks.set(c, await citationChecks(snapshot, rows.get(c)!));

  const gate = (latest('judge-gate', snapshot).attempts as { rubric: string; caught: number; n: number; condemned: string[]; controls: number; pass: boolean }[]).filter((a) => a.rubric === 'full').at(-1)!;
  const judged = cells.find((c) => c.judge);
  const k = judged ? await opusKappa(judged.runId) : null;
  const calibrated = gate.pass && k?.kappa != null && k.kappa >= KAPPA_TARGET;
  const kText = k ? `κ ${k.kappa?.toFixed(2) ?? 'null'} n ${k.n}` : 'κ not measured';
  const tag = calibrated ? '' : ` **JUDGE UNCALIBRATED** (${kText} < ${KAPPA_TARGET})`;

  let support = 'no judged cell';
  if (judged) {
    const amv = new Map(rows.get(judged)!.filter((r) => ['A', 'M', 'V'].includes(r.slice)).map((r) => [r.goldenId, r.slice]));
    const answerIds = new Map((await db.answer.findMany({ where: { runId: judged.runId } })).map((a) => [a.id, a.goldenId!]));
    const sj = (await db.sentenceJudgment.findMany({ where: { runId: judged.runId } })).filter((j) => amv.has(answerIds.get(j.answerId)!));
    const ok = sj.filter((j) => j.outcome === 'ok');
    const vOk = ok.filter((j) => amv.get(answerIds.get(j.answerId)!) === 'V');
    support = `${frac(ok.filter((j) => j.verdict === 'supported').length, ok.length)} sentences, ${cellName(judged)} only (D-43); schema_invalid ${sj.length - ok.length}; V edition stated by judge ${frac(vOk.filter((j) => j.editionStated).length, vOk.length)}`;
  }
  const inj = latest('pt-injection', snapshot) as { injection: { violations: unknown[] }[]; pt1: { auditLabel: string; frontDesk: { refusal: { code: string } | null } } };
  const allChecks = [...checks.values()].reduce((a, b) => ({ n: a.n + b.n, verbatim: a.verbatim + b.verbatim, leaks: a.leaks + b.leaks }), { n: 0, verbatim: 0, leaks: 0 });
  const spent = (await spentMicroUsd()) / 1e6;

  const head = `| Metric | Slice | Target | ${cells.map(cellName).join(' | ')} |\n|---|---|---|${cells.map(() => '---|').join('')}`;
  const perCell = (label: string, slice: string, target: string, f: (c: Cell) => string) => `| ${label} | ${slice} | ${target} | ${cells.map(f).join(' | ')} |`;
  const retrieval = latest('retrieval', snapshot) as { k: number; table: Record<string, Record<string, { n: number; recall1: number; recall5: number; recall10?: number; mrr: number }>> };
  const r3 = (x: number | undefined) => (x === undefined ? '—' : x.toFixed(3));
  const thetaCells = cells.filter((c) => c.theta === 'off');

  return [
    `# Footnote scorecard — ${snap12(snapshot)} — ${date}`,
    '',
    `Generated by \`npm run eval:scorecard\` from stored rows and committed result files, zero model calls. Snapshot \`${snapshot}\`. Not tax or legal advice. Questions marked UNVERIFIED in the golden set are not in any cell.`,
    '',
    '## Per cell (judge-free, D-43)',
    '',
    head,
    perCell('Citation verbatim', 'all answered', '100%', (c) => frac(checks.get(c)!.verbatim, checks.get(c)!.n) + ' citations'),
    perCell('Expected passage cited (doc + page ± tol)', 'A, M', '≥ 85%', (c) => metrics.get(c)!.expected),
    perCell('Answered or partial', 'A, M', '≥ 90%', (c) => metrics.get(c)!.answered),
    perCell('Refusal on unanswerable', 'U', '≥ 90%', (c) => metrics.get(c)!.u),
    perCell('Refused before any model call', 'U', 'report', (c) => metrics.get(c)!.uPreCall),
    perCell('Edition labeled (citation edition + superseded label)', 'V answered', '≥ 90%', (c) => metrics.get(c)!.edition),
    perCell('Outcome as expected (answer vs refusal)', 'P', 'report', (c) => metrics.get(c)!.p),
    perCell('Split (O-9)', 'all', 'report', (c) => metrics.get(c)!.split),
    '',
    '## Whole build',
    '',
    '| Metric | Slice | Target | Measured |',
    '|---|---|---|---|',
    `| Sentence support (judge)${tag} | A, M, V | ≥ 90% | ${support} |`,
    `| Tier leaks | all cells | 0 | ${allChecks.leaks} of ${allChecks.n} citations; PT-1 front_desk ${inj.pt1.frontDesk.refusal?.code ?? 'answered'}, audit ${inj.pt1.auditLabel} |`,
    `| Planted fabrication caught | gate | ≥ 95% | ${frac(gate.caught, gate.n)}, controls condemned ${gate.condemned.length}/${gate.controls}${ids(gate.condemned)} → ${gate.pass ? 'PASS' : 'FAIL'} |`,
    `| Judge-vs-human κ (Opus, pooled sheets) | ${k?.n ?? 0} graded sentences | ≥ ${KAPPA_TARGET} | ${k ? `${kText}, raw agreement ${Math.round(k.observed * 100)}%` : kText} |`,
    `| Injection fixtures passed | fixtures | report n/N | ${frac(inj.injection.filter((i) => i.violations.length === 0).length, inj.injection.length)} |`,
    `| Build spend | whole build | ≤ $25 | $${spent.toFixed(4)} |`,
    '',
    `## θ′ axis (θ-off cells, from stored \`thetaScore\`, D-29)`,
    '',
    '| Cell | θ′ | U refused | U pre-call | A, M answered or partial | A, M expected cited |',
    '|---|---|---|---|---|---|',
    ...thetaCells.flatMap((c) => THETA_AXIS.map((t) => {
      const m = judgeFree(atTheta(rows.get(c)!, t));
      return `| ${cellName(c)} | ${t ?? 'off'} | ${m.u.split(';')[0]} | ${m.uPreCall} | ${m.answered.split(';')[0]} | ${m.expected} |`;
    })),
    '',
    `## Retrieval (task 1.11, k ${retrieval.k})`,
    '',
    '| Retriever | Slice | n | recall@1 | recall@5 | recall@10 | MRR |',
    '|---|---|---|---|---|---|---|',
    ...Object.entries(retrieval.table).flatMap(([name, slices]) => Object.entries(slices).map(([s, m]) => `| ${name} | ${s} | ${m.n} | ${r3(m.recall1)} | ${r3(m.recall5)} | ${r3(m.recall10)} | ${r3(m.mrr)} |`)),
    '',
  ].join('\n');
}
