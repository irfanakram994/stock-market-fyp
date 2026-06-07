-- Add direct user ownership for normal-user history records.
-- Existing rows remain nullable so admin/super-admin can still inspect old shared data.

ALTER TABLE "Prediction" ADD COLUMN IF NOT EXISTS "userId" TEXT;
ALTER TABLE "BacktestResult" ADD COLUMN IF NOT EXISTS "userId" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "isBlocked" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "blockedReason" TEXT;

CREATE INDEX IF NOT EXISTS "Prediction_userId_idx" ON "Prediction"("userId");
CREATE INDEX IF NOT EXISTS "BacktestResult_userId_idx" ON "BacktestResult"("userId");

ALTER TABLE "Prediction"
  ADD CONSTRAINT "Prediction_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "BacktestResult"
  ADD CONSTRAINT "BacktestResult_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
