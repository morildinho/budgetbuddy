-- Tink Open Banking tables
-- Migration: 20260311_tink_bank_connections.sql

CREATE TABLE IF NOT EXISTS bank_connections (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL DEFAULT 'tink',
  tink_credentials_id TEXT,
  access_token TEXT,
  refresh_token TEXT,
  token_expires_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, provider)
);

CREATE TABLE IF NOT EXISTS bank_accounts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  connection_id UUID NOT NULL REFERENCES bank_connections(id) ON DELETE CASCADE,
  tink_account_id TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  iban TEXT,
  type TEXT,
  balance_amount DECIMAL(15,2),
  balance_currency TEXT DEFAULT 'NOK',
  last_refreshed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS bank_transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES bank_accounts(id) ON DELETE CASCADE,
  tink_transaction_id TEXT NOT NULL UNIQUE,
  amount DECIMAL(15,2) NOT NULL,
  currency TEXT DEFAULT 'NOK',
  description TEXT,
  date DATE NOT NULL,
  category TEXT,
  status TEXT DEFAULT 'BOOKED',
  raw_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE bank_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE bank_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE bank_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users own their bank connections" ON bank_connections
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users own their bank accounts" ON bank_accounts
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users own their bank transactions" ON bank_transactions
  FOR ALL USING (auth.uid() = user_id);
