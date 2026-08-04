-- ==============================================================================
-- INSTRUÇÕES DE ATUALIZAÇÃO RÁPIDA (PARA CORRIGIR O ERRO DOS LOTES)
-- Execute este bloco isoladamente no SQL Editor do Supabase se a tabela 'lotes' já existir:
-- ==============================================================================
/*
ALTER TABLE public.lotes ADD COLUMN IF NOT EXISTS rua TEXT;
ALTER TABLE public.lotes ADD COLUMN IF NOT EXISTS prateleira TEXT;
ALTER TABLE public.lotes ADD COLUMN IF NOT EXISTS lote TEXT;
*/
-- ==============================================================================

-- === v4_architecture.sql ===

-- ========================================================
-- LOST WIND LDA - BANCO DE DADOS ERP/WMS V4
-- Arquitetura Híbrida: ERP Financeiro + WMS + Retalho
-- ========================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ========================================================
-- 1. TABELAS BASE (Entidades principais)
-- ========================================================

CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('admin', 'armazem', 'loja', 'financeiro')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.fornecedores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome TEXT NOT NULL,
    nif TEXT UNIQUE,
    email TEXT,
    telefone TEXT,
    morada TEXT,
    prazo_pagamento_dias INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.categorias (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome TEXT NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ========================================================
-- 2. GESTÃO DE PRODUTOS E UNIDADES / PESO
-- ========================================================

CREATE TABLE IF NOT EXISTS public.produtos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome TEXT NOT NULL,
    codigo_barras TEXT UNIQUE,
    categoria_id UUID REFERENCES public.categorias(id) ON DELETE SET NULL,
    
    -- GESTÃO DE UNIDADES (Multi-unidade)
    unidade_base TEXT NOT NULL CHECK (unidade_base IN ('un', 'g', 'ml')), 
    unidade_compra TEXT NOT NULL CHECK (unidade_compra IN ('caixa', 'pack', 'un', 'kg', 'lt')),
    fator_conversao_compra NUMERIC(15, 3) NOT NULL DEFAULT 1.000, -- Ex: 1 Caixa = 24 UN, 1 KG = 1000 G
    unidade_venda TEXT NOT NULL CHECK (unidade_venda IN ('caixa', 'pack', 'un', 'kg', 'lt')),
    fator_conversao_venda NUMERIC(15, 3) NOT NULL DEFAULT 1.000,
    
    -- GESTÃO DE PESO / BALANÇA
    is_peso_variavel BOOLEAN DEFAULT FALSE, -- True para Carne, Queijo, Peixe (Balanca)

    -- FINANCEIRO (Calculados em cima do IVA e Custos)
    iva taxa NUMERIC(5, 2) DEFAULT 23.00,
    preco_custo_unit_base NUMERIC(15, 4) DEFAULT 0.0000, -- Custo real por unidade base (ex: custo por 'un' ou 'g')
    margem_lucro_percentagem NUMERIC(5, 2) DEFAULT 0.00, -- Margem estipulada
    preco_venda_bruto NUMERIC(15, 2) NOT NULL DEFAULT 0.00, -- Preço final ao cliente (Com IVA)
    
    -- STOCK CONSOLIDADO (Sempre na Unidade Base)
    stock_armazem NUMERIC(15, 3) NOT NULL DEFAULT 0.000,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ========================================================
-- 3. GESTÃO DE LOTES E VALIDADES
-- ========================================================

CREATE TABLE IF NOT EXISTS public.lotes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lot_code TEXT NOT NULL,
    produto_id UUID REFERENCES public.produtos(id) ON DELETE CASCADE,
    fornecedor_id UUID REFERENCES public.fornecedores(id) ON DELETE SET NULL,
    
    quantidade_inicial NUMERIC(15, 3) NOT NULL, -- Na unidade base
    quantidade_atual NUMERIC(15, 3) NOT NULL, -- Na unidade base
    
    preco_custo_lote NUMERIC(15, 4) NOT NULL, -- Preço unitário pago NESTE lote
    validade DATE,
    data_entrada TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(lot_code, produto_id)
);

-- ========================================================
-- 4. FATURAÇÃO FORNECEDORES (Entradas Financeiras)
-- ========================================================

