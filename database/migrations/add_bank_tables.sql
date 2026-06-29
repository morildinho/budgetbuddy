-- Bank Integration Tables
-- Run this SQL in your Supabase SQL Editor

-- ============================================
-- BANK CONNECTIONS TABLE
-- ============================================
-- Stores OAuth tokens for connected bank accounts
CREATE TABLE IF NOT EXISTS public.bank_connections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Provider info
    provider TEXT NOT NULL DEFAULT 'sparebank1',
    bank_name TEXT,

    -- OAuth tokens (stored encrypted at rest by Supabase)
    access_token TEXT,
    refresh_token TEXT,
    token_expires_at TIMESTAMPTZ,

    -- Connection status
    status TEXT NOT NULL DEFAULT 'active', -- active, expired, disconnected
    last_synced_at TIMESTAMPTZ,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

    -- One connection per provider per user
    UNIQUE(user_id, provider)
);

-- Enable Row Level Security
ALTER TABLE public.bank_connections ENABLE ROW LEVEL SECURITY;

-- Users can only manage their own connections
CREATE POLICY "Users can view own bank connections" ON public.bank_connections
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own bank connections" ON public.bank_connections
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own bank connections" ON public.bank_connections
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own bank connections" ON public.bank_connections
    FOR DELETE USING (auth.uid() = user_id);

-- Index
CREATE INDEX IF NOT EXISTS idx_bank_connections_user_id ON public.bank_connections(user_id);

-- Trigger for updated_at
CREATE TRIGGER update_bank_connections_updated_at
    BEFORE UPDATE ON public.bank_connections
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- BANK TRANSACTIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.bank_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Bank reference
    bank_account_id TEXT, -- Account identifier from bank API
    transaction_id TEXT,  -- Unique transaction ID from bank (for dedup)
    source TEXT NOT NULL DEFAULT 'sparebank1',

    -- Transaction data
    date DATE NOT NULL,
    description TEXT NOT NULL,
    amount DECIMAL(10,2) NOT NULL, -- Negative for expenses, positive for income

    -- Categorization
    category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,

    -- Receipt matching
    receipt_id UUID REFERENCES public.receipts(id) ON DELETE SET NULL,

    -- Raw API response for reference
    raw_data JSONB,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

    -- Prevent duplicate imports
    UNIQUE(user_id, source, transaction_id)
);

-- Enable Row Level Security
ALTER TABLE public.bank_transactions ENABLE ROW LEVEL SECURITY;

-- Users can only manage their own transactions
CREATE POLICY "Users can view own bank transactions" ON public.bank_transactions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own bank transactions" ON public.bank_transactions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own bank transactions" ON public.bank_transactions
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own bank transactions" ON public.bank_transactions
    FOR DELETE USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_bank_transactions_user_id ON public.bank_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_bank_transactions_date ON public.bank_transactions(date);
CREATE INDEX IF NOT EXISTS idx_bank_transactions_category ON public.bank_transactions(category_id);
CREATE INDEX IF NOT EXISTS idx_bank_transactions_receipt ON public.bank_transactions(receipt_id);
CREATE INDEX IF NOT EXISTS idx_bank_transactions_dedup ON public.bank_transactions(user_id, source, transaction_id);

-- Trigger for updated_at
CREATE TRIGGER update_bank_transactions_updated_at
    BEFORE UPDATE ON public.bank_transactions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
