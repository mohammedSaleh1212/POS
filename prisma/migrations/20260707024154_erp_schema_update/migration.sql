/*
  Warnings:

  - Added the required column `status` to the `daily_movements` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "daily_movements" ADD COLUMN     "status" TEXT NOT NULL;
