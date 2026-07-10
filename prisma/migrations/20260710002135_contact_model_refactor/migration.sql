/*
  Warnings:

  - You are about to drop the column `customer_id` on the `invoices` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "invoices" DROP CONSTRAINT "invoices_customer_id_fkey";

-- AlterTable
ALTER TABLE "customers" ADD COLUMN     "is_customer" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "is_supplier" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "invoices" DROP COLUMN "customer_id",
ADD COLUMN     "contact_id" INTEGER;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
