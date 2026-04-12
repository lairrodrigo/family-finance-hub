
-- Create AI Insights table for caching analysis results
CREATE TABLE IF NOT EXISTS public.ai_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  content JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ai_insights ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Family members can view AI insights"
  ON public.ai_insights FOR SELECT
  TO authenticated
  USING (family_id = public.get_user_family_id(auth.uid()));

CREATE POLICY "System can manage AI insights"
  ON public.ai_insights FOR ALL
  TO authenticated
  USING (family_id = public.get_user_family_id(auth.uid()))
  WITH CHECK (family_id = public.get_user_family_id(auth.uid()));

-- Trigger for updated_at
CREATE TRIGGER update_ai_insights_updated_at 
  BEFORE UPDATE ON public.ai_insights 
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
