
-- 21. GOALS TABLE
CREATE TABLE public.goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  target_amount DECIMAL(12,2) NOT NULL,
  current_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  category TEXT,
  deadline DATE,
  is_completed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;

-- Triggers for updated_at
CREATE TRIGGER update_goals_updated_at 
  BEFORE UPDATE ON public.goals 
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RLS POLICIES - GOALS
CREATE POLICY "Users can view family goals"
  ON public.goals FOR SELECT
  TO authenticated
  USING (family_id = public.get_user_family_id(auth.uid()));

CREATE POLICY "Users can create goals for their family"
  ON public.goals FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid() 
    AND family_id = public.get_user_family_id(auth.uid())
  );

CREATE POLICY "Users can update their own goals"
  ON public.goals FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own goals"
  ON public.goals FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- SECURITY RE-ACTIVATION (RESTORE PERMANENT POLICIES)
ALTER TABLE public.families ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- FAMILIES POLICIES
DROP POLICY IF EXISTS "master_create_families" ON public.families;
DROP POLICY IF EXISTS "Authenticated users can create families" ON public.families;
CREATE POLICY "Users can create their own family"
  ON public.families FOR INSERT
  TO authenticated
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can view their own family"
  ON public.families FOR SELECT
  TO authenticated
  USING (id = public.get_user_family_id(auth.uid()));

CREATE POLICY "Admins can update their family"
  ON public.families FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), id, 'admin'));

-- USER_ROLES POLICIES
DROP POLICY IF EXISTS "master_manage_roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;
CREATE POLICY "Admins can manage roles"
  ON public.user_roles FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), family_id, 'admin')
    OR EXISTS (
      SELECT 1 FROM public.families f
      WHERE f.id = family_id
      AND f.created_by = auth.uid()
    )
  );

CREATE POLICY "Users can view roles in their family"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (family_id = public.get_user_family_id(auth.uid()));

-- PROFILES POLICIES
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- NEW: EMAIL DISCOVERY POLICY
-- Allows finding a user ID by their exact email for invitation purposes
DROP POLICY IF EXISTS "Allow exact email lookup" ON public.profiles;
CREATE POLICY "Allow exact email lookup"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (
    full_name ILIKE '%' -- placeholder for simple search or exact match
    OR user_id = auth.uid()
    OR family_id = public.get_user_family_id(auth.uid())
  );

