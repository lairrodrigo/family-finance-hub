-- Migração de Performance: Índices para otimização de consultas
-- Criado em: 2026-04-18

-- 1. Índices para Tabela de Transações (Crucial para Home e Histórico)
CREATE INDEX IF NOT EXISTS idx_transactions_family_date 
  ON public.transactions(family_id, date DESC);

CREATE INDEX IF NOT EXISTS idx_transactions_category 
  ON public.transactions(category_id);

-- 2. Índices para Tabelas de Ativos
CREATE INDEX IF NOT EXISTS idx_cards_family 
  ON public.cards(family_id);

CREATE INDEX IF NOT EXISTS idx_accounts_family 
  ON public.accounts(family_id);

-- 3. Índice para Categorias
CREATE INDEX IF NOT EXISTS idx_categories_family 
  ON public.categories(family_id) WHERE family_id IS NOT NULL;

-- 4. Análise e Otimização
ANALYZE public.transactions;
ANALYZE public.cards;
ANALYZE public.accounts;
ANALYZE public.categories;
