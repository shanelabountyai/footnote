# CLAUDE.md — Footnote

Learning project: a knowledge assistant whose every sentence carries a verified citation. Chunking and retrieval over IRS small-business publications (public domain, 17 U.S.C. §105) plus a synthetic private tier; answers that quote the passage they came from, with edition and page; a tested refusal when the documents don't say; retrieval filtered by caller inside the database query. **Not tax or legal advice — every answer says so. Synthetic private tier only; no real people, no real client data.** Keep the scope-honesty banner verbatim in README.md.

Read first: `prd-footnote-knowledge-assistant.md` (what), `docs/decisions.md` (authoritative; outranks the PRD), `docs/domain-brief.md` (corpus, tiers, golden set), `docs/portfolio-overlap.md` (what to port, what not to build). Current work: `docs/phase-1-tasks.md`. Session state: `NEXT.md`.

## Non-negotiables
1. **A sentence without a verified citation is not said.** `verifyCitations()` checks every quote is a whitespace-normalized substring of its stored chunk, in code, on every answer. A sentence whose citations all fail is dropped and counted (`droppedSentences`); an answer with no sentences left is a refusal. The model never verifies itself.
2. **Refusal is a first-class, tested outcome.** The golden set has an unanswerable slice; its refusal rate is measured and printed. A refusal never reveals that hidden documents exist (D-13).
3. **Permissions are enforced in the retrieval query.** `WHERE tier = ANY($allowedTiers) AND org_id = $orgId` runs before ranking, in `Retriever.search(caller, …)`, and nothing else hands chunks to the model. Never filter the model's output to enforce access. PT-1 (forbidden best match stays hidden) runs in CI.
4. **Retrieved text is untrusted input.** Chunks are wrapped as data in the prompt; an instruction inside a chunk is content to quote, not a command. Injection fixtures run in CI.
5. **The corpus is a pinned snapshot.** `corpus/manifest.json` holds URL, sha256, edition and revision date per document; the snapshot id is the hash of hashes and appears on every answer. A changed hash is a new snapshot and a re-index, never a silent update.
6. **Edition and page come from the manifest and the extraction, never from the model.** A citation without `edition`, `revisionDate` and `page` is invalid.
7. **No quality adjective without a number.** Not "accurate", "optimal", "robust", "reliable" in code comments, UI, commits or write-ups unless the measured figure sits beside it ("sentence support 91% on 32 answered questions, judge κ 0.74"). Targets are written as targets until measured.
8. **Spend is capped in code.** $25 whole build, $3 per eval run, $0.10 per answer, checked *before* the call (D-18). Prices come from `config/prices.json`, filled from the vendor pages with the date checked, never from memory.
9. **Every model call is logged** (`ModelCall`: purpose, model, tokens, cost, run id). The scorecard regenerates from stored rows with zero model calls.
10. **The judge is not trusted until it is calibrated.** Planted-fabrication gate ≥ 95% and κ vs Shane's hand grades reported, before any support-rate number is quoted anywhere.
11. **Golden set and fixtures are frozen.** Tests read `eval/golden.json` and `eval/fixtures/`; product code never writes them. To change an expected answer, change `docs/decisions.md` first, then the file, and show the diff.

