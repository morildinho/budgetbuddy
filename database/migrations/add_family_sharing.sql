-- Household groups
CREATE TABLE IF NOT EXISTS public.households (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL DEFAULT 'Min familie',
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

ALTER TABLE public.households ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner manages household" ON public.households USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);

-- Household members (invited users)
CREATE TABLE IF NOT EXISTS public.household_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    household_id UUID NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
    owner_id UUID NOT NULL REFERENCES auth.users(id), -- the inviting user
    member_user_id UUID REFERENCES auth.users(id),    -- NULL until accepted
    invite_email TEXT,
    invite_token TEXT UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
    invite_status TEXT NOT NULL DEFAULT 'pending',    -- pending, accepted, revoked

    -- Permissions (what the member can see)
    can_view_overview BOOLEAN DEFAULT true,
    can_view_receipts BOOLEAN DEFAULT false,
    can_view_transactions BOOLEAN DEFAULT false,
    can_view_budget BOOLEAN DEFAULT false,
    can_view_analytics BOOLEAN DEFAULT false,
    can_view_portfolio BOOLEAN DEFAULT false,

    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    accepted_at TIMESTAMPTZ
);

ALTER TABLE public.household_members ENABLE ROW LEVEL SECURITY;
-- Owner can see/manage their invites
CREATE POLICY "Owner manages invites" ON public.household_members
    USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);
-- Member can see their own invite
CREATE POLICY "Member views own invite" ON public.household_members
    FOR SELECT USING (auth.uid() = member_user_id);
-- Accept invite (member updates their own invite)
CREATE POLICY "Member accepts invite" ON public.household_members
    FOR UPDATE USING (auth.uid() = member_user_id);
