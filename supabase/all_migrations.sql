
-- 1. ROLE ENUM
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
        CREATE TYPE public.app_role AS ENUM ('admin', 'standard', 'member', 'viewer');
    END IF;
END $$;
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'standard';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'member';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'viewer';

-- 2. FAMILIES TABLE
CREATE TABLE public.families (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.families ENABLE ROW LEVEL SECURITY;

-- 3. PROFILES TABLE
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  avatar_url TEXT,
  family_id UUID REFERENCES public.families(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 4. USER_ROLES TABLE (separate for security)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  role app_role NOT NULL DEFAULT 'standard',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, family_id)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 4.5. FAMILY INVITATIONS TABLE
CREATE TABLE IF NOT EXISTS public.family_invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    role public.app_role NOT NULL DEFAULT 'member',
    invited_by UUID NOT NULL REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(family_id, email)
);
ALTER TABLE public.family_invitations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins veem convites da familia" ON public.family_invitations;
CREATE POLICY "Admins veem convites da familia" ON public.family_invitations
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.user_roles 
            WHERE user_roles.family_id = family_invitations.family_id 
            AND user_roles.user_id = auth.uid() 
            AND user_roles.role = 'admin'
        )
    );

DROP POLICY IF EXISTS "Admins criam convites" ON public.family_invitations;
CREATE POLICY "Admins criam convites" ON public.family_invitations
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.user_roles 
            WHERE user_roles.family_id = family_id 
            AND user_roles.user_id = auth.uid() 
            AND user_roles.role = 'admin'
        )
    );

DROP POLICY IF EXISTS "Admins cancelam convites" ON public.family_invitations;
CREATE POLICY "Admins cancelam convites" ON public.family_invitations
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.user_roles 
            WHERE user_roles.family_id = family_invitations.family_id 
            AND user_roles.user_id = auth.uid() 
            AND user_roles.role = 'admin'
        )
    );

DROP POLICY IF EXISTS "Usuarios veem seus proprios convites" ON public.family_invitations;
CREATE POLICY "Usuarios veem seus proprios convites" ON public.family_invitations
    FOR SELECT USING (
        email = (SELECT email FROM auth.users WHERE id = auth.uid()) OR
        email = (SELECT email FROM profiles WHERE user_id = auth.uid())
    );

-- 5. SECURITY DEFINER: has_role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _family_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND family_id = _family_id
      AND role = _role
  )
$$;

-- 6. SECURITY DEFINER: get_user_family_id
CREATE OR REPLACE FUNCTION public.get_user_family_id(_user_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT family_id FROM public.profiles WHERE user_id = _user_id LIMIT 1
$$;

-- 7. ACCOUNTS TABLE
CREATE TABLE public.accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('checking', 'savings', 'wallet', 'investment')),
  balance DECIMAL(12,2) NOT NULL DEFAULT 0,
  color TEXT,
  icon TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;

-- 8. CARDS TABLE
CREATE TABLE public.cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  last_four TEXT CHECK (char_length(last_four) = 4),
  brand TEXT CHECK (brand IN ('visa', 'mastercard', 'elo', 'amex', 'other')),
  credit_limit DECIMAL(12,2),
  closing_day INT CHECK (closing_day BETWEEN 1 AND 31),
  due_day INT CHECK (due_day BETWEEN 1 AND 31),
  color TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.cards ENABLE ROW LEVEL SECURITY;

-- 9. CATEGORIES TABLE
CREATE TABLE public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID REFERENCES public.families(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  icon TEXT,
  color TEXT,
  type TEXT NOT NULL CHECK (type IN ('expense', 'income')),
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

-- 10. SUBCATEGORIES TABLE
CREATE TABLE public.subcategories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.subcategories ENABLE ROW LEVEL SECURITY;

-- 11. UPDATED_AT TRIGGER FUNCTION
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_families_updated_at BEFORE UPDATE ON public.families FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_accounts_updated_at BEFORE UPDATE ON public.accounts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_cards_updated_at BEFORE UPDATE ON public.cards FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 12. AUTO-CREATE PROFILE ON SIGNUP
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email TEXT;
CREATE INDEX IF NOT EXISTS profiles_email_idx ON public.profiles(email);

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email), NEW.email);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Sync existing profiles
UPDATE public.profiles p
SET email = u.email
FROM auth.users u
WHERE p.user_id = u.id AND p.email IS NULL;

