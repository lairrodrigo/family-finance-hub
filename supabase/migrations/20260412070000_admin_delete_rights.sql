
-- Enable Admins to delete family data for full reset functionality

-- 1. Transactions
DROP POLICY IF EXISTS "Admins can delete any family transaction" ON public.transactions;
CREATE POLICY "Admins can delete any family transaction"
  ON public.transactions FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), family_id, 'admin'));

-- 2. Cards
DROP POLICY IF EXISTS "Admins can delete any family card" ON public.cards;
CREATE POLICY "Admins can delete any family card"
  ON public.cards FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), family_id, 'admin'));

-- 3. Accounts
DROP POLICY IF EXISTS "Admins can delete any family account" ON public.accounts;
CREATE POLICY "Admins can delete any family account"
  ON public.accounts FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), family_id, 'admin'));

-- 4. Goals
DROP POLICY IF EXISTS "Admins can delete any family goal" ON public.goals;
CREATE POLICY "Admins can delete any family goal"
  ON public.goals FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), family_id, 'admin'));

-- 5. History Entries
DROP POLICY IF EXISTS "Admins can delete any family history entry" ON public.history_entries;
CREATE POLICY "Admins can delete any family history entry"
  ON public.history_entries FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), family_id, 'admin'));

-- 6. Shopping Lists
DROP POLICY IF EXISTS "Admins can delete any family shopping list" ON public.shopping_lists;
CREATE POLICY "Admins can delete any family shopping list"
  ON public.shopping_lists FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), family_id, 'admin'));

-- 7. Shopping List Items (cascades usually, but just in case)
DROP POLICY IF EXISTS "Admins can delete any family shopping list item" ON public.shopping_list_items;
CREATE POLICY "Admins can delete any family shopping list item"
  ON public.shopping_list_items FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.shopping_lists sl
      WHERE sl.id = list_id
      AND public.has_role(auth.uid(), sl.family_id, 'admin')
    )
  );

-- 8. AI Insights
DROP POLICY IF EXISTS "Admins can delete any family insight" ON public.ai_insights;
CREATE POLICY "Admins can delete any family insight"
  ON public.ai_insights FOR DELETE
  TO authenticated
  USING (family_id = public.get_user_family_id(auth.uid()));

-- 9. Custom Categories
DROP POLICY IF EXISTS "Admins can delete family categories" ON public.categories;
CREATE POLICY "Admins can delete family categories"
  ON public.categories FOR DELETE
  TO authenticated
  USING (
    family_id IS NOT NULL 
    AND public.has_role(auth.uid(), family_id, 'admin')
  );
