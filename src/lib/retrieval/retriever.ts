// The only entry to chunk retrieval (D-12, non-negotiable 3). Every retriever filters by the caller's org and the
// tiers their role allows INSIDE the query, before ranking; nothing else hands chunks to the model.
import { db } from '@/core/db';
import type { Tier } from '@/lib/corpus/chunk';
import { toVector } from './indexer';
import { EMBED_MODEL, type Embedder, voyageEmbed } from './voyage';

export type FootnoteRole = 'front_desk' | 'bookkeeper' | 'partner' | 'service';
/** Role comes from the session or API key, never the request body (D-12). */
export type Caller = { orgId: string; role: FootnoteRole };

const TIERS_BY_ROLE: Record<FootnoteRole, Tier[]> = {
  front_desk: ['public', 'staff'],
  bookkeeper: ['public', 'staff', 'engagement'],
  partner: ['public', 'staff', 'engagement', 'partner'],
  service: ['public'],
};
export const tiersFor = (role: FootnoteRole): Tier[] => TIERS_BY_ROLE[role];

export type RetrievedChunk = {
  chunkId: string; docId: string; tier: Tier; page: number; heading: string | null; isTable: boolean; text: string;
  /** Retriever-specific: ts_rank_cd, cosine similarity, or RRF score. Comparable within one retriever only. */
  score: number;
};

export type RetrieverName = 'fts' | 'dense' | 'hybrid';
export interface Retriever {
  readonly name: RetrieverName;
  search(caller: Caller, query: string, k: number): Promise<RetrievedChunk[]>;
}

const COLS = 'c."chunkId", c."docId", c.tier::text AS tier, c.page, c.heading, c."isTable", c.text';

export function ftsRetriever(snapshot: string): Retriever {
  return {
    name: 'fts',
    search: (caller, query, k) => db.$queryRawUnsafe<RetrievedChunk[]>(
      `SELECT ${COLS}, ts_rank_cd(c.tsv, q)::float8 AS score
       FROM "CorpusChunk" c, websearch_to_tsquery('english', $1) q
       WHERE c.snapshot = $2 AND c."orgId" = $3::uuid AND c.tier::text = ANY($4::text[]) AND c.tsv @@ q
       ORDER BY score DESC, c."chunkId" LIMIT $5`,
      query, snapshot, caller.orgId, tiersFor(caller.role), k),
  };
}

/** Exact cosine scan, no ANN index (D-16), so the tier filter never costs recall. */
export function denseRetriever(snapshot: string, opts: { embed?: Embedder; model?: string; runId?: string | null } = {}): Retriever {
  const { embed = voyageEmbed, model = EMBED_MODEL, runId = null } = opts;
  return {
    name: 'dense',
    async search(caller, query, k) {
      const [v] = await embed([query], 'query', { runId });
      return db.$queryRawUnsafe<RetrievedChunk[]>(
        `SELECT ${COLS}, (1 - (e.embedding <=> $1::vector))::float8 AS score
         FROM "CorpusChunk" c JOIN "ChunkEmbedding" e ON e."chunkPk" = c.id AND e.model = $2
         WHERE c.snapshot = $3 AND c."orgId" = $4::uuid AND c.tier::text = ANY($5::text[])
         ORDER BY e.embedding <=> $1::vector, c."chunkId" LIMIT $6`,
        toVector(v!), model, snapshot, caller.orgId, tiersFor(caller.role), k);
    },
  };
}

export const RRF_K = 60; // O-8
/** Reciprocal rank fusion: score = Σ 1 / (RRF_K + rank), rank 1-based; ties broken by chunkId for a stable order. */
export function rrf(lists: RetrievedChunk[][], k: number): RetrievedChunk[] {
  const fused = new Map<string, RetrievedChunk>();
  for (const list of lists) {
    list.forEach((c, i) => {
      const prev = fused.get(c.chunkId);
      fused.set(c.chunkId, { ...c, score: (prev?.score ?? 0) + 1 / (RRF_K + i + 1) });
    });
  }
  return [...fused.values()].sort((a, b) => b.score - a.score || a.chunkId.localeCompare(b.chunkId)).slice(0, k);
}

/** Both inputs are already tier-filtered, so fusion cannot reintroduce a forbidden chunk. */
export function hybridRetriever(fts: Retriever, dense: Retriever, depth = 50): Retriever {
  return {
    name: 'hybrid',
    async search(caller, query, k) {
      const n = Math.max(k, depth);
      return rrf(await Promise.all([fts.search(caller, query, n), dense.search(caller, query, n)]), k);
    },
  };
}
