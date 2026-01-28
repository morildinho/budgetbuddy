-- Migration: Add category hierarchy support
-- Run this SQL in your Supabase SQL Editor

-- Add parent_id for sub-categories (self-referencing)
ALTER TABLE public.budget_categories
ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES public.budget_categories(id) ON DELETE CASCADE;

-- Make parent_type nullable so custom main categories don't need a type
ALTER TABLE public.budget_categories
ALTER COLUMN parent_type DROP NOT NULL;

-- Drop old check constraint and re-add with NULL allowed
ALTER TABLE public.budget_categories DROP CONSTRAINT IF EXISTS budget_categories_parent_type_check;
ALTER TABLE public.budget_categories ADD CONSTRAINT budget_categories_parent_type_check
  CHECK (parent_type IS NULL OR parent_type IN ('income', 'fixed_expense', 'variable_expense', 'loan'));

-- Drop old unique constraint and re-add to account for nullable parent_type
ALTER TABLE public.budget_categories DROP CONSTRAINT IF EXISTS budget_categories_user_id_parent_type_name_key;

-- Index for parent_id lookups
CREATE INDEX IF NOT EXISTS budget_categories_parent_id_idx ON public.budget_categories(parent_id);
