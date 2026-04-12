
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
      RAISE EXCEPTION 'Acesso negado: Você não é administrador desta família.';
    END IF;
  END IF;

  -- 2. Find target user by email
  SELECT user_id, full_name INTO v_target_user_id, v_target_full_name
  FROM public.profiles
  WHERE email ILIKE trim(p_user_email)
  LIMIT 1;

  IF v_target_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuário não encontrado. Solicite que crie uma conta primeiro.';
  END IF;

  -- 3. Check if user is already in this family
  IF EXISTS (
    SELECT 1 FROM public.profiles WHERE user_id = v_target_user_id AND family_id = p_family_id
  ) THEN
    RAISE EXCEPTION 'Este usuário já faz parte da família!';
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
