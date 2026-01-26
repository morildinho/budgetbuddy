-- Budget Feature Migration
-- Run this SQL in Supabase SQL Editor

-- ============================================
-- BUDGETS TABLE
-- ============================================
-- Stores monthly budget records for each user
CREATE TABLE IF NOT EXISTS public.budgets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Month identifier (first day of month)
    month DATE NOT NULL,

    -- Optional notes for the month
    notes TEXT,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

    -- Each user can only have one budget per month
    UNIQUE(user_id, month)
);

-- Enable Row Level Security
ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own budgets" ON public.budgets
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own budgets" ON public.budgets
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own budgets" ON public.budgets
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own budgets" ON public.budgets
    FOR DELETE USING (auth.uid() = user_id);

-- ============================================
-- BUDGET ENTRIES TABLE
-- ============================================
-- Individual line items within a budget
CREATE TABLE IF NOT EXISTS public.budget_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    budget_id UUID NOT NULL REFERENCES public.budgets(id) ON DELETE CASCADE,

    -- Entry type: fixed_expense, variable_expense, loan, income
    entry_type TEXT NOT NULL CHECK (entry_type IN ('fixed_expense', 'variable_expense', 'loan', 'income')),

    -- Entry details
    description TEXT NOT NULL,
    amount DECIMAL(10,2) NOT NULL,

    -- For recurring entries that should be copied to new months
    is_recurring BOOLEAN DEFAULT false,

    -- Sort order within the entry type
    sort_order INTEGER DEFAULT 0,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Enable Row Level Security
ALTER TABLE public.budget_entries ENABLE ROW LEVEL SECURITY;

-- RLS Policies (through budget ownership)
CREATE POLICY "Users can view own budget entries" ON public.budget_entries
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.budgets
            WHERE budgets.id = budget_entries.budget_id
            AND budgets.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert own budget entries" ON public.budget_entries
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.budgets
            WHERE budgets.id = budget_entries.budget_id
            AND budgets.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update own budget entries" ON public.budget_entries
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.budgets
            WHERE budgets.id = budget_entries.budget_id
            AND budgets.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete own budget entries" ON public.budget_entries
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.budgets
            WHERE budgets.id = budget_entries.budget_id
            AND budgets.user_id = auth.uid()
        )
    );

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_budgets_user_id ON public.budgets(user_id);
CREATE INDEX IF NOT EXISTS idx_budgets_month ON public.budgets(month);
CREATE INDEX IF NOT EXISTS idx_budgets_user_month ON public.budgets(user_id, month);
CREATE INDEX IF NOT EXISTS idx_budget_entries_budget_id ON public.budget_entries(budget_id);
CREATE INDEX IF NOT EXISTS idx_budget_entries_type ON public.budget_entries(entry_type);

-- ============================================
-- TRIGGERS
-- ============================================
CREATE TRIGGER update_budgets_updated_at
    BEFORE UPDATE ON public.budgets
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_budget_entries_updated_at
    BEFORE UPDATE ON public.budget_entries
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
