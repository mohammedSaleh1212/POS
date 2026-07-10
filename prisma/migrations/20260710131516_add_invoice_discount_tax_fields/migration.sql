/*
  Warnings:

  - You are about to drop the column `total_amount` on the `invoices` table. All the data in the column will be lost.
  - Added the required column `subtotalAmount` to the `invoices` table without a default value. This is not possible if the table is not empty.
  - Added the required column `totalAmount` to the `invoices` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "DiscountType" AS ENUM ('FIXED', 'PERCENTAGE');

-- AlterTable
ALTER TABLE "invoices" DROP COLUMN "total_amount",
ADD COLUMN     "discountAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
ADD COLUMN     "discountType" "DiscountType",
ADD COLUMN     "discountValue" DECIMAL(10,2),
ADD COLUMN     "subtotalAmount" DECIMAL(10,2) NOT NULL,
ADD COLUMN     "taxAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
ADD COLUMN     "totalAmount" DECIMAL(10,2) NOT NULL;
