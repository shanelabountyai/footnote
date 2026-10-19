# NEXT

## ▶ Next session: finish task 1.7 (dense + hybrid), needs the Voyage key

Start in `~/Projects/footnote` on Fable. **Shane pastes `VOYAGE_API_KEY`** into `.env.local` (the line is already there; the file is gitignored). Then run `npm run corpus:index -- --retriever=dense` **twice**: the first run embeds 3,922 chunks (≈ 31 batches of 128, expected about $0.02 at list price), the second must print `embeddings … 0 written`. Then `npm run spend` should show non-zero `embed` tokens, which completes the 1.7 acceptance; tick 1.7 in `docs/phase-1-tasks.md` with both numbers. After that: 1.10 (PT-1 + tier-filter lint, `permissions:verify`), then 1.11 → 1.12. Task **1.9** (Shane's ten hand answers → `eval/hand-answers.md`, plus the GM-02b fragment) must land before 1.10 is reported.

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

Spend so far: **$0.00** (embedding calls start at 1.7).
