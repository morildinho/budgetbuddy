-- Budget dates + multiple standalone Overview notes
-- Additive and safe for existing data.

-- Step 1: Give every budget entry an optional concrete date.
ALTER TABLE public.budget_entries
  ADD COLUMN IF NOT EXISTS planned_date DATE;

CREATE INDEX IF NOT EXISTS idx_budget_entries_planned_date
  ON public.budget_entries(planned_date);

-- Existing entries intentionally keep NULL planned_date. The UI lists them as
-- "Uten dato" so we do not invent incorrect salary or due dates.

-- Step 2: Convert overview_notes from one row per owner to many notes per owner.
ALTER TABLE public.overview_notes
  ADD COLUMN IF NOT EXISTS id UUID DEFAULT uuid_generate_v4();

UPDATE public.overview_notes
SET id = uuid_generate_v4()
WHERE id IS NULL;

ALTER TABLE public.overview_notes
  ALTER COLUMN id SET DEFAULT uuid_generate_v4(),
  ALTER COLUMN id SET NOT NULL;

-- The original primary key was user_id. Replace it with id so one owner can
-- store multiple notes. Re-running this migration remains safe.
ALTER TABLE public.overview_notes
  DROP CONSTRAINT IF EXISTS overview_notes_pkey;

ALTER TABLE public.overview_notes
  ADD CONSTRAINT overview_notes_pkey PRIMARY KEY (id);

CREATE INDEX IF NOT EXISTS idx_overview_notes_user_updated
  ON public.overview_notes(user_id, updated_at DESC);

-- Existing RLS policies use user_id and therefore continue to provide:
-- owner write access + accepted household member read access.
