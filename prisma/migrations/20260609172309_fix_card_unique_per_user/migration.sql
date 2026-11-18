/*
  Warnings:

  - A unique constraint covering the columns `[remoteId,userId]` on the table `cards` will be added. If there are existing duplicate values, this will fail.
  - Made the column `userId` on table `cards` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "cards" DROP CONSTRAINT "cards_userId_fkey";

-- DropIndex
DROP INDEX "cards_remoteId_key";

-- AlterTable
ALTER TABLE "cards" ALTER COLUMN "userId" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "cards_remoteId_userId_key" ON "cards"("remoteId", "userId");

-- AddForeignKey
ALTER TABLE "cards" ADD CONSTRAINT "cards_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
