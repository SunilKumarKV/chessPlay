-- Add OTP attempt/cooldown metadata for password reset and email verification.
ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS "emailVerificationAttempts" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "emailVerificationSentAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "passwordResetAttempts" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "passwordResetSentAt" TIMESTAMP(3);

-- Compatibility rollout: accounts created before OTP enforcement are treated as already verified.
UPDATE "User"
SET "emailVerified" = true
WHERE "emailVerified" = false
  AND "createdAt" < NOW();
