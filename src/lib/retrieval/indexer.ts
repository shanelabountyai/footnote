// corpus:index (task 1.7). Idempotent per (snapshot, org) for chunks and per (snapshot, org, model) for embeddings:
// a re-run finds every row present and writes 0.
import { db } from '@/core/db';
import type { Chunk } from '@/lib/corpus/chunk';
import type { Embedder } from './voyage';

/** Writes chunk rows (and their tsvector) that are not already indexed; returns the number written. */
export async function indexChunks(snapshot: string, orgId: string, chunks: Chunk[]): Promise<number> {
  const { count } = await db.corpusChunk.createMany({
    data: chunks.map((c) => ({ snapshot, orgId, chunkId: c.id, docId: c.docId, tier: c.tier, page: c.page, ordinal: c.ordinal, heading: c.heading, isTable: c.isTable, text: c.text })),
    skipDuplicates: true,
  });
  await db.$executeRaw`UPDATE "CorpusChunk" SET tsv = to_tsvector('english', text) WHERE snapshot = ${snapshot} AND "orgId" = ${orgId}::uuid AND tsv IS NULL`;
  return count;
}

/** Embeds chunks of this snapshot that have no embedding for `model` yet, in batches; returns the number written. */
export async function indexEmbeddings(snapshot: string, orgId: string, model: string, embed: Embedder, runId: string, batch = 128): Promise<number> {
  const todo = await db.$queryRaw<{ id: string; text: string }[]>`
    SELECT c.id, c.text FROM "CorpusChunk" c
    WHERE c.snapshot = ${snapshot} AND c."orgId" = ${orgId}::uuid
      AND NOT EXISTS (SELECT 1 FROM "ChunkEmbedding" e WHERE e."chunkPk" = c.id AND e.model = ${model})
    ORDER BY c."chunkId"`;
  let written = 0;
  for (let i = 0; i < todo.length; i += batch) {
    const rows = todo.slice(i, i + batch);
    const vecs = await embed(rows.map((r) => r.text), 'document', { runId });
    written += await db.$executeRaw`
      INSERT INTO "ChunkEmbedding" ("chunkPk", model, embedding)
      SELECT unnest(${rows.map((r) => r.id)}::uuid[]), ${model}, unnest(${vecs.map(toVector)}::text[])::vector
      ON CONFLICT DO NOTHING`;
  }
  return written;
}

export const toVector = (v: number[]) => `[${v.join(',')}]`;

// D-55: the per-org data export leaves the chunk tables out. They are re-derived from the source documents by
// `corpus:index`, and D-12 keeps every read of them in this file and retriever.ts, so export-hooks.ts takes this entry.
export const chunkExportSkipped: Readonly<Record<string, string>> = {
  CorpusChunk: 'derived from the source documents by corpus:index; D-12 confines chunk-table reads to the retriever and indexer',
};
