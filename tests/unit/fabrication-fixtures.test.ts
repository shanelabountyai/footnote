// Task 3.2 acceptance: the frozen planted-fabrication set (D-29, D-31) is well formed. The gate run (3.3) loads each
// chunk from the database by id; here every quote is checked against its extracted page, which the chunk is cut from.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { normalizeQuote } from '@/lib/answer/verify';

type Cit = { chunkId: string; docId: string; page: number; quote: string };
type Fixture = {
  id: string; kind: string; sourceAnswer: string; plantedIndex: number | null; original: string | null;
  signature: string | null; change: string | null; sentences: { text: string; citations: Cit[] }[];
};
const KINDS = ['changed_number', 'changed_year', 'inverted_condition', 'invented_exception', 'wrong_edition'];
const { fixtures } = JSON.parse(readFileSync('eval/fixtures/fabrication.json', 'utf8')) as { fixtures: Fixture[] };
const planted = fixtures.filter((f) => f.kind !== 'control');
const controls = fixtures.filter((f) => f.kind === 'control');
const page = (c: Cit) => normalizeQuote(readFileSync(`corpus/text/${c.docId}/${String(c.page).padStart(3, '0')}.txt`, 'utf8'));
const lc = (s: string) => normalizeQuote(s).toLowerCase();

describe('eval/fixtures/fabrication.json (task 3.2)', () => {
  it('has ≥ 20 planted fixtures, ≥ 4 of each kind, ≥ 5 controls and unique ids', () => {
    expect(planted.length).toBeGreaterThanOrEqual(20);
    for (const k of KINDS) expect(planted.filter((f) => f.kind === k).length, k).toBeGreaterThanOrEqual(4);
    expect(controls.length).toBeGreaterThanOrEqual(5);
    expect(new Set(fixtures.map((f) => f.id)).size).toBe(fixtures.length);
    expect(fixtures.every((f) => [...KINDS, 'control'].includes(f.kind))).toBe(true);
  });

  it('every quote is verbatim on its page and its chunkId names that page', () => {
    for (const f of fixtures) for (const s of f.sentences) {
      expect(s.citations.length, `${f.id}: ${s.text}`).toBeGreaterThan(0);
      for (const c of s.citations) {
        expect(c.chunkId, f.id).toMatch(new RegExp(`^${c.docId}:${c.page}:\\d+$`));
        expect(page(c), `${f.id} ${c.chunkId}`).toContain(normalizeQuote(c.quote));
      }
    }
  });

  it('a planted fixture alters exactly one sentence, and its signature marks the plant', () => {
    for (const f of planted) {
      const s = f.sentences[f.plantedIndex!]!;
      expect(s, f.id).toBeDefined();
      expect(f.signature && f.original && f.change, f.id).toBeTruthy();
      const control = controls.find((c) => c.sourceAnswer === f.sourceAnswer)!;
      expect(control, `${f.id}: no control for ${f.sourceAnswer}`).toBeDefined();
      expect(f.sentences.length, f.id).toBe(control.sentences.length);
      const orig = control.sentences[f.plantedIndex!]!;
      f.sentences.forEach((x, i) => {
        if (i !== f.plantedIndex) expect(x, `${f.id} sentence ${i}`).toEqual(control.sentences[i]);
      });
      expect(orig.text, f.id).toBe(f.original);
      expect(s, f.id).not.toEqual(orig);
      if (f.kind === 'wrong_edition') {
        expect(s.citations.map((c) => c.docId), f.id).toContain(f.signature);
        expect(orig.citations.map((c) => c.docId), f.id).not.toContain(f.signature);
      } else {
        expect(lc(s.text), f.id).toContain(lc(f.signature!));
        expect(lc(f.original!), f.id).not.toContain(lc(f.signature!));
        for (const c of s.citations) expect(lc(c.quote), f.id).not.toContain(lc(f.signature!));
      }
    }
  });
});
