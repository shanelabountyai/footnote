# NEXT

## ▶ Next session: task 2.7, version labeling (needs the Anthropic key for its live acceptance)

2.1–2.6 built. 2.7's code half (`supersededBy` on citations from the manifest, a superseded-only sentence labeled) can be built and unit-tested without a key; its acceptance (V slice answered live) needs `ANTHROPIC_API_KEY` in `.env.local` line 9. **Still open from 2.5:** with the key, run `npm run answer:check -- GA-01`, record the verified citation and cost here and on the 2.5 line of `docs/phase-2-tasks.md`, then tick 2.5. **Owner steps still open:** the Anthropic key; task 1.9 (2.10 waits on it); the GitHub repo plus `origin`.

## Session 12 — 2026-10-19 (task 2.6)

**Built:** migration `20261020022552_answers` (`FootnoteRole`, `StaffRole`, `AnswerStatus`, `Answer`), applied to dev and test; `src/lib/answer/caller.ts` (`apiCaller`: role from the `StaffRole` row); `POST /api/answers` and `GET /api/answers/:id`; `tests/integration/answers-api.test.ts` (6 tests: body role ignored and no partner chunk in the prompt; snapshot 409 with no fetch and no row; redirect / 404 / 400; replay with 0 fetches and its `ModelCall` row; θ refusal replay; a partner-cited answer is 404 to front_desk, same body as an unknown id).

**Decided:** D-26 (StaffRole table instead of mapping the template role; `requireUser` first per template FR-06, so no session redirects rather than 401; GET checks cited tiers).

**Gate:** `npm test` **41 files / 242 tests passed**; typecheck OK; lint 0 errors (the 1 template warning); `corpus:check` OK; `permissions:verify` OK. **Spend: $0.0147 of $25** (no live calls).

## Session 11 — 2026-10-19 (task 2.5, built; live check waiting on the key)

**Built** (c43f0bd): `src/lib/answer/compose.ts` `answer(caller, question, {retriever, snapshot, model?, runId?, answerId?, docs?})`, `loadDocMeta()`, `REFUSAL_MESSAGES`, `DISCLAIMER`; `tests/integration/compose.test.ts` (6 tests: answered with a verified citation and an `ok` row; below θ → no fetch and 0 answer rows; prose output → `schema_invalid` row with cost counted; paraphrase dropped; Fable rejected; doc metadata from the manifest and the memo front matter); `scripts/answer-check.ts` behind `npm run answer:check -- <ids>`.

**Decided:** D-19a (plain fetch, Shane clicked it; the composer as built). Estimate = prompt chars / 3 + the full `max_tokens` (2048) ceiling.

**Gate:** `npm test` **40 files / 236 tests passed**; typecheck OK; lint 0 errors (the 1 template warning); `corpus:check` OK; `permissions:verify` OK. **Spend: $0.0147 of $25** (no live answer call yet).

## Session 10 — 2026-10-19 (task 2.4)