-- 13. RLS POLICIES - FAMILIES
CREATE POLICY "Users can view their family"
  ON public.families FOR SELECT
  TO authenticated
  USING (id = public.get_user_family_id(auth.uid()));

CREATE POLICY "Authenticated users can create families"
  ON public.families FOR INSERT
  TO authenticated
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Admins can update their family"
  ON public.families FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), id, 'admin'));

-- 14. RLS POLICIES - PROFILES
CREATE POLICY "Users can view family members profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (
    family_id = public.get_user_family_id(auth.uid())
    OR user_id = auth.uid()
  );

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "System can insert profiles"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- 15. RLS POLICIES - USER_ROLES
CREATE POLICY "Users can view roles in their family"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (family_id = public.get_user_family_id(auth.uid()));

CREATE POLICY "Admins can manage roles"
  ON public.user_roles FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), family_id, 'admin'));

CREATE POLICY "Admins can update roles"
  ON public.user_roles FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), family_id, 'admin'));

CREATE POLICY "Admins can delete roles"
  ON public.user_roles FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), family_id, 'admin'));

-- 16. RLS POLICIES - ACCOUNTS
CREATE POLICY "Admins see all family accounts, standard sees own"
  ON public.accounts FOR SELECT
  TO authenticated
  USING (
    (family_id = public.get_user_family_id(auth.uid()))
    AND (
      public.has_role(auth.uid(), family_id, 'admin')
      OR user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create own accounts"
  ON public.accounts FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid() AND family_id = public.get_user_family_id(auth.uid()));

CREATE POLICY "Users can update own accounts"
  ON public.accounts FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete own accounts"
  ON public.accounts FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- 17. RLS POLICIES - CARDS
CREATE POLICY "Admins see all family cards, standard sees own"
  ON public.cards FOR SELECT
  TO authenticated
  USING (
    (family_id = public.get_user_family_id(auth.uid()))
    AND (
      public.has_role(auth.uid(), family_id, 'admin')
      OR user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create own cards"
  ON public.cards FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid() AND family_id = public.get_user_family_id(auth.uid()));

CREATE POLICY "Users can update own cards"
  ON public.cards FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete own cards"
  ON public.cards FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- 18. RLS POLICIES - CATEGORIES
CREATE POLICY "Users can view default and family categories"
  ON public.categories FOR SELECT
  TO authenticated
  USING (
    is_default = true
    OR family_id = public.get_user_family_id(auth.uid())
  );

CREATE POLICY "Admins can create family categories"
  ON public.categories FOR INSERT
  TO authenticated
  WITH CHECK (
    family_id = public.get_user_family_id(auth.uid())
    AND public.has_role(auth.uid(), family_id, 'admin')
  );

CREATE POLICY "Admins can update family categories"
  ON public.categories FOR UPDATE
  TO authenticated
  USING (
    family_id IS NOT NULL
    AND public.has_role(auth.uid(), family_id, 'admin')
  );

-- 19. RLS POLICIES - SUBCATEGORIES
CREATE POLICY "Users can view subcategories of visible categories"
  ON public.subcategories FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.categories c
      WHERE c.id = category_id
      AND (c.is_default = true OR c.family_id = public.get_user_family_id(auth.uid()))
    )
  );

CREATE POLICY "Admins can manage subcategories"
  ON public.subcategories FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.categories c
      WHERE c.id = category_id
      AND c.family_id IS NOT NULL
      AND public.has_role(auth.uid(), c.family_id, 'admin')
    )
  );

