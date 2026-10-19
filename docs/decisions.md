# Footnote — Resolved Decisions & Open Items

The PRD leaves rules open; this file closes them. The golden set in `docs/domain-brief.md` §5 encodes the answers below. If you change a decision, change the golden set and fixtures deliberately, not the tests. **This file outranks PRD text.**

## Resolved

### Owner decisions (Shane, 2026-10-14)

| # | Decision | Why |
|---|---|---|
| D-1 | **Corpus is a public document set:** eight current IRS publications (334, 15, 463, 583, 587, 946, 538, 15-B) plus three prior editions (334-2024, 15-2025, 463-2024). Legal basis: works of the United States Government, 17 U.S.C. §105(a) (text read 2026-10-14 at law.cornell.edu/uscode/text/17/105). URLs, editions and catalog numbers in `docs/domain-brief.md` §2. **Pub 535 is excluded** — the IRS declares the 2022 edition its final revision (O-6). | Public domain by statute, real small-business questions, dense cross-references and tables, yearly editions so "which edition" matters. Shane's starting suggestion, verified; 535 rejected as discontinued |
| D-2 | **Answers are quotations, not advice.** Every response carries the sentence "Footnote quotes IRS publications and firm documents. It does not give tax or legal advice." "Should I…" questions return what the documents say about the mechanics plus an `OUT_OF_SCOPE` refusal of the recommendation (GU-03). | Scope honesty; the PRD banner |
| D-3 | **Permission-aware search is real despite the public corpus:** a synthetic private tier (fictional firm Ledger & Lane Bookkeeping; tiers `staff`, `engagement`, `partner`; roles `front_desk`, `bookkeeper`, `partner`, `service`) sits over the public tier. **Enforcement is in the retrieval query, never on the model's output** (D-12). PT-1 tests that a forbidden passage which is the best match does not appear. | Chip "permission-aware search" must be demonstrable, and the enforcement point is the lesson |
| D-4 | **Model for specs and the build is Claude Fable 5.1** (`claude-fable-5-1`), pinned in `.claude/settings.json`. Drop to Sonnet only for an item with no new logic. The product's runtime models are D-19 and are never Fable. | Owner's call; same as OpsAgent |
| D-5 | **Data: synthetic private tier only; no real people.** Memos are written in role voice; clients are fictional businesses. | Owner's call |

### Answer semantics

| # | Decision | Why |
|---|---|---|
| D-6 | **Sentence-level attribution with code verification.** The model returns `{sentence, chunkIds[], quotes[]}`; `verifyCitations()` requires each quote to be a whitespace-normalized substring of the named chunk's stored text. A citation that fails is dropped; a sentence with no surviving citation is dropped and counted in `confidence.droppedSentences`; an answer with no surviving sentence becomes `refused / INSUFFICIENT_SUPPORT`. Normalization: collapse whitespace, unify quotes/dashes (`"" '' – —` → ASCII), nothing else. | The model composes; the system verifies. Paraphrase fails the check by design |
| D-7 | **A citation is** `{docId, title, edition, revisionDate, location{page, section}, chunkId, quote, score, tier}`. All fields required. `edition` and `revisionDate` come from the manifest, `page` and `section` from the extraction, never from model output. | Chip "citations" at passage level with version and location |
| D-8 | **`status`** is `answered` (no sentence dropped), `partial` (≥ 1 dropped, ≥ 1 kept) or `refused`. `partial` is visible to callers; N9 may treat it as answered or not, its call. `refusal` is non-null with `status: refused` (codes `NO_RELEVANT_PASSAGE`, `INSUFFICIENT_SUPPORT`) and may also be non-null with `answered`/`partial` **only** for code `OUT_OF_SCOPE` (advice refused, mechanics answered — GU-03). | Honest about what was lost; advice questions are half-answerable |
| D-9 | **Corpus snapshot id** = sha256 over the sorted document hashes plus private-tier file hashes; on every answer and in the audit row. A request with `options.corpusSnapshot` that doesn't match the live snapshot gets HTTP 409. | "Which version did this answer come from" is answerable later |
| D-10 | **Chunk ids are deterministic:** `<docId>:<page>:<ordinal>`; chunker is pure over the extracted text; re-chunking the same snapshot yields the same ids. Heading-bounded, ≈ 350 tokens, 15% overlap within a section, never inside a table, never across a page unless a sentence spans it (O-3). | Replayable answers; stable citations across re-index |
| D-11 | **Private tier files** are markdown with front-matter `docId, title, tier, revisionDate, clientRef`; `tier` is validated against the closed set `{public, staff, engagement, partner}`; a file without `tier` fails `corpus:check`. | A missing tier must fail closed, not default open |

