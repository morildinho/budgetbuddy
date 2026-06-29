-- ============================================
-- MIGRATION: Merchant Icons
-- ============================================
-- Stores merchant logo mappings. Admins upload icons
-- and associate them with transaction description patterns.
-- Icons are stored in the 'merchant-icons' Supabase Storage bucket.

-- Step 1: Create the table
CREATE TABLE IF NOT EXISTS public.merchant_icons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pattern TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  icon_path TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Step 2: Enable RLS
ALTER TABLE public.merchant_icons ENABLE ROW LEVEL SECURITY;

-- Step 3: RLS policies — everyone reads, only admins write
CREATE POLICY "Anyone can view merchant icons"
  ON public.merchant_icons FOR SELECT
  USING (true);

CREATE POLICY "Admins can insert merchant icons"
  ON public.merchant_icons FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND is_admin = true));

CREATE POLICY "Admins can update merchant icons"
  ON public.merchant_icons FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND is_admin = true));

CREATE POLICY "Admins can delete merchant icons"
  ON public.merchant_icons FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND is_admin = true));

-- Step 4: Create public storage bucket for merchant icons
-- (Run separately if this fails — bucket may already exist)
INSERT INTO storage.buckets (id, name, public)
VALUES ('merchant-icons', 'merchant-icons', true)
ON CONFLICT (id) DO NOTHING;

-- Step 5: Storage policy — anyone can read, authenticated users can upload
CREATE POLICY "Public read merchant icons" ON storage.objects
  FOR SELECT USING (bucket_id = 'merchant-icons');

CREATE POLICY "Admins can upload merchant icons" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'merchant-icons'
    AND EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND is_admin = true)
  );

CREATE POLICY "Admins can delete merchant icons" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'merchant-icons'
    AND EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND is_admin = true)
  );
