
-- Create family_invitations table (repairing missing table)
CREATE TABLE IF NOT EXISTS public.family_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role public.app_role NOT NULL DEFAULT 'standard',
  invited_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(family_id, email)
);

-- Enable RLS
ALTER TABLE public.family_invitations ENABLE ROW LEVEL SECURITY;

-- Policies for family_invitations
DROP POLICY IF EXISTS "Users can view invitations for their family" ON public.family_invitations;
CREATE POLICY "Users can view invitations for their family"
  ON public.family_invitations FOR SELECT
  TO authenticated
  USING (family_id = public.get_user_family_id(auth.uid()));

DROP POLICY IF EXISTS "Admins can manage invitations" ON public.family_invitations;
CREATE POLICY "Admins can manage invitations"
  ON public.family_invitations FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), family_id, 'admin'));

DROP POLICY IF EXISTS "Users can view their own pending invitations" ON public.family_invitations;
CREATE POLICY "Users can view their own pending invitations"
  ON public.family_invitations FOR SELECT
  TO authenticated
  USING (LOWER(email) = LOWER(auth.jwt() ->> 'email'));