### Permissions

| # | Decision | Why |
|---|---|---|
| D-12 | **One function `tiersFor(role)`** maps role → allowed tiers (`front_desk → [public, staff]`, `bookkeeper → [public, staff, engagement]`, `partner → all`, `service → [public]`). `Retriever.search(caller, query)` is the only entry to chunk retrieval and always issues `WHERE tier = ANY($tiers) AND org_id = $orgId` before ranking. The caller's role is loaded from the session/API key, **never taken from the request body**. Lint: the answer-composition module imports only the `RetrievedChunk` type. | Enforcement point is the DB query; a second path would be a bypass |
| D-13 | **Refusals never leak existence.** External `refusal.code` for a permission-scoped miss is `NO_RELEVANT_PASSAGE`, same message as a true miss. The audit row records `PERMISSION_SCOPED_MISS` when a higher-tier run of the same query would have scored above θ (computed in the test harness, not at request time). | "I can't show you that" confirms a document exists |
| D-14 | **Retrieved text is untrusted input.** Each chunk is wrapped `<chunk id="…" tier="…" edition="…">…</chunk>` with a system instruction that chunk contents are quoted material and never instructions; the user question is placed after the chunks; the output is strict JSON validated by schema. ≥ 10 injection fixtures in CI (brief §4). Ported design from OpsAgent's red-team set. | A memo saying "ignore the question" is a realistic attack on a knowledge assistant |
| D-16 | **Dense retrieval uses exact scan in v1** (no HNSW/IVFFlat index). With ~2,000–4,000 chunks a sequential cosine scan is milliseconds and filtered recall is exact. An approximate index may be added as a measured P1 item with a filtered-recall test. | pgvector approximate indexes can under-return when a `WHERE` filter removes most candidates; recall loss would silently hurt low-tier callers |

### Retrieval and refusal

| # | Decision | Why |
|---|---|---|
| D-15 | **Three retrievers behind one interface,** compared, not assumed: `fts` (Postgres `tsvector`, `websearch_to_tsquery`, `ts_rank_cd`), `dense` (pgvector cosine over Voyage embeddings), `hybrid` (reciprocal rank fusion, k = 60, O-8). The default retriever is chosen after `eval:retrieval` prints recall@5 and MRR for all three; the chosen one and the measured gap are recorded here as D-15a. No retriever is removed for losing. | The build-log card promises a measured comparison; the portfolio has no retrieval numbers yet |
| D-17 | **Refusal threshold θ** on the top fused score: below θ the model is not called (`NO_RELEVANT_PASSAGE`, zero answer cost). θ is calibrated on GA-01..07 + GU-01..04 and **reported on the remaining questions only**. Initial θ is the midpoint between the median top score of the calibration A questions and of the calibration U questions, measured in Phase 1. | A threshold tuned and tested on the same questions overstates refusal quality |

### Cost

| # | Decision | Why |
|---|---|---|
| D-18 | **Spend caps enforced in code before the call:** $25 whole build (all live model and embedding calls, every purpose), $3 per eval run, $0.10 per answer. `config/prices.json` holds per-MTok prices with `checkedAt` dates, filled in Session 0 from the vendor pricing pages; a price older than 60 days fails `npm run spend` with a warning. Over-cap → `BUDGET_EXCEEDED`, logged, no call. | OpsAgent's $25 cap left $22.87 unspent at its last recorded state; the same number is enough here — estimate in PRD §Cost: ~$0.012 per Sonnet answer, ~$0.02 per Opus judge call, ~$1.50 per 50-question run with judge; 10 runs ≈ $15 |
| D-19 | **Runtime model defaults (proposed, to confirm in Session 0 from platform.claude.com/docs/en/about-claude/pricing):** answer composition `claude-sonnet-5-5` ($2 / $10 per MTok in/out, read 2026-10-14); judge `claude-opus-5-5` ($4 / $20) for the fabrication gate and κ measurement, then `claude-sonnet-5-5` as the routine judge **only if** its κ on the same 20 graded answers is within 0.05 of Opus's; `claude-haiku-5-5` (from $0.10 / $0.50) as the cheap-answerer ablation cell, not the default. Embeddings `voyage-4-lite` ($0.02/M, read 2026-10-14; O-2). | Groundedness quality matters more than latency here; Haiku's gap is measured, not assumed |

