// Answer output schema (task 2.2, D-6). The model must return exactly one JSON object and nothing else; anything
// that fails here is `refused / INSUFFICIENT_SUPPORT` and the call is logged `schema_invalid` by the composer.
// Never repaired, never retried silently. Quotes are checked against chunks later, by verifyCitations (2.3).
import { z } from 'zod';

const nonEmpty = z.string().trim().min(1);

/** `quotes[i]` is the verbatim quote from chunk `chunkIds[i]`, so the two arrays pair one to one. */
const SentenceSchema = z
  .strictObject({ sentence: nonEmpty, chunkIds: z.array(nonEmpty).min(1), quotes: z.array(nonEmpty).min(1) })
  .refine((s) => s.chunkIds.length === s.quotes.length, { message: 'chunkIds and quotes must pair one to one' });

/** An empty `sentences` array is valid: it is the model saying the chunks do not answer (verify turns it into a refusal). */
export const AnswerOutputSchema = z.strictObject({ sentences: z.array(SentenceSchema), outOfScope: z.boolean().optional() });
export type AnswerOutput = z.infer<typeof AnswerOutputSchema>;

export type ParsedOutput =
  | { ok: true; output: AnswerOutput }
  | { ok: false; refusal: 'INSUFFICIENT_SUPPORT'; outcome: 'schema_invalid'; reason: string };

/** Parses the model's raw text. Prose or a code fence around the JSON is invalid: strict JSON only. */
export function parseAnswerOutput(raw: string): ParsedOutput {
  const fail = (reason: string): ParsedOutput => ({ ok: false, refusal: 'INSUFFICIENT_SUPPORT', outcome: 'schema_invalid', reason });
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return fail('not a single JSON value');
  }
  const r = AnswerOutputSchema.safeParse(json);
  return r.success ? { ok: true, output: r.data } : fail(z.prettifyError(r.error));
}
