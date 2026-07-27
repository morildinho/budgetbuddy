-- Remove the legacy UUID overload left by the former Tink account model.
-- Keep cached bank_accounts sharing compatible by checking the provider account ID as text.

DROP POLICY IF EXISTS "Household members view selected bank accounts" ON public.bank_accounts;
DROP FUNCTION IF EXISTS public.can_view_household_bank_account(UUID, UUID);

CREATE POLICY "Household members view selected bank accounts" ON public.bank_accounts
  FOR SELECT USING (
    public.can_view_household_bank_account(
      user_id,
      COALESCE(tink_account_id, id::TEXT)
    )
  );