### Stack

| # | Decision | Why |
|---|---|---|
| D-20 | **Stack: clone of saas-foundation v1.2.1** (Next.js 16, Prisma 7, PostgreSQL 17 + `pgvector`, vitest, Playwright). **Port 5400** — confirm unclaimed in `~/.claude/CLAUDE.md`'s port table (used: 3000–4200, 4173, 4400 reserved, 4901, 5000, 5100, 5200 reserved, 5300) and add the row in the same commit as the config. Local `DATABASE_URL`s carry `?connection_limit=10&pool_timeout=20`. Python only in `tools/` (stdlib + poppler `pdftotext`/`pdfinfo`, O-7). Not deployed in v1. **Rejected:** Python/FastAPI like OpsAgent — the permission tiers map onto the foundation's orgs/roles/audit, the eval harness donor (Use-Case Studio) is TypeScript, and fts + pgvector in one Postgres is what makes the three-way comparison cheap. OpsAgent's Python designs (budget guard, injection red-team) port as designs. | Reuse over rebuild; one database for all three retrievers |
| D-21 | **Golden set and fixtures are frozen** (`eval/golden.json`, `eval/fixtures/**`). Product code never writes them. Shane's hand answers (task 1.9) override the kit's expected pages; every override is a dated line in §Golden-set changes below. `tools/check_golden.py` marks a question UNVERIFIED if its quote fragment is not found in `corpus/text` at page ± 1, and the scorecard excludes UNVERIFIED questions and says how many. | Tests are evidence only if the expected values were fixed by hand first |
| D-22 | **Judge calibration precedes any reported score.** Order: planted-fabrication gate (≥ 95% target) → κ vs Shane's grades on 20 answers (≥ 0.7 target) → only then sentence-support rates. A scorecard printed before calibration carries the banner "JUDGE UNCALIBRATED" on every judge column. | Use-Case Studio lesson, carried over |
| D-23 | **Every model call is a `ModelCall` row** (purpose, model, tokens, cost, runId, answerId). `eval:scorecard` reads rows only. Replay (`GET /answers/:id`) reads rows only. | Zero-call regeneration; cost is auditable |
| D-24 | **Terms.** "Chunk" = indexed unit with one tier and one page (or two if a sentence spans). "Passage" = the quoted substring inside a chunk. "Edition" = the cover's tax year or Rev. date. "Superseded" = a document whose `supersededBy` is non-null in the manifest; it stays retrievable and is always labeled. "Refusal" = `status: refused` with a code; "partial" is not a refusal. | Shared vocabulary for the write-up |

## Open — need Shane's call (defaults in force until changed)

