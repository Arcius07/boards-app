-- AlterTable
ALTER TABLE "Card" ADD COLUMN     "completedAt" TIMESTAMP(3);
UPDATE "Card" SET "completedAt" = NOW()
WHERE "listId" IN (SELECT id FROM "List" WHERE name = 'Done');