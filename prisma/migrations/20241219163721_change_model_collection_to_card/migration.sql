/*
  Warnings:

  - You are about to drop the `collection` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "collection" DROP CONSTRAINT "collection_userId_fkey";

-- DropTable
DROP TABLE "collection";

-- CreateTable
CREATE TABLE "card" (
    "id" SERIAL NOT NULL,
    "remoteId" TEXT NOT NULL,
    "userId" INTEGER,

    CONSTRAINT "card_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "card" ADD CONSTRAINT "card_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
