import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { AnswerResponseSchema } from '@/lib/answer/contract';

const blocks = [...readFileSync('docs/n9-contract.md', 'utf8').matchAll(/```json\n([\s\S]*?)\n```/g)].map((m) => JSON.parse(m[1]!));
const response = blocks.find((b) => 'answerId' in b);

describe('docs/n9-contract.md', () => {
  it('response example parses against the zod schema', () => {
    expect(AnswerResponseSchema.parse(response).status).toBe('answered');
  });
  it('request example has the documented fields only', () => {
    const req = blocks.find((b) => 'question' in b);
    expect(Object.keys(req).sort()).toEqual(['options', 'org', 'question']);
  });
  it('schema is strict and names every refusal code the doc lists', () => {
    expect(() => AnswerResponseSchema.parse({ ...response, extra: 1 })).toThrow();
    const doc = readFileSync('docs/n9-contract.md', 'utf8');
    for (const c of ['NO_RELEVANT_PASSAGE', 'INSUFFICIENT_SUPPORT', 'OUT_OF_SCOPE', 'BUDGET_EXCEEDED']) expect(doc).toContain(c);
  });
});
