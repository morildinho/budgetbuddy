-- Tink schema compatibility migration for existing BudgetBuddy installs
-- Safe to run on databases that already have bank_connections / bank_transactions.
-- Uses additive ALTER TABLE statements instead of relying on CREATE TABLE IF NOT EXISTS.

ALTER TABLE IF EXISTS public.bank_connections
  ADD COLUMN IF NOT EXISTS tink_user_id TEXT,
  ADD COLUMN IF NOT EXISTS tink_credentials_id TEXT;

CREATE TABLE IF NOT EXISTS public.bank_accounts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  connection_id UUID NOT NULL REFERENCES public.bank_connections(id) ON DELETE CASCADE,
  tink_account_id TEXT NOT NULL,
  name TEXT NOT NULL,
  iban TEXT,
  type TEXT,
  balance_amount DECIMAL(15,2),
  balance_currency TEXT DEFAULT 'NOK',
  last_refreshed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE IF EXISTS public.bank_transactions
  ADD COLUMN IF NOT EXISTS account_id UUID REFERENCES public.bank_accounts(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS tink_transaction_id TEXT,
  ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'NOK',
  ADD COLUMN IF NOT EXISTS category TEXT,
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'BOOKED';

ALTER TABLE IF EXISTS public.bank_transactions
  ALTER COLUMN currency SET DEFAULT 'NOK';

ALTER TABLE IF EXISTS public.bank_transactions
  ALTER COLUMN status SET DEFAULT 'BOOKED';

UPDATE public.bank_transactions
SET currency = 'NOK'
WHERE currency IS NULL;

UPDATE public.bank_transactions
SET status = 'BOOKED'
WHERE status IS NULL;

ALTER TABLE public.bank_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bank_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bank_transactions ENABLE ROW LEVEL SECURITY;

CREATE UNIQUE INDEX IF NOT EXISTS idx_bank_accounts_tink_account_id
  ON public.bank_accounts(tink_account_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_bank_transactions_tink_transaction_id
  ON public.bank_transactions(tink_transaction_id)
  WHERE tink_transaction_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_bank_transactions_account_id
  ON public.bank_transactions(account_id);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'bank_accounts'
      AND policyname = 'Users own their bank accounts'
  ) THEN
    CREATE POLICY "Users own their bank accounts" ON public.bank_accounts
      FOR ALL USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'bank_transactions'
      AND policyname = 'Users own their bank transactions'
  ) THEN
    CREATE POLICY "Users own their bank transactions" ON public.bank_transactions
      FOR ALL USING (auth.uid() = user_id);
  END IF;
END $$;
