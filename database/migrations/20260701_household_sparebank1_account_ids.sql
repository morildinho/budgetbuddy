-- Household sharing: SpareBank1 account IDs are provider-specific text values,
-- not Supabase UUID primary keys. Store selected account IDs as TEXT[] so
-- invites can scope access to SpareBank1 accounts without cast errors.

ALTER TABLE public.household_members
  ADD COLUMN IF NOT EXISTS allowed_bank_account_ids TEXT[];

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'household_members'
      AND column_name = 'allowed_bank_account_ids'
      AND udt_name = '_uuid'
  ) THEN
    ALTER TABLE public.household_members
      ALTER COLUMN allowed_bank_account_ids TYPE TEXT[]
      USING allowed_bank_account_ids::TEXT[];
  END IF;
END $$;

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
        OR cardinality(hm.allowed_bank_account_ids) = 0
        OR bank_account_id = ANY(hm.allowed_bank_account_ids)
      )
  );
$$;

DROP POLICY IF EXISTS "Household members view selected bank transactions" ON public.bank_transactions;
CREATE POLICY "Household members view selected bank transactions" ON public.bank_transactions
  FOR SELECT USING (
    public.can_view_household_bank_account(user_id, bank_account_id)
    OR (
      bank_account_id IS NULL
      AND public.can_view_household_owner_data(user_id, 'transactions')
    )
  );
