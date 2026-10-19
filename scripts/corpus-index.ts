// `npm run corpus:index -- --retriever=<fts|dense|hybrid>` (task 1.7). Runs after corpus:check (package.json), so the
// snapshot id hashed here matches the files. fts writes chunk rows; dense also embeds; hybrid needs both.
import { randomUUID } from 'node:crypto';
import { db } from '@/core/db';
import { chunkCorpus, loadCorpus } from '@/lib/corpus/chunk';
import { indexChunks, indexEmbeddings } from '@/lib/retrieval/indexer';
import { snapshotId } from '@/lib/retrieval/snapshot';
import { EMBED_MODEL, voyageEmbed } from '@/lib/retrieval/voyage';

/** The fictional firm every chunk belongs to in v1 (D-3, brief §3). */
const CORPUS_ORG = { slug: 'ledger-lane', name: 'Ledger & Lane Bookkeeping' };

const retriever = /--retriever=(\w+)/.exec(process.argv.join(' '))?.[1];
if (!retriever || !['fts', 'dense', 'hybrid'].includes(retriever)) {
  console.error('usage: npm run corpus:index -- --retriever=<fts|dense|hybrid>');
  process.exit(2);
}
const snapshot = snapshotId();
const org = await db.org.upsert({ where: { slug: CORPUS_ORG.slug }, create: CORPUS_ORG, update: {} });
const chunks = chunkCorpus(loadCorpus());
const written = await indexChunks(snapshot, org.id, chunks);
console.log(`chunks: ${written} written, ${chunks.length - written} already indexed (snapshot ${snapshot.slice(0, 19)}…, org ${CORPUS_ORG.slug})`);
if (retriever !== 'fts') {
  const runId = `corpus:index:${randomUUID()}`;
  const n = await indexEmbeddings(snapshot, org.id, EMBED_MODEL, voyageEmbed, runId, 32); // 32 ≈ 6K tokens, fits a 10K TPM cap per request
  console.log(`embeddings (${EMBED_MODEL}): ${n} written — run ${runId}`);
}
await db.$disconnect();