CREATE TABLE IF NOT EXISTS public.faturas_fornecedor (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    numero_fatura TEXT NOT NULL,
    fornecedor_id UUID REFERENCES public.fornecedores(id) ON DELETE CASCADE,
    
    data_fatura DATE NOT NULL,
    data_vencimento DATE NOT NULL,
    status_pagamento TEXT CHECK (status_pagamento IN ('pendente', 'parcial', 'pago', 'vencido')) DEFAULT 'pendente',
    
    valor_liquido NUMERIC(15, 2) NOT NULL DEFAULT 0.00, -- Sem IVA
    valor_iva NUMERIC(15, 2) NOT NULL DEFAULT 0.00,      -- Montante de IVA
    valor_bruto NUMERIC(15, 2) NOT NULL DEFAULT 0.00,    -- Com IVA
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    
    UNIQUE(numero_fatura, fornecedor_id)
);

CREATE TABLE IF NOT EXISTS public.fatura_fornecedor_itens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    fatura_id UUID REFERENCES public.faturas_fornecedor(id) ON DELETE CASCADE,
    produto_id UUID REFERENCES public.produtos(id) ON DELETE RESTRICT,
    
    quantidade_compra NUMERIC(15, 3) NOT NULL, -- Ex: 10 (Caixas)
    preco_unitario_compra NUMERIC(15, 4) NOT NULL, -- Ex: 50.00 (Por caixa)
    taxa_iva NUMERIC(5, 2) NOT NULL,
    
    -- Conversão automática para o sistema (Gerenciado via trigger ou backend)
    quantidade_base_recebida NUMERIC(15, 3) NOT NULL, -- Ex: 240 (un)
    preco_custo_base NUMERIC(15, 4) NOT NULL, -- Custo por Unidade Base (Ex: 50.00 / 24 = 2.0833)
    
    lote_id UUID REFERENCES public.lotes(id) ON DELETE SET NULL
);

-- ========================================================
-- 5. MOVIMENTOS DE STOCK (Apenas Inserções, Fonte da Verdade)
-- ========================================================

CREATE TABLE IF NOT EXISTS public.movimentacoes_stock (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    produto_id UUID REFERENCES public.produtos(id) ON DELETE CASCADE,
    lote_id UUID REFERENCES public.lotes(id) ON DELETE SET NULL,
    origem_id UUID REFERENCES public.users(id) ON DELETE SET NULL, -- Ex: Armazém
    destino_id UUID REFERENCES public.users(id) ON DELETE SET NULL, -- Ex: Loja
    
    tipo_movimento TEXT NOT NULL CHECK (tipo_movimento IN (
        'ENTRADA_FATURA', -- Da faturas_fornecedor
        'SAIDA_LOJA',     -- Venda para loja
        'VENDA_BALCAO',   -- Cliente final (se aplicável ao armazém)
        'AJUSTE_INVENTARIO_IN',
        'AJUSTE_INVENTARIO_OUT',
        'QUEBRA',         -- Validade ultrapassada, danificado
        'TRANSFERENCIA'
    )),
    
    quantidade NUMERIC(15, 3) NOT NULL, -- Sempre UNIDADE BASE
    custo_total_movimento NUMERIC(15, 4) DEFAULT 0.0000, -- Para Valuation de Stock (CMV)
    
    documento_ref TEXT, -- ID do pedido ou Fatura
    motivo TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    user_log_id UUID REFERENCES public.users(id) ON DELETE SET NULL -- Quem fez o registo
);

-- ========================================================
-- 6. ROTINAS DE INVENTÁRIO (Gera Movimentos)
-- ========================================================

