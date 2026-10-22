// Live task 3.3: the planted-fabrication gate (D-22, D-31, D-32). Judges the planted sentence of each of the 25 plants
// and every sentence of the 6 controls, once with the shipping rubric and once with the error-kind list removed
// (D-32), each under its own run id. Chunks are loaded by id through `chunksById` (the retriever's org + tier predicate). Every attempt is appended to
// eval/results/judge-gate-<snapshot>-<date>.json with its prompt hash; a revised prompt is a new attempt, never a rewrite.
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { db } from '@/core/db';
import { loadDocMeta } from '@/lib/answer/compose';
import type { Citation } from '@/lib/answer/verify';
import { judge, JUDGE_MODEL, JUDGE_SYSTEM_PROMPT, JUDGE_SYSTEM_PROMPT_NO_KINDS } from '@/lib/eval/judge';
import { type GateVerdicts, scoreGate } from '@/lib/eval/judge-gate';
import { chunksById, type RetrievedChunk } from '@/lib/retrieval/retriever';
import { snapshotId } from '@/lib/retrieval/snapshot';

type Cit = { chunkId: string; docId: string; page: number; quote: string };
type Fixture = { id: string; kind: string; plantedIndex: number | null; signature: string | null; sentences: { text: string; citations: Cit[] }[] };

const { fixtures } = JSON.parse(readFileSync('eval/fixtures/fabrication.json', 'utf8')) as { fixtures: Fixture[] };
const snapshot = snapshotId();
const date = new Date().toISOString().slice(0, 10);
const out = `eval/results/judge-gate-${snapshot.replace('sha256:', '').slice(0, 12)}-${date}.json`;
const prior = existsSync(out) ? (JSON.parse(readFileSync(out, 'utf8')) as { attempts: unknown[] }).attempts : [];
const attempt = prior.length / 2 + 1; // each attempt runs both rubrics
const docs = loadDocMeta();

const ids = [...new Set(fixtures.flatMap((f) => f.sentences.flatMap((s) => s.citations.map((c) => c.chunkId))))];
// Through the retriever's predicate (non-negotiable 3), as the role that reads the most tiers; the fixtures cite public pages.
const org = await db.org.findUniqueOrThrow({ where: { slug: 'ledger-lane' } });
const chunks = new Map<string, RetrievedChunk>((await chunksById(snapshot, { orgId: org.id, role: 'partner' }, ids)).map((c) => [c.chunkId, c]));
const missing = ids.filter((id) => !chunks.has(id));
if (missing.length) throw new Error(`chunks not in snapshot ${snapshot}: ${missing.join(', ')} (run corpus:index)`);

const toCitation = (c: Cit, i: number): Citation => {
  const d = docs[c.docId];
  if (!d) throw new Error(`no doc metadata for ${c.docId}`);
  return { id: `c${i + 1}`, docId: c.docId, title: d.title, edition: d.edition, revisionDate: d.revisionDate, supersededBy: d.supersededBy ?? null,
    location: { page: c.page, section: null }, chunkId: c.chunkId, quote: c.quote, score: 0, tier: chunks.get(c.chunkId)!.tier };
};

const attempts = [];
for (const [rubric, system] of [['full', JUDGE_SYSTEM_PROMPT], ['no-kinds', JUDGE_SYSTEM_PROMPT_NO_KINDS]] as const) {
  const runId = `judge-gate:${date}:a${attempt}:${rubric}`;
  const promptHash = createHash('sha256').update(system).digest('hex').slice(0, 12);
  const verdicts: GateVerdicts = {};
  const detail = [];
  for (const f of fixtures) {
    const idx = f.kind === 'control' ? f.sentences.map((_, i) => i) : [f.plantedIndex!];
    verdicts[f.id] = [];
    for (const i of idx) {
      const s = f.sentences[i]!;
      const r = await judge(s.text, s.citations.map(toCitation), s.citations.map((c) => chunks.get(c.chunkId)!), { runId, system });
      const v = r.ok ? r.verdict.verdict : 'schema_invalid';
      verdicts[f.id]![i] = v;
      const bad = f.kind === 'control' ? v !== 'supported' : !['unsupported', 'partial'].includes(v);
      console.log(`${bad ? (f.kind === 'control' ? 'CONDEMNED' : 'MISSED   ') : 'ok       '} [${rubric}] ${f.id} ${f.kind} s${i}: ${v}${r.ok ? ` — ${r.verdict.reason}` : ` — ${r.reason}`}`);
      detail.push({ id: f.id, kind: f.kind, sentence: i, signature: f.signature, verdict: v, reason: r.ok ? r.verdict.reason : r.reason, costUsd: r.usage.costUsd });
    }
  }
  const score = scoreGate(fixtures, verdicts);
  const spent = await db.modelCall.aggregate({ where: { runId, purpose: 'judge', outcome: { not: 'budget_exceeded' } }, _sum: { costMicroUsd: true } });
  const costUsd = (spent._sum.costMicroUsd ?? 0) / 1e6;
  console.log(`[${rubric}] attempt ${attempt} prompt ${promptHash}: caught ${score.caught}/${score.n} (${(score.rate * 100).toFixed(1)}%), controls condemned ${score.condemned.length}/${score.controls}${score.missed.length ? `, missed ${score.missed.join(' ')}` : ''}${score.condemned.length ? `, condemned ${score.condemned.join(' ')}` : ''} — ${score.pass ? 'PASS' : 'below target'}; $${costUsd.toFixed(4)}`);
  attempts.push({ attempt, rubric, runId, model: JUDGE_MODEL, promptHash, ...score, costUsd, detail });
}

const [full, noKinds] = attempts;
console.log(`D-32 gap: full ${full!.caught}/${full!.n} vs no-kinds ${noKinds!.caught}/${noKinds!.n}; the ≥ 95% / 0-controls target applies to full only → ${full!.pass ? 'PASS' : 'FAIL'}`);
writeFileSync(out, JSON.stringify({ snapshot, target: 'caught ≥ 95% on the full rubric, 0 controls condemned (D-32)', attempts: [...prior, ...attempts] }, null, 1) + '\n');
console.log(`wrote ${out}`);
await db.$disconnect();
