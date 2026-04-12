
-- Create history_entries table
CREATE TABLE IF NOT EXISTS public.history_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('planilha', 'documento', 'imagem', 'audio')),
    "fileName" TEXT NOT NULL,
    "processedContent" TEXT NOT NULL,
    "userMessage" TEXT NOT NULL,
    "systemResponse" TEXT NOT NULL,
    "fileUrl" TEXT,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.history_entries ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view their own history entries"
    ON public.history_entries FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own history entries"
    ON public.history_entries FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own history entries"
    ON public.history_entries FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own history entries"
    ON public.history_entries FOR DELETE
    USING (auth.uid() = user_id);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_history_entries_user_createdAt ON public.history_entries(user_id, "createdAt" DESC);
