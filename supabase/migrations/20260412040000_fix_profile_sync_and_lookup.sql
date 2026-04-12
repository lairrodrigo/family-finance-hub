
-- Create the trigger to automatically create a profile for new users
-- This was missing from previous migrations
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'on_auth_user_created'
  ) THEN
    CREATE TRIGGER on_auth_user_created
      AFTER INSERT ON auth.users
      FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
  END IF;
END $$;

-- Manual sync for existing users who might be missing a profile
-- This ensures that users created while the trigger was missing are and can be found
INSERT INTO public.profiles (user_id, full_name, email)
SELECT 
  u.id, 
  COALESCE(u.raw_user_meta_data->>'full_name', u.email), 
  u.email
FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.user_id
WHERE p.id IS NULL
ON CONFLICT (user_id) DO NOTHING;

-- Update the RLS policy for profiles to allow better discovery
-- The previous policy might have been too restrictive if full_name was NULL
DROP POLICY IF EXISTS "Allow exact email lookup" ON public.profiles;

CREATE POLICY "Allow email lookup for invitations"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (
    true -- Allow all authenticated users to search profiles (needed for invitations)
    -- We can restrict the columns in the frontend, but for RLS, they need to be able to see the row to find it
  );

-- Ensure email is stored in a way that respects the index
-- and is consistent for searches
CREATE INDEX IF NOT EXISTS profiles_email_lower_idx ON public.profiles (LOWER(email));