-- 20. PRE-POPULATED DEFAULT CATEGORIES
INSERT INTO public.categories (name, icon, color, type, is_default) VALUES
  ('AlimentaÃ§Ã£o', 'utensils', '#FF6B6B', 'expense', true),
  ('Transporte', 'car', '#4ECDC4', 'expense', true),
  ('Moradia', 'home', '#45B7D1', 'expense', true),
  ('SaÃºde', 'heart-pulse', '#96CEB4', 'expense', true),
  ('Lazer', 'gamepad-2', '#FFEAA7', 'expense', true),
  ('EducaÃ§Ã£o', 'graduation-cap', '#DDA0DD', 'expense', true),
  ('VestuÃ¡rio', 'shirt', '#F0E68C', 'expense', true),
  ('Assinaturas', 'repeat', '#87CEEB', 'expense', true),
  ('Compras', 'shopping-bag', '#FFA07A', 'expense', true),
  ('Outros', 'ellipsis', '#C0C0C0', 'expense', true),
  ('SalÃ¡rio', 'banknote', '#2ECC71', 'income', true),
  ('Freelance', 'laptop', '#27AE60', 'income', true),
  ('Investimentos', 'trending-up', '#1ABC9C', 'income', true),
  ('Outros', 'ellipsis', '#95A5A6', 'income', true);

INSERT INTO public.subcategories (category_id, name)
SELECT c.id, s.name
FROM public.categories c
CROSS JOIN (VALUES
  ('AlimentaÃ§Ã£o', 'Restaurante'),
  ('AlimentaÃ§Ã£o', 'Supermercado'),
  ('AlimentaÃ§Ã£o', 'Delivery'),
  ('AlimentaÃ§Ã£o', 'Padaria'),
  ('AlimentaÃ§Ã£o', 'CafÃ©'),
  ('Transporte', 'CombustÃ­vel'),
  ('Transporte', 'Uber/99'),
  ('Transporte', 'Transporte pÃºblico'),
  ('Transporte', 'Estacionamento'),
  ('Transporte', 'ManutenÃ§Ã£o veÃ­culo'),
  ('Moradia', 'Aluguel'),
  ('Moradia', 'CondomÃ­nio'),
  ('Moradia', 'Ãgua'),
  ('Moradia', 'Luz'),
  ('Moradia', 'Internet'),
  ('Moradia', 'GÃ¡s'),
  ('SaÃºde', 'FarmÃ¡cia'),
  ('SaÃºde', 'Consulta mÃ©dica'),
  ('SaÃºde', 'Plano de saÃºde'),
  ('SaÃºde', 'Academia'),
  ('Lazer', 'Cinema'),
  ('Lazer', 'Streaming'),
  ('Lazer', 'Viagem'),
  ('Lazer', 'Jogos'),
  ('EducaÃ§Ã£o', 'Escola'),
  ('EducaÃ§Ã£o', 'Faculdade'),
  ('EducaÃ§Ã£o', 'Cursos'),
  ('EducaÃ§Ã£o', 'Livros')
) AS s(cat_name, name)
WHERE c.name = s.cat_name AND c.is_default = true AND c.type = 'expense';

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

DROP POLICY IF EXISTS "Admins can update their family" ON public.families;
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

DROP POLICY IF EXISTS "Users can view roles in their family" ON public.user_roles;
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

-- CREATE TRANSACTIONS TABLE
CREATE TABLE public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  account_id UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
  card_id UUID REFERENCES public.cards(id) ON DELETE SET NULL,
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  subcategory_id UUID REFERENCES public.subcategories(id) ON DELETE SET NULL,
  amount DECIMAL(12,2) NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  description TEXT,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  is_recurring BOOLEAN DEFAULT false,
  status TEXT DEFAULT 'completed' CHECK (status IN ('completed', 'pending', 'cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- RLS POLICIES - TRANSACTIONS
CREATE POLICY "Family members can view all transactions"
  ON public.transactions FOR SELECT
  TO authenticated
  USING (family_id = public.get_user_family_id(auth.uid()));

CREATE POLICY "Users can create transactions for their family"
  ON public.transactions FOR INSERT
  TO authenticated
  WITH CHECK (
    family_id = public.get_user_family_id(auth.uid())
    AND user_id = auth.uid()
  );

CREATE POLICY "Users can update own transactions"
  ON public.transactions FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete own transactions"
  ON public.transactions FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

CREATE TRIGGER update_transactions_updated_at BEFORE UPDATE ON public.transactions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create history_entries table
CREATE TABLE IF NOT EXISTS public.history_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('planilha', 'documento', 'imagem', 'audio')),
    "fileName" TEXT NOT NULL,
    "processedContent" TEXT NOT NULL,
    "userMessage" TEXT NOT NULL,
    "systemResponse" TEXT NOT NULL,
    "fileUrl" TEXT,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.history_entries ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view their own history entries"
    ON public.history_entries FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own history entries"
    ON public.history_entries FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own history entries"
    ON public.history_entries FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own history entries"
    ON public.history_entries FOR DELETE
    USING (auth.uid() = user_id);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_history_entries_user_createdAt ON public.history_entries(user_id, "createdAt" DESC);

-- Create the trigger to automatically create a profile for new users
-- This was missing from previous migrations
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'on_auth_user_created'
  ) THEN
    CREATE TRIGGER on_auth_user_created
      AFTER INSERT ON auth.users
      FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
  END IF;
