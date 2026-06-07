CREATE TABLE IF NOT EXISTS user_notifications (
  id BIGSERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  user_email TEXT,
  source_type TEXT NOT NULL DEFAULT 'admin',
  source_name TEXT,
  source_key TEXT,
  type TEXT NOT NULL DEFAULT 'info',
  title TEXT NOT NULL DEFAULT '',
  message TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT 'general',
  priority TEXT NOT NULL DEFAULT 'normal',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS user_notifications_source_key_idx
  ON user_notifications (source_key);

CREATE INDEX IF NOT EXISTS user_notifications_user_read_created_idx
  ON user_notifications (user_id, is_read, created_at DESC);

CREATE TABLE IF NOT EXISTS stock_purchases (
  id BIGSERIAL PRIMARY KEY,
  user_id TEXT,
  user_email TEXT,
  stock_name TEXT NOT NULL,
  purchase_amount NUMERIC(14,2) NOT NULL CHECK (purchase_amount >= 0),
  purchase_date DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS stock_purchases_user_created_idx
  ON stock_purchases (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS prediction_user_created_idx
  ON "Prediction" ("userId", "createdAt" DESC);

CREATE INDEX IF NOT EXISTS agent_log_user_started_idx
  ON "AgentLog" ("userId", "startedAt" DESC);
-- Runtime performance tables moved out of request handlers.
CREATE TABLE IF NOT EXISTS user_notifications (
  id BIGSERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  user_email TEXT,
  source_type TEXT NOT NULL DEFAULT 'admin',
  source_name TEXT,
  source_key TEXT,
  type TEXT NOT NULL DEFAULT 'info',
  title TEXT NOT NULL DEFAULT '',
  message TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT 'general',
  priority TEXT NOT NULL DEFAULT 'normal',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE user_notifications
  ADD COLUMN IF NOT EXISTS user_email TEXT,
  ADD COLUMN IF NOT EXISTS source_type TEXT NOT NULL DEFAULT 'admin',
  ADD COLUMN IF NOT EXISTS source_name TEXT,
  ADD COLUMN IF NOT EXISTS source_key TEXT,
  ADD COLUMN IF NOT EXISTS type TEXT NOT NULL DEFAULT 'info',
  ADD COLUMN IF NOT EXISTS title TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS message TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS category TEXT NOT NULL DEFAULT 'general',
  ADD COLUMN IF NOT EXISTS priority TEXT NOT NULL DEFAULT 'normal',
  ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS is_read BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS read_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE UNIQUE INDEX IF NOT EXISTS user_notifications_source_key_idx
  ON user_notifications (source_key);

CREATE INDEX IF NOT EXISTS user_notifications_user_read_created_idx
  ON user_notifications (user_id, is_read, created_at DESC);

CREATE TABLE IF NOT EXISTS stock_purchases (
  id BIGSERIAL PRIMARY KEY,
  user_id TEXT,
  user_email TEXT,
  stock_name TEXT NOT NULL,
  purchase_amount NUMERIC(14,2) NOT NULL CHECK (purchase_amount >= 0),
  purchase_date DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE stock_purchases
  ADD COLUMN IF NOT EXISTS user_id TEXT,
  ADD COLUMN IF NOT EXISTS user_email TEXT;

CREATE INDEX IF NOT EXISTS stock_purchases_user_created_idx
  ON stock_purchases (user_id, created_at DESC);
