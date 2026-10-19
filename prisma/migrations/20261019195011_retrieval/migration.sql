-- CreateEnum
CREATE TYPE "ChunkTier" AS ENUM ('public', 'staff', 'engagement', 'partner');

-- CreateTable
CREATE TABLE "CorpusChunk" (
    "id" UUID NOT NULL,
    "snapshot" TEXT NOT NULL,
    "orgId" UUID NOT NULL,
    "chunkId" TEXT NOT NULL,
    "docId" TEXT NOT NULL,
    "tier" "ChunkTier" NOT NULL,
    "page" INTEGER NOT NULL,
    "ordinal" INTEGER NOT NULL,
    "heading" TEXT,
    "isTable" BOOLEAN NOT NULL,
    "text" TEXT NOT NULL,
    "tsv" tsvector,

    CONSTRAINT "CorpusChunk_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChunkEmbedding" (
    "chunkPk" UUID NOT NULL,
    "model" TEXT NOT NULL,
    "embedding" vector(1024) NOT NULL,

    CONSTRAINT "ChunkEmbedding_pkey" PRIMARY KEY ("chunkPk","model")
);

-- CreateIndex
CREATE INDEX "CorpusChunk_snapshot_orgId_tier_idx" ON "CorpusChunk"("snapshot", "orgId", "tier");

-- CreateIndex
CREATE INDEX "CorpusChunk_tsv_idx" ON "CorpusChunk" USING GIN ("tsv");

-- CreateIndex
CREATE UNIQUE INDEX "CorpusChunk_snapshot_orgId_chunkId_key" ON "CorpusChunk"("snapshot", "orgId", "chunkId");

-- AddForeignKey
ALTER TABLE "ChunkEmbedding" ADD CONSTRAINT "ChunkEmbedding_chunkPk_fkey" FOREIGN KEY ("chunkPk") REFERENCES "CorpusChunk"("id") ON DELETE CASCADE ON UPDATE CASCADE;