**Built:** `Retriever.search` returns `Hits` (chunks + `denseTop`; dense and hybrid set it, fts does not); `src/lib/answer/gate.ts` (`THETA_DENSE = 0.559`, `thetaGate` → `{score, theta, pass}`, `noRelevantPassage()`); `NO_RELEVANT_PASSAGE` added to the `Verified` refusal codes; `tests/unit/gate.test.ts` (7 tests: θ ± 1e-9 on dense and hybrid, a missing `denseTop` throws, fts ungated); 3 integration tests (`denseTop` equals the dense leg's top-1 cosine); `scripts/gate-check.ts` behind `npm run eval:gate`.

**Decided:** D-17b (fts is not gated, since there is no cosine; a missing `denseTop` throws).

**Measured live:** GU-06 0.423, GU-07 0.507, GU-08 0.544 → all `refused / NO_RELEVANT_PASSAGE`; `answer` ModelCall rows 0 → 0.

**Gate:** `npm test` **39 files / 230 tests passed**; typecheck OK; lint 0 errors (the 1 template warning); `corpus:check` OK; `permissions:verify` (all three) OK. **Spend: $0.0147 of $25** (3 query embeds, which round to $0).

## Session 9 — 2026-10-19 (task 2.3)

**Built:** `src/lib/answer/verify.ts` (`verifyCitations`, `normalizeQuote`, `DocMeta`, `Citation`, `Verified`) + `tests/unit/verify.test.ts` (6 tests: a line break and curly quotes/dashes kept; edition/revisionDate/page/section from the manifest and chunk row, with a model `page` ignored; a paraphrase, a chunk that was not retrieved and a doc without metadata all dropped, with `droppedSentences` counted and `partial`; all failing → `refused / INSUFFICIENT_SUPPORT`, even with `outOfScope`; `OUT_OF_SCOPE` beside `answered`; a repeated quote deduped).

**Decided:** D-6b. `DocMeta` is passed in, and 2.5 builds it from the manifest and the memo front matter. The refusal message belongs to the composer.

**Gate:** `npm test` **38 files / 220 tests passed**; typecheck OK; lint 0 errors (the 1 template warning); `corpus:check` OK; `permissions:verify` (all three) OK. **Spend: $0.0147 of $25** (no model calls).

## Session 8 — 2026-10-19 (task 2.2)

**Built:** `src/lib/answer/output.ts` (`AnswerOutputSchema`, `parseAnswerOutput`) + `tests/unit/output.test.ts` (5 tests: valid with and without `outOfScope`, empty `sentences` valid, missing fields, prose/fence around the JSON, extra keys and unpaired arrays). Migration `20261019230000_schema_invalid_outcome` adds `ModelCallOutcome.schema_invalid`; `recordCall` takes `outcome`; spend counts every outcome except `budget_exceeded` (spend test added). `SYSTEM_PROMPT` now states the JSON shape. Applied to both the test and dev databases.

**Decided:** D-6a (strict parse, `quotes[i]` ↔ `chunkIds[i]`, empty array is not a schema failure, schema-invalid calls count as spend).

**Gate:** `npm test` **37 files / 214 tests passed**; typecheck OK; lint 0 errors (the 1 template warning); `corpus:check` OK; `permissions:verify` (all three) OK. **Spend: $0.0147 of $25** (no model calls).

## Session 7 — 2026-10-19 (task 2.1)

**Built:** `src/lib/answer/prompt.ts` (`buildPrompt`, `escapeChunkText`, `SYSTEM_PROMPT`, `PromptChunk`) + `tests/unit/prompt.test.ts` (5 tests: inline snapshot of a 2-chunk prompt, `</chunk>` breakout held, all 10 injection memos inside one wrapper each, ordinary text untouched, attribute escaping). `permissions:verify` adds `lint prompt imports`.

**Decided:** D-14a (escape only `<chunk`/`</chunk`; `edition` joined onto the chunk by the composer; no `page` attribute).

**Gate:** `npm test` **36 files / 208 tests passed**; typecheck OK; lint 0 errors (the 1 template warning); `corpus:check` OK; `permissions:verify` (all three) OK. **Spend: $0.0147 of $25** (no model calls).

## Session 6 — 2026-10-19 (Phase 1 gate)

**Decided:** D-17a, closing O-4 (Shane clicked it). θ = **0.559 on the top dense cosine**, and hybrid stays the ranker. Calibration was GA-01..07 + GU-01..04 (median A 0.614, median U 0.520). On the held-out questions it refuses 3 of 4 U, and wrongly refuses 1 of 7 A and 4 of 15 M/V/P (GM-05, GV-02/03/05). The rejected RRF θ = 0.024 refused 4 of 4 U but 6 of 15 M/V/P, including GP-02 and GP-05.

**Written:** `docs/phase-2-tasks.md`, tasks 2.1–2.10 plus exit criteria. 2.4 adds the dense leg's top cosine to `hybrid.search` for the gate. 2.2 uses zod, which is already a dependency.

**Gate:** no code changed this session. Session 5's gate output stands. **Spend: $0.0147 of $25.**

## Session 5 — 2026-10-19 (task 1.12)

**Built:** `ci.yml` job `ci` now runs `corpus:check` (after `npm ci`) and, after vitest, `corpus:index -- --retriever=fts` + `permissions:verify -- --retriever=fts`. `permissions:verify` takes an optional `-- --retriever=<name>` (no flag = all three, as before).

**Decided:** D-12b. CI checks fts only (no Voyage key there); dense/hybrid are covered in CI by the predicate lint and the fake-embedder integration tests, and their live run stays local.

**Measured:** the CI steps replayed on a fresh database: 3,922 chunks indexed, 9 checks OK. Throwaway branch: one byte flipped in `corpus/text/p538-2022/009.txt` → `corpus:check` exit 1; fts filter neutralized → 4 FAIL, exit 1. Not run on GitHub yet (no `origin`).

**Gate:** `npm test` **35 files / 203 tests passed**; typecheck OK; lint OK; `corpus:check` OK; `permissions:verify` (all three) OK. **Spend: $0.0147 of $25** (no new calls).

## Session 4 — 2026-10-19 (task 1.11)

**Built:** `scripts/eval-retrieval.ts` behind `npm run eval:retrieval`; pure metrics in `src/lib/eval/retrieval-metrics.ts` + `tests/unit/retrieval-metrics.test.ts`. Every question is embedded in **one** Voyage call per run (dense/hybrid read from that), so the run takes seconds instead of ~15 min under the rate cap. Writes `eval/results/retrieval-cd1252c6a407-2026-10-19.json` (per-question ranks, top-10 doc#page, top scores).

**Measured** (k = 10, page ± tolerance match, recall = share of distinct expected (doc, page) citations, 2 UNVERIFIED excluded: GM-02, GV-06):

| retriever | slice | n | recall@1 | recall@5 | recall@10 | MRR |
|---|---|---|---|---|---|---|
| fts | A+M+V | 26 | 0.231 | 0.538 | 0.577 | 0.399 |
| dense | A+M+V | 26 | 0.442 | 0.846 | 0.923 | 0.695 |
| hybrid | A+M+V | 26 | 0.423 | 0.904 | 0.942 | 0.685 |
| fts / dense / hybrid | P (private, 3) | 3 | 0.333 / 1.000 / 1.000 | 0.333 / 1.000 / 1.000 | — | 0.333 / 1.000 / 1.000 |

By slice (recall@5): A fts 0.607 / dense 0.929 / hybrid 0.964 (n 14); M 0.357 / 0.857 / 0.786 (n 7); V 0.600 / 0.600 / 0.900 (n 5). Full table in the script output and the results file.

**Decided:** D-15a, default retriever **hybrid** on recall@5 (+0.058 over dense, −0.010 MRR; +0.366 over fts).

**Open for the Phase 1 gate (θ, D-17 / O-4):** top-1 score distributions overlap on every retriever. Dense cosine: A 0.455–0.710 (median 0.614), U 0.424–0.603 (median 0.520); calibration midpoint **0.559**. Hybrid RRF: A 0.016–0.033, U 0.016–0.031; the fused score is close to binary (≈ 1/61 = one list ranks it first, ≈ 2/61 = both do), so θ on "the top fused score" as D-17 words it cannot separate A from U well (midpoint 0.024). Likely options: put θ on the dense cosine even with hybrid ranking, or accept a weak gate and lean on the model refusal. That is Shane's call at the gate; it is not decided here.

**Gate:** `npm test` **35 files / 203 tests passed**; typecheck OK; lint 0 errors (the 1 template warning); `corpus:check` OK; `permissions:verify` OK. **Spend: $0.0147 of $25** (ledger 151 embed calls / 736,037 tokens; query embeds round to $0).

## Session 3 — 2026-10-19 (tasks 1.7 dense half, 1.10)

**Built** (commits 4aac2ea, cbaa212, and the 1.10 commit): `voyageEmbed` waits out 429s (`fetchWithRetry`: Retry-After, else 21 s, 40 tries; tested), `corpus:index` embeds in batches of 32; `scripts/permissions-verify.ts` behind `npm run permissions:verify` — PT-1, PT-2, PT-3 retrieval halves for all three retrievers, the query log captured by wrapping `db.$queryRawUnsafe` (template client untouched), and the lint that only `retriever.ts` and `indexer.ts` touch the chunk tables.

**Measured:** dense index **3,922 embeddings**, re-run **0 written**; ledger **130 `embed` calls, 735,309 tokens, $0.0147** (D-15c). `permissions:verify` **22 checks OK**; with the tier predicate neutralized in the working tree **12 fail** and front_desk's unfiltered top 10 for the Red Fork question is 5 partner + 5 engagement chunks (D-12a). fts has no lexical match for GP-01/GP-05 as written for any role ("give", "long" absent from the memos; the OR form ranks IRS prose above both memos and was not adopted), so the fts best-match half is probed with the brief's own sentences and the output line says so.

**Gate:** `npm test` **34 files / 200 tests passed**; typecheck OK; lint 0 errors (the 1 template warning); `corpus:check` OK (snapshot `sha256:cd1252c6…`, GM-02/GV-06 still UNVERIFIED); `permissions:verify` OK. **Spend: $0.0147 of $25.**

**Decided:** D-15c (dense index as measured, 429 throttle), D-12a (`permissions:verify` design and measurements).

**Not pushed:** the repo still has no `origin` (owner hand step below). Voyage: adding a payment method on the dashboard lifts the 3 RPM / 10K TPM cap; nothing in code depends on it.

## Session 2 — 2026-10-19 (task 1.7, fts half)

**Built** (commits dc98aae, 7cce3b1, efde10a): migration `20261019195011_retrieval` (`CorpusChunk` with tsvector + GIN, `ChunkEmbedding` vector(1024)); `src/lib/retrieval/` with `retriever.ts` (`Retriever`, `tiersFor`, fts / dense / hybrid RRF k = 60, org + tier filter inside every query), `voyage.ts` (plain fetch, `assertBudget` before, `recordCall` after), `indexer.ts`, `snapshot.ts`; `scripts/corpus-index.ts` (`corpus:index` runs `corpus:check` first, upserts org `ledger-lane`); `tests/integration/retrieval.test.ts` (14 tests: idempotency, org/tier filter on all three retrievers with a fake embedder, RRF, the ledger path with fetch stubbed, snapshot id).

**Measured:** `corpus:index -- --retriever=fts` first run **3,922 written**, re-run **0 written**. fts query form probe (D-15b): AND 17 / OR 14 of 32 answerable questions with an expected passage in the top 5, so the AND form from D-15 stays.

**Gate:** `npm test` **34 files / 199 tests passed**; typecheck OK; lint 0 errors (the 1 template warning); `corpus:check` OK (snapshot `sha256:cd1252c6…`); `permissions:verify` still a stub until 1.10. **Spend: $0.0000 of $25** (no live embedding call yet).

**Decided:** D-15b (storage as built, org `ledger-lane`, fts AND kept, whole-micro-USD rounding means a single query embed logs $0 with its tokens).

**Not pushed:** the repo still has no `origin` (owner hand step below).

## Session 1 — 2026-10-19 (on the Mac)

**Built:** task **1.6** chunker `src/lib/corpus/chunk.ts` + `tests/unit/chunk.test.ts` (commit 24131c9; D-10a) and task **1.8** `eval/golden.json` (41 questions) + `tools/check_golden.py` running inside `corpus:check` (commit 44571d4). Tasks: 1.1–1.6 ✅ · 1.7 not started · 1.8 ✅ · 1.9 Shane · 1.10–1.12 not started.

**Gate output (last full run):** `npm test` **33 files / 185 tests passed**; `corpus:check` OK (11 documents, 40 private files, snapshot `sha256:cd1252c6…`, golden 41 questions / 2 UNVERIFIED); lint 0 errors (the 1 template warning in `e2e/billing.spec.ts`); typecheck OK; `permissions:verify` 0 checks (stub until 1.10). **Spend: $0.0000 of $25** (no model or embedding call yet).

**Chunk counts (1.6 acceptance; words per chunk, tokens ≈ words × 4/3):**

| doc | pages | chunks | table chunks | median words | max words |
|---|---|---|---|---|---|
| p15-2025 | 58 | 369 | 4 | 141 | 263 |
| p15-2026 | 59 | 340 | 4 | 186 | 263 |
| p15b-2026 | 36 | 184 | 9 | 231 | 263 |
| p334-2024 | 55 | 398 | 9 | 79 | 263 |
| p334-2025 | 57 | 394 | 9 | 89 | 263 |
| p463-2024 | 62 | 405 | 9 | 110 | 312 |
| p463-2025 | 62 | 370 | 9 | 123 | 263 |
| p538-2022 | 22 | 132 | 0 | 149 | 263 |
| p583-2024 | 28 | 169 | 3 | 75 | 263 |
| p587-2025 | 35 | 278 | 2 | 78 | 263 |
| p946-2025 | 113 | 680 | 90 | 100 | 263 |
| private memos | 40 memos | 203 | 0 | — | — |
| **total** | 587 + 40 | **3,922** | 148 | | |

Known chunker limits (D-10a): page-bounded, so a sentence across a page break is not joined (GM-04's 6.2% sentence, `p15-2026` pp. 1–2); a table region runs to the next run-in lead or the end of the page, so a table chunk may carry trailing prose; medians sit below the 262-word target because headings bound sections (O-3 size ablation if time allows).

**UNVERIFIED (1.8 acceptance):** `GM-02`, `GV-06` — both on the Pub 538 fragment "…were $26 million or less." (the page reads "…were $26 million or less (indexed for inflation)", measured p. 9). One edit to the shared fragment in `eval/golden.json` (two occurrences) after Shane sets it in 1.9 clears both. GA-13 (p. 19) and GU-03 (p. 3) resolved; GU-06 stays U. Measured-page notes: GA-08's 2025 What's New item is on `p946-2025` p. 1, GM-03's Pub 538 sentence on p. 8.

**Decided this session:** D-10a (chunker as built, with the page-spanning deviation) · O-12 default (clone-owned secrets read from `process.env` at call time, documented in README, never in `.env.example`) · golden `callerRole` default `front_desk` where the brief was silent.

**Contradictions carried from Session 0** (unchanged unless noted): 8 → O-12 default in force; 9 (O-10, API key table in Phase 4) open; 12 (template `CLONES.md` row uncommitted) open.

**Owner hand steps still open:** paste `VOYAGE_API_KEY` into `.env.local` (line prepared); private GitHub repo `shanelabountyai/footnote` + `git remote add origin` + first-push secret check (`git ls-files | grep -iE "\.env|secret|credential|\.pem$|\.key$"` — only `.env.example` may appear); build-log card A4; task 1.9 (ten hand answers, GM-02b fragment).

Spend so far: **$0.0147** (dense index, 735,309 embedding tokens).
