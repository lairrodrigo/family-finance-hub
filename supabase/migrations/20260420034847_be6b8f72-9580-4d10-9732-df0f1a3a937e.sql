
-- ============================================
-- 1. RECRIAR TRIGGERS AUSENTES
-- ============================================

-- Trigger: criar profile ao registrar novo usuário
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Trigger: definir autoria automática em transactions
DROP TRIGGER IF EXISTS trg_set_transaction_created_by ON public.transactions;
CREATE TRIGGER trg_set_transaction_created_by
  BEFORE INSERT ON public.transactions
  FOR EACH ROW EXECUTE FUNCTION public.set_transaction_created_by();

-- Trigger: validar payment_type e limpar card_id se não for cartão
DROP TRIGGER IF EXISTS trg_validate_transaction_payment ON public.transactions;
CREATE TRIGGER trg_validate_transaction_payment
  BEFORE INSERT OR UPDATE ON public.transactions
  FOR EACH ROW EXECUTE FUNCTION public.validate_transaction_payment();

-- Trigger: atualizar progresso de metas
DROP TRIGGER IF EXISTS trg_handle_goal_contribution ON public.transactions;
CREATE TRIGGER trg_handle_goal_contribution
  AFTER INSERT OR UPDATE OR DELETE ON public.transactions
  FOR EACH ROW EXECUTE FUNCTION public.handle_goal_contribution();

-- Triggers: updated_at automático
DROP TRIGGER IF EXISTS trg_profiles_updated_at ON public.profiles;
CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_families_updated_at ON public.families;
CREATE TRIGGER trg_families_updated_at
  BEFORE UPDATE ON public.families
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_cards_updated_at ON public.cards;
CREATE TRIGGER trg_cards_updated_at
  BEFORE UPDATE ON public.cards
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_accounts_updated_at ON public.accounts;
CREATE TRIGGER trg_accounts_updated_at
  BEFORE UPDATE ON public.accounts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_goals_updated_at ON public.goals;
CREATE TRIGGER trg_goals_updated_at
  BEFORE UPDATE ON public.goals
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- 2. LIMPAR POLICIES DUPLICADAS / CONFLITANTES
-- ============================================

-- TRANSACTIONS: remover policies antigas em "public" role
DROP POLICY IF EXISTS "Admin e Membros criam transações" ON public.transactions;
DROP POLICY IF EXISTS "Membros visualizam transações da família" ON public.transactions;
DROP POLICY IF EXISTS "Proprietário ou Admin deleta transações" ON public.transactions;
DROP POLICY IF EXISTS "Proprietário ou Admin edita transações" ON public.transactions;
DROP POLICY IF EXISTS "Users can create transactions" ON public.transactions;
DROP POLICY IF EXISTS "Users can delete family transactions" ON public.transactions;
DROP POLICY IF EXISTS "Family members can view all transactions" ON public.transactions;

-- TRANSACTIONS: criar policies finais limpas
CREATE POLICY "tx_select_family" ON public.transactions
  FOR SELECT TO authenticated
  USING (family_id = public.get_user_family_id(auth.uid()));

CREATE POLICY "tx_insert_admin_or_member" ON public.transactions
  FOR INSERT TO authenticated
  WITH CHECK (
    family_id = public.get_user_family_id(auth.uid())
    AND user_id = auth.uid()
    AND public.get_role_in_family(family_id) IN ('admin', 'member')
  );

CREATE POLICY "tx_update_owner_or_admin" ON public.transactions
  FOR UPDATE TO authenticated
  USING (
    family_id = public.get_user_family_id(auth.uid())
    AND (user_id = auth.uid() OR public.get_role_in_family(family_id) = 'admin')
  );

CREATE POLICY "tx_delete_owner_or_admin" ON public.transactions
  FOR DELETE TO authenticated
  USING (
    family_id = public.get_user_family_id(auth.uid())
    AND (user_id = auth.uid() OR public.get_role_in_family(family_id) = 'admin')
  );

-- CARDS: remover duplicadas
DROP POLICY IF EXISTS "Apenas Admin gerencia cartões" ON public.cards;
DROP POLICY IF EXISTS "Membros visualizam cartões" ON public.cards;
DROP POLICY IF EXISTS "Admins see all family cards, standard sees own" ON public.cards;
DROP POLICY IF EXISTS "Users can create own cards" ON public.cards;
DROP POLICY IF EXISTS "Users can delete own cards" ON public.cards;
DROP POLICY IF EXISTS "Users can update own cards" ON public.cards;

CREATE POLICY "cards_select_family" ON public.cards
  FOR SELECT TO authenticated
  USING (family_id = public.get_user_family_id(auth.uid()));

CREATE POLICY "cards_insert_admin_or_member" ON public.cards
  FOR INSERT TO authenticated
  WITH CHECK (
    family_id = public.get_user_family_id(auth.uid())
    AND user_id = auth.uid()
    AND public.get_role_in_family(family_id) IN ('admin', 'member')
  );

CREATE POLICY "cards_update_owner_or_admin" ON public.cards
  FOR UPDATE TO authenticated
  USING (
    family_id = public.get_user_family_id(auth.uid())
    AND (user_id = auth.uid() OR public.get_role_in_family(family_id) = 'admin')
  );

