-- 1) Adiciona colunas em transactions
ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS payment_type TEXT,
  ADD COLUMN IF NOT EXISTS card_id UUID REFERENCES public.cards(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS created_by UUID;

-- 2) Backfill: created_by = user_id quando nulo
UPDATE public.transactions
SET created_by = user_id
WHERE created_by IS NULL;

-- 3) Não obrigamos NOT NULL para evitar quebra de inserts antigos,
--    mas adicionamos trigger que preenche created_by automaticamente.
CREATE OR REPLACE FUNCTION public.set_transaction_created_by()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.created_by IS NULL THEN
    NEW.created_by := COALESCE(auth.uid(), NEW.user_id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_transaction_created_by ON public.transactions;
CREATE TRIGGER trg_set_transaction_created_by
BEFORE INSERT ON public.transactions
FOR EACH ROW
EXECUTE FUNCTION public.set_transaction_created_by();

-- 4) Validação leve do payment_type via trigger (evita CHECK rígido)
CREATE OR REPLACE FUNCTION public.validate_transaction_payment()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.payment_type IS NOT NULL
     AND NEW.payment_type NOT IN ('cash', 'credit_card') THEN
    RAISE EXCEPTION 'payment_type inválido: %', NEW.payment_type;
  END IF;

  IF NEW.payment_type <> 'credit_card' THEN
    NEW.card_id := NULL;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_transaction_payment ON public.transactions;
CREATE TRIGGER trg_validate_transaction_payment
BEFORE INSERT OR UPDATE ON public.transactions
FOR EACH ROW
EXECUTE FUNCTION public.validate_transaction_payment();

-- 5) Índices
CREATE INDEX IF NOT EXISTS idx_transactions_card_id ON public.transactions(card_id);
CREATE INDEX IF NOT EXISTS idx_transactions_created_by ON public.transactions(created_by);