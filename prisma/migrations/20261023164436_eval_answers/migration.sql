-- AlterTable
ALTER TABLE "Answer" ADD COLUMN     "goldenId" TEXT,
ADD COLUMN     "runId" TEXT,
ALTER COLUMN "userId" DROP NOT NULL;

-- CreateTable
CREATE TABLE "SentenceJudgment" (
    "id" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "runId" TEXT NOT NULL,
    "answerId" UUID NOT NULL,
    "sentenceIndex" INTEGER NOT NULL,
    "model" TEXT NOT NULL,
    "promptHash" TEXT NOT NULL,
    "outcome" "ModelCallOutcome" NOT NULL,
    "verdict" TEXT,
    "quoteIsRule" BOOLEAN,
    "editionStated" BOOLEAN,
    "reason" TEXT NOT NULL,

    CONSTRAINT "SentenceJudgment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SentenceJudgment_runId_idx" ON "SentenceJudgment"("runId");

-- CreateIndex
CREATE UNIQUE INDEX "SentenceJudgment_answerId_sentenceIndex_model_promptHash_key" ON "SentenceJudgment"("answerId", "sentenceIndex", "model", "promptHash");

-- CreateIndex
CREATE INDEX "Answer_runId_idx" ON "Answer"("runId");
