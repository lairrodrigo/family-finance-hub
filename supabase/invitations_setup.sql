-- 0. Garantir que o tipo enum existe e tem os valores necessários
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
        CREATE TYPE public.app_role AS ENUM ('admin', 'member', 'viewer');
    END IF;
END $$;
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'member';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'viewer';

-- 1. Criar a tabela de convites
CREATE TABLE IF NOT EXISTS public.family_invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    role public.app_role NOT NULL DEFAULT 'member',
    invited_by UUID NOT NULL REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    
    -- Garante que não haja convites duplicados para o mesmo e-mail na mesma família
    UNIQUE(family_id, email)
);

-- 2. Habilitar RLS
ALTER TABLE public.family_invitations ENABLE ROW LEVEL SECURITY;

-- 3. Políticas de RLS
-- Apenas Admins da família podem ver os convites
DROP POLICY IF EXISTS "Admins veem convites da família" ON public.family_invitations;
CREATE POLICY "Admins veem convites da família" ON public.family_invitations
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.user_roles 
            WHERE user_roles.family_id = family_invitations.family_id 
            AND user_roles.user_id = auth.uid() 
            AND user_roles.role = 'admin'
        )
    );

-- Apenas Admins da família podem criar convites
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

-- Apenas Admins da família podem deletar convites
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

-- 4. Permitir que o sistema (service_role ou trigger se necessário) visualize convites por e-mail no login
-- No caso do frontend, faremos o check usando service_role via edge function ou garantindo que o AuthContext 
-- possa ler se o e-mail bate com o do convite.
-- Por agora, vamos permitir que qualquer usuário logado veja seus PRÓPRIOS convites (pelo e-mail)
DROP POLICY IF EXISTS "Usuários veem seus próprios convites" ON public.family_invitations;
CREATE POLICY "Usuários veem seus próprios convites" ON public.family_invitations
    FOR SELECT USING (
        email = (SELECT email FROM auth.users WHERE id = auth.uid()) OR
        email = (SELECT email FROM profiles WHERE user_id = auth.uid())
    );
