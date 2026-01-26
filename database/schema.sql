-- Receipt Tracker Database Schema
-- Run this SQL in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- USERS TABLE
-- ============================================
-- Syncs with Supabase Auth users
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    full_name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Enable Row Level Security
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Users can view their own profile
CREATE POLICY "Users can view own profile" ON public.users
    FOR SELECT USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile" ON public.users
    FOR UPDATE USING (auth.uid() = id);

-- ============================================
-- CATEGORIES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    parent_category TEXT,
    color TEXT DEFAULT '#64748b',
    icon TEXT DEFAULT 'tag',
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Categories are public reference data
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view categories" ON public.categories
    FOR SELECT USING (true);

-- Allow authenticated users to create new categories
CREATE POLICY "Authenticated users can insert categories" ON public.categories
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- ============================================
-- RECEIPTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.receipts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Image storage
    image_url TEXT,

    -- Receipt metadata
    merchant TEXT NOT NULL,
    receipt_date DATE NOT NULL,
    total_amount DECIMAL(10,2) NOT NULL,

    -- Categorization
    category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,

    -- OCR metadata (for future use)
    ocr_method TEXT,
    raw_ocr_text TEXT,
    confidence_score DECIMAL(3,2),

    -- User notes
    notes TEXT,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Enable Row Level Security
ALTER TABLE public.receipts ENABLE ROW LEVEL SECURITY;

-- Users can only see their own receipts
CREATE POLICY "Users can view own receipts" ON public.receipts
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own receipts" ON public.receipts
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own receipts" ON public.receipts
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own receipts" ON public.receipts
    FOR DELETE USING (auth.uid() = user_id);

-- ============================================
-- RECEIPT ITEMS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.receipt_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    receipt_id UUID NOT NULL REFERENCES public.receipts(id) ON DELETE CASCADE,

    -- Item details
    item_name TEXT NOT NULL,
    quantity DECIMAL(10,2) DEFAULT 1,
    unit_price DECIMAL(10,2),
    total_price DECIMAL(10,2) NOT NULL,

    -- Item categorization
    category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,

    -- Metadata
    line_number INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Enable Row Level Security
ALTER TABLE public.receipt_items ENABLE ROW LEVEL SECURITY;

-- Users can manage items on their own receipts
CREATE POLICY "Users can view own receipt items" ON public.receipt_items
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.receipts
            WHERE receipts.id = receipt_items.receipt_id
            AND receipts.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert own receipt items" ON public.receipt_items
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.receipts
            WHERE receipts.id = receipt_items.receipt_id
            AND receipts.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update own receipt items" ON public.receipt_items
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.receipts
            WHERE receipts.id = receipt_items.receipt_id
            AND receipts.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete own receipt items" ON public.receipt_items
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.receipts
            WHERE receipts.id = receipt_items.receipt_id
            AND receipts.user_id = auth.uid()
        )
    );

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_receipts_user_id ON public.receipts(user_id);
CREATE INDEX IF NOT EXISTS idx_receipts_date ON public.receipts(receipt_date);
CREATE INDEX IF NOT EXISTS idx_receipts_category ON public.receipts(category_id);
CREATE INDEX IF NOT EXISTS idx_receipts_merchant ON public.receipts(merchant);
CREATE INDEX IF NOT EXISTS idx_receipt_items_receipt_id ON public.receipt_items(receipt_id);
CREATE INDEX IF NOT EXISTS idx_receipt_items_category ON public.receipt_items(category_id);

-- ============================================
-- FUNCTIONS & TRIGGERS
-- ============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON public.users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_receipts_updated_at
    BEFORE UPDATE ON public.receipts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- FUNCTION: Handle New User Signup
