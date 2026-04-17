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

  IF p_role NOT IN ('admin', 'member', 'viewer') THEN
    RAISE EXCEPTION 'Papel inválido.';
  END IF;

  IF v_email = '' THEN
    RAISE EXCEPTION 'E-mail inválido.';
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
      RAISE EXCEPTION 'Este usuário já pertence a uma família.';
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
    RAISE EXCEPTION 'Não autorizado.';
  END IF;

  SELECT *
  INTO v_profile
  FROM public.profiles
  WHERE user_id = auth.uid()
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Perfil não encontrado.';
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
    RAISE EXCEPTION 'Não autorizado.';
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
    RAISE EXCEPTION 'Não autorizado.';
  END IF;

  SELECT *
  INTO v_invitation
  FROM public.family_invitations
  WHERE id = p_invite_id
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Convite não encontrado.';
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
