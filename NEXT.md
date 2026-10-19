# NEXT

## ▶ Next session: Shane's hand answers (1.9), then Phase 1 tasks 1.6–1.8

Start in `~/Projects/footnote` (not the kickoff folder) on Fable. O-11 is closed as **D-25** (complex tables accepted as a v1 limit; the chunker marks table regions and never cites across them). Task **1.9** (ten hand answers into `eval/hand-answers.md`) is Shane's and must land before 1.10 is reported; the measured pages in `docs/decisions.md` §Golden-set changes are the starting point.

## Session 0 — 2026-10-19 (on the Mac)

**Built:** clone of saas-foundation **v1.3.0** on port **5800** (commits c124ca8, ea125d3, 90ae799, 5a02555); kit copied in; Fable pin in `.claude/settings.json`; local `footnote` / `footnote_test` databases with pool caps; `pgvector` 0.8.7 installed (brew) and enabled by a hand-written migration; task 1.1 commands; `config/prices.json` (checked 2026-10-19); corpus pinned and extracted (11 documents, **587 pages**, snapshot `sha256:cd1252c6…`); `tools/fetch_corpus.py`, `tools/check_corpus.py`; synthetic private tier (8 staff / 14 engagement / 8 partner / 10 injection memos) with `eval/fixtures/injection.json`; spend ledger (`ModelCall`, `assertBudget`, `npm run spend`, 6 tests); `docs/extraction-sample.md`.

**Tasks:** 1.1 ✅ · 1.2 ✅ · 1.3 ✅ · 1.4 ✅ by decision (16 OK / 4 WRONG of 20, the four being 3+-column tables; D-25) · 1.5 ✅ · 1.6–1.12 not started.

**Gate output (last full run):** lint 0 errors (1 template warning in `e2e/billing.spec.ts`), typecheck OK, `corpus:check` OK, `permissions:verify` 0 checks (stub), `foundation:drift` clean against v1.3.0, `npm test` **32 files / 178 tests passed**. **Spend: $0.0000 of $25** (no model or embedding call yet).

**Decided (see `docs/decisions.md` §Session 0 log):** D-20a port 5800 + v1.3.0 (Shane) · O-7a→O-7b extraction is `pdftotext -raw` + dehyphenation (measured: 8/8 column-spanning sentences contiguous vs 2/8 default, 1/8 `-layout`; 25/26 kit quotes) · D-7a cover date as `revisionDate` · D-18a prices confirmed, **no difference from D-19** · D-23a cost in integer micro-USD · D-11a `corpus:check` behaviour · reuse-check result (scanner parsed 0 items; outcome recorded by hand) · donor "Where to look" corrections (UCS has no κ and no $ ledger; OpsAgent prices are hardcoded; clearpath is `~/Projects/clinic`).

**Price check vs D-19:** identical — Sonnet 5.5 $2/$10, Opus 5.5 $4/$20, Haiku 5.5 $0.10/$0.50 (≤100K prompt; $0.50/$2.50 above), `voyage-4-lite` $0.02/M, 200M free tokens. IDs `claude-sonnet-5-5`, `claude-opus-5-5`, `claude-haiku-5-5`, `claude-fable-5-1` confirmed on the models page.

**Manifest (sha256 prefix · pages · cover date):** p334-2025 722639ba · 57 · 2026-02-10 | p15-2026 b46c3622 · 59 · 2025-12-15 | p463-2025 ddc3bb15 · 62 · 2026-02-27 | p583-2024 c551e158 · 28 · 2025-01-28 | p587-2025 7f68de21 · 35 · 2026-02-27 | p946-2025 07fadfb2 · 113 · 2026-03-13 | p538-2022 e2aa318b · 22 · 2022-02-14 | p15b-2026 a0af8513 · 36 · 2025-12-23 | p334-2024 0414933e · 55 · 2024-12-23 | p15-2025 168837bd · 58 · 2024-12-17 | p463-2024 5c8bbbc3 · 62 · 2025-02-27.

**Quote check (brief §5.1/§5.2 against `corpus/text`, page ± 1):** 27 of 28 found. Nine are one page later than the kit said (the cover is p. 1): GA-02, GA-09, GA-14, GV-05a/b, GM-04, GM-07 → p. 2; GA-06 → p. 10; GA-07 → p. 16; GA-08 → p. 18. Resolved: GA-13 → `p463-2025` p. 19; GU-03 → `p583-2024` p. 3; GU-06 stays U (no dollar penalty for a late 1099-NEC in Pub 15).

**UNVERIFIED:** `GM-02b` — the kit's Pub 538 p. 8 fragment ends "…$26 million or less." but the page reads "…$26 million or less (indexed for inflation)". Not edited; Shane sets the fragment in 1.9.

**Contradictions / cannot-build-as-written (KICKOFF step 8; not resolved unless marked):**
1. Port 5400 was claimed — resolved, D-20a. 2. Template v1.2.1 vs latest v1.3.0 — resolved (Shane: "use the newer one"). 3. Kit NEXT.md claimed `.claude/settings.json` existed; it did not — written here. 4. Brief §3 had the `-layout` column behaviour backwards — corrected with measurements. 5. D-18 says a stale price table "fails `npm run spend` with a warning", task 1.2 says "warn" — implemented as warning + exit 1 (D-18 outranks). 6. PRD answer-contract example `chunkId: "p15-2026:0043"` does not follow D-10's `<docId>:<page>:<ordinal>` — D-10 governs; PRD example not edited. 7. PRD P0-5 rule "sentences[*].citations non-empty … (D-5)" should cite D-6. 8. **INV-14 requires `.env.example` to match template-owned `src/core/env.ts` exactly**, so `VOYAGE_API_KEY` (1.7) and `ANTHROPIC_API_KEY` (Phase 2) cannot be added to `.env.example` without a clone-side env reader (e.g. `src/lib/env.ts` with its own schema) — decide before 1.7. 9. **O-10:** v1.3.0 has no API-key mechanism (`src/core` has none; the spec's only bearer check is the cron secret), so O-10's fallback applies: a hashed-key table with one row, Phase 4, after asking. 10. Task 1.4's gate failed on 3+-column tables that no golden-set question cites — closed as D-25. 11. `KICKOFF.md` still says 5400 / v1.2.1 — kept as the historical record. 12. The clone row is in the template's `CLONES.md` working tree, uncommitted (diff shown; committing the template was not asked).

**Reuse check:** `reuse-scan.py check` parsed 0 items from the checkbox list (434 built items in 1 indexed project); `find` probes returned document mentions only. Buckets recorded by hand in `docs/decisions.md`.

**Owner hand steps still open:** private GitHub repo `shanelabountyai/footnote` + `git remote add origin` + first-push secret check (`git ls-files | grep -iE "\.env|secret|credential|\.pem$|\.key$"` — only `.env.example` may appear; `.gitignore` covers `.env`, `.env.*`, `corpus/raw/`); Voyage key (needed at 1.7; env mechanism per contradiction 8 first); build-log card A4; task 1.9.

Spend so far: **$0.00** (embedding and model calls start at 1.7).
