-- D-55: footnote keeps its own service key and removes the template apikeys module. The module's tables stay in the
-- migration history (README "Removing a module"), and 20261108000001_apikeys_init creates "ApiKey", so footnote's
-- table moves out of the way first. Rows, the D-48 CHECK and the keyHash uniqueness carry over.
ALTER TABLE "ApiKey" RENAME TO "FootnoteApiKey";
ALTER TABLE "FootnoteApiKey" RENAME CONSTRAINT "ApiKey_pkey" TO "FootnoteApiKey_pkey";
ALTER INDEX "ApiKey_keyHash_key" RENAME TO "FootnoteApiKey_keyHash_key";