| # | Question | Default | Why it's open |
|---|---|---|---|
| O-1 | Answer model default | `claude-sonnet-5-5` | Haiku may be good enough; the ablation decides, Shane confirms |
| O-2 | Embedding model | `voyage-4-lite` (1024-dim) | `voyage-4` is 3× the price for a quality gap we haven't measured; `voyage-context-4` is a P1 ablation. Needs a Voyage/Atlas API key (owner hand step) |
| O-3 | Chunk size / overlap | ≈ 350 tokens, 15% overlap, heading- and table-bounded | Smaller chunks give sharper quotes but more cross-chunk answers; measure recall at 250/350/500 if time allows |
| O-4 | θ initial value | measured per D-17 in Phase 1 | Cannot be set before the score distribution exists |
| O-5 | May `service` callers (N9) ever see `staff` tier? | No | N9's end user is a customer, not staff |
| O-6 | Keep discontinued Pub 535 (2022) in the corpus as a "superseded with no successor" case? | No | Interesting edge case, but muddies "superseded" and adds ~60 pages |
| O-7 | PDF extraction tool | poppler `pdftotext -layout` per page | Zero Python deps; if task 1.4's sample shows > 2 of 20 mangled passages, propose `pymupdf` (ask first) |
| O-8 | Hybrid fusion | RRF with k = 60 | Standard constant; weighted fusion is a P1 ablation |
| O-9 | Should `partial` answers count as answered in the scorecard? | Reported separately (answered / partial / refused) | N9 will decide its own treatment |
| O-10 | How does the `service` role (N9) authenticate? | The foundation's API-key mechanism if v1.2.1 has one (session verifies in KICKOFF step 6); otherwise a hashed-key table with one row, built in Phase 4 after asking | Project 20 (Public API) owns key management; Footnote needs exactly one key |
| O-12 | Where do clone-owned secrets (`VOYAGE_API_KEY`, later `ANTHROPIC_API_KEY`) live, given INV-14 pins `.env.example` to the template's `src/core/env.ts` schema (Session 0 contradiction 8)? | Read `process.env.VOYAGE_API_KEY` directly in the Voyage client, at call time, so tests and scripts that never embed need no key; the line lives in gitignored `.env.local`; names documented in README, never added to `.env.example` or the template schema | A one-key schema file would be an abstraction with one use; revisit when a third key appears |


## Not modeled (seams only)

Multi-turn memory · uploads (`CorpusSource` interface only) · OCR · reranking (P1 ablation) · per-client engagement assignment · streaming · deploy · real client data · a second corpus (P1 if licensed) · fine-tuning.

## Session 0 log (2026-10-19, on the Mac)

### Amendments

