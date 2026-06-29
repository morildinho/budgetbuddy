-- Portfolio assets
CREATE TABLE IF NOT EXISTS public.portfolio_assets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    symbol TEXT NOT NULL,           -- e.g. "AAPL", "BTC"
    name TEXT NOT NULL,             -- e.g. "Apple Inc.", "Bitcoin"
    asset_type TEXT NOT NULL,       -- "stock" or "crypto"
    quantity DECIMAL(20, 8) NOT NULL,
    purchase_price DECIMAL(20, 8),  -- avg purchase price (optional)
    currency TEXT DEFAULT 'USD',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

ALTER TABLE public.portfolio_assets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own assets" ON public.portfolio_assets USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX idx_portfolio_assets_user ON public.portfolio_assets(user_id);
