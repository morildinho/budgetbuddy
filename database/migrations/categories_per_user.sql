-- ============================================
-- MIGRATION: Per-User Categories
-- ============================================
-- Makes categories per-user instead of global.
-- Each user gets their own set of categories.
-- New users are auto-seeded with defaults via trigger.

-- Step 1: Add user_id column (nullable for now)
ALTER TABLE public.categories
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Step 2: Backfill — assign all existing categories to the first user found in receipts
-- (This assumes a single-user setup; adjust if needed)
UPDATE public.categories
SET user_id = (SELECT DISTINCT user_id FROM public.receipts LIMIT 1)
WHERE user_id IS NULL;

-- Step 3: Make user_id NOT NULL
ALTER TABLE public.categories
ALTER COLUMN user_id SET NOT NULL;

-- Step 4: Drop old UNIQUE constraint on name, add per-user unique
ALTER TABLE public.categories DROP CONSTRAINT IF EXISTS categories_name_key;
ALTER TABLE public.categories ADD CONSTRAINT categories_user_name_key UNIQUE (user_id, name);

-- Step 5: Update RLS policies
DROP POLICY IF EXISTS "Anyone can view categories" ON public.categories;
DROP POLICY IF EXISTS "Authenticated users can insert categories" ON public.categories;

CREATE POLICY "Users can view own categories" ON public.categories
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own categories" ON public.categories
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own categories" ON public.categories
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own categories" ON public.categories
    FOR DELETE USING (auth.uid() = user_id);

-- Step 6: Function to seed default categories for new users
CREATE OR REPLACE FUNCTION public.seed_default_categories()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.categories (user_id, name, parent_category, color, icon, sort_order) VALUES
    (NEW.id, 'Kjøtt', NULL, '#ef4444', 'beef', 1),
    (NEW.id, 'Fisk', NULL, '#3b82f6', 'fish', 2),
    (NEW.id, 'Grønnsaker', NULL, '#22c55e', 'carrot', 3),
    (NEW.id, 'Frukt', NULL, '#f59e0b', 'apple', 4),
    (NEW.id, 'Brød', NULL, '#d97706', 'croissant', 5),
    (NEW.id, 'Melk', NULL, '#60a5fa', 'milk', 6),
    (NEW.id, 'Ost', NULL, '#fcd34d', 'cheese', 7),
    (NEW.id, 'Melkeprodukter', NULL, '#93c5fd', 'cup-soda', 8),
    (NEW.id, 'Egg', NULL, '#fbbf24', 'egg', 9),
    (NEW.id, 'Godteri', NULL, '#ec4899', 'candy', 10),
    (NEW.id, 'Snacks', NULL, '#8b5cf6', 'cookie', 11),
    (NEW.id, 'Drikke', NULL, '#06b6d4', 'cup-soda', 12),
    (NEW.id, 'Krydder', NULL, '#84cc16', 'flame', 13),
    (NEW.id, 'Kaffe', NULL, '#78350f', 'coffee', 14),
    (NEW.id, 'Pålegg', NULL, '#f97316', 'sandwich', 15),
    (NEW.id, 'Mat', NULL, '#10b981', 'utensils', 16),
    (NEW.id, 'Husholdning', NULL, '#6366f1', 'home', 17),
    (NEW.id, 'Personlig pleie', NULL, '#14b8a6', 'heart', 18),
    (NEW.id, 'Annet', NULL, '#64748b', 'tag', 19);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 7: Trigger on new user signup
DROP TRIGGER IF EXISTS on_auth_user_created_seed_categories ON auth.users;
CREATE TRIGGER on_auth_user_created_seed_categories
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.seed_default_categories();
