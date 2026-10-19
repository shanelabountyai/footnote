# Footnote — Portfolio Overlap Check

Checked 2026-10-14 against the build-log card list and the kickoff docs of the AI-track siblings. **Donor code was not readable from the workspace that wrote this kit**; every "Where" below is a description of what to look for, and the session reads the donor before porting (KICKOFF step 6). Purpose: keep Footnote from re-teaching what a sibling already built, and from taking a lesson a planned project owns.

## Verdict

The card lists five chips. None is already built; two lean on existing harnesses:

| Card chip | Already in the portfolio? | What Footnote does |
|---|---|---|
| retrieval | No. MCP-over-Bookable exposes app data as tools; nothing indexes a document set | Chunking real PDFs; fts vs dense vs hybrid, measured |
| citations | No | Passage-level, verbatim, verified in code, with edition and page |
| groundedness eval | **Partly — Use-Case Studio** has the eval harness (invariants, planted-fabrication gate, judge-vs-human agreement, cost caps) for use-case briefs | Ported and extended with sentence-level support, retrieval recall, refusal rate, κ |
| refusal behavior | No. OpsAgent refuses *actions* without approval; nothing refuses to *answer* | A tested outcome with a measured rate on an unanswerable slice |
| permission-aware search | **Partly — clearpath** has access tiers over clinic records; saas-foundation has orgs/roles/audit | Tiers applied inside the retrieval query; the forbidden-best-match test |

Suggested chips once it ships: `verified citations` · `tested refusal` · `tiered retrieval` · `fts vs dense vs hybrid` · `edition-aware`.

## Reuse — port, do not rebuild

| Capability | Donor | Where to look (session verifies) | Footnote use |
|---|---|---|---|
| Auth, orgs, roles, audit log, outbox, CI, invariants, share links | saas-foundation v1.2.1 | template | As cloned; roles → `tiersFor(role)`; audit log → answer audit rows; API key for the `service` role |
| Eval harness: invariants, planted-fabrication gate, judge-vs-human agreement, cost caps | Use-Case Studio (`Projects/usecasestudiofiles`; Drizzle ORM) | its eval module and fixtures; the fabrication fixture format; the agreement calculation | Port to Prisma; add retrieval recall, sentence support, refusal rate, tier-leak count; keep the gate-before-trust ordering (D-22) |
| Budget guard: cap checked before the call, spend logged per run, over-budget cell refused | OpsAgent (Python; D-5 and the M6 matrix runner, D-26) | its eval runner's guard and spend ledger | Re-expressed in TypeScript as `ModelCall` + `assertBudget(purpose, estimate)` (D-18, D-23) |
| Prompt-injection red-team fixtures and the "untrusted text is data" prompt shape | OpsAgent (M5 red team: 20 fixtures, "model 1/20, system 0/20") | its red-team fixture file and the system/model split in scoring | Injection fixtures for retrieved chunks (D-14); report system and model results separately the same way |
| Fixed model IDs and prices confirmed from docs, not memory | OpsAgent (M0-2) | its model-ID check step | `config/prices.json` with `checkedAt` |
| Access tiers over records | clearpath (counseling clinic ops) | its role → visibility mapping and the tests that prove a lower role cannot read a higher record | The tier model; the shape of PT-1 |
| Public share-link hardening (projection, no-store, rate limit) | Use-Case Studio | `toPublicBrief()` and headers | Only if a public answer page is ever added (P1) — seam |
| Frozen fixtures + Python oracle | LoanBook / Adjuster / Gridline kit | `tools/`, `fixtures/` discipline | `eval/golden.json`, `tools/check_golden.py`, `tools/check_corpus.py` |
| Idempotent batch command with a run id | BoxLoop / OpsAgent | `billing-run` / matrix runner | `corpus:index`, `eval:answers` (idempotent per snapshot × retriever × model) |
| Stoplight updates, failure-only monitors, one sweep at a time, port table, pool caps | `~/.claude/CLAUDE.md` | global | Obeyed as written |

## New — each with the fixture that proves it

| # | Lesson | Not in any sibling because | Proven by |
|---|---|---|---|
| 1 | Chunking real two-column PDFs with tables and cross-references so that page and section are facts of the chunk | Claims Intake extracts fields from forms; nothing chunks prose | Task 1.4 sample (20 passages), GA-03 (table row kept whole) |
| 2 | Verbatim citation verification in code, with the sentence dropped when it fails | No sibling quotes a source | Verifier unit tests; `droppedSentences` on the scorecard; the fabrication gate's "wrong edition" type |
| 3 | Refusal as a measured outcome with a calibrated threshold, calibrated and reported on disjoint questions | OpsAgent refuses actions by rule, not by evidence strength | GU-01..08, D-17 split |
| 4 | Permission enforced inside a similarity/full-text query, and the proof that a forbidden best match stays hidden | clearpath filters rows by role on read; it has no ranking step that could leak | PT-1..PT-3, the query-log assertion |
| 5 | Edition-aware answers over near-duplicate chunks | No versioned corpus anywhere in the portfolio | GV-01..06, GM-02 |
| 6 | A measured three-way retrieval comparison on one golden set | No retrieval exists to compare | `eval:retrieval` table, D-15a |
| 7 | Groundedness judging at sentence level, gated by fabrication detection and human agreement | Use-Case Studio judged briefs, not evidence support | Gate fixtures (5 types), κ on 20 answers |
| 8 | Retrieved text as an injection surface (not user input, not tool output) | OpsAgent's red team attacked CRM field contents and user prompts | ≥ 10 injection fixtures with mechanical pass criteria |
| 9 | An answer API designed for a downstream automation (N9) with refusal and partial as first-class statuses | MCP-over-Bookable exposed tools, not an answer contract | Contract tests; `GET /answers/:id` replay |

## Guardrails — lessons Footnote must not take

| Lesson | Owner | Rule here |
|---|---|---|
| Acting on a system under approval, write allowlists, hash chains | A2 OpsAgent | Footnote only reads and answers |
| Field extraction with per-field confidence, review queue | A3 Claims Intake | No extraction; PDFs have a text layer and are chunked, not parsed into fields |
| Exposing an app as tools | MCP-over-Bookable | Footnote is called *by* an automation; it exposes one HTTP contract, not an MCP server (seam only) |
| Ticket threads, deflection policy, escalation | N9 Support Ticket Deflection (planned) | One question in, one answer out; N9 owns the conversation |
| Tenant isolation, per-tenant billing | 19 Multi-Tenant Shell (planned) | One org (`org_ll`); foundation orgs as cloned |
| API keys, rate limits, signed webhooks | 20 Public API (planned) | One service key for N9 via the foundation; no rate-limit design |
| Messy data import | 22 Nonprofit/Donor CRM | Corpus is clean PDFs by design |

## How this was checked

- Read the Gridline kickoff kit, OpsAgent's KICKOFF.md and NEXT.md, Bracketry's CLAUDE.md, the reuse-check template and the global conventions. Donor source trees were not reachable from the workspace; descriptions above come from those documents and from memory notes about Use-Case Studio (Drizzle, share-link hardening, eval harness) and clearpath (access tiers).
- The session must read the donors before porting and correct any "Where to look" that is wrong, recording the correction in `docs/decisions.md`.
- `reuse-scan.py` indexes markdown backlog tables; whether it parses `docs/phase-1-tasks.md` is unverified. KICKOFF step 7 runs it and records the result either way.
