ALTER TABLE "BacktestResult" ADD COLUMN IF NOT EXISTS "userId" TEXT;

CREATE INDEX IF NOT EXISTS "BacktestResult_userId_idx"
  ON "BacktestResult"("userId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'BacktestResult_userId_fkey'
  ) THEN
    ALTER TABLE "BacktestResult"
      ADD CONSTRAINT "BacktestResult_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
