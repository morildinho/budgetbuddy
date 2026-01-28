-- Migration: Add Admin Role Support
-- Run this SQL in your Supabase SQL Editor

-- Add is_admin column to users table
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;

-- Set your user as admin (replace with your actual user ID from Supabase Auth)
-- You can find your user ID by running: SELECT id, email FROM auth.users;
-- UPDATE public.users SET is_admin = TRUE WHERE email = 'espen.morild@gmail.com';

-- Note: After running this migration, manually run the UPDATE command above
-- with your actual email address to set yourself as admin.
