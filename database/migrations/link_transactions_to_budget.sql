-- ============================================
-- MIGRATION: Link Bank Transactions to Budget Entries
-- ============================================
-- Adds a budget_entry_id FK to bank_transactions so users can
-- connect transactions to budget entries and track actual vs planned spending.

-- Step 1: Add the FK column (nullable, same pattern as receipt_id)
ALTER TABLE public.bank_transactions
  ADD COLUMN budget_entry_id UUID REFERENCES public.budget_entries(id) ON DELETE SET NULL;

-- Step 2: Index for efficient lookups
CREATE INDEX idx_bank_transactions_budget_entry_id
  ON public.bank_transactions(budget_entry_id);