-- ============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.users (id, email, full_name)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1))
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to call the function on new user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- SEED DATA: Default Categories (Norwegian)
-- ============================================
INSERT INTO public.categories (name, parent_category, color, icon, sort_order) VALUES
    ('Kjøtt', NULL, '#ef4444', 'beef', 1),
    ('Fisk', NULL, '#3b82f6', 'fish', 2),
    ('Grønnsaker', NULL, '#22c55e', 'carrot', 3),
    ('Frukt', NULL, '#f59e0b', 'apple', 4),
    ('Brød', NULL, '#d97706', 'croissant', 5),
    ('Melk', NULL, '#60a5fa', 'milk', 6),
    ('Ost', NULL, '#fcd34d', 'cheese', 7),
    ('Melkeprodukter', NULL, '#93c5fd', 'cup-soda', 8),
    ('Egg', NULL, '#fbbf24', 'egg', 9),
    ('Godteri', NULL, '#ec4899', 'candy', 10),
    ('Snacks', NULL, '#8b5cf6', 'cookie', 11),
    ('Drikke', NULL, '#06b6d4', 'cup-soda', 12),
    ('Krydder', NULL, '#84cc16', 'flame', 13),
    ('Kaffe', NULL, '#78350f', 'coffee', 14),
    ('Pålegg', NULL, '#f97316', 'sandwich', 15),
    ('Mat', NULL, '#10b981', 'utensils', 16),
    ('Husholdning', NULL, '#6366f1', 'home', 17),
    ('Personlig pleie', NULL, '#14b8a6', 'heart', 18),
    ('Annet', NULL, '#64748b', 'tag', 19)
ON CONFLICT (name) DO NOTHING;

-- ============================================
-- LEARNED CATEGORIES TABLE
-- ============================================
-- Stores user corrections for item categorization
-- Used to improve future auto-categorization
CREATE TABLE IF NOT EXISTS public.learned_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Item pattern (lowercase, trimmed)
    item_pattern TEXT NOT NULL,

    -- Assigned category
    category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,

    -- How many times this mapping was used
    use_count INTEGER DEFAULT 1,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

    -- Each user can only have one mapping per item pattern
    UNIQUE(user_id, item_pattern)
);

-- Enable Row Level Security
ALTER TABLE public.learned_categories ENABLE ROW LEVEL SECURITY;

-- Users can only manage their own learned categories
CREATE POLICY "Users can view own learned categories" ON public.learned_categories
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own learned categories" ON public.learned_categories
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own learned categories" ON public.learned_categories
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own learned categories" ON public.learned_categories
    FOR DELETE USING (auth.uid() = user_id);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_learned_categories_user_pattern
    ON public.learned_categories(user_id, item_pattern);

-- Trigger for updated_at
CREATE TRIGGER update_learned_categories_updated_at
    BEFORE UPDATE ON public.learned_categories
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- STORAGE BUCKET FOR RECEIPT IMAGES
-- ============================================
-- Run this in SQL Editor or create bucket manually in Supabase Dashboard:
-- 1. Go to Storage in Supabase Dashboard
-- 2. Create a new bucket called "receipts"
-- 3. Make it private (not public)
-- 4. Add the following policies via SQL or Dashboard:

-- Create storage bucket (if using SQL - may need to run separately)
-- INSERT INTO storage.buckets (id, name, public) VALUES ('receipts', 'receipts', false);

-- Storage policies for receipt images
-- Users can upload to their own folder
CREATE POLICY "Users can upload receipt images"
ON storage.objects FOR INSERT
WITH CHECK (
    bucket_id = 'receipts' AND
    auth.uid()::text = (storage.foldername(name))[1]
);

-- Users can view their own images
CREATE POLICY "Users can view own receipt images"
ON storage.objects FOR SELECT
USING (
    bucket_id = 'receipts' AND
    auth.uid()::text = (storage.foldername(name))[1]
);

-- Users can delete their own images
CREATE POLICY "Users can delete own receipt images"
ON storage.objects FOR DELETE
USING (
    bucket_id = 'receipts' AND
    auth.uid()::text = (storage.foldername(name))[1]
);
