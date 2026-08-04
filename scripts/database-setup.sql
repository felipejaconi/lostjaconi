-- ESTRUTURA PARA BANCO DE DADOS ERP (Stock x Financeiro)
-- Copie e cole este código no SQL Editor do Supabase e execute.

-- 1. TABELA DE FORNECEDORES
CREATE TABLE IF NOT EXISTS public.fornecedores (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  nome text NOT NULL,
  contribuinte text,
  contato text,
  email text,
  tipo text NOT NULL DEFAULT 'mercadoria', -- 'mercadoria' ou 'operacional'
  morada text,
  codigo_postal text,
  localidade text,
  iban text,
  banco text,
  swift_bic text,
  condicoes_pagamento text,
  created_at timestamp with time zone DEFAULT now()
);

-- 2. TABELA DE FATURAS (INVOICES)
CREATE TABLE IF NOT EXISTS public.faturas (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  numero_fatura text NOT NULL,
  fornecedor_id uuid REFERENCES public.fornecedores(id) ON DELETE SET NULL,
  tipo text NOT NULL DEFAULT 'compra', -- 'compra' (stock) ou 'despesa' (operacional)
  valor_total numeric(10, 2) NOT NULL DEFAULT 0,
  valor_pendente numeric(10, 2) NOT NULL DEFAULT 0,
  status_pagamento text NOT NULL DEFAULT 'pendente', -- 'pendente', 'pago', 'parcial', 'vencido'
  data_emissao date NOT NULL,
  data_vencimento date,
  anexo_url text,
  created_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  created_at timestamp with time zone DEFAULT now()
);

-- 3. TABELA DE ITENS DE FATURAS DE COMPRA (INVOICE ITEMS - Apenas para tipo=compra)
CREATE TABLE IF NOT EXISTS public.fatura_itens (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  fatura_id uuid REFERENCES public.faturas(id) ON DELETE CASCADE,
  produto_id uuid REFERENCES public.produtos(id) ON DELETE SET NULL,
  quantidade integer NOT NULL,
  preco_custo numeric(10, 2) NOT NULL, -- O custo real daquela compra
  created_at timestamp with time zone DEFAULT now()
);

-- 4. TABELA DE MOVIMENTOS FINANCEIROS (Pagamentos)
CREATE TABLE IF NOT EXISTS public.movimentos_financeiros (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  fatura_id uuid REFERENCES public.faturas(id) ON DELETE CASCADE,
  valor numeric(10, 2) NOT NULL,
  data_pagamento date NOT NULL,
  metodo text, -- 'transferencia', 'dinheiro', 'mbway'
  comprovativo_url text,
  created_by uuid REFERENCES public.users(id),
  created_at timestamp with time zone DEFAULT now()
);

-- 5. Atualizar Produtos (Se ainda não tiver as colunas)
-- ALTER TABLE public.produtos ADD COLUMN IF NOT EXISTS preco_custo numeric(10,2) DEFAULT 0;
-- ALTER TABLE public.produtos ADD COLUMN IF NOT EXISTS margem_lucro numeric(10,2) GENERATED ALWAYS AS (
--    CASE WHEN preco_custo > 0 THEN ((preco - preco_custo) / preco_custo) * 100 ELSE 0 END
-- ) STORED;

-- Segurança Row Level Security
ALTER TABLE public.fornecedores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.faturas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fatura_itens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.movimentos_financeiros ENABLE ROW LEVEL SECURITY;

-- Políticas de Privacidade Básicas
DROP POLICY IF EXISTS "Public Read All" ON public.fornecedores;
CREATE POLICY "Public Read All" ON public.fornecedores FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public Write All" ON public.fornecedores;
CREATE POLICY "Public Write All" ON public.fornecedores FOR ALL USING (true);

DROP POLICY IF EXISTS "Public Read All" ON public.faturas;
CREATE POLICY "Public Read All" ON public.faturas FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public Write All" ON public.faturas;
CREATE POLICY "Public Write All" ON public.faturas FOR ALL USING (true);

DROP POLICY IF EXISTS "Public Read All" ON public.fatura_itens;
CREATE POLICY "Public Read All" ON public.fatura_itens FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public Write All" ON public.fatura_itens;
CREATE POLICY "Public Write All" ON public.fatura_itens FOR ALL USING (true);

DROP POLICY IF EXISTS "Public Read All" ON public.movimentos_financeiros;
CREATE POLICY "Public Read All" ON public.movimentos_financeiros FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public Write All" ON public.movimentos_financeiros;
CREATE POLICY "Public Write All" ON public.movimentos_financeiros FOR ALL USING (true);
