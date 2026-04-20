
-- Create shopping_lists table
CREATE TABLE IF NOT EXISTS public.shopping_lists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  store TEXT,
  date DATE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'active')),
  total_estimated DECIMAL(12,2) DEFAULT 0,
  total_paid DECIMAL(12,2) DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.shopping_lists ENABLE ROW LEVEL SECURITY;

-- Create trigger for updated_at
CREATE TRIGGER update_shopping_lists_updated_at 
  BEFORE UPDATE ON public.shopping_lists 
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Policies for shopping_lists
DROP POLICY IF EXISTS "Family members can view shopping lists" ON public.shopping_lists;
CREATE POLICY "Family members can view shopping lists"
  ON public.shopping_lists FOR SELECT
  TO authenticated
  USING (family_id = public.get_user_family_id(auth.uid()));

DROP POLICY IF EXISTS "Users can create shopping lists for their family" ON public.shopping_lists;
CREATE POLICY "Users can create shopping lists for their family"
  ON public.shopping_lists FOR INSERT
  TO authenticated
  WITH CHECK (
    family_id = public.get_user_family_id(auth.uid())
    AND user_id = auth.uid()
  );

DROP POLICY IF EXISTS "Users can update their family shopping lists" ON public.shopping_lists;
CREATE POLICY "Users can update their family shopping lists"
  ON public.shopping_lists FOR UPDATE
  TO authenticated
  USING (family_id = public.get_user_family_id(auth.uid()));

DROP POLICY IF EXISTS "Users can delete their family shopping lists" ON public.shopping_lists;
CREATE POLICY "Users can delete their family shopping lists"
  ON public.shopping_lists FOR DELETE
  TO authenticated
  USING (family_id = public.get_user_family_id(auth.uid()));


-- Create shopping_list_items table
CREATE TABLE IF NOT EXISTS public.shopping_list_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  list_id UUID NOT NULL REFERENCES public.shopping_lists(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  quantity DECIMAL(12,3) NOT NULL DEFAULT 1,
  unit_price_retail DECIMAL(12,2) DEFAULT 0,
  unit_price_wholesale DECIMAL(12,2) DEFAULT 0,
  min_qty_wholesale DECIMAL(12,3) DEFAULT 0,
  price_type TEXT DEFAULT 'retail' CHECK (price_type IN ('retail', 'wholesale')),
  actual_price_paid DECIMAL(12,2) DEFAULT 0,
  is_collected BOOLEAN DEFAULT false,
  photo_url TEXT,
  tag_photo_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.shopping_list_items ENABLE ROW LEVEL SECURITY;

-- Policies for shopping_list_items
DROP POLICY IF EXISTS "Family members can view shopping list items" ON public.shopping_list_items;
CREATE POLICY "Family members can view shopping list items"
  ON public.shopping_list_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.shopping_lists sl
      WHERE sl.id = list_id
      AND sl.family_id = public.get_user_family_id(auth.uid())
    )
  );

DROP POLICY IF EXISTS "Family members can manage shopping list items" ON public.shopping_list_items;
CREATE POLICY "Family members can manage shopping list items"
  ON public.shopping_list_items FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.shopping_lists sl
      WHERE sl.id = list_id
      AND sl.family_id = public.get_user_family_id(auth.uid())
    )
  );

-- Create family_invitations table
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
