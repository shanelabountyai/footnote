// `npm run eval:grading-sheet` (task 3.4, D-37). Writes `eval/grades.md`: 20 sentences from run RUN_ID for Shane to grade on
// the judge's three labels, with the judge's verdicts left out. The 20 are every sentence of the six answered hand-10
// questions (14), both sentences the judge called partial (an enriched sample, so κ can see the rare label), and 4 more
// picked by hash, not by verdict. The order is hashed too, so position gives nothing away. Refuses to overwrite: the
// file holds Shane's grades once written. Zero model calls.
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { db } from '@/core/db';
import { chunksById } from '@/lib/retrieval/retriever';

const RUN_ID = 'answers:hybrid:claude-sonnet-5-5:theta-on:2026-10-23T1646';
const OUT = 'eval/grades.md';
const N = 20;

type Sentence = { text: string; citations: string[]; superseded: string | null };
type Cit = { id: string; chunkId: string; docId: string; title: string; edition: string; quote: string; location: { page: number } };

if (existsSync(OUT)) throw new Error(`${OUT} exists and may hold grades; move it aside to regenerate`);
const hand10 = new Set((JSON.parse(readFileSync('eval/results/hand10-cd1252c6a407-2026-10-21.json', 'utf8')) as { rows: { id: string }[] }).rows.map((r) => r.id));
const hash = (s: string) => createHash('sha256').update(`${RUN_ID}|${s}`).digest('hex');

const answers = await db.answer.findMany({ where: { runId: RUN_ID, status: { not: 'refused' } } });
const partial = new Set((await db.sentenceJudgment.findMany({ where: { runId: RUN_ID, verdict: 'partial' } })).map((j) => `${j.answerId}:${j.sentenceIndex}`));
const all = answers.flatMap((a) => (a.sentences as Sentence[]).map((s, i) => ({ a, s, i, key: `${a.id}:${i}` })));
const forced = all.filter((x) => hand10.has(x.a.goldenId!) || partial.has(x.key));
const rest = all.filter((x) => !forced.includes(x)).sort((x, y) => hash(x.key).localeCompare(hash(y.key)));
const picked = [...forced, ...rest.slice(0, N - forced.length)].sort((x, y) => hash(`order|${x.key}`).localeCompare(hash(`order|${y.key}`)));
if (picked.length !== N) throw new Error(`expected ${N} sentences, got ${picked.length}`);

const golden = new Map((JSON.parse(readFileSync('eval/golden.json', 'utf8')) as { id: string; question: string }[]).map((g) => [g.id, g.question]));
const blocks: string[] = [];
for (const [n, { a, s, i, key }] of picked.entries()) {
  const cits = (a.citations as Cit[]).filter((c) => s.citations.includes(c.id));
  // Same org + tier predicate as retrieval (non-negotiable 3), as the question's own caller.
  const chunks = new Map((await chunksById(a.snapshot, { orgId: a.orgId, role: a.callerRole }, cits.map((c) => c.chunkId))).map((c) => [c.chunkId, c.text]));
  blocks.push([
    `## S-${String(n + 1).padStart(2, '0')} · ${a.goldenId} sentence ${i + 1}`,
    `<!-- key ${key} -->`,
    `**Question:** ${golden.get(a.goldenId!) ?? a.question}`,
    `**Sentence:** ${s.text}`,
    ...(s.superseded ? [`*Answer's own label:* ${s.superseded}`] : []),
    ...cits.map((c) => `> **${c.title}** (${c.edition}), p. ${c.location.page}\n>\n> ${c.quote.replace(/\s+/g, ' ')}`),
    ...[...new Set(cits.map((c) => c.chunkId))].map((id) => `<details><summary>Chunk ${id}</summary>\n\n${(chunks.get(id) ?? '(not readable as this caller)').trim()}\n\n</details>`),
    `grade: `,
  ].join('\n\n'));
}

writeFileSync(OUT, `# Shane's grades (task 3.4)

Run \`${RUN_ID}\`, ${N} sentences. The judge's verdicts are not in this file. For each sentence, fill in the \`grade:\` line with one of:

- **supported**: every claim in the sentence is stated by the cited quotes — each number, year, date, threshold, condition and exception, and the edition or year the sentence attributes it to.
- **partial**: some claims are stated by the quotes and at least one is not.
- **unsupported**: the main claim is not stated by the quotes, or the quotes contradict it.

Grade against the quotes (read in their chunk), not against what you know of tax law. A note after the label is fine: \`grade: partial — the year is not in the quote\`.

${blocks.join('\n\n---\n\n')}
`);
console.log(`wrote ${OUT}: ${N} sentences (${forced.length} forced, ${N - forced.length} by hash)`);
await db.$disconnect();