CREATE POLICY "cards_delete_owner_or_admin" ON public.cards
  FOR DELETE TO authenticated
  USING (
    family_id = public.get_user_family_id(auth.uid())
    AND (user_id = auth.uid() OR public.get_role_in_family(family_id) = 'admin')
  );

-- GOALS: remover duplicadas
DROP POLICY IF EXISTS "Apenas Admin gerencia metas" ON public.goals;
DROP POLICY IF EXISTS "Membros visualizam metas" ON public.goals;
DROP POLICY IF EXISTS "Users can create goals for their family" ON public.goals;
DROP POLICY IF EXISTS "Users can delete their own goals" ON public.goals;
DROP POLICY IF EXISTS "Users can update their own goals" ON public.goals;
DROP POLICY IF EXISTS "Users can view family goals" ON public.goals;

CREATE POLICY "goals_select_family" ON public.goals
  FOR SELECT TO authenticated
  USING (family_id = public.get_user_family_id(auth.uid()));

CREATE POLICY "goals_insert_admin_or_member" ON public.goals
  FOR INSERT TO authenticated
  WITH CHECK (
    family_id = public.get_user_family_id(auth.uid())
    AND user_id = auth.uid()
    AND public.get_role_in_family(family_id) IN ('admin', 'member')
  );

CREATE POLICY "goals_update_owner_or_admin" ON public.goals
  FOR UPDATE TO authenticated
  USING (
    family_id = public.get_user_family_id(auth.uid())
    AND (user_id = auth.uid() OR public.get_role_in_family(family_id) = 'admin')
  );

CREATE POLICY "goals_delete_owner_or_admin" ON public.goals
  FOR DELETE TO authenticated
  USING (
    family_id = public.get_user_family_id(auth.uid())
    AND (user_id = auth.uid() OR public.get_role_in_family(family_id) = 'admin')
  );

-- USER_ROLES: remover duplicadas
DROP POLICY IF EXISTS "Admin gerencia papéis da família" ON public.user_roles;
DROP POLICY IF EXISTS "Ver membros da família" ON public.user_roles;

-- FAMILIES: remover SELECT duplicada
DROP POLICY IF EXISTS "Users can view their own family" ON public.families;

-- ============================================
-- 3. CORRIGIR search_path nas 2 funções legadas
-- ============================================

CREATE OR REPLACE FUNCTION public.get_role_in_family(_family_id uuid)
RETURNS public.app_role
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT role FROM public.user_roles 
  WHERE user_id = auth.uid() AND family_id = _family_id;
$$;

CREATE OR REPLACE FUNCTION public.get_financial_insights()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_family_id UUID;
    v_total_income DECIMAL(12,2) := 0;
    v_total_expense DECIMAL(12,2) := 0;
    v_balance DECIMAL(12,2) := 0;
    v_top_category TEXT;
    v_top_category_amount DECIMAL(12,2) := 0;
    v_insights JSONB := '[]'::jsonb;
BEGIN
    SELECT family_id INTO v_family_id FROM public.profiles WHERE user_id = auth.uid();
    IF v_family_id IS NULL THEN
        RETURN jsonb_build_object('insights', v_insights);
    END IF;

    SELECT 
        COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0)
    INTO v_total_income, v_total_expense
    FROM public.transactions
    WHERE family_id = v_family_id 
      AND date_trunc('month', date) = date_trunc('month', CURRENT_DATE);

    v_balance := v_total_income - v_total_expense;

    IF v_balance < 0 THEN
        v_insights := v_insights || jsonb_build_object(
            'title', 'Saldo do mês: R$' || v_balance,
            'text', 'Atenção! Seus gastos estão superando suas receitas este mês.',
            'type', 'warning'
        );
    ELSEIF v_balance > 0 THEN
        v_insights := v_insights || jsonb_build_object(
            'title', 'Saldo Positivo: R$' || v_balance,
            'text', 'Parabéns! Você está economizando este mês.',
            'type', 'success'
        );
    END IF;

    SELECT c.name, SUM(t.amount) INTO v_top_category, v_top_category_amount
    FROM public.transactions t
    JOIN public.categories c ON t.category_id = c.id
    WHERE t.family_id = v_family_id 
      AND t.type = 'expense'
      AND date_trunc('month', t.date) = date_trunc('month', CURRENT_DATE)
    GROUP BY c.name
    ORDER BY 2 DESC
    LIMIT 1;

    IF v_top_category IS NOT NULL THEN
        v_insights := v_insights || jsonb_build_object(
            'title', 'Maior gasto: ' || v_top_category,
            'text', 'Você já gastou R$' || v_top_category_amount || ' com ' || v_top_category || ' este mês.',
            'type', 'info'
        );
    END IF;

    v_insights := v_insights || jsonb_build_object(
        'title', 'Planejamento Familiar',
        'text', 'Mantenha gastos fixos abaixo de 50% da renda total.',
        'type', 'info'
    );

    RETURN jsonb_build_object('insights', v_insights);
END;
$$;
