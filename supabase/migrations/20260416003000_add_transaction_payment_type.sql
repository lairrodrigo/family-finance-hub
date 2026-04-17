ALTER TABLE public.transactions
ADD COLUMN IF NOT EXISTS payment_type TEXT;

ALTER TABLE public.transactions
DROP CONSTRAINT IF EXISTS transactions_payment_type_check;

ALTER TABLE public.transactions
ADD CONSTRAINT transactions_payment_type_check
CHECK (payment_type IN ('cash', 'credit_card') OR payment_type IS NULL);

ALTER TABLE public.transactions
DROP CONSTRAINT IF EXISTS transactions_payment_consistency_check;

ALTER TABLE public.transactions
ADD CONSTRAINT transactions_payment_consistency_check
CHECK (
  (
    type = 'income'
    AND payment_type IS NULL
  )
  OR (
    type = 'expense'
    AND payment_type = 'cash'
    AND card_id IS NULL
  )
  OR (
    type = 'expense'
    AND payment_type = 'credit_card'
    AND card_id IS NOT NULL
  )
);
