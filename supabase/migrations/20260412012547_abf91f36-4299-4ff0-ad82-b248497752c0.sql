
-- 1. ROLE ENUM
CREATE TYPE public.app_role AS ENUM ('admin', 'standard');

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
  ('Alimentação', 'utensils', '#FF6B6B', 'expense', true),
  ('Transporte', 'car', '#4ECDC4', 'expense', true),
  ('Moradia', 'home', '#45B7D1', 'expense', true),
  ('Saúde', 'heart-pulse', '#96CEB4', 'expense', true),
  ('Lazer', 'gamepad-2', '#FFEAA7', 'expense', true),
  ('Educação', 'graduation-cap', '#DDA0DD', 'expense', true),
  ('Vestuário', 'shirt', '#F0E68C', 'expense', true),
  ('Assinaturas', 'repeat', '#87CEEB', 'expense', true),
  ('Compras', 'shopping-bag', '#FFA07A', 'expense', true),
  ('Outros', 'ellipsis', '#C0C0C0', 'expense', true),
  ('Salário', 'banknote', '#2ECC71', 'income', true),
  ('Freelance', 'laptop', '#27AE60', 'income', true),
  ('Investimentos', 'trending-up', '#1ABC9C', 'income', true),
  ('Outros', 'ellipsis', '#95A5A6', 'income', true);

INSERT INTO public.subcategories (category_id, name)
SELECT c.id, s.name
FROM public.categories c
CROSS JOIN (VALUES
  ('Alimentação', 'Restaurante'),
  ('Alimentação', 'Supermercado'),
  ('Alimentação', 'Delivery'),
  ('Alimentação', 'Padaria'),
  ('Alimentação', 'Café'),
  ('Transporte', 'Combustível'),
  ('Transporte', 'Uber/99'),
  ('Transporte', 'Transporte público'),
  ('Transporte', 'Estacionamento'),
  ('Transporte', 'Manutenção veículo'),
  ('Moradia', 'Aluguel'),
  ('Moradia', 'Condomínio'),
  ('Moradia', 'Água'),
  ('Moradia', 'Luz'),
  ('Moradia', 'Internet'),
  ('Moradia', 'Gás'),
  ('Saúde', 'Farmácia'),
  ('Saúde', 'Consulta médica'),
  ('Saúde', 'Plano de saúde'),
  ('Saúde', 'Academia'),
  ('Lazer', 'Cinema'),
  ('Lazer', 'Streaming'),
  ('Lazer', 'Viagem'),
  ('Lazer', 'Jogos'),
  ('Educação', 'Escola'),
  ('Educação', 'Faculdade'),
  ('Educação', 'Cursos'),
  ('Educação', 'Livros')
) AS s(cat_name, name)
WHERE c.name = s.cat_name AND c.is_default = true AND c.type = 'expense';
