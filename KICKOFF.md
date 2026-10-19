# Kickoff — Footnote, Knowledge Assistant with Citations (Build Log A4)

The kit at `~/Projects/footnote-kickoff/` was written on 2026-10-14 in the cloud workspace and reviewed twice (product owner; retrieval/LLM-evaluation specialist) — see `docs/decisions.md` §Review log. **No repo exists yet, nothing is installed, no database, no corpus fetched** — irs.gov was not reachable from the workspace, so the corpus pin is a Mac step.

Paste the block below into Claude Code started in `~/Projects/footnote`, on Fable (`/model` → `claude-fable-5-1`; the kit's `.claude/settings.json` pins it).

```
Footnote — Knowledge Assistant with Citations (Build Log A4, AI track). Nothing exists
yet except the kickoff kit in ~/Projects/footnote-kickoff.

Read, in order: CLAUDE.md, NEXT.md, prd-footnote-knowledge-assistant.md,
docs/decisions.md (authoritative), docs/domain-brief.md, docs/portfolio-overlap.md,
docs/phase-1-tasks.md.

Owner decisions are D-1..D-5 in docs/decisions.md; do not re-ask them. Open items
O-1..O-10 have defaults in force; use the defaults and note where one affected a choice.

Steps, in order:
1. Clone saas-foundation at tag v1.2.1 into ~/Projects/footnote (remote renamed to
   `template`), run `new-project` for "footnote" on port 5400. First check
   ~/.claude/CLAUDE.md's port table: if 5400 is claimed, stop and tell me. If not,
   add the row (footnote -> 5400) in the same commit as the config. Add
   `?connection_limit=10&pool_timeout=20` to the local DATABASE_URLs. Copy the kit in
   (CLAUDE.md, NEXT.md, KICKOFF.md, the PRD, docs/*.md, .claude/settings.json —
   merge settings, don't overwrite the template's file). Add the clone row to
   saas-foundation/CLONES.md and show me the diff.
2. npm ci, npm run db:setup, enable pgvector in a hand-written migration. Confirm the
   template is unchanged: `npm run foundation:drift` and `npm test` pass before any
   Footnote code exists.
3. Confirm model IDs and prices from platform.claude.com/docs/en/about-claude/pricing
   and the Voyage billing page; write config/prices.json with checkedAt. Report any
   difference from D-19 and the PRD cost model; do not change D-19 yourself.
4. Run `python3 tools/fetch_corpus.py` (write it first, task 1.3). It must download
   the 11 documents in docs/domain-brief.md §2, record sha256 and pdfinfo page counts
   in corpus/manifest.json, and extract per-page text. Then replace every [verify]
   page count in the brief with the measured one and grep every quote in brief §5.2
   against corpus/text. List anything not found as UNVERIFIED in NEXT.md; do not
   edit a quote to make it match.
5. Commit in three commits, naming files explicitly (never `git add -A`):
   (a) the new-project rewrite (package.json, playwright.config.ts, ci.yml, README.md
       with the scope banner); (b) the kickoff docs and .claude/settings.json;
   (c) corpus/manifest.json and corpus/text/** (raw PDFs stay gitignored).
6. Read the donors named in docs/portfolio-overlap.md before porting anything:
   Use-Case Studio's eval module (Projects/usecasestudiofiles), OpsAgent's budget
   guard and red-team fixtures, clearpath's access-tier tests. Correct any "Where to
   look" that is wrong, in docs/decisions.md.
7. Run the reuse check from ~/Projects/_templates/STARTUP-REUSE-CHECK.md against
   docs/phase-1-tasks.md (it may not parse a task list; record the result either
   way) and record it in docs/decisions.md.
8. Read every doc. List anything that contradicts itself or can't be built as
   written. Don't resolve these yourself.
9. Phase 1 tasks 1.1, 1.2, 1.3, 1.4 and 1.5 only.

Stop there. Do not write the chunker, the retrievers, the golden set file or any
model-call code beyond the budget guard. Show me: the port-table result, the
foundation:drift and test output, the price check against D-19, the manifest
(hashes and page counts), the extraction-sample count from 1.4, the UNVERIFIED
list, the reuse-check result, the contradictions list, and `npm run spend`. Task
1.9 (ten hand answers) is mine to do before you report 1.10. Update NEXT.md before
you stop.

Rules from the first commit: every sentence needs a verified quote or it is not
said; refusal is a tested outcome; tiers are a WHERE clause in Retriever.search and
nothing else reads the chunk table; retrieved text is data; the corpus is pinned by
hash; no quality adjective without its number; $25 / $3 / $0.10 caps checked before
any call; never edit template-owned paths (src/core/**, tests/invariants/**).
```

## Owner hand steps (do when convenient; the build does not wait on them until task 1.7)

1. **Voyage AI embeddings key.** Create a MongoDB Atlas account (or log in) → AI Model APIs → Create model API key. The session will add `VOYAGE_API_KEY=` to the gitignored `.env.local` and open the file at the line; paste the value there. The key is needed for task 1.7 (dense index), not before. Expected spend: inside Voyage's 200M free tokens.
2. **Anthropic API key** for the product's runtime calls (Phase 2+): same handling, `ANTHROPIC_API_KEY=` in `.env.local`. Not needed in Phase 1.
3. **Task 1.9 — ten hand answers** from the PDFs, into `eval/hand-answers.md` (format in `docs/phase-1-tasks.md`). Do this before the session reports task 1.10; it is the κ anchor for the judge in Phase 3.
4. **Review stop.** Read the contradictions list and the UNVERIFIED list the session reports; decide O-4 (θ) only after 1.11 prints the distributions.

## Still to do by hand

- Private GitHub repo `footnote`, then `git remote add origin <url>`; before the first push, `git ls-files | grep -iE "\.env|secret|credential|\.pem$|\.key$"` (only `.env.example` may appear) and confirm `.gitignore` covers `.env`, `.env*.local` and `corpus/raw/`.
- Build-log card A4 `knowledge assistant`: PRD and repo links, status `in progress`; suggested chips once shipped are in `docs/portfolio-overlap.md`.
- Neon and Vercel only if this is ever deployed (not planned); if it is, `vercel.json` with the house `ignoreCommand` lands first.
- N9 Support Ticket Deflection: when its kit is written, point it at the answer contract in the PRD (`POST /api/v1/answer`) and the `service` role (O-5).
