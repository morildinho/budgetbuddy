-- Store the persistent Tink user that belongs to each BudgetBuddy user.
-- The continuous-access Tink Link flow needs this user ID so we can mint
-- fresh user tokens without sending the customer through Link every time.
-- Guarded so fresh installs do not fail if bank_connections has not been created yet.
-- Existing installs should prefer the broader 20260311_tink_schema_compat.sql migration.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'bank_connections'
  ) THEN
    ALTER TABLE public.bank_connections
      ADD COLUMN IF NOT EXISTS tink_user_id TEXT;
  END IF;
END $$;
