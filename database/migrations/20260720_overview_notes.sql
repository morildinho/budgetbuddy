-- Standalone shared note shown directly on the Overview page.
-- One note per household owner; accepted members with Overview access can read it.

CREATE TABLE IF NOT EXISTS public.overview_notes (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT overview_notes_content_length CHECK (char_length(content) <= 4000)
);

ALTER TABLE public.overview_notes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owners manage their overview note" ON public.overview_notes;
CREATE POLICY "Owners manage their overview note"
  ON public.overview_notes
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Household members view shared overview note" ON public.overview_notes;
CREATE POLICY "Household members view shared overview note"
  ON public.overview_notes
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.household_members hm
      WHERE hm.owner_id = overview_notes.user_id
        AND hm.member_user_id = auth.uid()
        AND hm.invite_status = 'accepted'
        AND hm.can_view_overview = true
    )
  );