END $$;

-- Manual sync for existing users who might be missing a profile
-- This ensures that users created while the trigger was missing are and can be found
INSERT INTO public.profiles (user_id, full_name, email)
SELECT 
  u.id, 
  COALESCE(u.raw_user_meta_data->>'full_name', u.email), 
  u.email
FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.user_id
WHERE p.id IS NULL
ON CONFLICT (user_id) DO NOTHING;

-- Update the RLS policy for profiles to allow better discovery
-- The previous policy might have been too restrictive if full_name was NULL
DROP POLICY IF EXISTS "Allow exact email lookup" ON public.profiles;

CREATE POLICY "Allow email lookup for invitations"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (
    true -- Allow all authenticated users to search profiles (needed for invitations)
    -- We can restrict the columns in the frontend, but for RLS, they need to be able to see the row to find it
  );

-- Ensure email is stored in a way that respects the index
-- and is consistent for searches
CREATE INDEX IF NOT EXISTS profiles_email_lower_idx ON public.profiles (LOWER(email));

-- Create an RPC to safely invite and add a member to a family
CREATE OR REPLACE FUNCTION public.add_family_member(
  p_user_email TEXT,
  p_family_id UUID,
  p_role app_role DEFAULT 'standard'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_target_user_id UUID;
  v_target_full_name TEXT;
  v_is_authorized BOOLEAN;
BEGIN
  -- 1. Check if caller is admin or creator
  SELECT true INTO v_is_authorized
  FROM public.user_roles
  WHERE user_id = auth.uid() AND family_id = p_family_id AND role = 'admin';

  IF v_is_authorized IS NULL THEN
    SELECT true INTO v_is_authorized
    FROM public.families
    WHERE id = p_family_id AND created_by = auth.uid();
    
    IF v_is_authorized IS NULL THEN
      RAISE EXCEPTION 'Acesso negado: VocÃª nÃ£o Ã© administrador desta famÃ­lia.';
    END IF;
  END IF;

  -- 2. Find target user by email
  SELECT user_id, full_name INTO v_target_user_id, v_target_full_name
  FROM public.profiles
  WHERE email ILIKE trim(p_user_email)
  LIMIT 1;

  IF v_target_user_id IS NULL THEN
    RAISE EXCEPTION 'UsuÃ¡rio nÃ£o encontrado. Solicite que crie uma conta primeiro.';
  END IF;

  -- 3. Check if user is already in this family
  IF EXISTS (
    SELECT 1 FROM public.profiles WHERE user_id = v_target_user_id AND family_id = p_family_id
  ) THEN
    RAISE EXCEPTION 'Este usuÃ¡rio jÃ¡ faz parte da famÃ­lia!';
  END IF;

  -- 4. Insert or update user_roles
  INSERT INTO public.user_roles (user_id, family_id, role)
  VALUES (v_target_user_id, p_family_id, p_role)
  ON CONFLICT (user_id, family_id) DO UPDATE SET role = EXCLUDED.role;

  -- 5. Update profiles.family_id
  UPDATE public.profiles
  SET family_id = p_family_id
  WHERE user_id = v_target_user_id;

  -- Return success as JSONB
  RETURN jsonb_build_object(
    'success', true,
    'user_id', v_target_user_id,
    'full_name', v_target_full_name
  );
END;
$$;

-- Create AI Insights table for caching analysis results
CREATE TABLE IF NOT EXISTS public.ai_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  content JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ai_insights ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Family members can view AI insights"
  ON public.ai_insights FOR SELECT
  TO authenticated
  USING (family_id = public.get_user_family_id(auth.uid()));

CREATE POLICY "System can manage AI insights"
  ON public.ai_insights FOR ALL
  TO authenticated
  USING (family_id = public.get_user_family_id(auth.uid()))
  WITH CHECK (family_id = public.get_user_family_id(auth.uid()));

-- Trigger for updated_at
CREATE TRIGGER update_ai_insights_updated_at 
  BEFORE UPDATE ON public.ai_insights 
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enable Admins to delete family data for full reset functionality

-- 1. Transactions
CREATE POLICY "Admins can delete any family transaction"
  ON public.transactions FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), family_id, 'admin'));

