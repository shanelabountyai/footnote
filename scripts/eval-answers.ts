// `npm run eval:answers -- --retriever=<fts|dense|hybrid> --model=<answer model> [--judge=<judge model>|none] [--theta=off] [--estimate]`
// (task 3.7, D-35). All golden questions, each as its callerRole, under one run id: retrieve every question first (one
// Voyage call), estimate answers + judge calls, refuse to start over the $3 run cap, then answer, store an Answer row
// per question with its gate score, and judge every answered sentence into SentenceJudgment. UNVERIFIED questions are
// skipped and counted. `--theta=off` records the gate without enforcing it (3.8 derives θ′ from the stored score).
// `--judge=none` (D-43) stores answers only: no judge estimate, no SentenceJudgment rows. `--estimate` stops after the estimate: one embed call, no model call.
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { parseArgs } from 'node:util';
import { db } from '@/core/db';
import { answer, ANSWER_K, ANSWER_MODEL, buildAnswerPrompt, loadDocMeta } from '@/lib/answer/compose';
import { thetaGate } from '@/lib/answer/gate';
import { estimateRunMicroUsd, type PlannedQuestion } from '@/lib/eval/answers-run';
import { judge, JUDGE_MODEL, JUDGE_SYSTEM_PROMPT } from '@/lib/eval/judge';
import { type Caller, denseRetriever, ftsRetriever, type Hits, hybridRetriever, type Retriever, type RetrieverName } from '@/lib/retrieval/retriever';
import { snapshotId } from '@/lib/retrieval/snapshot';
import { type Embedder, voyageEmbed } from '@/lib/retrieval/voyage';
import { BudgetExceededError, CAPS_MICRO_USD, spentMicroUsd } from '@/lib/spend/budget';

type Golden = { id: string; slice: string; question: string; callerRole: Caller['role'] };

const { values: args } = parseArgs({ options: {
  retriever: { type: 'string', default: 'dense' }, model: { type: 'string', default: ANSWER_MODEL },
  judge: { type: 'string', default: JUDGE_MODEL }, theta: { type: 'string', default: 'on' }, estimate: { type: 'boolean', default: false },
} });
const name = args.retriever as RetrieverName;
if (!['fts', 'dense', 'hybrid'].includes(name)) throw new Error(`--retriever must be fts, dense or hybrid, not ${name}`);
if (!['on', 'off'].includes(args.theta)) throw new Error(`--theta must be on or off, not ${args.theta}`);
const enforceGate = args.theta === 'on';
const judgeModel = args.judge === 'none' ? null : args.judge;
const usd = (micro: number) => `$${(micro / 1e6).toFixed(4)}`;

const all = JSON.parse(readFileSync('eval/golden.json', 'utf8')) as Golden[];
const unverified = execFileSync('python3', ['tools/check_golden.py'], { encoding: 'utf8' })
  .split('\n').filter((l) => l.startsWith('UNVERIFIED ')).map((l) => l.slice(11).trim());
const qs = all.filter((g) => !unverified.includes(g.id));

const snapshot = snapshotId();
const stamp = new Date().toISOString().slice(0, 16).replace(':', '');
const runId = `answers:${name}:${args.model}:theta-${args.theta}:${stamp}`;
const org = await db.org.findUniqueOrThrow({ where: { slug: 'ledger-lane' } });
const docs = loadDocMeta();

// Retrieve everything first: the estimate needs the real prompts, and dense/hybrid read one up-front embed call.
let embed: Embedder | undefined;
if (name !== 'fts') {
  const vectors = await voyageEmbed(qs.map((g) => g.question), 'query', { runId });
  const byText = new Map(qs.map((g, i) => [g.question, vectors[i]!]));
  embed = async (texts) => texts.map((t) => byText.get(t) ?? (() => { throw new Error(`not pre-embedded: ${t}`); })());
}
const fts = ftsRetriever(snapshot);
const base: Retriever = name === 'fts' ? fts : name === 'dense' ? denseRetriever(snapshot, { embed }) : hybridRetriever(fts, denseRetriever(snapshot, { embed }));
const hits = new Map<string, Hits>();
const plan: PlannedQuestion[] = [];
for (const g of qs) {
  const h = await base.search({ orgId: org.id, role: g.callerRole }, g.question, ANSWER_K);
  hits.set(g.id, h);
  const { system, user } = buildAnswerPrompt(g.question, h, docs);
  plan.push({ callsModel: h.length > 0 && (!enforceGate || thetaGate(name, h).pass), promptChars: system.length + user.length, chunkChars: h.map((c) => c.text.length) });
}

