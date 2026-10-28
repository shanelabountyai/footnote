# Footnote — demo script

Not tax or legal advice. Synthetic private tier (Ledger & Lane Bookkeeping, invented), public IRS corpus (snapshot `cd1252c6a407`). Not deployed: everything runs on localhost:5800 against the local Postgres.

Every command and question below was run once on 2026-10-28 against the local database. Answers come from a live model, so wording varies between runs; the citations, labels and refusals are what to point at. Each answered question costs about $0.01–0.05 (cap $0.10 per answer).

## Setup (once, ~1 minute)

```bash
cd ~/Projects/footnote
npm run corpus:check          # expect: corpus:check OK — 11 documents, 40 private files
npm run permissions:verify    # expect: permissions:verify OK
npm run seed:footnote         # three demo staff in the ledger-lane org (idempotent)
npm run dev                   # http://localhost:5800
```

Prerequisite: the dev database was indexed once with `npm run corpus:index -- --retriever=dense` (and `fts`, `hybrid`). `.env.local` needs `DEMO_MODE=1`, `ANTHROPIC_API_KEY` and `VOYAGE_API_KEY`; only the names matter here, the values stay in that file.

## Accounts

Open `http://localhost:5800/demo` and click the account. No password: demo sessions resolve only while `DEMO_MODE=1`. After the click you land on `/onboarding`; go straight to `http://localhost:5800/o/ledger-lane/ask`.

| Account | Staff role | Sees tiers |
|---|---|---|
| `partner@ledgerlane.demo.test` | partner | public, staff, engagement, partner |
| `bookkeeper@ledgerlane.demo.test` | bookkeeper | public, staff, engagement |
| `frontdesk@ledgerlane.demo.test` | front_desk | public, staff |

## Stops

**1. Answered, with a citation — as bookkeeper.** Ask: *What is the standard mileage rate for business use of a car for 2025?*
Expect: 70 cents per mile, one citation to Publication 463 (For use in preparing 2025 returns), page 20, with the quote shown. Say: every sentence carries the passage it came from, with edition and page. The code checks the quote is a substring of the stored chunk; the model does not check itself.

**2. Superseded edition, labeled — as bookkeeper.** Ask: *What was the standard mileage rate for 2024?*
Expect: 67 cents, citing the 2024 editions of Pub 463 (page 21) and Pub 334 (page 34), and each sentence carries "Cites only a superseded edition … The current edition in the corpus is …". Say: an old figure is never presented as current; the label comes from the manifest, not the model.

**3. Refusal on an unanswerable question — as partner.** Ask: *What will the social security wage base be for 2027?*
Expect: "No passage in the documents answers this question." (`NO_RELEVANT_PASSAGE`), no sentences. Say: the corpus pins 2025 and 2026; refusing is a tested outcome, and this one is stopped by a similarity threshold before any model call.

**4. Permission-scoped miss — as front_desk, then partner.** Ask both: *What discount did we give Red Fork Welding?*
Expect: front_desk gets the same plain refusal as stop 3; partner gets "15% discount on its monthly fee for the first six months", cited to the Red Fork fee note (tier partner), page 1. Say: the front-desk answer is a refusal, not "you can't see this": the tier filter runs inside the retrieval query, so the partner chunk never reaches the model, and a refusal never reveals that hidden documents exist. `npm run permissions:verify` runs this case (PT-1) against every retriever.

**5. Audit view — as partner.** Open `http://localhost:5800/o/ledger-lane/answers`. Expect: the answers just asked, with role, status, snapshot and cost; click one for sentences, citations and the gate score. Switch to `frontdesk` and the same URL is a 404.

**6. Service API (optional).**

```bash
npm run apikey:create -- --org=ledger-lane --label=demo     # prints the key once
curl -s -H "Authorization: Bearer <key>" -H 'Content-Type: application/json' \
  -d '{"question":"How long do I have to keep employment tax records?","org":"ledger-lane"}' \
  http://localhost:5800/api/answers
```

Expect: `status: "answered"` with citations and `corpusSnapshot`. The role comes from the key (`service`: public tier only), never from the request body. Contract: `docs/n9-contract.md`.

**7. The numbers — no model calls.**

```bash
npm run eval:scorecard        # writes eval/results/scorecard-cd1252c6a407-<date>.md from stored rows
npm run spend                 # spent vs the $25 build cap, by purpose
```

## What to concede before you're asked

- **The judge is uncalibrated.** Cohen's κ against Shane's hand grades is 0.17 on 40 sentences (target 0.7). The sentence-support figure (49/51, one run) is printed beside that and is not a quality claim.
- **Targets missed.** Expected passage cited: best cell 17/22 (77%) against a ≥ 85% target. Answered-or-partial on answerable questions: best 19/22 (86%) against ≥ 90%.
- **Schema failures read as refusals.** Some answer calls return malformed output (4–10 of 41 depending on the cell) and surface as `INSUFFICIENT_SUPPORT`. That is a format failure, not caution.
- **Refusal codes.** Several unanswerable questions refuse with `INSUFFICIENT_SUPPORT` where the golden set expects `NO_RELEVANT_PASSAGE`; GU-03 (S corp advice) is answered in some cells instead of refused `OUT_OF_SCOPE`.
- **Verbatim and tier-leak figures are by construction.** 342/342 citations verbatim and 0 tier leaks prove the code ran, not that the answers are right.
- **Synthetic private tier, public corpus.** No real client data. Not deployed; demo auth only.
- **Not tax or legal advice**, and the corpus is eleven IRS publications, so most real questions will refuse.

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| `/demo` is a 404 | `DEMO_MODE` is not 1 in `.env.local` | set it, restart `npm run dev` |
| `/demo` lists no ledgerlane accounts | seed not run | `npm run seed:footnote` (needs the `ledger-lane` org, which `corpus:index` creates) |
| Ask page is a 404 after sign-in | wrong org slug, or the user has no StaffRole there | use `/o/ledger-lane/ask` and a ledgerlane account |
| Every question refuses | no chunks indexed, or `VOYAGE_API_KEY` missing | `npm run corpus:index -- --retriever=dense`; check the key name exists in `.env.local` |
| `Missing script` or old output | stale checkout | `git pull`, `npm install` |
| Port 5800 busy | another dev server | `lsof -ti :5800 \| xargs kill` |
| Answer cost errors | per-answer or build cap reached | `npm run spend`; the caps are code, not config |
