-- ====================================================================================
-- ATUALIZAÇÃO COMPLETA DO BANCO DE DADOS (TODAS AS ÁREAS)
-- Execute este script no SQL Editor do Supabase para atualizar a base de dados
-- sem perder os dados existentes.
-- ====================================================================================

-- 1. TABELAS BASE (Se não existirem)
CREATE TABLE IF NOT EXISTS public.categorias (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome TEXT UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- PRODUTOS & ESTOQUE
CREATE TABLE IF NOT EXISTS public.produtos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome TEXT NOT NULL,
    descricao TEXT,
    preco NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    preco_custo NUMERIC(10,2) DEFAULT 0.00,
    iva NUMERIC(5, 2) DEFAULT 23.00,
    categoria_id UUID REFERENCES public.categorias(id) ON DELETE SET NULL,
    stock_armazem NUMERIC(10, 3) NOT NULL DEFAULT 0.000,
    barcode_ean TEXT UNIQUE,
    pais_origem TEXT,
    imagem_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ADIÇÃO DE COLUNAS (Unidades, Conversões, Peso)
ALTER TABLE public.produtos
ADD COLUMN IF NOT EXISTS preco_custo numeric(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS is_peso_variavel BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS unidade_base TEXT DEFAULT 'un',
ADD COLUMN IF NOT EXISTS unidade_compra TEXT DEFAULT 'un',
ADD COLUMN IF NOT EXISTS fator_conversao_compra NUMERIC(15,3) DEFAULT 1.000,
ADD COLUMN IF NOT EXISTS unidade_venda TEXT DEFAULT 'un',
ADD COLUMN IF NOT EXISTS fator_conversao_venda NUMERIC(15,3) DEFAULT 1.000;

-- PRODUCT UNITS
CREATE TABLE IF NOT EXISTS public.product_units (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID REFERENCES public.produtos(id) ON DELETE CASCADE,
    unit TEXT NOT NULL,
    factor NUMERIC(15, 3) NOT NULL DEFAULT 1.000,
    is_default_buy BOOLEAN DEFAULT FALSE,
    is_default_sell BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(product_id, unit)
);

-- FORNECEDORES
CREATE TABLE IF NOT EXISTS public.fornecedores (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  nome text NOT NULL,
  contribuinte text,
  contato text,
  email text,
  tipo text NOT NULL DEFAULT 'mercadoria',
  created_at timestamp with time zone DEFAULT now()
);

-- ADIÇÃO DE DADOS DE PAGAMENTO E MORADA AOS FORNECEDORES
ALTER TABLE public.fornecedores 
ADD COLUMN IF NOT EXISTS morada text,
ADD COLUMN IF NOT EXISTS codigo_postal text,
ADD COLUMN IF NOT EXISTS localidade text,
ADD COLUMN IF NOT EXISTS iban text,
ADD COLUMN IF NOT EXISTS banco text,
ADD COLUMN IF NOT EXISTS swift_bic text,
ADD COLUMN IF NOT EXISTS condicoes_pagamento text;

-- FATURAS (Compras e Despesas)
CREATE TABLE IF NOT EXISTS public.faturas (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  numero_fatura text NOT NULL,
  fornecedor_id uuid REFERENCES public.fornecedores(id) ON DELETE SET NULL,
  tipo text NOT NULL DEFAULT 'compra', -- 'compra' ou 'despesa'
  valor_total numeric(10, 2) NOT NULL DEFAULT 0,
  valor_pendente numeric(10, 2) NOT NULL DEFAULT 0,
  status_pagamento text NOT NULL DEFAULT 'pendente', -- 'pendente', 'pago', 'parcial', 'vencido'
  data_emissao date NOT NULL,
  data_vencimento date,
  created_at timestamp with time zone DEFAULT now()
);

-- FATURA ITENS
CREATE TABLE IF NOT EXISTS public.fatura_itens (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  fatura_id uuid REFERENCES public.faturas(id) ON DELETE CASCADE,
  produto_id uuid REFERENCES public.produtos(id) ON DELETE SET NULL,
  quantidade numeric(15, 3) NOT NULL,
  preco_custo numeric(10, 2) NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);

-- ADICIONAR UNIDADE DE COMPRA NOS ITENS DA FATURA
ALTER TABLE public.fatura_itens
ADD COLUMN IF NOT EXISTS unidade_compra text,
ADD COLUMN IF NOT EXISTS fator_conversao numeric(15,3) DEFAULT 1.000;

-- MOVIMENTOS FINANCEIROS (Pagamentos)
CREATE TABLE IF NOT EXISTS public.movimentos_financeiros (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  fatura_id uuid REFERENCES public.faturas(id) ON DELETE CASCADE,
  valor numeric(10, 2) NOT NULL,
  metodo_pagamento text NOT NULL, -- 'transferencia', 'numerario', 'cheque', etc.
  data_pagamento date NOT NULL,
  comprovativo_url text,
  observacoes text,
  created_at timestamp with time zone DEFAULT now()
);

-- TABELA MOVIMENTAÇÕES DE STOCK
CREATE TABLE IF NOT EXISTS public.movimentacoes_stock (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    produto_id UUID REFERENCES public.produtos(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id),
    tipo TEXT CHECK (tipo IN ('entrada', 'saida')),
    quantidade NUMERIC(10, 3) NOT NULL,
    motivo TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- TABELA DE LOTES
CREATE TABLE IF NOT EXISTS public.lotes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    produto_id UUID REFERENCES public.produtos(id) ON DELETE CASCADE,
    quantidade NUMERIC(10, 3) NOT NULL,
    validade DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
