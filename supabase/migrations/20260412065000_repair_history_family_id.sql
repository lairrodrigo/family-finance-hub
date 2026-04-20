
-- Add family_id to history_entries if not exists (repairing previous partial migration)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'history_entries' 
    AND column_name = 'family_id'
  ) THEN
    ALTER TABLE public.history_entries ADD COLUMN family_id UUID REFERENCES public.families(id) ON DELETE CASCADE;
  END IF;
END $$;
