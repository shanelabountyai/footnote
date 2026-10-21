// `npm run permissions:verify` (task 1.10): PT-1, PT-2 and PT-3 retrieval halves against the indexed corpus for every
// retriever, plus a lint that only `Retriever` and the indexer touch the chunk tables (D-12, non-negotiable 3).
// The query log is the SQL each retriever actually sent, captured by wrapping db.$queryRawUnsafe for this process.
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { db } from '@/core/db';
import { type Caller, denseRetriever, ftsRetriever, hybridRetriever, type RetrievedChunk, type Retriever } from '@/lib/retrieval/retriever';
import { snapshotId } from '@/lib/retrieval/snapshot';

const K = 10;
const golden = JSON.parse(readFileSync('eval/golden.json', 'utf8')) as { id: string; question: string }[];
const q = (id: string) => golden.find((g) => g.id === id)!.question;
const RED_FORK = q('GP-01'); // PT-1 / PT-3 forbidden half
const RETENTION = q('GP-05'); // PT-2
const IRS = q('GA-01'); // PT-3 allowed half
const PT1_MEMO = 'll-partner-fees-redfork-2026-02';
const PT2_MEMO = 'll-staff-record-retention-2025-10';
const PT1_WORDS = "discount on Red Fork Welding's monthly fee"; // brief §4 PT-1 sentence
const PT2_WORDS = 'keeps client records for 7 years'; // brief §4 PT-2 sentence

let failures = 0;
const check = (name: string, ok: boolean, detail: string) => { failures += ok ? 0 : 1; console.log(`${ok ? 'OK  ' : 'FAIL'} ${name} — ${detail}`); };
const tiers = (rows: RetrievedChunk[]) => rows.map((r) => r.tier);
const count = (rows: RetrievedChunk[], ...t: string[]) => rows.filter((r) => t.includes(r.tier)).length;

// Query log: every SQL string the retrievers send in this process.
const sqlLog: string[] = [];
const raw = db.$queryRawUnsafe.bind(db);
(db as { $queryRawUnsafe: unknown }).$queryRawUnsafe = (sql: string, ...values: unknown[]) => { sqlLog.push(sql); return raw(sql, ...values); };
const PREDICATE = /WHERE[\s\S]*c\."orgId" = \$\d+::uuid AND c\.tier::text = ANY\(\$\d+::text\[\]\)[\s\S]*ORDER BY/;

const org = await db.org.findUniqueOrThrow({ where: { slug: 'ledger-lane' } });
const snapshot = snapshotId();
const as = (role: Caller['role']): Caller => ({ orgId: org.id, role });
const fts = ftsRetriever(snapshot);
const dense = denseRetriever(snapshot, { runId: 'permissions:verify' });
// `-- --retriever=fts` (CI, D-12b): CI has no Voyage key, so dense/hybrid are skipped there; their SQL predicate is still
// checked by the source lint below and their filter by tests/integration/retrieval.test.ts with a fake embedder.
const only = /--retriever=(\w+)/.exec(process.argv.join(' '))?.[1];
const retrievers = ([fts, dense, hybridRetriever(fts, dense)] as Retriever[]).filter((r) => !only || r.name === only);
if (!retrievers.length) { console.error('usage: npm run permissions:verify [-- --retriever=<fts|dense|hybrid>]'); process.exit(2); }

const embedded = await db.chunkEmbedding.count();
const chunks = await db.corpusChunk.count({ where: { snapshot, orgId: org.id } });
console.log(`snapshot ${snapshot.slice(0, 19)}… org ledger-lane: ${chunks} chunks, ${embedded} embeddings${only ? ` (only ${only})` : ''}${!only && embedded < chunks ? ' (dense index incomplete — dense/hybrid ranks are provisional)' : ''}`);

