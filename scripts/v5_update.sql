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
