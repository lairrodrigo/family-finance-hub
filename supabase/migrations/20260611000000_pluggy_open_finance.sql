-- ─────────────────────────────────────────────────────────────
-- Open Finance via Pluggy: conexões bancárias + dedup de transações
-- ─────────────────────────────────────────────────────────────

-- 1. Rastrear a origem da transação e o id externo (pra não duplicar no sync)
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'manual'
  CHECK (source IN ('manual', 'cora', 'pluggy', 'email'));
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS external_id TEXT;

-- Garante que a mesma transação da Pluggy nunca entre duas vezes na mesma família.
CREATE UNIQUE INDEX IF NOT EXISTS uq_transactions_family_external
  ON public.transactions(family_id, external_id)
  WHERE external_id IS NOT NULL;

-- 2. Conexões bancárias (um "item" da Pluggy por banco conectado)
CREATE TABLE IF NOT EXISTS public.bank_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL DEFAULT 'pluggy',
  item_id TEXT NOT NULL,            -- id do item na Pluggy
  connector_name TEXT,             -- nome do banco (ex: "Nubank", "Pluggy Bank")
  connector_image_url TEXT,
  status TEXT NOT NULL DEFAULT 'updating'
    CHECK (status IN ('updating', 'updated', 'login_error', 'outdated', 'error', 'deleted')),
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (family_id, item_id)
);

CREATE INDEX IF NOT EXISTS idx_bank_connections_family ON public.bank_connections(family_id);
CREATE INDEX IF NOT EXISTS idx_bank_connections_item ON public.bank_connections(item_id);

ALTER TABLE public.bank_connections ENABLE ROW LEVEL SECURITY;

-- RLS — espelha o padrão da tabela transactions (escopo por família)
CREATE POLICY "Family members can view bank connections"
  ON public.bank_connections FOR SELECT
  TO authenticated
  USING (family_id = public.get_user_family_id(auth.uid()));

CREATE POLICY "Users can create bank connections for their family"
  ON public.bank_connections FOR INSERT
  TO authenticated
  WITH CHECK (
    family_id = public.get_user_family_id(auth.uid())
    AND user_id = auth.uid()
  );

CREATE POLICY "Users can update own bank connections"
  ON public.bank_connections FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete own bank connections"
  ON public.bank_connections FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

CREATE TRIGGER update_bank_connections_updated_at
  BEFORE UPDATE ON public.bank_connections
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
