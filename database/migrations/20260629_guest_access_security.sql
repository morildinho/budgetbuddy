-- Guest / household access security hardening
-- Apply in Supabase SQL Editor before deploying the guest-access build.

-- Optional per-invite bank-account scope. NULL or empty array means "all accounts"
-- when can_view_transactions is true.
ALTER TABLE public.household_members
  ADD COLUMN IF NOT EXISTS allowed_bank_account_ids UUID[];

-- Helper: can the current authenticated user view a feature owned by owner_user_id?
CREATE OR REPLACE FUNCTION public.can_view_household_owner_data(
  owner_user_id UUID,
  permission_name TEXT
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
      AND CASE permission_name
        WHEN 'receipts' THEN hm.can_view_receipts
        WHEN 'transactions' THEN hm.can_view_transactions
        WHEN 'budget' THEN hm.can_view_budget
        WHEN 'analytics' THEN hm.can_view_analytics
        WHEN 'portfolio' THEN hm.can_view_portfolio
        ELSE false
      END
  );
$$;

-- Helper: can the current authenticated user view a specific owner bank account?
CREATE OR REPLACE FUNCTION public.can_view_household_bank_account(
  owner_user_id UUID,
  bank_account_id UUID
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

-- Existing owner policies stay in place. These add read-only access for invited members.
DROP POLICY IF EXISTS "Household members view shared categories" ON public.categories;
CREATE POLICY "Household members view shared categories" ON public.categories
  FOR SELECT USING (
    public.can_view_household_owner_data(user_id, 'receipts')
    OR public.can_view_household_owner_data(user_id, 'transactions')
    OR public.can_view_household_owner_data(user_id, 'budget')
    OR public.can_view_household_owner_data(user_id, 'analytics')
  );

DROP POLICY IF EXISTS "Household members view shared receipts" ON public.receipts;
CREATE POLICY "Household members view shared receipts" ON public.receipts
  FOR SELECT USING (
    public.can_view_household_owner_data(user_id, 'receipts')
    OR public.can_view_household_owner_data(user_id, 'analytics')
  );

DROP POLICY IF EXISTS "Household members view shared receipt items" ON public.receipt_items;
CREATE POLICY "Household members view shared receipt items" ON public.receipt_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.receipts r
      WHERE r.id = receipt_items.receipt_id
        AND (
          public.can_view_household_owner_data(r.user_id, 'receipts')
          OR public.can_view_household_owner_data(r.user_id, 'analytics')
        )
    )
  );

DROP POLICY IF EXISTS "Household members view shared budgets" ON public.budgets;
CREATE POLICY "Household members view shared budgets" ON public.budgets
  FOR SELECT USING (public.can_view_household_owner_data(user_id, 'budget'));

DROP POLICY IF EXISTS "Household members view shared budget entries" ON public.budget_entries;
CREATE POLICY "Household members view shared budget entries" ON public.budget_entries
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.budgets b
      WHERE b.id = budget_entries.budget_id
        AND public.can_view_household_owner_data(b.user_id, 'budget')
    )
  );

DROP POLICY IF EXISTS "Household members view shared budget categories" ON public.budget_categories;
CREATE POLICY "Household members view shared budget categories" ON public.budget_categories
  FOR SELECT USING (public.can_view_household_owner_data(user_id, 'budget'));

DROP POLICY IF EXISTS "Household members view selected bank accounts" ON public.bank_accounts;
CREATE POLICY "Household members view selected bank accounts" ON public.bank_accounts
  FOR SELECT USING (public.can_view_household_bank_account(user_id, id));

DROP POLICY IF EXISTS "Household members view selected bank transactions" ON public.bank_transactions;
CREATE POLICY "Household members view selected bank transactions" ON public.bank_transactions
  FOR SELECT USING (
    (
      account_id IS NOT NULL
      AND public.can_view_household_bank_account(user_id, account_id)
    )
    OR (
      account_id IS NULL
      AND public.can_view_household_owner_data(user_id, 'transactions')
    )
  );

DROP POLICY IF EXISTS "Household members view shared portfolio assets" ON public.portfolio_assets;
CREATE POLICY "Household members view shared portfolio assets" ON public.portfolio_assets
  FOR SELECT USING (public.can_view_household_owner_data(user_id, 'portfolio'));

-- Keep invite tokens non-readable through anon/client RLS; invite lookup is handled
-- by /api/household/invite/[token] with a server-side service-role client.
