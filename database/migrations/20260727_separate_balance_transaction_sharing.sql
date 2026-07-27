-- Separate household permissions for account balances and transactions.
-- Existing transaction grants remain compatible; balance sharing starts deny-by-default.

ALTER TABLE public.household_members
  ADD COLUMN IF NOT EXISTS allowed_balance_account_ids TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

COMMENT ON COLUMN public.household_members.allowed_balance_account_ids IS
  'SpareBank1 provider account IDs whose current balance may be shown to this household member.';

-- Transaction access remains governed by can_view_transactions plus the transaction
-- account list. NULL preserves legacy "all accounts" grants; an explicit empty array
-- means no transaction accounts for all newly created invites.
CREATE OR REPLACE FUNCTION public.can_view_household_bank_account(
  owner_user_id UUID,
  bank_account_id TEXT
)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.household_members hm
    WHERE hm.owner_id = owner_user_id
      AND hm.member_user_id = auth.uid()
      AND hm.invite_status = 'accepted'
      AND hm.can_view_transactions = true
      AND (
        hm.allowed_bank_account_ids IS NULL
        OR bank_account_id = ANY(hm.allowed_bank_account_ids)
      )
  );
$$;

-- Balance grants are independent of transaction grants and always explicit.
CREATE OR REPLACE FUNCTION public.can_view_household_bank_balance(
  owner_user_id UUID,
  bank_account_id TEXT
)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.household_members hm
    WHERE hm.owner_id = owner_user_id
      AND hm.member_user_id = auth.uid()
      AND hm.invite_status = 'accepted'
      AND hm.can_view_overview = true
      AND bank_account_id = ANY(hm.allowed_balance_account_ids)
  );
$$;

DROP POLICY IF EXISTS "Household members view selected bank transactions" ON public.bank_transactions;
CREATE POLICY "Household members view selected bank transactions" ON public.bank_transactions
  FOR SELECT USING (
    public.can_view_household_bank_account(user_id, bank_account_id)
    OR (
      bank_account_id IS NULL
      AND public.can_view_household_owner_data(user_id, 'transactions')
      AND EXISTS (
        SELECT 1
        FROM public.household_members hm
        WHERE hm.owner_id = bank_transactions.user_id
          AND hm.member_user_id = auth.uid()
          AND hm.invite_status = 'accepted'
          AND hm.allowed_bank_account_ids IS NULL
      )
    )
  );
