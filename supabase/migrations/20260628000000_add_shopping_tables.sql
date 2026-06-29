-- Add shopping tables to the new Supabase project
-- This mirrors the shopping schema used by the app.

CREATE TABLE IF NOT EXISTS public.shopping_lists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  store TEXT,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'active')),
  total_estimated DECIMAL(12,2) NOT NULL DEFAULT 0,
  total_paid DECIMAL(12,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.shopping_lists ENABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS update_shopping_lists_updated_at ON public.shopping_lists;
CREATE TRIGGER update_shopping_lists_updated_at
  BEFORE UPDATE ON public.shopping_lists
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

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

CREATE TABLE IF NOT EXISTS public.shopping_list_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  list_id UUID NOT NULL REFERENCES public.shopping_lists(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  quantity DECIMAL(12,3) NOT NULL DEFAULT 1,
  unit_price_retail DECIMAL(12,2) NOT NULL DEFAULT 0,
  unit_price_wholesale DECIMAL(12,2) NOT NULL DEFAULT 0,
  min_qty_wholesale DECIMAL(12,3) NOT NULL DEFAULT 0,
  price_type TEXT NOT NULL DEFAULT 'retail' CHECK (price_type IN ('retail', 'wholesale')),
  actual_price_paid DECIMAL(12,2) NOT NULL DEFAULT 0,
  is_collected BOOLEAN NOT NULL DEFAULT false,
  photo_url TEXT,
  tag_photo_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.shopping_list_items ENABLE ROW LEVEL SECURITY;

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
