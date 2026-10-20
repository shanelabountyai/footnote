-- CreateEnum
CREATE TYPE "FootnoteRole" AS ENUM ('front_desk', 'bookkeeper', 'partner', 'service');

-- CreateEnum
CREATE TYPE "AnswerStatus" AS ENUM ('answered', 'partial', 'refused');

-- CreateTable
CREATE TABLE "StaffRole" (
    "orgId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "role" "FootnoteRole" NOT NULL,

    CONSTRAINT "StaffRole_pkey" PRIMARY KEY ("orgId","userId")
);

-- CreateTable
CREATE TABLE "Answer" (
    "id" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "orgId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "question" TEXT NOT NULL,
    "callerRole" "FootnoteRole" NOT NULL,
    "snapshot" TEXT NOT NULL,
    "retriever" TEXT NOT NULL,
    "model" TEXT,
    "thetaScore" DOUBLE PRECISION,
    "theta" DOUBLE PRECISION NOT NULL,
    "status" "AnswerStatus" NOT NULL,
    "refusalCode" TEXT,
    "sentences" JSONB NOT NULL,
    "citations" JSONB NOT NULL,
    "droppedSentences" INTEGER NOT NULL,

    CONSTRAINT "Answer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Answer_orgId_createdAt_idx" ON "Answer"("orgId", "createdAt");