-- 2. Cards
CREATE POLICY "Admins can delete any family card"
  ON public.cards FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), family_id, 'admin'));

-- 3. Accounts
CREATE POLICY "Admins can delete any family account"
  ON public.accounts FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), family_id, 'admin'));

-- 4. Goals
CREATE POLICY "Admins can delete any family goal"
  ON public.goals FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), family_id, 'admin'));

-- 5. History Entries
-- CREATE POLICY "Admins can delete any family history entry"
--   ON public.history_entries FOR DELETE
--   TO authenticated
--   USING (public.has_role(auth.uid(), family_id, 'admin'));

-- 6. Shopping Lists
-- CREATE POLICY "Admins can delete any family shopping list"
--   ON public.shopping_lists FOR DELETE
--   TO authenticated
--   USING (public.has_role(auth.uid(), family_id, 'admin'));

-- 7. Shopping List Items (cascades usually, but just in case)
-- CREATE POLICY "Admins can delete any family shopping list item"
--   ON public.shopping_list_items FOR DELETE
--   TO authenticated
--   USING (
--     EXISTS (
--       SELECT 1 FROM public.shopping_lists sl
--       WHERE sl.id = list_id
--       AND public.has_role(auth.uid(), sl.family_id, 'admin')
--     )
--   );

-- 8. AI Insights
CREATE POLICY "Admins can delete any family insight"
  ON public.ai_insights FOR DELETE
  TO authenticated
  USING (family_id = public.get_user_family_id(auth.uid()));

-- 9. Custom Categories
CREATE POLICY "Admins can delete family categories"
  ON public.categories FOR DELETE
  TO authenticated
  USING (
    family_id IS NOT NULL 
    AND public.has_role(auth.uid(), family_id, 'admin')
  );
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS avatar_url TEXT;

INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Public avatar reads" ON storage.objects;
CREATE POLICY "Public avatar reads"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "Users can upload own avatar" ON storage.objects;
CREATE POLICY "Users can upload own avatar"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "Users can update own avatar" ON storage.objects;
CREATE POLICY "Users can update own avatar"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "Users can delete own avatar" ON storage.objects;
CREATE POLICY "Users can delete own avatar"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = auth.uid()::text
);
ALTER TABLE public.transactions
ADD COLUMN IF NOT EXISTS payment_type TEXT;

ALTER TABLE public.transactions
DROP CONSTRAINT IF EXISTS transactions_payment_type_check;

ALTER TABLE public.transactions
ADD CONSTRAINT transactions_payment_type_check
CHECK (payment_type IN ('cash', 'credit_card') OR payment_type IS NULL);

ALTER TABLE public.transactions
DROP CONSTRAINT IF EXISTS transactions_payment_consistency_check;