CREATE TABLE IF NOT EXISTS public.inventarios_auditoria (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    produto_id UUID REFERENCES public.produtos(id) ON DELETE CASCADE,
    quantidade_sistema_base NUMERIC(15, 3) NOT NULL,
    quantidade_contada_base NUMERIC(15, 3) NOT NULL,
    metodo TEXT CHECK (metodo IN ('manual', 'balanca')),
    diferenca NUMERIC(15, 3) GENERATED ALWAYS AS (quantidade_contada_base - quantidade_sistema_base) STORED,
    movimento_gerado_id UUID REFERENCES public.movimentacoes_stock(id) ON DELETE SET NULL,
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ========================================================
-- 7. GESTÃO FINANCEIRA (Despesas e Fluxo de Caixa)
-- ========================================================

CREATE TABLE IF NOT EXISTS public.transacoes_financeiras (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tipo TEXT NOT NULL CHECK (tipo IN ('RECEITA', 'DESPESA')),
    categoria TEXT NOT NULL, -- Ex: 'PAGAMENTO_FORNECEDOR', 'SALARIO', 'AGUA/LUZ', 'VENDA'
    valor NUMERIC(15, 2) NOT NULL,
    data_transacao DATE NOT NULL,
    fatura_fornecedor_id UUID REFERENCES public.faturas_fornecedor(id) ON DELETE SET NULL,
    conta_bancaria TEXT,
    descricao TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);


-- === v5_update.sql ===

-- ========================================================
-- LOST WIND LDA - COMPLETE DATABASE SCRIPT V6 (Updated)
-- Data: 2026-05-17
-- Descrição: Script to create/update the entire database.
-- ========================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. DROP OBSOLETE TABLES
DROP TABLE IF EXISTS public.lotes CASCADE;

-- 3. CREATE / ALTER CORE TABLES

-- USERS
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'loja',
    avatar_url TEXT,
    manager_name TEXT,
    order_start_time TIME,
    order_end_time TIME,
    picking_start_time TIME,
    picking_end_time TIME,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE public.users ADD CONSTRAINT users_role_check CHECK (role IN ('admin', 'armazem', 'loja', 'financeiro'));

-- CATEGORIAS
CREATE TABLE IF NOT EXISTS public.categorias (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome TEXT NOT NULL UNIQUE,
    imagem_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- PRODUTOS
CREATE TABLE IF NOT EXISTS public.produtos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome TEXT NOT NULL,
    descricao TEXT,
    preco NUMERIC(15, 4) NOT NULL DEFAULT 0.00,
    preco_custo NUMERIC(15, 4) DEFAULT 0.00,
    iva NUMERIC(5, 2) DEFAULT 23.00,
    stock_armazem NUMERIC(15, 3) NOT NULL DEFAULT 0.000,
    categoria_id UUID REFERENCES public.categorias(id) ON DELETE SET NULL,
    barcode_ean TEXT UNIQUE,
    pais_origem TEXT,
    imagem_url TEXT,
    
    unidade_compra TEXT DEFAULT 'un',
    fator_conversao_compra NUMERIC(15,3) DEFAULT 1.000,
    unidade_venda TEXT DEFAULT 'un',
    fator_conversao_venda NUMERIC(15,3) DEFAULT 1.000,
    is_peso_variavel BOOLEAN DEFAULT FALSE,
    unidade_base TEXT DEFAULT 'un',

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ADD COLUMNS IF TABLE ALREADY EXISTS
DO $$ 
BEGIN
    BEGIN
        ALTER TABLE public.produtos ADD COLUMN preco_custo NUMERIC(15, 4) DEFAULT 0.00;
    EXCEPTION WHEN duplicate_column THEN END;
    BEGIN
        ALTER TABLE public.produtos ADD COLUMN unidade_compra TEXT DEFAULT 'un';
    EXCEPTION WHEN duplicate_column THEN END;
    BEGIN
        ALTER TABLE public.produtos ADD COLUMN fator_conversao_compra NUMERIC(15,3) DEFAULT 1.000;
    EXCEPTION WHEN duplicate_column THEN END;
    BEGIN
        ALTER TABLE public.produtos ADD COLUMN unidade_venda TEXT DEFAULT 'un';
    EXCEPTION WHEN duplicate_column THEN END;
    BEGIN
        ALTER TABLE public.produtos ADD COLUMN fator_conversao_venda NUMERIC(15,3) DEFAULT 1.000;
    EXCEPTION WHEN duplicate_column THEN END;
    BEGIN
        ALTER TABLE public.produtos ADD COLUMN is_peso_variavel BOOLEAN DEFAULT FALSE;
    EXCEPTION WHEN duplicate_column THEN END;
    BEGIN
        ALTER TABLE public.produtos ADD COLUMN unidade_base TEXT DEFAULT 'un';
    EXCEPTION WHEN duplicate_column THEN END;
END $$;

-- DROP OLD COLUMNS FROM PRODUTOS IF THEY EXIST
DO $$ 
BEGIN
    ALTER TABLE public.produtos DROP COLUMN IF EXISTS peso;
    ALTER TABLE public.produtos DROP COLUMN IF EXISTS unidade_medida;
    ALTER TABLE public.produtos DROP COLUMN IF EXISTS quantidade_padrao;
    ALTER TABLE public.produtos DROP COLUMN IF EXISTS unidade_embalagem;
    ALTER TABLE public.produtos DROP COLUMN IF EXISTS item_color;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;


-- FORNECEDORES
CREATE TABLE IF NOT EXISTS public.fornecedores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome TEXT NOT NULL,
    nif TEXT UNIQUE,
    email TEXT,
    telefone TEXT,
    morada TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- FATURAS
CREATE TABLE IF NOT EXISTS public.faturas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    numero_fatura TEXT,
    fornecedor_id UUID REFERENCES public.fornecedores(id) ON DELETE CASCADE,
    tipo TEXT NOT NULL DEFAULT 'compra',
    data_emissao DATE NOT NULL,
    data_vencimento DATE,
    valor_total NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    valor_pendente NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    status_pagamento TEXT DEFAULT 'pendente',
    created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- FATURA ITENS
CREATE TABLE IF NOT EXISTS public.fatura_itens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    fatura_id UUID REFERENCES public.faturas(id) ON DELETE CASCADE,
    produto_id UUID REFERENCES public.produtos(id) ON DELETE CASCADE,
    quantidade NUMERIC(15, 3) NOT NULL,
    preco_unitario NUMERIC(15, 4) NOT NULL
);

-- Drop lote_id from fatura_itens if exists
DO $$ 
BEGIN
   ALTER TABLE public.fatura_itens DROP COLUMN IF EXISTS lote_id;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- MOVIMENTOS FINANCEIROS
CREATE TABLE IF NOT EXISTS public.movimentos_financeiros (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    fatura_id UUID REFERENCES public.faturas(id) ON DELETE CASCADE,
    valor NUMERIC(15, 2) NOT NULL,
    data_pagamento TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metodo_pagamento TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- INVENTARIOS AUDITORIA
CREATE TABLE IF NOT EXISTS public.inventarios_auditoria (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    produto_id UUID REFERENCES public.produtos(id) ON DELETE CASCADE,
    quantidade_sistema_base NUMERIC(15, 3) NOT NULL,
    quantidade_contada_base NUMERIC(15, 3) NOT NULL,
    diferenca NUMERIC(15, 3),
    metodo TEXT,
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- MOVIMENTAÇÕES DE STOCK
CREATE TABLE IF NOT EXISTS public.movimentacoes_stock (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    produto_id UUID REFERENCES public.produtos(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL, 
    user_target_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    tipo TEXT NOT NULL,
    tipo_movimento TEXT,
    quantidade NUMERIC(15, 3) NOT NULL,
    unidade TEXT,
    motivo TEXT,
    documento_ref TEXT,
    destino_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Drop lote_id from movimentacoes_stock if exists
DO $$ 
BEGIN
   ALTER TABLE public.movimentacoes_stock DROP COLUMN IF EXISTS lote_id;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- STOCK LOJA
CREATE TABLE IF NOT EXISTS public.stock_loja (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    produto_id UUID REFERENCES public.produtos(id) ON DELETE CASCADE,
    quantidade NUMERIC(15, 3) NOT NULL DEFAULT 0.000,
    ultima_picagem TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, produto_id)
);

-- PEDIDOS
CREATE TABLE IF NOT EXISTS public.pedidos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'pendente',
    total NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    observacoes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.pedidos DROP CONSTRAINT IF EXISTS pedidos_status_check;
ALTER TABLE public.pedidos ADD CONSTRAINT pedidos_status_check CHECK (status IN ('pendente', 'processando', 'preparacao', 'pronto', 'enviado', 'concluido', 'cancelado', 'entregue'));

-- PEDIDO ITENS
CREATE TABLE IF NOT EXISTS public.pedido_itens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pedido_id UUID REFERENCES public.pedidos(id) ON DELETE CASCADE,
    produto_id UUID REFERENCES public.produtos(id) ON DELETE CASCADE,
    quantidade NUMERIC(15, 3) NOT NULL,
    preco_unitario NUMERIC(15, 4) NOT NULL,
    unidade TEXT DEFAULT 'un'
);

-- NOTIFICAÇÕES
CREATE TABLE IF NOT EXISTS public.notificacoes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    titulo TEXT NOT NULL,
    mensagem TEXT NOT NULL,
    lida BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. DISABLE RLS
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.categorias DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.produtos DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.fornecedores DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.faturas DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.fatura_itens DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.movimentos_financeiros DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventarios_auditoria DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.movimentacoes_stock DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_loja DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.pedidos DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.pedido_itens DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.notificacoes DISABLE ROW LEVEL SECURITY;

-- 5. REALTIME
DROP PUBLICATION IF EXISTS supabase_realtime;
CREATE PUBLICATION supabase_realtime;
ALTER PUBLICATION supabase_realtime ADD TABLE public.produtos;
ALTER PUBLICATION supabase_realtime ADD TABLE public.pedidos;
ALTER PUBLICATION supabase_realtime ADD TABLE public.movimentacoes_stock;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notificacoes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.stock_loja;

-- DONE


-- === v6_unidades.sql ===

-- ========================================================
-- V6 UPDATE - PRODUCT UNITS & MULTIPLE UoM
-- ========================================================

-- 1. Create product_units table
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

-- 2. Modify movimentacoes_stock table to include new unit tracking fields
DO $$ 
BEGIN
    ALTER TABLE public.movimentacoes_stock ADD COLUMN display_qty NUMERIC(15, 3);
    ALTER TABLE public.movimentacoes_stock ADD COLUMN display_unit TEXT;
EXCEPTION WHEN duplicate_column THEN END;
$$;

-- 3. Modify pedido_itens table to include new unit tracking fields
DO $$ 
BEGIN
    ALTER TABLE public.pedido_itens ADD COLUMN display_qty NUMERIC(15, 3);
    ALTER TABLE public.pedido_itens ADD COLUMN display_unit TEXT;
    ALTER TABLE public.pedido_itens ADD COLUMN qty_base NUMERIC(15, 3);
EXCEPTION WHEN duplicate_column THEN END;
$$;

-- 4. Move legacy conversions to the new table
-- Insert base units
INSERT INTO public.product_units (product_id, unit, factor, is_default_buy, is_default_sell)
SELECT id, unidade_base, 1.000, FALSE, FALSE FROM public.produtos 
ON CONFLICT DO NOTHING;

-- Insert un if not present and base is different
INSERT INTO public.product_units (product_id, unit, factor)
SELECT id, 'un', 1.000 FROM public.produtos WHERE unidade_base != 'un' AND unidade_base IS NOT NULL
ON CONFLICT DO NOTHING;

-- Disable RLS
ALTER TABLE public.product_units DISABLE ROW LEVEL SECURITY;

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.product_units;


-- === v7_financeiro.sql ===

-- v7_financeiro.sql
-- Atualiza a precisão da base de dados e adiciona colunas reais de registo de faturas
-- Resolvendo a divergência entre a entrada exata do papel vs arredondamentos do sistema

-- 1. Faturas: Guardamos o valor líquido e o valor do IVA à cabeça da fatura original
ALTER TABLE public.faturas ADD COLUMN IF NOT EXISTS valor_liquido NUMERIC(15, 4) DEFAULT 0.00;
ALTER TABLE public.faturas ADD COLUMN IF NOT EXISTS valor_iva NUMERIC(15, 4) DEFAULT 0.00;

-- 2. Itens das Faturas: Guardamos a percentagem de IVA utilizada na Altura (evitando erros se o iva global do produto mudar)
-- Bem como o valor líquido total e total daquela linha.
ALTER TABLE public.fatura_itens ADD COLUMN IF NOT EXISTS iva NUMERIC(5, 2) DEFAULT 0.00;
ALTER TABLE public.fatura_itens ADD COLUMN IF NOT EXISTS valor_liquido NUMERIC(15, 4) DEFAULT 0.00;
ALTER TABLE public.fatura_itens ADD COLUMN IF NOT EXISTS valor_iva NUMERIC(15, 4) DEFAULT 0.00;
ALTER TABLE public.fatura_itens ADD COLUMN IF NOT EXISTS valor_total NUMERIC(15, 4) DEFAULT 0.00;

-- 3. Aumentar a escala (casas decimais) do preço de custo, caso o produto venha a ter Múltiplas Unidades de Medida
ALTER TABLE public.fatura_itens ALTER COLUMN preco_custo TYPE NUMERIC(15, 6);

-- Opcional (Se existir preco_unitario na sua tabela, como na migração v5)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'fatura_itens' AND column_name = 'preco_unitario') THEN
    ALTER TABLE public.fatura_itens ALTER COLUMN preco_unitario TYPE NUMERIC(15, 6);
  END IF;
END $$;


-- === v8_fornecedores.sql ===

ALTER TABLE public.fornecedores 
ADD COLUMN IF NOT EXISTS morada text,
ADD COLUMN IF NOT EXISTS codigo_postal text,
ADD COLUMN IF NOT EXISTS localidade text,
ADD COLUMN IF NOT EXISTS iban text,
ADD COLUMN IF NOT EXISTS banco text,
ADD COLUMN IF NOT EXISTS swift_bic text,
ADD COLUMN IF NOT EXISTS condicoes_pagamento text;


