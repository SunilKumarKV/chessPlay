/*
  Warnings:

  - You are about to drop the column `data` on the `CommunityPost` table. All the data in the column will be lost.
  - The `type` column on the `CommunityPost` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `status` column on the `CommunityPost` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the column `data` on the `Conversation` table. All the data in the column will be lost.
  - You are about to drop the column `participantIds` on the `Conversation` table. All the data in the column will be lost.
  - The `type` column on the `Conversation` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the column `approvedAt` on the `Payment` table. All the data in the column will be lost.
  - You are about to drop the column `mongoPaymentId` on the `Payment` table. All the data in the column will be lost.
  - You are about to drop the column `planId` on the `Payment` table. All the data in the column will be lost.
  - You are about to drop the column `providerReference` on the `Payment` table. All the data in the column will be lost.
  - You are about to drop the column `rejectedAt` on the `Payment` table. All the data in the column will be lost.
  - You are about to drop the column `submittedAt` on the `Payment` table. All the data in the column will be lost.
  - You are about to drop the column `data` on the `Puzzle` table. All the data in the column will be lost.
  - You are about to drop the column `difficulty` on the `Puzzle` table. All the data in the column will be lost.
  - You are about to drop the column `puzzleId` on the `Puzzle` table. All the data in the column will be lost.
  - The `moves` column on the `Puzzle` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the column `data` on the `PuzzleAttempt` table. All the data in the column will be lost.
  - You are about to drop the column `ownerKey` on the `PuzzleAttempt` table. All the data in the column will be lost.
  - You are about to drop the column `status` on the `PuzzleAttempt` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `PuzzleAttempt` table. All the data in the column will be lost.
  - You are about to drop the column `mongoReferralId` on the `Referral` table. All the data in the column will be lost.
  - You are about to drop the column `qualifiedAt` on the `Referral` table. All the data in the column will be lost.
  - You are about to drop the column `rewardGranted` on the `Referral` table. All the data in the column will be lost.
  - You are about to drop the column `rewardedAt` on the `Referral` table. All the data in the column will be lost.
  - You are about to drop the column `currentPeriodEnd` on the `Subscription` table. All the data in the column will be lost.
  - You are about to drop the column `currentPeriodStart` on the `Subscription` table. All the data in the column will be lost.
  - You are about to drop the column `mongoSubscriptionId` on the `Subscription` table. All the data in the column will be lost.
  - You are about to drop the column `maxPlayers` on the `Tournament` table. All the data in the column will be lost.
  - You are about to drop the column `mongoTournamentId` on the `Tournament` table. All the data in the column will be lost.
  - You are about to drop the column `rules` on the `Tournament` table. All the data in the column will be lost.
  - You are about to drop the `Account` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Achievement` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `AdminAuditLog` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `AnalysisNote` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `AppSetting` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `AuditLog` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `AutomationEvent` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `BlogPost` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Coupon` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `EmailEvent` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `FeatureEntitlement` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Feedback` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Friend` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `GameAnalysis` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `GameMove` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Leaderboard` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Message` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `MistakeReview` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Notification` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Opening` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `PaymentIntent` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `PuzzleDailyUsage` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `RefreshToken` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `SecurityEvent` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Session` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `SupportPayment` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `SupportTicket` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `SupporterRequest` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `TournamentPlayer` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Waitlist` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `WebhookEvent` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[type,roomKey]` on the table `Conversation` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[externalId]` on the table `Puzzle` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[referrerId,referredUserId]` on the table `Referral` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `authorName` to the `CommunityPost` table without a default value. This is not possible if the table is not empty.
  - Made the column `title` on table `CommunityPost` required. This step will fail if there are existing NULL values in that column.
  - Made the column `body` on table `CommunityPost` required. This step will fail if there are existing NULL values in that column.
  - Made the column `fen` on table `Puzzle` required. This step will fail if there are existing NULL values in that column.
  - Added the required column `success` to the `PuzzleAttempt` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `Referral` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "CommunityPostType" AS ENUM ('ANNOUNCEMENT', 'FEEDBACK', 'BUG', 'FEATURE', 'DISCUSSION');

-- CreateEnum
CREATE TYPE "CommunityPostStatus" AS ENUM ('OPEN', 'REVIEWING', 'RESOLVED', 'CLOSED');

-- CreateEnum
CREATE TYPE "ConversationType" AS ENUM ('PUBLIC', 'PRIVATE');

-- DropForeignKey
ALTER TABLE "Payment" DROP CONSTRAINT "Payment_planId_fkey";

-- DropForeignKey
ALTER TABLE "Payment" DROP CONSTRAINT "Payment_userId_fkey";

-- DropForeignKey
ALTER TABLE "Subscription" DROP CONSTRAINT "Subscription_planId_fkey";

-- DropIndex
DROP INDEX "Payment_mongoPaymentId_key";

-- DropIndex
DROP INDEX "Payment_planId_idx";

-- DropIndex
DROP INDEX "Payment_provider_idx";

-- DropIndex
DROP INDEX "Puzzle_puzzleId_key";

-- DropIndex
DROP INDEX "Referral_code_key";

-- DropIndex
DROP INDEX "Referral_mongoReferralId_key";

-- DropIndex
DROP INDEX "Referral_referredUserId_idx";

-- DropIndex
DROP INDEX "Referral_referrerId_idx";

-- DropIndex
DROP INDEX "Referral_status_idx";

-- DropIndex
DROP INDEX "Subscription_mongoSubscriptionId_key";

-- DropIndex
DROP INDEX "Subscription_planId_idx";

-- DropIndex
DROP INDEX "Tournament_mongoTournamentId_key";

-- DropIndex
DROP INDEX "Tournament_startsAt_idx";

-- AlterTable
ALTER TABLE "CommunityPost" DROP COLUMN "data",
ADD COLUMN     "authorName" TEXT NOT NULL,
ADD COLUMN     "authorSupporter" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "comments" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN     "isHidden" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isPinned" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isPublic" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "likes" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "metadata" JSONB,
DROP COLUMN "type",
ADD COLUMN     "type" "CommunityPostType" NOT NULL DEFAULT 'DISCUSSION',
DROP COLUMN "status",
ADD COLUMN     "status" "CommunityPostStatus" NOT NULL DEFAULT 'OPEN',
ALTER COLUMN "title" SET NOT NULL,
ALTER COLUMN "body" SET NOT NULL;

-- AlterTable
ALTER TABLE "Conversation" DROP COLUMN "data",
DROP COLUMN "participantIds",
ADD COLUMN     "blockedBy" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "messages" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN     "mutedBy" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "participants" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "reports" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN     "roomKey" TEXT,
ADD COLUMN     "title" TEXT,
DROP COLUMN "type",
ADD COLUMN     "type" "ConversationType" NOT NULL DEFAULT 'PRIVATE';

-- AlterTable
ALTER TABLE "Payment" DROP COLUMN "approvedAt",
DROP COLUMN "mongoPaymentId",
DROP COLUMN "planId",
DROP COLUMN "providerReference",
DROP COLUMN "rejectedAt",
DROP COLUMN "submittedAt",
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "proofUrl" TEXT,
ADD COLUMN     "reviewedAt" TIMESTAMP(3),
ADD COLUMN     "transactionRef" TEXT,
ALTER COLUMN "userId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Puzzle" DROP COLUMN "data",
DROP COLUMN "difficulty",
DROP COLUMN "puzzleId",
ADD COLUMN     "externalId" TEXT,
ADD COLUMN     "metadata" JSONB,
ADD COLUMN     "source" TEXT,
ADD COLUMN     "themes" TEXT[],
ALTER COLUMN "fen" SET NOT NULL,
DROP COLUMN "moves",
ADD COLUMN     "moves" TEXT[],
ALTER COLUMN "rating" DROP NOT NULL,
ALTER COLUMN "rating" DROP DEFAULT;

-- AlterTable
ALTER TABLE "PuzzleAttempt" DROP COLUMN "data",
DROP COLUMN "ownerKey",
DROP COLUMN "status",
DROP COLUMN "updatedAt",
ADD COLUMN     "metadata" JSONB,
ADD COLUMN     "success" BOOLEAN NOT NULL;

-- AlterTable
ALTER TABLE "Referral" DROP COLUMN "mongoReferralId",
DROP COLUMN "qualifiedAt",
DROP COLUMN "rewardGranted",
DROP COLUMN "rewardedAt",
ADD COLUMN     "metadata" JSONB,
ADD COLUMN     "rewardNote" TEXT,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "Stats" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "Subscription" DROP COLUMN "currentPeriodEnd",
DROP COLUMN "currentPeriodStart",
DROP COLUMN "mongoSubscriptionId",
ADD COLUMN     "expiresAt" TIMESTAMP(3),
ADD COLUMN     "metadata" JSONB,
ADD COLUMN     "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "planId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Tournament" DROP COLUMN "maxPlayers",
DROP COLUMN "mongoTournamentId",
DROP COLUMN "rules",
ADD COLUMN     "metadata" JSONB;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "emailVerificationExpires" TIMESTAMP(3),
ADD COLUMN     "emailVerificationTokenHash" TEXT,
ADD COLUMN     "emailVerified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "lastLogin" TIMESTAMP(3),
ADD COLUMN     "passwordResetExpires" TIMESTAMP(3),
ADD COLUMN     "passwordResetTokenHash" TEXT,
ADD COLUMN     "refreshTokenHash" TEXT,
ADD COLUMN     "tokenVersion" INTEGER NOT NULL DEFAULT 0;

-- DropTable
DROP TABLE "Account";

-- DropTable
DROP TABLE "Achievement";

-- DropTable
DROP TABLE "AdminAuditLog";

-- DropTable
DROP TABLE "AnalysisNote";

-- DropTable
DROP TABLE "AppSetting";

-- DropTable
DROP TABLE "AuditLog";

-- DropTable
DROP TABLE "AutomationEvent";

-- DropTable
DROP TABLE "BlogPost";

-- DropTable
DROP TABLE "Coupon";

-- DropTable
DROP TABLE "EmailEvent";

-- DropTable
DROP TABLE "FeatureEntitlement";

-- DropTable
DROP TABLE "Feedback";

-- DropTable
DROP TABLE "Friend";

-- DropTable
DROP TABLE "GameAnalysis";

-- DropTable
DROP TABLE "GameMove";

-- DropTable
DROP TABLE "Leaderboard";

-- DropTable
DROP TABLE "Message";

-- DropTable
DROP TABLE "MistakeReview";

-- DropTable
DROP TABLE "Notification";

-- DropTable
DROP TABLE "Opening";

-- DropTable
DROP TABLE "PaymentIntent";

-- DropTable
DROP TABLE "PuzzleDailyUsage";

-- DropTable
DROP TABLE "RefreshToken";

-- DropTable
DROP TABLE "SecurityEvent";

-- DropTable
DROP TABLE "Session";

-- DropTable
DROP TABLE "SupportPayment";

-- DropTable
DROP TABLE "SupportTicket";

-- DropTable
DROP TABLE "SupporterRequest";

-- DropTable
DROP TABLE "TournamentPlayer";

-- DropTable
DROP TABLE "Waitlist";

-- DropTable
DROP TABLE "WebhookEvent";

-- CreateIndex
CREATE INDEX "CommunityPost_type_idx" ON "CommunityPost"("type");

-- CreateIndex
CREATE INDEX "CommunityPost_status_idx" ON "CommunityPost"("status");

-- CreateIndex
CREATE INDEX "CommunityPost_isPublic_isHidden_idx" ON "CommunityPost"("isPublic", "isHidden");

-- CreateIndex
CREATE INDEX "CommunityPost_isPinned_createdAt_idx" ON "CommunityPost"("isPinned", "createdAt");

-- CreateIndex
CREATE INDEX "Conversation_type_idx" ON "Conversation"("type");

-- CreateIndex
CREATE UNIQUE INDEX "Conversation_type_roomKey_key" ON "Conversation"("type", "roomKey");

-- CreateIndex
CREATE UNIQUE INDEX "Puzzle_externalId_key" ON "Puzzle"("externalId");

-- CreateIndex
CREATE INDEX "PuzzleAttempt_puzzleId_idx" ON "PuzzleAttempt"("puzzleId");

-- CreateIndex
CREATE INDEX "PuzzleAttempt_userId_idx" ON "PuzzleAttempt"("userId");

-- CreateIndex
CREATE INDEX "Referral_code_idx" ON "Referral"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Referral_referrerId_referredUserId_key" ON "Referral"("referrerId", "referredUserId");

-- CreateIndex
CREATE INDEX "User_deletedAt_idx" ON "User"("deletedAt");

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PuzzleAttempt" ADD CONSTRAINT "PuzzleAttempt_puzzleId_fkey" FOREIGN KEY ("puzzleId") REFERENCES "Puzzle"("id") ON DELETE CASCADE ON UPDATE CASCADE;
