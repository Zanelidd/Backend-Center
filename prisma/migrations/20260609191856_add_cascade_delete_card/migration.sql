-- DropForeignKey
ALTER TABLE "cards" DROP CONSTRAINT "cards_userId_fkey";

-- AddForeignKey
ALTER TABLE "cards" ADD CONSTRAINT "cards_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
