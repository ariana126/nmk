/*
  Warnings:

  - A unique constraint covering the columns `[password_reset_token]` on the table `app_user` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "app_user" ADD COLUMN     "password_reset_expires_at" TIMESTAMPTZ(3),
ADD COLUMN     "password_reset_redeemed_at" TIMESTAMPTZ(3),
ADD COLUMN     "password_reset_requested_at" TIMESTAMPTZ(3),
ADD COLUMN     "password_reset_token" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "app_user_password_reset_token_key" ON "app_user"("password_reset_token");