ALTER TABLE public.transactions
ADD CONSTRAINT transactions_payment_consistency_check
CHECK (
  (
    type = 'income'
    AND payment_type IS NULL
  )
  OR (
    type = 'expense'
    AND payment_type = 'cash'
    AND card_id IS NULL
  )
  OR (
    type = 'expense'
    AND payment_type = 'credit_card'
    AND card_id IS NOT NULL
  )
);
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'profiles'
      AND policyname = 'Allow email lookup for invitations'
  ) THEN
    DROP POLICY "Allow email lookup for invitations" ON public.profiles;
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.invite_family_member(
  p_family_id UUID,
  p_email TEXT,
  p_role public.app_role DEFAULT 'member'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email TEXT := lower(trim(p_email));
  v_target_profile public.profiles%ROWTYPE;
  v_invitation public.family_invitations%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Não autorizado.';
  END IF;

  IF p_role NOT IN ('admin', 'standard', 'member', 'viewer') THEN
    RAISE EXCEPTION 'Papel inválido.';
  END IF;

  IF v_email = '' THEN
    RAISE EXCEPTION 'E-mail invÃ¡lido.';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = auth.uid()
      AND family_id = p_family_id
      AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Apenas administradores podem convidar membros.';
  END IF;

  SELECT *
  INTO v_target_profile
  FROM public.profiles
  WHERE lower(email) = v_email
  LIMIT 1;

  IF FOUND THEN
    IF v_target_profile.family_id IS NOT NULL THEN
      RAISE EXCEPTION 'Este usuÃ¡rio jÃ¡ pertence a uma famÃ­lia.';
    END IF;

    UPDATE public.profiles
    SET family_id = p_family_id
    WHERE user_id = v_target_profile.user_id;

    INSERT INTO public.user_roles (user_id, family_id, role)
    VALUES (v_target_profile.user_id, p_family_id, p_role)
    ON CONFLICT (user_id, family_id)
    DO UPDATE SET role = EXCLUDED.role;

    DELETE FROM public.family_invitations
    WHERE family_id = p_family_id
      AND lower(email) = v_email;

    RETURN jsonb_build_object(
      'status', 'linked',
      'user_id', v_target_profile.user_id,
      'full_name', v_target_profile.full_name,
      'email', v_target_profile.email
    );
  END IF;

  INSERT INTO public.family_invitations (family_id, email, role, invited_by)
  VALUES (p_family_id, v_email, p_role, auth.uid())
  ON CONFLICT (family_id, email)
  DO UPDATE SET
    role = EXCLUDED.role,
    invited_by = EXCLUDED.invited_by,
    created_at = timezone('utc'::text, now())
  RETURNING *
  INTO v_invitation;

  RETURN jsonb_build_object(
    'status', 'invited',
    'invite_id', v_invitation.id,
    'email', v_invitation.email
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.accept_my_family_invitation()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile public.profiles%ROWTYPE;
  v_invitation public.family_invitations%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'NÃ£o autorizado.';
  END IF;

  SELECT *
  INTO v_profile
  FROM public.profiles
  WHERE user_id = auth.uid()
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Perfil nÃ£o encontrado.';
  END IF;

  IF v_profile.family_id IS NOT NULL THEN
    RETURN jsonb_build_object(
      'accepted', false,
      'reason', 'already_has_family',
      'family_id', v_profile.family_id
    );
  END IF;

  SELECT *
  INTO v_invitation
  FROM public.family_invitations
  WHERE lower(email) = lower(coalesce(v_profile.email, ''))
  ORDER BY created_at DESC
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'accepted', false,
      'reason', 'no_invitation'
    );
  END IF;

  UPDATE public.profiles
  SET family_id = v_invitation.family_id
  WHERE user_id = auth.uid();

  INSERT INTO public.user_roles (user_id, family_id, role)
  VALUES (auth.uid(), v_invitation.family_id, v_invitation.role)
  ON CONFLICT (user_id, family_id)
  DO UPDATE SET role = EXCLUDED.role;

  DELETE FROM public.family_invitations
  WHERE id = v_invitation.id;

  RETURN jsonb_build_object(
    'accepted', true,
    'family_id', v_invitation.family_id,
    'role', v_invitation.role
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.list_family_pending_invitations(
  p_family_id UUID
)
RETURNS TABLE (
  id UUID,
  email TEXT,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'NÃ£o autorizado.';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = auth.uid()
      AND family_id = p_family_id
      AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Apenas administradores podem ver convites pendentes.';
  END IF;

  RETURN QUERY
  SELECT family_invitations.id, family_invitations.email, family_invitations.created_at
  FROM public.family_invitations
  WHERE family_invitations.family_id = p_family_id
  ORDER BY family_invitations.created_at DESC;
END;
$$;

CREATE OR REPLACE FUNCTION public.cancel_family_invitation(
  p_invite_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invitation public.family_invitations%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'NÃ£o autorizado.';
  END IF;

  SELECT *
  INTO v_invitation
  FROM public.family_invitations
  WHERE id = p_invite_id
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Convite nÃ£o encontrado.';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = auth.uid()
      AND family_id = v_invitation.family_id
      AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Apenas administradores podem cancelar convites.';
  END IF;

  DELETE FROM public.family_invitations
  WHERE id = v_invitation.id;

  RETURN jsonb_build_object(
    'cancelled', true,
    'invite_id', v_invitation.id
  );
END;
$$;

REVOKE ALL ON FUNCTION public.invite_family_member(UUID, TEXT, public.app_role) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.accept_my_family_invitation() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.list_family_pending_invitations(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.cancel_family_invitation(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.invite_family_member(UUID, TEXT, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.accept_my_family_invitation() TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_family_pending_invitations(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_family_invitation(UUID) TO authenticated;
-- 1) Adiciona colunas em transactions
ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS payment_type TEXT,
  ADD COLUMN IF NOT EXISTS card_id UUID REFERENCES public.cards(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS created_by UUID;

-- 2) Backfill: created_by = user_id quando nulo
UPDATE public.transactions
SET created_by = user_id
WHERE created_by IS NULL;

-- 3) NÃ£o obrigamos NOT NULL para evitar quebra de inserts antigos,
--    mas adicionamos trigger que preenche created_by automaticamente.
CREATE OR REPLACE FUNCTION public.set_transaction_created_by()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.created_by IS NULL THEN
    NEW.created_by := COALESCE(auth.uid(), NEW.user_id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_transaction_created_by ON public.transactions;
CREATE TRIGGER trg_set_transaction_created_by
BEFORE INSERT ON public.transactions
FOR EACH ROW
EXECUTE FUNCTION public.set_transaction_created_by();

-- 4) ValidaÃ§Ã£o leve do payment_type via trigger (evita CHECK rÃ­gido)
CREATE OR REPLACE FUNCTION public.validate_transaction_payment()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.payment_type IS NOT NULL
     AND NEW.payment_type NOT IN ('cash', 'credit_card') THEN
    RAISE EXCEPTION 'payment_type invÃ¡lido: %', NEW.payment_type;
  END IF;

  IF NEW.payment_type <> 'credit_card' THEN
    NEW.card_id := NULL;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_transaction_payment ON public.transactions;
CREATE TRIGGER trg_validate_transaction_payment
BEFORE INSERT OR UPDATE ON public.transactions
FOR EACH ROW
EXECUTE FUNCTION public.validate_transaction_payment();

-- 5) Ãndices
CREATE INDEX IF NOT EXISTS idx_transactions_card_id ON public.transactions(card_id);
CREATE INDEX IF NOT EXISTS idx_transactions_created_by ON public.transactions(created_by);
-- MigraÃ§Ã£o de Performance: Ãndices para otimizaÃ§Ã£o de consultas
-- Criado em: 2026-04-18

-- 1. Ãndices para Tabela de TransaÃ§Ãµes (Crucial para Home e HistÃ³rico)
CREATE INDEX IF NOT EXISTS idx_transactions_family_date 
  ON public.transactions(family_id, date DESC);

CREATE INDEX IF NOT EXISTS idx_transactions_category 
  ON public.transactions(category_id);

-- 2. Ãndices para Tabelas de Ativos
CREATE INDEX IF NOT EXISTS idx_cards_family 
  ON public.cards(family_id);

CREATE INDEX IF NOT EXISTS idx_accounts_family 
  ON public.accounts(family_id);

-- 3. Ãndice para Categorias
CREATE INDEX IF NOT EXISTS idx_categories_family 
  ON public.categories(family_id) WHERE family_id IS NOT NULL;

-- 4. AnÃ¡lise e OtimizaÃ§Ã£o
ANALYZE public.transactions;
ANALYZE public.cards;
ANALYZE public.accounts;
ANALYZE public.categories;
