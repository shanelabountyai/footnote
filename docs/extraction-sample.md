# Extraction sample — task 1.4 (2026-10-19)

Twenty passages compared by eye against the rendered PDF page (`pdftoppm -r 70`), judged OK / WRONG / GARBLED. Required mix met: 9 inside tables, 5 sentences spanning the two columns, 3 from "What's New", 3 prose, across 10 of the 11 documents. The first pass was scored by a Sonnet subagent on the reading-order extraction; after the switch to `-raw` (O-7b) the 11 WRONG rows were re-scored against the committed `corpus/text` by direct text inspection (the subagent's re-score re-read stale files and was discarded).

## Result on the committed extraction (`pdftotext -raw`, dehyphenated — O-7b)

**16 OK, 4 WRONG, 0 GARBLED of 20. The gate is ≤ 2 wrong, so it is not met.** All four failures are multi-column tables; no column-spanning sentence, What's New item or prose passage fails.

| # | docId | page | kind | passage starts | verdict | reason |
|---|---|---|---|---|---|---|
| 1 | p583-2024 | 15 | table | Table 3. Period of Limitations, row 1 | OK | label and value on one line ("6. File a claim … 7 years"); this is the GA-03 fixture |
| 2 | p583-2024 | 15 | table | General Journal (Date / Description / Debit / Credit) | **WRONG** | "Rent expense 780.00" and "Cash 780.00" carry no column position, so debit and credit cannot be told apart |
| 3 | p15-2026 | 33 | table | Table 2. Semiweekly Deposit Schedule | OK | rows intact (label, then value) |
| 4 | p463-2025 | 28 | table | depreciation limits "2019 14,900¹ …" | **WRONG** | footnote superscripts fuse into the number: "14,9001", "$20,2001" |
| 5 | p946-2025 | 2 | table | "For information on depreciating: See Publication" | OK | label and value paired |
| 6 | p587-2025 | 6 | table | Table 1. Types of Expenses, "Indirect" | **WRONG** | the three-column table's cells are emitted in column order, so a row cannot be rebuilt |
| 7 | p15b-2026 | 6 | table | Table 2-1, "Accident and health benefits" | **WRONG** | four-column table: "Exempt Exempt2 4 6" — cells scrambled with footnote markers |
| 8 | p334-2024 | 12 | table | Table 1-3. Going Out of Business Checklists | OK | row labels stay with entries; checkbox glyphs dropped |
| 9 | p463-2024 | 12 | table | per diem "2024 Dates … January 1 – March 31 $564 $1,128" | OK | header lines directly precede the rows in `-raw` (they were displaced in reading-order mode) |
| 10 | p15-2026 | 2 | column-span | "updated Form W-4, Employee's / Withholding Certificate" | OK | continuous |
| 11 | p946-2025 | 2 | column-span | "property placed in / service before 1987" | OK | lines 36–37, continuous (split in reading-order mode) |
| 12 | p538-2022 | 6 | column-span | "section 444 / election only if the deferral period" | OK | continuous (split in reading-order mode) |
| 13 | p334-2024 | 12 | column-span | "false or fraudulent Form / 8300, or structuring" | OK | continuous (split in reading-order mode) |
| 14 | p463-2024 | 12 | column-span | "You and your family / take one of the trips" | OK | lines 43–44, continuous (split in reading-order mode) |
| 15 | p946-2025 | 2 | whats-new | "Section 179 deduction dollar limits. For tax years beginning in 2026" | OK | numbers match the page |
| 16 | p463-2025 | 2 | whats-new | "Section 179 deduction. For tax years beginning in 2025" | OK | |
| 17 | p15b-2026 | 2 | whats-new | "Dependent care assistance exclusion from wages" | OK | hyphenated words rejoined |
| 18 | p15-2025 | 12 | prose | "Always be sure the EIN on the form you file exactly matches" | OK | the CAUTION icon label now sits on its own line after the paragraph (it was inside the sentence in reading-order mode) |
| 19 | p463-2025 | 2 | prose | "There is no amount shown with a code L in box 12 of / your Form W-2" | OK | lines 61–62, continuous |
| 20 | p587-2025 | 6 | prose | "Part-year use. You cannot deduct expenses for the business use" | OK | |

For comparison, the same 20 on the reading-order mode (first pass, by eye): 9 OK, 11 WRONG — the extra seven failures were the four column spans (#11–14), the icon insertion (#18), the displaced Introduction (#19) and the per diem header (#9). `-layout` was not sampled by eye; on the 26 kit quotes it scored 14 of 26 against 25 of 26 for `-raw` + dehyphenation.

## What this means

- **Prose, What's New, bullets and two-column tables (label + value) extract well enough to quote**: 16 of 16 non-complex passages, 27 of 28 kit quotes found at the expected page ± 1.
- **Tables with three or more columns, and numeric tables with footnote superscripts, are not citable from `pdftotext` output in any mode.** The chunker must not let a citation span such a table, and the golden set should not expect one (it does not: its only table fixture, GA-03 / Pub 583 Table 3, is row 1 above).
- Remaining artifacts, not counted as wrong: icon labels (`CAUTION`, `!`, `TIP`) on their own lines; checkbox glyphs dropped; a stray blank line at some column joins; a true compound broken at a line end is glued ("self-employed" → "selfemployed") because dehyphenation has no dictionary (O-7b ceiling).

## Decision needed (O-11, `docs/decisions.md`)

The gate says stop and propose. Options: (a) accept the table limit for v1 — mark table regions in the chunker, never cite across them, keep simple two-column tables citable, list the four table pages above as known-uncitable; (b) add `pymupdf` as a table-only extraction path (`page.find_tables()`), a dependency, re-score these 4 rows before adopting it. Default in force until Shane decides: (a).
