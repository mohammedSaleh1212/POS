/*
  Warnings:

  - You are about to drop the column `price` on the `products` table. All the data in the column will be lost.
  - You are about to drop the `customers` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `cost_price` to the `invoice_items` table without a default value. This is not possible if the table is not empty.
  - Added the required column `cost_price` to the `products` table without a default value. This is not possible if the table is not empty.
  - Added the required column `selling_price` to the `products` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('PAID', 'UNPAID', 'PARTIAL');

-- DropForeignKey
ALTER TABLE "invoices" DROP CONSTRAINT "invoices_contact_id_fkey";

-- AlterTable
ALTER TABLE "invoice_items" ADD COLUMN     "cost_price" DECIMAL(10,2) NOT NULL;

-- AlterTable
ALTER TABLE "invoices" ADD COLUMN     "status" "InvoiceStatus" NOT NULL DEFAULT 'PAID';

-- AlterTable
ALTER TABLE "products" DROP COLUMN "price",
ADD COLUMN     "cost_price" DECIMAL(10,2) NOT NULL,
ADD COLUMN     "selling_price" DECIMAL(10,2) NOT NULL;

-- DropTable
DROP TABLE "customers";

-- CreateTable
CREATE TABLE "contacts" (
    "id" SERIAL NOT NULL,
    "full_name" TEXT,
    "phone_number" TEXT,
    "is_customer" BOOLEAN NOT NULL DEFAULT false,
    "is_supplier" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contacts_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "contacts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
