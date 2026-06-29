-- Ensure every family has the two default financial accounts used by the app.
-- "Pessoa PF" and "Empresa PJ" are real rows in public.accounts and transactions
-- are linked through transactions.account_id.

CREATE OR REPLACE FUNCTION public.ensure_default_family_accounts(
  _family_id UUID,
  _user_id UUID
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF _family_id IS NULL OR _user_id IS NULL THEN
    RETURN;
  END IF;

  INSERT INTO public.accounts (family_id, user_id, name, type, balance, color, icon, is_active)
  SELECT _family_id, _user_id, 'Pessoa PF', 'checking', 0, '#203A74', 'user', true
  WHERE NOT EXISTS (
    SELECT 1
    FROM public.accounts
    WHERE family_id = _family_id
      AND lower(name) = lower('Pessoa PF')
  );

  INSERT INTO public.accounts (family_id, user_id, name, type, balance, color, icon, is_active)
  SELECT _family_id, _user_id, 'Empresa PJ', 'checking', 0, '#0D5C4B', 'building', true
  WHERE NOT EXISTS (
    SELECT 1
    FROM public.accounts
    WHERE family_id = _family_id
      AND lower(name) = lower('Empresa PJ')
  );
END;
$$;

-- Backfill existing families.
SELECT public.ensure_default_family_accounts(id, created_by)
FROM public.families;

CREATE OR REPLACE FUNCTION public.create_default_family_accounts()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.ensure_default_family_accounts(NEW.id, NEW.created_by);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_create_default_family_accounts ON public.families;
CREATE TRIGGER trg_create_default_family_accounts
  AFTER INSERT ON public.families
  FOR EACH ROW
  EXECUTE FUNCTION public.create_default_family_accounts();

-- Default PF/PJ accounts are family-level buckets, so every family member needs
-- to see them in account pickers even when the account row is owned by the admin.
DROP POLICY IF EXISTS "Family members can view default PF PJ accounts" ON public.accounts;
CREATE POLICY "Family members can view default PF PJ accounts"
  ON public.accounts FOR SELECT
  TO authenticated
  USING (
    family_id = public.get_user_family_id(auth.uid())
    AND lower(name) IN (lower('Pessoa PF'), lower('Empresa PJ'))
  );
