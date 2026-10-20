// Citation verifier (task 2.3, D-6/D-7/D-8). Pure: the model composes, this checks. Every quote must be a normalized
// substring of the stored text of a chunk retrieved for this call; edition, revision date, page and section come from
// the manifest and the chunk row, never from model output (the schema has no field for them, and extra keys fail 2.2).
import type { RetrievedChunk } from '@/lib/retrieval/retriever';
import type { AnswerOutput } from './output';

/** Per-document metadata from `corpus/manifest.json` (public) or the memo front matter (private); built by the composer. */
export type DocMeta = { title: string; edition: string; revisionDate: string };

export type Citation = {
  id: string; docId: string; title: string; edition: string; revisionDate: string;
  location: { page: number; section: string | null }; chunkId: string; quote: string; score: number; tier: RetrievedChunk['tier'];
};
export type VerifiedSentence = { text: string; citations: string[] };
export type Verified = {
  status: 'answered' | 'partial' | 'refused';
  refusal: { code: 'NO_RELEVANT_PASSAGE' | 'INSUFFICIENT_SUPPORT' | 'OUT_OF_SCOPE' } | null;
  sentences: VerifiedSentence[];
  citations: Citation[];
  droppedSentences: number;
};

/** D-6 normalization and nothing else: unify curly quotes and en/em dashes to ASCII, collapse whitespace. */
export function normalizeQuote(s: string): string {
  return s.replace(/[“”]/g, '"').replace(/[‘’]/g, "'").replace(/[–—]/g, '-').replace(/\s+/g, ' ').trim();
}

export function verifyCitations(output: AnswerOutput, retrieved: RetrievedChunk[], docs: Record<string, DocMeta>): Verified {
  const chunks = new Map(retrieved.map((c) => [c.chunkId, { chunk: c, norm: normalizeQuote(c.text) }]));
  const citations = new Map<string, Citation>(); // keyed chunkId + normalized quote, so a repeated quote is one citation
  const sentences: VerifiedSentence[] = [];
  let droppedSentences = 0;

  for (const s of output.sentences) {
    const ids = new Set<string>();
    s.chunkIds.forEach((chunkId, i) => {
      const hit = chunks.get(chunkId);
      const quote = normalizeQuote(s.quotes[i]!);
      const doc = hit && docs[hit.chunk.docId];
      if (!hit || !doc || !doc.edition || !doc.revisionDate || !quote || !hit.norm.includes(quote)) return;
      const key = `${chunkId}\u0000${quote}`;
      let c = citations.get(key);
      if (!c) {
        const { chunk } = hit;
        c = {
          id: `c${citations.size + 1}`, docId: chunk.docId, title: doc.title, edition: doc.edition, revisionDate: doc.revisionDate,
          location: { page: chunk.page, section: chunk.heading }, chunkId, quote: s.quotes[i]!.trim(), score: chunk.score, tier: chunk.tier,
        };
        citations.set(key, c);
      }
      ids.add(c.id);
    });
    if (ids.size) sentences.push({ text: s.sentence, citations: [...ids] });
    else droppedSentences++;
  }

  // Citations no surviving sentence points at cannot exist: each one is created by the sentence that keeps it.
  if (!sentences.length) return { status: 'refused', refusal: { code: 'INSUFFICIENT_SUPPORT' }, sentences, citations: [], droppedSentences };
  return {
    status: droppedSentences ? 'partial' : 'answered',
    refusal: output.outOfScope ? { code: 'OUT_OF_SCOPE' } : null, // D-8: the only code allowed beside answered/partial
    sentences, citations: [...citations.values()], droppedSentences,
  };
}
