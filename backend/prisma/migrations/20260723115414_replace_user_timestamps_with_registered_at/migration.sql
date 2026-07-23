/*
  Warnings:

  - You are about to drop the column `created_at` on the `app_user` table. All the data in the column will be lost.
  - You are about to drop the column `updated_at` on the `app_user` table. All the data in the column will be lost.
  - Added the required column `registered_at` to the `app_user` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "app_user" DROP COLUMN "created_at",
DROP COLUMN "updated_at",
ADD COLUMN     "registered_at" TIMESTAMP(3) NOT NULL;
