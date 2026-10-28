# Footnote — engineering write-up

Learning project. Not tax or legal advice; every answer says so. The private tier is synthetic; the public corpus is IRS small-business publications (public domain, 17 U.S.C. §105). Snapshot `sha256:cd1252c6a407…`. Numbers below come from `eval/results/scorecard-cd1252c6a407-2026-10-28.md` (regenerated with `npm run eval:scorecard`, zero model calls) unless a decision id is cited. Questions marked UNVERIFIED in the golden set (GM-02, GV-06) are in no cell. Build spend: ~$2.81 of $25.

## What it is

A question goes in; sentences come out, each with a quoted passage, edition, revision date and page, or a refusal. Three rules do the work, all in code, none in the prompt:

- **Verification.** `verifyCitations()` checks every quote is a whitespace-normalized substring of its stored chunk. A sentence whose citations all fail is dropped; no sentences left means refusal. Result: 342 of 342 citations verbatim across six cells.
- **Permissions in the query.** `WHERE tier = ANY($allowedTiers) AND org_id = $orgId` runs before ranking. Result: 0 tier leaks in 342 citations; PT-1 (forbidden best match stays hidden) passes for fts, dense and hybrid, for session and service-key callers.
- **Refusal as an outcome.** Eight unanswerable questions (slice U) are in the golden set; refusal on U is measured per cell (below).

## Measured

41 verified golden questions per cell. Slices: A = answerable, M = multi-passage, V = versioned editions, P = private tier, U = unanswerable.

| Metric (target) | Measured |
|---|---|
| Expected passage cited, A+M (≥ 85%) | 8/22 to 17/22 (36%–77%) across six cells; **target not met in any cell** |
| Answered or partial, A+M (≥ 90%) | 11/22 to 19/22 (50%–86%); not met in any cell |
| Refusal on U (≥ 90%) | 6/8 to 8/8 (75%–100%); 8/8 only for fts+Haiku |
| Edition labeled, V answered (≥ 90%) | 100% in every cell (n = 2 to 6); true by construction, so it shows the code ran, not that the model chose well |
| Sentence support, judge (≥ 90%) | 49/51 (96%), one run (hybrid+Sonnet, θ on). **JUDGE UNCALIBRATED: κ 0.17, n 40**, target 0.7 not met. Do not read 96% as a quality figure |
| Planted fabrication caught (≥ 95%) | 25/25; 0/6 clean controls condemned |
| Injection fixtures | 10/10 |

### Retrieval comparison (k = 10, A+M+V, n = 26)

| Retriever | recall@1 | recall@5 | recall@10 | MRR |
|---|---|---|---|---|
| fts | 0.231 | 0.538 | 0.577 | 0.399 |
| dense | 0.442 | 0.846 | 0.923 | 0.695 |
| hybrid | 0.423 | 0.904 | 0.942 | 0.685 |

Dense is ahead on recall@1 and MRR; hybrid is ahead on recall@5 and @10. The gaps are 0.019 (@1), 0.058 (@5), 0.019 (@10) and 0.010 (MRR), on 26 questions, so one question moves recall by 0.038. These tables do not separate dense from hybrid. fts trails both on every column. On the private slice (n = 3) dense and hybrid score 1.000 and fts 0.333 at every k.

The shipped answer default is **dense + Sonnet, θ 0.52** (D-46), chosen from the end-to-end cell, not from the table above: A+M answered-or-partial 17/22 and expected-cited 15/22 at θ 0.52, against 14/22 and 13/22 for the earlier hybrid default. All three retrievers stay behind `Retriever`.

### End-to-end cells (A+M, n = 22)

| Cell | Answered or partial | Expected cited | U refused | schema_invalid refusals |
|---|---|---|---|---|
| fts+Haiku, θ on | 11 | 8 | 8/8 | 1 |
| fts+Sonnet, θ on | 12 | 9 | 7/8 | 0 |
| dense+Haiku, θ off | 16 | 14 | 7/8 | 6 |
| dense+Sonnet, θ off | 19 | 17 | 7/8 | 3 |
| hybrid+Haiku, θ off | 13 | 11 | 6/8 | 9 |
| hybrid+Sonnet, θ on | 14 | 13 | 7/8 | 2 |

Cells differ in θ setting as well as retriever and model, so rows are not single-variable comparisons. fts's 9 pre-call refusals in A+M are empty retrievals (fts has no gate, D-17b).

