# Hand answers (task 1.9)

Shane's answers to the ten worked examples (brief §5.2), from the PDFs alone. They are the κ anchor for Phase 3 and the page check for task 2.10. Drafted by a subagent reading the PDFs only (blind to the golden set), 2026-10-20; Shane to confirm each line.

**Rules:** look at the PDF only, not `eval/golden.json`, the chunks or the app. Page is the PDF page number shown in the viewer (page 1 is the cover). Copy the quote exactly as printed. If your page or quote differs from the golden set, yours wins, and the change goes in `docs/decisions.md` §Golden-set changes. Where a question needs two documents (say, two editions), add a second `- doc:` block. For GU-01, write `refuse` as the answer and leave doc, page and quote empty.

PDFs are in `corpus/raw/` (gitignored). To open one: `open corpus/raw/p463-2025.pdf`.

Corpus: p15-2025, p15-2026, p15b-2026, p334-2024, p334-2025, p463-2024, p463-2025, p538-2022, p583-2024, p587-2025, p946-2025.

## GA-01 (front_desk)

> What is the standard mileage rate for business use of a car for 2025?

- doc: p463-2025
  page: 20
  quote: "For 2025, the standard mileage rate for the cost of operating your car for business use is 70 cents ($0.70) per mile."
- answer: 70 cents ($0.70) per mile for 2025.

## GV-01 (bookkeeper)

> What was the standard mileage rate for 2024?

- doc: p463-2024
  page: 21
  quote: "For 2024, the standard mileage rate for the cost of operating your car for business use is 67 cents ($0.67) per mile."
- answer: 67 cents ($0.67) per mile for 2024.

*Also stated on p463-2024 p. 2 (What's New).*

## GA-02 (front_desk)

> What is the social security wage base limit for 2026?

- doc: p15-2026
  page: 29
  quote: "The social security wage base limit is $184,500."
- answer: $184,500 for 2026.

*Also stated on p15-2026 p. 2 (What's New).*

## GV-02 (partner)

> What was the social security wage base for 2025?

- doc: p15-2025
  page: 28
  quote: "The social security wage base limit is $176,100."
- answer: $176,100 for 2025.

*Also stated on p15-2025 p. 2 (What's New).*

## GM-01 (front_desk)

> How long do I have to keep employment tax records?

- doc: p15-2026
  page: 9
  quote: "Keep all records of employment taxes for at least 4 years."
- doc: p15-2025
  page: 8
  quote: "Keep all records of employment taxes for at least 4 years."
- doc: p583-2024
  page: 16
  quote: "If you have employees, you must keep all employment tax records for at least 4 years after the date the tax becomes due or is paid, whichever is later."
- answer: At least 4 years (Pub 583 adds: after the date the tax becomes due or is paid, whichever is later).

## GA-03 (bookkeeper)

> If I don't file a return, how long should I keep records for that year?

- doc: p583-2024
  page: 15
  quote: "4. Do not file a return Not limited"
- answer: Without a return filed, the period of limitations is not limited, so keep records indefinitely (Pub 583 Table 3).

## GA-04 (front_desk)

> What is the rate per square foot under the simplified method for the home office deduction, and the maximum area?

- doc: p587-2025
  page: 10
  quote: "In most cases, you will figure your deduction by multiplying $5, the prescribed rate, by the area of your home used for a qualified business use."
- doc: p587-2025
  page: 10
  quote: "The area you use to figure your deduction is limited to 300 square feet."
- answer: $5 per square foot, on a maximum of 300 square feet.

## GM-02 (bookkeeper)

> What is the gross-receipts threshold to qualify as a small business taxpayer for the cash method?

- doc: p334-2025
  page: 16
  quote: "You qualify as a small business taxpayer if you (a) have average annual gross receipts of $31 million or less for the 3 prior tax years (indexed for inflation), and (b) are not a tax shelter (as defined in section 448(d)(3))."
- doc: p538-2022
  page: 9
  quote: "A corporation or a partnership meets the test if its average annual gross receipts for the 3 prior tax years were $26 million or less (indexed for inflation)."
- answer: $31 million average annual gross receipts over the 3 prior tax years per Pub 334 (2025); $26 million per Pub 538 (January 2022).

*Also set the Pub 538 wording here: the golden fragment "…were $26 million or less." is UNVERIFIED (it also blocks GV-06). Quote the sentence exactly as the page prints it.*

## GA-05 (service)

> Can I depreciate the cost of land?

- doc: p946-2025
  page: 5
  quote: "You cannot depreciate the cost of land because land does not wear out, become obsolete, or get used up."
- doc: p334-2025
  page: 36
  quote: "You can never depreciate the cost of land because land does not wear out, become obsolete, or get used up."
- answer: No, land cannot be depreciated.

## GU-01 (front_desk)

> What is the Oklahoma state sales tax rate?

- answer: refuse
