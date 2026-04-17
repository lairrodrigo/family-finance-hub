-- ==========================================
-- SCRIPT DE CONFIGURAÇÃO DE CONTROLE DE ACESSO (RBAC)
-- Copie e cole este script no Painel SQL do Supabase
-- ==========================================

-- 1. Atualizar os Papéis (Roles)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
        CREATE TYPE public.app_role AS ENUM ('admin', 'member', 'viewer');
    END IF;
END $$;

-- Adiciona novos valores se não existirem (Fora de blocos DO para evitar erros do Postgres)
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'member';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'viewer';

-- 2. Migração de Dados: 'standard' para 'member'
-- (Se o seu banco ainda usa 'standard', movemos para o novo padrão)
UPDATE public.user_roles 
SET role = 'member'::public.app_role 
WHERE role::text = 'standard';

-- 3. Função Auxiliar de Permissão (Melhorada)
-- Retorna o papel do usuário logado na família especificada
CREATE OR REPLACE FUNCTION public.get_role_in_family(_family_id uuid)
RETURNS public.app_role AS $$
    SELECT role FROM public.user_roles 
    WHERE user_id = auth.uid() AND family_id = _family_id;
$$ LANGUAGE sql SECURITY DEFINER;

-- 4. ATUALIZAÇÃO DAS POLÍTICAS DE RLS --

-- Configuração inicial: garante que RLS está ativo em tudo
ALTER TABLE public.families ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shopping_lists ENABLE ROW LEVEL SECURITY;

-- Transações (Onde o Membro pode fazer quase tudo, Viewer nada)
DROP POLICY IF EXISTS "Membros visualizam transações da família" ON public.transactions;
CREATE POLICY "Membros visualizam transações da família" ON public.transactions
    FOR SELECT USING (public.get_role_in_family(family_id) IS NOT NULL);

DROP POLICY IF EXISTS "Admin e Membros criam transações" ON public.transactions;
CREATE POLICY "Admin e Membros criam transações" ON public.transactions
    FOR INSERT WITH CHECK (public.get_role_in_family(family_id) IN ('admin', 'member'));

DROP POLICY IF EXISTS "Proprietário ou Admin edita transações" ON public.transactions;
CREATE POLICY "Proprietário ou Admin edita transações" ON public.transactions
    FOR UPDATE USING (
        (auth.uid() = user_id AND public.get_role_in_family(family_id) = 'member') OR 
        public.get_role_in_family(family_id) = 'admin'
    );

DROP POLICY IF EXISTS "Proprietário ou Admin deleta transações" ON public.transactions;
CREATE POLICY "Proprietário ou Admin deleta transações" ON public.transactions
    FOR DELETE USING (
        (auth.uid() = user_id AND public.get_role_in_family(family_id) = 'member') OR 
        public.get_role_in_family(family_id) = 'admin'
    );

-- Gestão da Família e Papeis (Apenas Admin)
DROP POLICY IF EXISTS "Admin gerencia papéis da família" ON public.user_roles;
CREATE POLICY "Admin gerencia papéis da família" ON public.user_roles
    FOR ALL USING (public.get_role_in_family(family_id) = 'admin');

-- Visualização de papéis (Todos na família)
DROP POLICY IF EXISTS "Ver membros da família" ON public.user_roles;
CREATE POLICY "Ver membros da família" ON public.user_roles
    FOR SELECT USING (public.get_role_in_family(family_id) IS NOT NULL);

-- Metas, Cartões e Contas (Gerenciamento apenas Admin, Visualização para todos)
-- (Repetir para goals, cards, accounts)

-- Exemplo para Goals:
DROP POLICY IF EXISTS "Membros visualizam metas" ON public.goals;
CREATE POLICY "Membros visualizam metas" ON public.goals
    FOR SELECT USING (public.get_role_in_family(family_id) IS NOT NULL);

DROP POLICY IF EXISTS "Apenas Admin gerencia metas" ON public.goals;
CREATE POLICY "Apenas Admin gerencia metas" ON public.goals
    FOR ALL USING (public.get_role_in_family(family_id) = 'admin');

-- Exemplo para Cards:
DROP POLICY IF EXISTS "Membros visualizam cartões" ON public.cards;
CREATE POLICY "Membros visualizam cartões" ON public.cards
    FOR SELECT USING (public.get_role_in_family(family_id) IS NOT NULL);

DROP POLICY IF EXISTS "Apenas Admin gerencia cartões" ON public.cards;
CREATE POLICY "Apenas Admin gerencia cartões" ON public.cards
    FOR ALL USING (public.get_role_in_family(family_id) = 'admin');

-- Comentário final: 
-- Lembre-se de revisar as permissões de SELECT para garantir que 'viewer' 
-- está incluído no check 'IS NOT NULL' (que engloba qualquer role).
