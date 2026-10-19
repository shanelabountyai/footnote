// Chunker acceptance (Phase 1 task 1.6, D-10, D-25): deterministic ids and texts; every chunk is a
// whitespace-normalized substring of its page (the precondition verifyCitations() relies on); Pub 583 Table 3
// rows each sit in one chunk with the caption; a memo without a tier fails closed; counts printed for NEXT.md.
import { describe, expect, it } from 'vitest';
import { chunkCorpus, loadCorpus, parseMemo, TARGET_WORDS, type Chunk } from '@/lib/corpus/chunk';

const norm = (s: string) => s.replace(/\s+/g, ' ').trim();
const words = (s: string) => norm(s).split(' ').length;
const pages = loadCorpus();
const chunks = chunkCorpus(pages);
const pageText = new Map(pages.map((p) => [`${p.docId}:${p.page}`, norm(p.text)]));

describe('chunker (1.6, D-10)', () => {
  it('is deterministic: the same input yields identical ids and texts', () => {
    expect(chunkCorpus(loadCorpus())).toEqual(chunks);
  });

  it('ids are unique and follow <docId>:<page>:<ordinal>', () => {
    expect(new Set(chunks.map((c) => c.id)).size).toBe(chunks.length);
    for (const c of chunks) expect(c.id).toBe(`${c.docId}:${c.page}:${c.ordinal}`);
  });

  it('every chunk (per row for a repeated-caption table chunk) is a whitespace-normalized substring of its page', () => {
    for (const c of chunks) {
      const page = pageText.get(`${c.docId}:${c.page}`)!;
      for (const part of c.isTable ? c.text.split('\n') : [c.text]) expect(page, c.id).toContain(norm(part));
    }
  });

  it('Pub 583 Table 3: each row sits in one chunk with the caption (the GA-03 fixture)', () => {
    const rows = ['1. Owe additional tax', '2. Do not report income', '3. File a fraudulent return', '4. Do not file a return', '5. File a claim for credit or refund', '6. File a claim for a loss from worthless securities'];
    for (const row of rows) {
      const hits = chunks.filter((c) => c.docId === 'p583-2024' && c.page === 15 && c.text.includes(row));
      expect(hits, row).toHaveLength(1);
      expect(hits[0]!.isTable).toBe(true);
      expect(hits[0]!.text).toContain('Table 3. Period of Limitations');
    }
  });

  it('private memos carry their tier; a memo without one fails closed (D-11)', () => {
    const tiers = new Set(chunks.filter((c) => c.docId.startsWith('ll-')).map((c) => c.tier));
    expect([...tiers].sort()).toEqual(['engagement', 'partner', 'staff']);
    expect(chunks.filter((c) => !c.docId.startsWith('ll-')).every((c) => c.tier === 'public')).toBe(true);
    expect(() => parseMemo('---\ndocId: x\ntitle: t\n---\nbody')).toThrow(/tier/);
    expect(() => parseMemo('---\ndocId: x\ntier: admin\n---\nbody')).toThrow(/tier 'admin'/);
  });

  it('prose chunks stay near the budget; only a single oversize unit exceeds it', () => {
    const prose = chunks.filter((c) => !c.isTable);
    const over = prose.filter((c) => words(c.text) > TARGET_WORDS * 1.5);
    expect(over.length / prose.length).toBeLessThan(0.02);
  });

  it('prints chunk counts per document (recorded in NEXT.md)', () => {
    const byDoc = new Map<string, Chunk[]>();
    for (const c of chunks) byDoc.set(c.docId, [...(byDoc.get(c.docId) ?? []), c]);
    const rows = [...byDoc].filter(([d]) => !d.startsWith('ll-')).map(([docId, cs]) => {
      const w = cs.map((c) => words(c.text)).sort((a, b) => a - b);
      return { docId, pages: new Set(cs.map((c) => c.page)).size, chunks: cs.length, table: cs.filter((c) => c.isTable).length, medianWords: w[w.length >> 1], maxWords: w[w.length - 1] };
    });
    const memos = chunks.filter((c) => c.docId.startsWith('ll-'));
    rows.push({ docId: 'private memos (40)', pages: new Set(memos.map((c) => c.docId)).size, chunks: memos.length, table: 0, medianWords: 0, maxWords: 0 });
    console.table(rows);
    console.log(`total chunks: ${chunks.length}`);
    expect(chunks.length).toBeGreaterThan(1000);
  });
});