## Defects found

1. **Reading-order extraction split citable sentences (task 1.4).** First extraction mode: 11 of 20 sampled passages wrong; 4 of 5 column-spanning sentences broken. Fixed by `pdftotext -raw` plus hyphenation rejoin (O-7b): 8/8 of the previously failing sentences contiguous, 25 of 26 kit quotes found. Remaining limit: four pages with multi-column tables are uncitable (D-25).
2. **The gate was too coarse on the fused score (D-17a).** RRF scores take about two values, so a threshold on them refused 6 of 15 M/V/P questions including the private GP-02 and GP-05 while catching 4 of 4 U. θ moved to the top dense cosine, 0.559, then to 0.52 (D-46) after the full-set run showed 0.559 refused answerable questions: at 0.559 dense+Sonnet answers 13 of 22 A+M; with the gate off, 19.
3. **A frozen control fixture was wrong, and the judge found it (D-33).** The first judge-gate run condemned control CTL-03: the composer's sentence dropped "qualified wages for" from the quote's scope. `verifyCitations` passed it because the quote was verbatim. Scope drift inside a verbatim quote is invisible to the code check; this is the case the judge is for. Fixed in 13 fixture occurrences, with the first attempt kept in the results file.
4. **Judge format failures (D-38).** Sonnet as judge returned unusable output on about 7 of 20 sentences (fenced JSON, prose, malformed JSON); Opus 0 of 55. Fence stripping added for the judge only. Opus stays the judge.
5. **Haiku fails the answer schema (D-44, D-47).** 10 of 41 (hybrid) and 6 of 41 (dense) answers were `schema_invalid` and surfaced as refusals, so Haiku's refusal rate on A/M reads as caution when it is format failure. The scorecard splits refusals by cause for this reason. Haiku is not a product answer model.
6. **A script bypassed the retriever's predicate (D-34).** The judge-gate script read the chunk table directly; the tier-filter lint failed it. Fix: `chunksById` under the same predicate, and the lint now expects 3 SELECTs.
7. **`kappa.ts` threw on a sheet with no judge rows** (guard sat after `cohenKappa`, which throws at n = 0). Guard moved first.

## Hardest bug: the judge says "supported" and the human says no

Not a crash; a measurement that would not settle. The planted-fabrication gate passed (25/25, 0/6 controls). That says the judge catches errors it was told to look for. D-32 tested the worry by running the gate a second time with the error list removed from the rubric: also 25/25, gap 0.

Then κ against hand grades:

| Sheet | n | Raw agreement | κ |
|---|---|---|---|
| 1, enriched, Claude-assisted grades (D-39) | 20 | 90% | 0.44 |
| 2, unassisted, all 20 judge-`supported` (D-41) | 20 | 75% | 0.00 (by construction) |
| Pooled | 40 | 83% | 0.17 |

Sheet 2's κ is zero because the judge used one label, so κ carries no information there. What does: Shane would not support 5 of the 20 sentences the judge passed (2 unsupported, 3 partial). Both checks cannot be right about the judge: it caught every planted error and passed 5 of 20 real sentences a human rejected. Planted errors are changed numbers and inverted conditions; the misses on real answers are scope and condition drift, the kind of thing in defect 3.

What I did not do: tune the prompt until κ cleared 0.7 on the same 40 sentences, or revise the human grades toward the judge (S-14 stands). D-41 corrected an earlier overstatement that 0.7 was a gate; the rule requires the gate and κ *reported*. The result is that every support figure carries "JUDGE UNCALIBRATED, κ 0.17 n 40", and D-43 stopped judging the other five cells. Restore trigger: judge every cell once a revised judge reaches κ ≥ 0.7 on an unseen sheet.

## What this does not show

- Expected-passage and answered rates miss their targets in every cell. No cell is shown to meet the product bar.
- n is small: 41 questions, 8 U, 3 P. One question is 4.5 points of A+M and 12.5 points of U.
- Sentence support is one run and an uncalibrated judge.
- Edition labeling and verbatim citation are true by construction; they test the code, not the model.
- Hand grades on sheet 1 were Claude-drafted and human-approved (D-39); sheet 2 is unassisted but has no negatives to find disagreement among except judge misses.
- One synthetic org: 30 synthetic private documents plus 10 injection fixtures, of which the private slice (P) asks about 3. One corpus snapshot. Not deployed.