## Working rules
- **Order:** corpus pin → extraction → chunks → three retrievers behind one interface → tier filter + PT-1 → golden set + retrieval table → (Phase 2) prompt → verifier → thresholds → API → (Phase 3) judge → gate → κ → ablations → scorecard → (Phase 4) service key, UI, demo. Write the failing test first where a fixture exists.
- **Port before you write.** Donors are in `docs/portfolio-overlap.md`. Read the donor code, port it, record the lineage in `docs/decisions.md`. The eval harness comes from Use-Case Studio (Drizzle → Prisma adaptation is expected); the budget guard and injection defense are OpsAgent designs re-expressed in TypeScript.
- **Measured comparison, not assumption.** fts, dense and hybrid all ship behind `Retriever`; the default is chosen from the recall table and the gap is written down. No retriever is deleted for losing.
- Phase gate: don't start the next phase until the current phase's exit criteria pass. Write the next phase's task list at the gate and stop for review.
- Adding a tier, a refusal code, a retriever or a slice to the golden set needs a `docs/decisions.md` entry.
- **Ask before adding dependencies.** Expected adds (each still asked): `pgvector` Prisma support, `voyageai` HTTP client (plain `fetch` preferred — no package), Anthropic SDK. Python in `tools/` is stdlib plus the poppler CLI (O-7).
- Small commits, one concern each, naming specific files (never `git add -A`). Note seams for non-goals; don't build them.
- **Model is pinned to Fable 5.1** (`claude-fable-5-1`) in `.claude/settings.json` for this build. Drop to Sonnet only for an item with no new logic. The *product's* runtime models are a separate decision (D-19) and are never Fable.
- Stoplight markers on every update (🔴 / 🟡 / 🟢), failure-only monitoring for anything over a minute, one sweep at a time — per `~/.claude/CLAUDE.md`.
- End each session by updating `NEXT.md`: built, decided, left open, gate output, spend so far.

## Stack
TypeScript on a clone of saas-foundation v1.6.0 (apikeys module removed, D-55): Next.js 16, Prisma 7, PostgreSQL 17 with `pgvector`, vitest, Playwright. **Port 5800** (D-20a; the kit's 5400 was already taken; row added to `~/.claude/CLAUDE.md`'s port table 2026-10-19). Local `DATABASE_URL`s carry `?connection_limit=10&pool_timeout=20`. Template-owned paths (`src/core/**`, `tests/invariants/**`, core migrations) are never edited here. Python only in `tools/` (stdlib + poppler). Not deployed; if that changes, `vercel.json` gets the house `ignoreCommand` first.

## Commands (task 1.1, created 2026-10-19)
- `npm test` — vitest against the local `footnote_test` database
- `npm run corpus:fetch` — `python3 tools/fetch_corpus.py` (downloads to gitignored `corpus/raw/`, verifies sha256, extracts pages to `corpus/text/`)
- `npm run corpus:check` — recomputes hashes of `corpus/text/**` and `corpus/private/**` against the manifest; exits non-zero on drift
- `npm run corpus:index -- --retriever=<fts|dense|hybrid>` — idempotent per (snapshot, retriever, embedding model)
- `npm run eval:retrieval` — recall@k / MRR table for every retriever on `eval/golden.json`
- `npm run eval:answers -- --retriever=… --model=…` — Phase 2+; refuses to start if the run would exceed the per-run cap
- `npm run eval:scorecard` — Phase 3; from stored rows only, zero model calls
- `npm run spend` — spent / remaining by purpose
- `npm run permissions:verify` — PT-1 and the tier-filter lint

## Definition of done (any task)
Tests green, `corpus:check` OK, `permissions:verify` OK, no model call outside the spend ledger, no quality adjective without its number, decisions doc updated if a rule changed, `NEXT.md` updated with spend so far.

## Session 0 — reuse check (run before sequencing the backlog)

Before any backlog item is scoped or built, run the reuse scan against the proposed task list and act on the output:

    cd ~/Projects
    python3 reuse-scan.py check "footnote/docs/phase-1-tasks.md" "footnote"

Three buckets come back:

- **🟢 REUSE** — already built elsewhere. Do NOT rebuild. Port the implementation, mark the item ✅, and cite the donor item ID (e.g. "lifted from use-case-studio eval harness") so the lineage survives.
- **🟡 ADAPT** — close to something built. Read the existing implementation before writing. Then either extend the shared module or fork it *with a written reason* recorded in `docs/decisions.md`.
- **🔵 NEW** — no prior implementation. This is the real size of the project. Sequence only these.

**Record the outcome in `docs/decisions.md`** as a dated decision: what was reused, from where, and which project governs when the two diverge. `docs/decisions.md` outranks any PRD text. The scanner indexes markdown backlog tables and may not parse a checkbox task list; record the result either way. Re-run after the task list is re-sequenced.
