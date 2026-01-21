-- AlterTable
-- Make buyerId nullable to support guest checkout
-- This allows tickets to be created without a registered user account

ALTER TABLE "Ticket" ALTER COLUMN "buyerId" DROP NOT NULL;
