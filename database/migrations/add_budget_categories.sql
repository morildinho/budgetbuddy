-- Migration: Add Budget Categories
-- Run this SQL in your Supabase SQL Editor

-- Create budget_categories table
CREATE TABLE IF NOT EXISTS public.budget_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    parent_type TEXT NOT NULL CHECK (parent_type IN ('income', 'fixed_expense', 'variable_expense', 'loan')),
    color TEXT DEFAULT '#64748b',
    icon TEXT DEFAULT 'tag',
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

    -- Ensure unique names per user per parent type
    UNIQUE(user_id, parent_type, name)
);

-- Enable Row Level Security
ALTER TABLE public.budget_categories ENABLE ROW LEVEL SECURITY;

-- Users can view their own budget categories
CREATE POLICY "Users can view own budget categories" ON public.budget_categories
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own budget categories" ON public.budget_categories
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own budget categories" ON public.budget_categories
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own budget categories" ON public.budget_categories
    FOR DELETE USING (auth.uid() = user_id);

-- Add category_id to budget_entries table
ALTER TABLE public.budget_entries
ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES public.budget_categories(id) ON DELETE SET NULL;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS budget_categories_user_id_idx ON public.budget_categories(user_id);
CREATE INDEX IF NOT EXISTS budget_categories_parent_type_idx ON public.budget_categories(parent_type);
CREATE INDEX IF NOT EXISTS budget_entries_category_id_idx ON public.budget_entries(category_id);
