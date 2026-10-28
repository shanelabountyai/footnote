# N9 contract — `POST /api/answers`

What a client (N9) can rely on. Not tax or legal advice: every response carries `disclaimer`. The JSON examples below are parsed against `src/lib/answer/contract.ts` by `tests/unit/n9-contract.test.ts`.

## Request

`POST /api/answers`, `Content-Type: application/json`.

```http
Authorization: Bearer <service key>
```

```json
{ "question": "When must a monthly depositor deposit employment taxes?", "org": "acme-cpa", "options": { "corpusSnapshot": "cd1252c6a407" } }
```

- `question`: 1–2000 characters. `org`: the org slug. `options.corpusSnapshot` is optional; if it differs from the server's snapshot the call is `409 { error, corpusSnapshot }` and nothing is answered.
- A `role` or `caller` field in the body is ignored. Role comes from the key (`service`) or the session, never the client (D-12).
- Create a key with `npm run apikey:create -- --org=<slug> --label=<text>`; it is printed once.

HTTP errors (JSON `{ error }`, no answer row): `400` bad body, `401` unknown, revoked or malformed key (checked before the body is read), `404` org not found for this key, `409` snapshot mismatch. Success is `201`.

## Response

```json
{
  "answerId": "6f1d2c1e-0000-4000-8000-000000000001",
  "status": "answered",
  "refusal": null,
  "sentences": [
    { "text": "Monthly depositors deposit by the 15th of the following month.", "citations": ["c1"], "superseded": null }
  ],
  "citations": [
    {
      "id": "c1", "docId": "p15", "title": "Publication 15 (Circular E)", "edition": "2026", "revisionDate": "2025-12-16",
      "supersededBy": null, "location": { "page": 9, "section": "Depositing Taxes" }, "chunkId": "p15-2026#9#0",
      "quote": "deposit by the 15th", "score": 0.61, "tier": "public"
    }
  ],
  "droppedSentences": 0,
  "corpusSnapshot": "cd1252c6a407",
  "retriever": "dense",
  "gate": { "score": 0.61, "theta": 0.52, "pass": true },
  "usage": { "model": "claude-sonnet-5-5", "inputTokens": 5200, "outputTokens": 180, "costUsd": 0.0183 },
  "disclaimer": "Footnote quotes IRS publications and firm documents. It does not give tax or legal advice."
}
```

(The values are illustrative; the shape is what the test checks.)

### The guarantee

Every entry in `sentences` has at least one id in `citations`, and each citation's `quote` was checked in code to be a whitespace-normalized substring of the stored chunk it names. `edition`, `revisionDate` and `location.page` come from the corpus manifest and the extraction, never from the model. A sentence with no verified citation is dropped and counted in `droppedSentences`, not returned. The guarantee is that the quote is in the document, not that the sentence is a correct reading of it.

If every cited document of a sentence is a superseded edition, `superseded` names the successor; show it.

### `status`

| status | meaning | client should |
|---|---|---|
| `answered` | no sentence dropped | show `sentences` with their citations |
| `partial` | at least one sentence dropped (`droppedSentences` > 0), at least one kept | show the kept sentences, and say the answer may be incomplete. Treating it as `answered` is the client's call (O-9); it is not a refusal |
| `refused` | `sentences` is empty, `refusal` is set | show `refusal.message`; do not retry the same question expecting a different result |

`refusal` is also non-null with `answered` or `partial` for `OUT_OF_SCOPE` only: the mechanics were answered, the recommendation part was not.

### Refusal codes

| code | meaning |
|---|---|
| `NO_RELEVANT_PASSAGE` | nothing retrieved cleared the relevance threshold θ; the model was not called |
| `INSUFFICIENT_SUPPORT` | the model was called but no sentence kept a verified citation (or its output was not valid) |
| `OUT_OF_SCOPE` | the question asks what to do, not what the documents say |
| `BUDGET_EXCEEDED` | the estimate went over a spend cap; the model was not called |

A miss caused by permissions returns the same code and message as a true miss. The response never says that hidden documents exist (D-13).

## The `service` scope

A key resolves to role `service`, which can retrieve the `public` tier only (IRS publications). The tier filter runs inside the retrieval query before ranking, so no private or firm document can reach the model or the response for a service caller. `citations[].tier` is always `public` for a service key.

## Caps

Spend is checked before the model call: $0.10 per answer, $25 for the whole build, $3 per eval run (D-18). Over a cap, the response is `refused / BUDGET_EXCEEDED`. `usage` is `null` whenever the model was not called (θ refusal, nothing retrieved, budget).

## Not promised

No streaming, no history, no per-request retriever or model choice. The default is dense retrieval with Sonnet and θ 0.52 (D-46); the measured quality of that default is in the scorecard, not here.