| # | Change | Why | By |
|---|---|---|---|
| D-20a | **Port 5800, template v1.3.0.** The kit's 5400 was already claimed by use-case-grant-proposal-assembly (its `package.json` runs `next dev -p 5400`); the template's latest tag was v1.3.0, not the v1.2.1 the kit named. Clone is `~/Projects/footnote` from `shanelabountyai/saas-foundation` at v1.3.0, remote `template`. | Port table row added at 5800, *next project* moved to 5900. `new-project` refuses a port whose row says "in use", so the row is added right after the script runs, same commit | Shane (clicked 5800 and "use the newer one"), 2026-10-19 |
| O-7a | **`pdftotext` reading-order mode, not `-layout`.** `-layout` keeps the two columns side by side, so a sentence that wraps is interleaved line by line with the other column: 14 of 26 kit quotes found as whitespace-normalized substrings vs 25 of 26 in reading-order mode. `-layout` is still run once per page to read the running footer, whose tokens (page number, `Chapter N`, title, `Publication NNN (YYYY)`) are then removed from the reading-order text by exact line match (575 of 587 pages fully; 12 covers/exhibits with no recognizable footer; 9 pages keep one token merged into a text line, recorded in `NNN.meta.json`). No dependency added. | The citation verifier needs the quote to be a contiguous substring of the chunk; the extraction mode is what decides that | session, measured |
| D-7a | **`revisionDate` is the ISO date printed on the cover** for all 11 documents (every cover prints one, e.g. Pub 15 (2026) → 2025-12-15, Pub 538 Rev. January 2022 → 2022-02-14). `edition` keeps the cover's wording. | The brief said "ISO where the cover gives a date"; it always does | session |
| O-7b | **Extraction is `pdftotext -raw` (content-stream order) with line-end hyphenation rejoined**, superseding O-7a's reading-order mode the same day. Task 1.4's by-eye sample on reading-order text scored 11 of 20 wrong: 4 of 5 column-spanning sentences were split (the right column's continuation landed out of order) and complex tables lost structure. Measured on those 8 failing sentences: `-raw` 8/8 contiguous, default mode 2/8, `-layout` 1/8; on the 26 kit quotes `-raw` + dehyphenation 25/26 (same as default; `-raw` alone 19/26 because it keeps "operat- ing"). The footer comes out as one joined line in `-raw` and is removed as such (575 of 587 pages; 12 covers/exhibits have none). Ceiling: no dictionary, so a true compound broken at a line end ("self-\nemployed") is glued; same ceiling as the default mode. Complex multi-column tables (Pub 587 Table 1, Pub 15-B Table 2-1, Pub 463 depreciation limits with footnote superscripts fused into numbers) are not reliably citable by any `pdftotext` mode — see `docs/extraction-sample.md` and the open item below. | 1.4 gate; the verifier needs contiguous substrings | session, measured |
| D-23a | **Cost is integer micro-USD** (`costMicroUsd`, 1 USD = 1,000,000) on `ModelCall`; per-MTok price × tokens is already micro-USD, so no float division anywhere. House money rule (Int, named by unit) applied below the cent. `assertBudget` refusals are `outcome: budget_exceeded` rows carrying the refused estimate, so the scorecard can count what was not spent. Caps: build 25,000,000 / run 3,000,000 / answer 100,000. | D-18, D-23 | session |
| D-25 | **Complex tables are a known, accepted limit of v1 (O-11 closed).** `pdftotext` cannot keep a 3+-column table's cells aligned or separate footnote superscripts from numbers (task 1.4: 16 OK / 4 WRONG of 20, all four such tables — Pub 583 p. 15 journal, Pub 463 (2025) p. 28 depreciation limits, Pub 587 p. 6 Table 1, Pub 15-B p. 6 Table 2-1). The chunker marks table regions and never lets a citation span one; simple label + value tables (Pub 583 Table 3, the deposit schedules) stay citable; the four pages above are listed as known-uncitable in `docs/extraction-sample.md`. No dependency added; `pymupdf` `find_tables()` is a P1 ablation that must re-score those four rows before adoption. | Owner's call at the 1.4 gate; no golden-set question cites a complex table | Shane, 2026-10-19 |
| D-18a | `config/prices.json` written from the vendor pages on 2026-10-19. **No difference from D-19:** Sonnet 5.5 $2/$10, Opus 5.5 $4/$20, Haiku 5.5 $0.10/$0.50 (prompts ≤ 100K tokens; $0.50/$2.50 above), `voyage-4-lite` $0.02/M with 200M free tokens. Cache and batch rates recorded alongside; Fable 5.1 listed with `runtimeAllowed: false` so an accidental call is priced, never silently free. | D-18 | session |
| D-11a | `corpus:check` is `tools/check_corpus.py`: fails with "no hashes" until the manifest is filled, then verifies `textSha256` per document (hash over the page files, so drift is caught without the PDFs) and the private-tier hashes and front-matter (`tier` in the closed set, five required fields). `--update` re-records the private-tier hashes after a deliberate change. Prints the snapshot id (D-9). | 1.1 acceptance | session |
| D-10a | **Chunker as built (task 1.6), measured.** `src/lib/corpus/chunk.ts`, pure over `corpus/text` + `corpus/private`. Tokens are approximated as words × 4/3 (no tokenizer dependency), so the ≈ 350-token target is 262 words with a 39-word (15%) sentence overlap. A segment starts at a title-case heading line or a markdown heading; a table region starts at a `Table N.` caption and runs to the next bold run-in lead or the end of the page (a title heading cannot end it because a bare cell such as "Friday" looks like one); a long table is split only between rows with the caption repeated (D-25). **Deviation from D-10:** chunks are page-bounded; a sentence that spans a page break is not joined (the known case is GM-04's 6.2% sentence across `p15-2026` pp. 1–2), to be joined only if 1.11 shows a miss from it. Measured on snapshot `cd1252c6`: **3,922 chunks** (3,719 public over 587 pages, 203 memo chunks over 40 memos), 148 table chunks, median prose chunk 75–231 words by document, max 312; every chunk is a whitespace-normalized substring of its page (tested), which is the precondition `verifyCitations()` relies on | D-10, D-25, O-3 | session, measured |

### Reuse check (KICKOFF step 7)

`python3 reuse-scan.py check "footnote-kickoff/docs/phase-1-tasks.md" "footnote"` parsed **0 proposed items** from the checkbox task list (the scanner indexes markdown backlog tables) against 434 built items in 1 indexed project, so its buckets are empty. `reuse-scan.py find` for "eval harness", "budget cap", "prompt injection", "audit log", "access tier" returned document mentions only (apptbasedservice, headless-ci, alongside), no backlog matches. Outcome recorded by hand from reading the donors (step 6):

| Bucket | Item | Donor | Governs on divergence |
|---|---|---|---|
| 🟢 REUSE | auth, orgs, roles, audit log, outbox, CI, invariants | saas-foundation v1.3.0 as cloned | template; never edited here |
| 🟡 ADAPT | eval harness: planted-fabrication gate (the rule that a catch counts only if the critic quotes the planted `signature` token, and a clean control plan that must not be condemned), deterministic invariants | Use-Case Studio `src/lib/kickoff/harness.ts`, `invariants.ts` | Footnote forks (Drizzle → Prisma, briefs → sentence support) |
| 🟡 ADAPT | budget guard: `guard()` before every call, `BudgetExceeded`, spend as a view over logged calls, mean-cost projection | OpsAgent `src/opsagent/ledger.py` | Footnote re-expresses in TypeScript as `ModelCall` + `assertBudget` |
| 🟡 ADAPT | prompt-injection fixtures and the model-level / system-level split | OpsAgent `fixtures/gold/redteam.yaml`, `src/opsagent/redteam.py`, `gateway.py` `untrusted()`, `screen.py` `DATA_POLICY` | Footnote's fixtures attack retrieved chunks, not CRM fields |
| 🟡 ADAPT | access matrix shape and the "lower role cannot read higher record" tests, the static "no ad-hoc role checks outside the auth module" test | clearpath `src/auth/permissions.ts` `can()`, `permissions.test.ts` | Footnote's `tiersFor(role)` is a closed four-tier set, not a resource × action matrix |
| 🔵 NEW | Cohen's κ (no donor has it), the $-denominated per-run cap, chunking, verbatim citation verification, θ refusal threshold, tier predicate inside a ranked query, edition-aware answers, three-way retrieval table | — | Footnote |

### Donor "Where to look" corrections (KICKOFF step 6; `docs/portfolio-overlap.md` read against the code)

- **Use-Case Studio** root is `~/Projects/usecasestudiofiles/use-case-studio`. The eval module is `src/lib/kickoff/` (feature "Build Kickoff"): `harness.ts` (gate: `plantedFabrications`, `criticFabricationGate`, kinds `fake-benchmark`, `unlabeled-sla`, `guarantee`, `vendor-requirement`, `silent-downgrade`), `judge.ts` (`judgeAgreement` reports **MAE, within-1 rate and Pearson r — not Cohen's κ**; the word kappa appears nowhere), `limits.ts` (**token and wall-clock caps per run, no dollar ledger**; `pricing.ts` prices for telemetry and "never gates behavior"), fixtures `docs/build-kickoff/human-ratings.json` (2 of the 10 required ratings exist; its judge is unvalidated). No npm scripts for the eval; the gate is an env-flagged vitest file and the judge runner is `scripts/judge-validate.mts`. `toPublicBrief()` is `src/lib/sharing.ts`; headers in `next.config.mjs` for `/s/:token*`.
- **OpsAgent**: budget guard and ledger are `src/opsagent/ledger.py` (`BUILD_BUDGET_USD = 25.0`, `guard()`, `BudgetExceeded`, `spend()`), callers in `redteam.py`, `matrix.py`, `cli.py`. Prices are **hardcoded in `src/opsagent/models.py`** (`PRICES`, `CHECKED = "2026-10-14"`, `cost_usd` raises on an unknown model); there is no prices config file. Red team: `fixtures/gold/redteam.yaml` (20 cases, 6 threats × 3 styles), scorer `src/opsagent/redteam.py` with per-case `model` / `system` booleans; the report format is "model-level injection success H/N", not a literal "N/20". Data-as-data prompt: `gateway.py` `untrusted()` / `label()` with `TRUSTED_KEYS`, policy text `DATA_POLICY` in `screen.py`. D-5 and D-26 exist in `docs/DECISIONS.md`.
- **clearpath** lives at `~/Projects/clinic` (port 3700). Authorization surface `src/auth/permissions.ts` (`can(actor, action, resource, target)` over a role × resource × action matrix with relationship predicates; `process_note` is author-only even against break-glass), enforcement wrapper `src/auth/guard.ts`, tests `src/auth/permissions.test.ts` (one test per matrix cell, plus the denial suites and the static "no ad-hoc role checks outside the auth module" test), e2e `e2e/confidentiality.spec.ts`, `e2e/denials.spec.ts`.
- **Kit gap:** NEXT.md said the kit's `.claude/settings.json` existed; it did not. Written in Session 0 by merging the Fable pin into the template's settings file.

## Golden-set changes

| Date | Question | Change | By |
|---|---|---|---|
| 2026-10-19 | GA-02, GA-09, GA-14, GM-04, GV-03, GV-05, GM-07 (`p15-2026`, `p15b-2026`, `p946-2025` "p. 1") | Quote measured on **p. 2**; the cover is p. 1. Within `pageTolerance: 1`; the brief now shows both | session (pending Shane's 1.9 answers) |
| 2026-10-19 | GA-06, GA-07, GA-08 | `p334-2025` $400 on **p. 10** (kit: 9); `p463-2025` $25 on **p. 16** (kit: 15); `p946-2025` $2,500,000 on **p. 18** (kit: 17). Within tolerance | session (pending 1.9) |
| 2026-10-19 | GA-13 | Page resolved: `p463-2025` **p. 19**, "Commuting expenses. You can't deduct the costs of taking a bus, trolley, subway, or taxi, or of driving a car between your home and your main or regular place of work." | session |
| 2026-10-19 | GU-03 | Page resolved: `p583-2024` **p. 3** (sole proprietorships and S corporations described) | session |
| 2026-10-19 | GU-06 | Checked: Pub 15 (2026) states no dollar penalty for a late 1099-NEC. Stays in slice U | session |
| 2026-10-19 | GM-02b | **UNVERIFIED as written:** `p538-2022` p. 8 reads "…were $26 million or less (indexed for inflation)"; the kit's fragment ends with a period that is not in the text. Not edited; Shane sets the fragment in 1.9 | session |
| 2026-10-19 | all 41 (task 1.8) | `eval/golden.json` written from brief §5.1 with the measured pages above; `tools/check_golden.py` runs inside `corpus:check`: **39 of 41 verified** at page ± 1, GM-02 and GV-06 UNVERIFIED on the shared Pub 538 fragment (GM-02b). A private-memo citation (GP-02/04/05) is checked against the memo body. `callerRole` for A/M/V questions the brief leaves unspecified is `front_desk` (lowest tier that sees public), so the retrieval table is not flattered by a wider tier set | session |
| 2026-10-19 | GA-08, GM-03, GM-02 | Measured: the 2025 section 179 What's New item is on `p946-2025` **p. 1** (the cover page carries the first What's New items; the 2026 item is on p. 2); Pub 538's inventory sentence is on **p. 8** (kit: 7); Pub 538's $26 million sentence is on **p. 9** (kit: 8). All within `pageTolerance: 1`; the kit's pages stand in the file | session |

## Review log (2026-10-14)

Two independent passes over the draft kit, folded in before handoff.

**Review 1 — product owner (scope, contradictions, buildability, Phase 1 finishable)**

| Finding | Outcome |
|---|---|
| PRD personas said bookkeepers see "engagement memos for the clients assigned to them" but D-12 gives bookkeepers all engagement memos | PRD persona reworded: v1 is all engagement memos; per-client assignment is P1 (listed) |
| The answer contract took `caller.role` from the request body, which would let any caller claim `partner` | D-12 amended: role is loaded from session/API key; body `caller` is identity only and is cross-checked. Contract comment added |
| `PERMISSION_SCOPED_MISS` was described as computed "at request time", which means running a second, unfiltered query inside a live request — a bypass path by construction | D-13 reworded: computed only in the test harness; the live path never issues an unfiltered query |
| Phase 1 included "Shane answers 10 questions by hand" but no task said *which* 10 or what format | Task 1.9 names the 10 (the worked examples in brief §5.2) and the file format (`eval/hand-answers.md`: question, doc, page, quoted sentence, one-line answer) |
| Phase 1 exit criteria required recall numbers but the golden set's page expectations were partly UNVERIFIED | Task 1.8 adds `tools/check_golden.py`; UNVERIFIED questions are excluded from the recall table and counted; exit criterion says "on verified questions, with the UNVERIFIED count printed" |
| Corpus fetch cannot run from the cloud workspace (irs.gov blocked) — the kit implied Session 0 could pin hashes anywhere | KICKOFF step 2 marks fetch as a Mac step; the brief §2 says so |
| Pub 535 was in the suggestion list and the kit both rejected and half-kept it | D-1 excludes; O-6 keeps the question; GU-08 tests that the assistant doesn't pretend it is there |
| Cost cap: $25 was proposed without an estimate | D-18 and PRD cost model carry a per-call estimate from the verified prices |
| Phase 1 was too large (indexes + API + golden set + UI) | API and UI moved to Phases 2 and 4; Phase 1 is corpus, chunks, three retrievers, tier filter, golden set, retrieval table, hand answers |

**Review 2 — retrieval / LLM-evaluation specialist (eval design, citation verification, refusal testing, injection, cost)**

| Finding | Outcome |
|---|---|
| Citation verifier compared raw strings; PDF text has curly quotes, non-breaking spaces and soft hyphens, so honest quotes would fail | D-6 defines the normalization (whitespace, quotes, dashes); task 1.3 strips soft hyphens at extraction time |
| Injection fixtures sat under `eval/fixtures/` where nothing would index them, so they could never be retrieved | Moved to `corpus/private/injection/*.md` (tier `staff`, part of the snapshot); expectations in `eval/fixtures/injection.json` |
| GU-03 expected both an `OUT_OF_SCOPE` refusal and a `partial` answer, which the status model did not allow | D-8 amended: `OUT_OF_SCOPE` may accompany `answered`/`partial` |
| The `service` role's authentication assumed the foundation has API keys | O-10 added with a default |
| θ tuned on the full golden set and reported on it | D-17 splits calibration and reporting questions |
| "Refusal rate ≥ 90%" could be met by refusing everything; no paired metric | Scorecard pairs refusal-on-U with answered-rate-on-A in the same table; PRD metrics table notes "the remainder are false answers, listed by id" and the A/M answered rate sits beside it |
| Expected citations at exact page would fail on a sentence spanning pages | Expected citations carry `pageTolerance: 1` (D-21, brief §5.3) |
| Judge support-rate numbers would be quoted before κ existed | D-22 ordering and "JUDGE UNCALIBRATED" banner |
| Planted-fabrication fixtures were described only as "changed numbers"; a judge can catch numbers and miss conditions | Fixture types fixed: changed number, changed year, inverted condition, invented exception, correct sentence attributed to the wrong edition (five types, ≥ 4 each) |
| Dense + tier filter with an HNSW index can under-return | D-16: exact scan in v1 |
| Injection pass criterion was vague ("no injected content") | Each fixture carries a `mustNotContain[]` list and a `mustNotRetrieveTiers[]`; pass is mechanical |
| Version-sensitive questions with no year (GV-03, GV-06) had no defined correct behavior | Defined: both figures, each labeled; presenting one as "the" answer fails |
| Cost estimate ignored embedding spend and judge spend on the ablation matrix | PRD cost model lists embedding (within Voyage free tier at this size, $0 expected but ledgered), answer, judge; per-run cap $3 sized to one 41-question run with Opus judge (~$1.50) plus headroom |
| GU-06 (1099-NEC penalty) might actually be answerable from Pub 15 | Marked UNVERIFIED with the instruction to move it to slice A if found |
| Table 3 of Pub 583 was cited as the GA-03 fixture but the chunker rule for tables was not stated | D-10 and brief §3: never split inside a table; a long table is its own chunk with the caption repeated |

**Not taken:** adding a reranker to v1 (P1 ablation; it would blur the three-way comparison); removing prior editions to simplify (they are the version lesson); a probability-style confidence score (replaced by labeled measured quantities).
