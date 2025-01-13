/*
  Warnings:

  - A unique constraint covering the columns `[remoteId]` on the table `card` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "card_remoteId_key" ON "card"("remoteId");