for (const r of retrievers) {
  const before = sqlLog.length;
  const fd = await r.search(as('front_desk'), RED_FORK, K);
  check(`PT-1 ${r.name} front_desk`, count(fd, 'partner', 'engagement') === 0, `${fd.length} chunks, ${count(fd, 'partner')} partner, ${count(fd, 'engagement')} engagement [${tiers(fd).join(',')}]`);
  const sent = sqlLog.slice(before);
  check(`PT-1 ${r.name} query log`, sent.length > 0 && sent.every((s) => PREDICATE.test(s)), `${sent.length} SQL statement(s), ${sent.filter((s) => PREDICATE.test(s)).length} carry "orgId = $n AND tier = ANY($tiers)" before ORDER BY`);
  // Best-match proof. fts (AND, D-15b) has no lexical match for the question as written ("give" is not in the memo), so
  // it is re-probed with the memo's own words: the filter is what is under test, and the miss is 1.11's to report.
  let p = await r.search(as('partner'), RED_FORK, K);
  let probe = RED_FORK;
  if (p.length === 0) {
    probe = PT1_WORDS;
    p = await r.search(as('partner'), probe, K);
    const fdw = await r.search(as('front_desk'), probe, K);
    check(`PT-1 ${r.name} front_desk (memo wording)`, count(fdw, 'partner', 'engagement') === 0, `question as written: 0 chunks for every role; "${probe}" → ${fdw.length} chunks, ${count(fdw, 'partner')} partner`);
  }
  check(`PT-1 ${r.name} partner`, p[0]?.docId === PT1_MEMO, `rank 1 = ${p[0]?.docId ?? 'none'} (${p.length} chunks${probe === RED_FORK ? '' : ', memo wording'})`);

  let fd2 = await r.search(as('front_desk'), RETENTION, K);
  let probe2 = RETENTION;
  if (fd2.length === 0) { probe2 = PT2_WORDS; fd2 = await r.search(as('front_desk'), probe2, K); }
  check(`PT-2 ${r.name} front_desk`, fd2.some((c) => c.docId === PT2_MEMO) && count(fd2, 'partner', 'engagement') === 0, `staff policy at rank ${fd2.findIndex((c) => c.docId === PT2_MEMO) + 1 || 'none'}, ${count(fd2, 'partner')} partner${probe2 === RETENTION ? '' : ' (question as written: 0 chunks; memo wording)'} [${tiers(fd2).join(',')}]`);

  const svc = await r.search(as('service'), RED_FORK, K);
  check(`PT-3 ${r.name} service Red Fork`, count(svc, 'staff', 'partner', 'engagement') === 0, `${svc.length} chunks, all public: ${svc.every((c) => c.tier === 'public')}`);
  const irs = await r.search(as('service'), IRS, K);
  check(`PT-3 ${r.name} service IRS`, irs.length > 0 && irs.every((c) => c.tier === 'public'), `${irs.length} public chunks, top ${irs[0]?.docId ?? 'none'} p. ${irs[0]?.page ?? '-'}`);
}

// Lint: the chunk tables are read and written only by the retriever and the indexer (D-12).
const ALLOWED = new Set(['src/lib/retrieval/retriever.ts', 'src/lib/retrieval/indexer.ts']);
const walk = (dir: string): string[] => readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(join(dir, e.name)) : [join(dir, e.name)]));
const offenders = ['src', 'scripts'].flatMap(walk).filter((f) => /\.tsx?$/.test(f) && !f.startsWith('src/generated/') && !ALLOWED.has(f) && f !== 'scripts/permissions-verify.ts')
  .filter((f) => /CorpusChunk|corpusChunk|ChunkEmbedding|chunkEmbedding/.test(readFileSync(f, 'utf8')));
check('lint chunk-table access', offenders.length === 0, offenders.length ? `also touched by ${offenders.join(', ')}` : 'only retriever.ts and indexer.ts');
// Lint: the Messages API is reached only through llm/anthropic.ts, which only the composer and the judge import; answer
// output is parsed only in compose.ts, which hands the parse to verifyCitations (exit criterion, non-negotiable 1).
const srcFiles = walk('src').filter((f) => /\.tsx?$/.test(f) && !f.startsWith('src/generated/'));
const grepSrc = (re: RegExp, except: string) => srcFiles.filter((f) => f !== except && re.test(readFileSync(f, 'utf8')));
const apiFiles = grepSrc(/api\.anthropic\.com/, '');
const callers = grepSrc(/@\/lib\/llm\/anthropic'/, '');
const parsers = grepSrc(/parseAnswerOutput\(/, 'src/lib/answer/output.ts');
check('lint answer path',
  apiFiles.join() === 'src/lib/llm/anthropic.ts' && callers.sort().join() === 'src/lib/answer/compose.ts,src/lib/eval/judge.ts'
    && parsers.join() === 'src/lib/answer/compose.ts' && /verifyCitations\(parsed\.output,/.test(readFileSync('src/lib/answer/compose.ts', 'utf8')),
  `API in ${apiFiles.join(', ') || 'nothing'}; called from ${callers.join(', ') || 'nothing'}; answers parsed in ${parsers.join(', ') || 'nothing'}, verified by verifyCitations`);
const promptImports = readFileSync('src/lib/answer/prompt.ts', 'utf8').match(/^import .*$/gm) ?? [];
check('lint prompt imports', promptImports.length === 1 && /^import type \{ RetrievedChunk \} from '@\/lib\/retrieval\/retriever';$/.test(promptImports[0]), promptImports.join(' | ') || 'none');
const retrieverSrc = readFileSync('src/lib/retrieval/retriever.ts', 'utf8');
const selects = retrieverSrc.split(/\$queryRawUnsafe/).slice(1);
check('lint retriever predicate', selects.length === 2 && selects.every((s) => PREDICATE.test(s)), `${selects.filter((s) => PREDICATE.test(s)).length} of ${selects.length} SELECTs carry the org + tier predicate`);

await db.$disconnect();
console.log(failures ? `permissions:verify FAILED — ${failures} check(s)` : 'permissions:verify OK');
process.exit(failures ? 1 : 0);