const est = estimateRunMicroUsd(plan, args.model, judgeModel);
const buildLeft = CAPS_MICRO_USD.build - (await spentMicroUsd());
console.log(`${runId}: ${qs.length} questions (${unverified.length} UNVERIFIED skipped${unverified.length ? `: ${unverified.join(' ')}` : ''}), ${est.calling} reach the model`);
console.log(`estimate: answers ${usd(est.answers)} + judge ${usd(est.judges)} = ${usd(est.total)} against the run cap ${usd(CAPS_MICRO_USD.run)}; build left ${usd(buildLeft)}`);
if (est.total > CAPS_MICRO_USD.run || est.total > buildLeft) {
  console.error('REFUSED: the estimate is over a cap (D-18); nothing was sent to a model.');
  await db.$disconnect();
  process.exit(1);
}
if (args.estimate) {
  await db.$disconnect();
  process.exit(0);
}

const promptHash = createHash('sha256').update(JUDGE_SYSTEM_PROMPT).digest('hex').slice(0, 12);
const rows: { id: string; slice: string; answerId: string; status: string; refusal: string | null; gate: unknown; droppedSentences: number; verdicts: string[] }[] = [];
let stopped: string | null = null;
for (const g of qs) {
  const caller: Caller = { orgId: org.id, role: g.callerRole };
  const h = hits.get(g.id)!;
  const fixed: Retriever = { name, search: async () => h }; // the Hits value itself, so denseTop survives (D-17b)
  const a = await answer(caller, g.question, { retriever: fixed, snapshot, model: args.model, runId, enforceGate, docs });
  await db.answer.create({ data: {
    id: a.answerId, orgId: org.id, userId: null, runId, goldenId: g.id, question: g.question, callerRole: g.callerRole,
    snapshot, retriever: name, model: a.usage?.model ?? null, thetaScore: a.gate.score, theta: a.gate.theta,
    status: a.status, refusalCode: a.refusal?.code ?? null, sentences: a.sentences, citations: a.citations, droppedSentences: a.droppedSentences,
  } });
  if (a.refusal?.code === 'BUDGET_EXCEEDED') { stopped = `answer cap at ${g.id}`; break; }

  const verdicts: string[] = [];
  try {
    for (const [i, s] of judgeModel ? a.sentences.entries() : []) {
      const cites = s.citations.map((id) => a.citations.find((c) => c.id === id)!);
      const r = await judge(s.text, cites, h, { model: judgeModel!, runId, answerId: a.answerId });
      await db.sentenceJudgment.create({ data: {
        runId, answerId: a.answerId, sentenceIndex: i, model: judgeModel!, promptHash, outcome: r.ok ? 'ok' : 'schema_invalid',
        verdict: r.ok ? r.verdict.verdict : null, quoteIsRule: r.ok ? r.verdict.quoteIsRule : null,
        editionStated: r.ok ? r.verdict.editionStated : null, reason: r.ok ? r.verdict.reason : r.reason,
      } });
      verdicts.push(r.ok ? r.verdict.verdict : 'schema_invalid');
    }
  } catch (e) {
    if (!(e instanceof BudgetExceededError)) throw e;
    stopped = `judge ${e.scope} cap at ${g.id}`;
  }
  console.log(`${g.id} ${g.callerRole}: ${a.status}${a.refusal ? ` / ${a.refusal.code}` : ''} (gate ${a.gate.score?.toFixed(3) ?? 'n/a'}${a.gate.pass ? '' : ' below θ'}, dropped ${a.droppedSentences})${verdicts.length ? ` judge [${verdicts.join(' ')}]` : ''}`);
  rows.push({ id: g.id, slice: g.slice, answerId: a.answerId, status: a.status, refusal: a.refusal?.code ?? null, gate: a.gate, droppedSentences: a.droppedSentences, verdicts });
  if (stopped) break;
}

const spent = await spentMicroUsd({ runId });
const count = (s: string) => rows.filter((r) => r.status === s).length;
const judged = rows.flatMap((r) => r.verdicts);
console.log(`${stopped ? `STOPPED (${stopped}) after ${rows.length} of ${qs.length}` : `done ${rows.length} of ${qs.length}`}: answered ${count('answered')}, partial ${count('partial')}, refused ${count('refused')}; ${judgeModel ? `${judged.length} sentences judged (JUDGE UNCALIBRATED, κ 0.17 n 40)` : 'not judged (--judge=none)'}; run spend ${usd(spent)} vs estimate ${usd(est.total)}`);
const out = `eval/results/answers-${name}-${args.model}-theta-${args.theta}-${snapshot.replace('sha256:', '').slice(0, 12)}-${stamp}.json`;
writeFileSync(out, JSON.stringify({ snapshot, runId, retriever: name, model: args.model, judge: judgeModel, judgePromptHash: judgeModel ? promptHash : null, theta: args.theta, unverified, estimateUsd: est.total / 1e6, spentUsd: spent / 1e6, stopped, rows }, null, 1) + '\n');
console.log(`wrote ${out}`);
await db.$disconnect();
process.exit(stopped ? 1 : 0);
