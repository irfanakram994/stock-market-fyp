/*
  Warnings:

  - You are about to drop the `UserPortfolio` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "UserPortfolio" DROP CONSTRAINT "UserPortfolio_stockId_fkey";

-- DropForeignKey
ALTER TABLE "UserPortfolio" DROP CONSTRAINT "UserPortfolio_userId_fkey";

-- DropTable
DROP TABLE "UserPortfolio";
