import type { Citation } from '@/lib/answer/verify';
import type { RetrievedChunk } from '@/lib/retrieval/retriever';

export const CHUNK: RetrievedChunk = {
  chunkId: 'p15-2026:9:0', docId: 'p15-2026', tier: 'public', page: 9, heading: 'Monthly Deposit Schedule', isTable: false, score: 0.6,
  text: 'Under the monthly deposit schedule, deposit employment taxes on payments made during a month by the 15th day of the following month.',
};
export const QUOTE = 'deposit employment taxes on payments made during a month by the 15th day of the following month';
export const CITATION: Citation = {
  id: 'c1', docId: 'p15-2026', title: 'Publication 15', edition: 'For use in 2026', revisionDate: '2025-12-10', supersededBy: null,
  location: { page: 9, section: 'Monthly Deposit Schedule' }, chunkId: CHUNK.chunkId, quote: QUOTE, score: 0.6, tier: 'public',
};
export const SENTENCE = 'Under the 2026 Publication 15, monthly depositors deposit by the 15th day of the following month.';
