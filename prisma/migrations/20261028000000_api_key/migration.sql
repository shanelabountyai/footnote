-- CreateTable
CREATE TABLE "ApiKey" (
    "id" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "orgId" UUID NOT NULL,
    "label" TEXT NOT NULL,
    "keyHash" TEXT NOT NULL,
    "role" "FootnoteRole" NOT NULL DEFAULT 'service',
    "revokedAt" TIMESTAMPTZ(6),

    CONSTRAINT "ApiKey_pkey" PRIMARY KEY ("id"),
    -- D-48: a key is the service role and nothing else.
    CONSTRAINT "ApiKey_role_service" CHECK ("role" = 'service')
);

-- CreateIndex
CREATE UNIQUE INDEX "ApiKey_keyHash_key" ON "ApiKey"("keyHash");
