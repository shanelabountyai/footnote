-- CreateEnum
CREATE TYPE "ModelPurpose" AS ENUM ('answer', 'judge', 'embed');

-- CreateEnum
CREATE TYPE "ModelCallOutcome" AS ENUM ('ok', 'budget_exceeded');

-- CreateTable
CREATE TABLE "ModelCall" (
    "id" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "purpose" "ModelPurpose" NOT NULL,
    "model" TEXT NOT NULL,
    "outcome" "ModelCallOutcome" NOT NULL DEFAULT 'ok',
    "inputTokens" INTEGER NOT NULL DEFAULT 0,
    "outputTokens" INTEGER NOT NULL DEFAULT 0,
    "costMicroUsd" INTEGER NOT NULL,
    "runId" TEXT,
    "answerId" TEXT,

    CONSTRAINT "ModelCall_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ModelCall_runId_idx" ON "ModelCall"("runId");

-- CreateIndex
CREATE INDEX "ModelCall_answerId_idx" ON "ModelCall"("answerId");

-- CreateIndex
CREATE INDEX "ModelCall_purpose_outcome_idx" ON "ModelCall"("purpose", "outcome");
