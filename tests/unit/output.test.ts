import { describe, expect, it } from 'vitest';
import { parseAnswerOutput } from '@/lib/answer/output';

const valid = {
  sentences: [{ sentence: 'Monthly depositors deposit by the 15th.', chunkIds: ['p15-2026#9#0'], quotes: ['Deposit by the 15th.'] }],
};
const invalid = (raw: string) => {
  const r = parseAnswerOutput(raw);
  expect(r).toMatchObject({ ok: false, refusal: 'INSUFFICIENT_SUPPORT', outcome: 'schema_invalid' });
  return r.ok ? '' : r.reason;
};

describe('parseAnswerOutput (task 2.2)', () => {
  it('accepts valid output, with and without outOfScope', () => {
    expect(parseAnswerOutput(JSON.stringify(valid))).toEqual({ ok: true, output: valid });
    const withFlag = { ...valid, outOfScope: true };
    expect(parseAnswerOutput(JSON.stringify(withFlag))).toEqual({ ok: true, output: withFlag });
  });

  it('accepts an empty sentences array (the model declining is not a schema failure)', () => {
    expect(parseAnswerOutput('{"sentences": []}')).toEqual({ ok: true, output: { sentences: [] } });
  });

  it('rejects missing fields', () => {
    expect(invalid('{}')).toMatch(/sentences/);
    expect(invalid(JSON.stringify({ sentences: [{ sentence: 'x', chunkIds: ['a'] }] }))).toMatch(/quotes/);
    expect(invalid(JSON.stringify({ sentences: [{ sentence: 'x', chunkIds: [], quotes: [] }] }))).toMatch(/chunkIds/);
    expect(invalid(JSON.stringify({ sentences: [{ sentence: '  ', chunkIds: ['a'], quotes: ['q'] }] }))).toMatch(/sentence/);
  });

  it('rejects prose or a code fence around the JSON', () => {
    invalid(`Here is the answer:\n${JSON.stringify(valid)}`);
    invalid(`${JSON.stringify(valid)}\nHope that helps.`);
    invalid('```json\n' + JSON.stringify(valid) + '\n```');
    invalid('');
  });

  it('rejects extra keys and unpaired chunkIds/quotes', () => {
    expect(invalid(JSON.stringify({ ...valid, page: 9 }))).toMatch(/page/);
    expect(invalid(JSON.stringify({ sentences: [{ ...valid.sentences[0], page: 9 }] }))).toMatch(/page/);
    expect(invalid(JSON.stringify({ sentences: [{ sentence: 'x', chunkIds: ['a', 'b'], quotes: ['q'] }] }))).toMatch(/pair/);
  });
});
