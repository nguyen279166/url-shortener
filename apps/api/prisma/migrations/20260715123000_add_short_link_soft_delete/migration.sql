-- AlterTable
ALTER TABLE "short_links" ADD COLUMN "deletedAt" TIMESTAMPTZ(3);

-- CreateIndex
CREATE INDEX "short_links_ownerId_deletedAt_createdAt_idx"
ON "short_links"("ownerId", "deletedAt", "createdAt");
