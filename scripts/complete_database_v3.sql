-- ========================================================
-- LOST WIND LDA - BANCO DE DADOS COMPLETO E ATUALIZADO
-- Data: 2026-05-11
-- Descrição: Script completo para recriar o banco de dados
-- do zero no Supabase (PostgreSQL).
-- ========================================================

-- 1. EXTENSÕES (Se necessário)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. LIMPEZA (OPCIONAL - Cuidado: Apaga tudo)
/*
DROP TABLE IF EXISTS notificacoes CASCADE;
DROP TABLE IF EXISTS movimentacoes_stock CASCADE;
DROP TABLE IF EXISTS stock_loja CASCADE;
DROP TABLE IF EXISTS pedido_itens CASCADE;
DROP TABLE IF EXISTS pedidos CASCADE;
DROP TABLE IF EXISTS lotes CASCADE;
DROP TABLE IF EXISTS produtos CASCADE;
DROP TABLE IF EXISTS categorias CASCADE;
DROP TABLE IF EXISTS users CASCADE;
*/

-- 3. CRIAÇÃO DAS TABELAS

-- Tabela de Usuários (Admins, Armazém, Lojas)
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('admin', 'armazem', 'loja')) DEFAULT 'loja',
    avatar_url TEXT,
    manager_name TEXT,
    order_start_time TIME,
    order_end_time TIME,
    picking_start_time TIME,
    picking_end_time TIME,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de Categorias
CREATE TABLE IF NOT EXISTS public.categorias (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome TEXT NOT NULL UNIQUE,
    imagem_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de Produtos
CREATE TABLE IF NOT EXISTS public.produtos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome TEXT NOT NULL,
    descricao TEXT,
    preco NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    iva NUMERIC(5, 2) DEFAULT 23.00,
    peso NUMERIC(10, 3) DEFAULT 0.000,
    unidade_medida TEXT CHECK (unidade_medida IN ('un', 'kg', 'lt', 'pack', 'caixa', 'pacote')) DEFAULT 'un',
    quantidade_padrao NUMERIC(10, 3) DEFAULT 1.000,
    unidade_embalagem INTEGER DEFAULT 1,
    stock_armazem NUMERIC(10, 3) NOT NULL DEFAULT 0.000,
    categoria_id UUID REFERENCES public.categorias(id) ON DELETE SET NULL,
    barcode_ean TEXT UNIQUE,
    item_color TEXT,
    pais_origem TEXT,
    imagem_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT produtos_barcode_check CHECK (barcode_ean != '')
);

-- Tabela de Lotes (WMS)
CREATE TABLE IF NOT EXISTS public.lotes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lot_code TEXT UNIQUE NOT NULL,
    produto_id UUID REFERENCES public.produtos(id) ON DELETE CASCADE,
    quantidade_inicial NUMERIC(10, 3) NOT NULL,
    quantidade_atual NUMERIC(10, 3) NOT NULL,
    unidade TEXT NOT NULL DEFAULT 'un',
    fornecedor_id TEXT,
    ean_fornecedor_origem TEXT,
    validade DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de Movimentações de Stock (WMS Log)
CREATE TABLE IF NOT EXISTS public.movimentacoes_stock (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    produto_id UUID REFERENCES public.produtos(id) ON DELETE CASCADE,
    lote_id UUID REFERENCES public.lotes(id) ON DELETE SET NULL,
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL, -- Quem realizou a ação
    user_target_id UUID REFERENCES public.users(id) ON DELETE SET NULL, -- Loja de destino (se aplicável)
    tipo TEXT NOT NULL CHECK (tipo IN ('entrada', 'saida', 'ajuste')),
    quantidade NUMERIC(10, 3) NOT NULL,
    unidade TEXT,
    motivo TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de Stock Individual das Lojas (Inventário da Loja)
CREATE TABLE IF NOT EXISTS public.stock_loja (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    produto_id UUID REFERENCES public.produtos(id) ON DELETE CASCADE,
    quantidade NUMERIC(10, 3) NOT NULL DEFAULT 0.000,
    ultima_picagem TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, produto_id)
);

-- Tabela de Pedidos (Lojas -> Armazém)
CREATE TABLE IF NOT EXISTS public.pedidos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    status TEXT NOT NULL CHECK (status IN ('pendente', 'preparacao', 'enviado', 'concluido', 'cancelado')) DEFAULT 'pendente',
    total NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    observacoes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de Itens do Pedido
CREATE TABLE IF NOT EXISTS public.pedido_itens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pedido_id UUID REFERENCES public.pedidos(id) ON DELETE CASCADE,
    produto_id UUID REFERENCES public.produtos(id) ON DELETE CASCADE,
    quantidade NUMERIC(10, 3) NOT NULL,
    preco_unitario NUMERIC(10, 2) NOT NULL,
    unidade TEXT DEFAULT 'un'
);

-- Tabela de Notificações
CREATE TABLE IF NOT EXISTS public.notificacoes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    titulo TEXT NOT NULL,
    mensagem TEXT NOT NULL,
    lida BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. ÍNDICES DE PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_produtos_barcode_ean ON public.produtos(barcode_ean);
CREATE INDEX IF NOT EXISTS idx_lotes_lot_code ON public.lotes(lot_code);
CREATE INDEX IF NOT EXISTS idx_movimentacoes_produto ON public.movimentacoes_stock(produto_id);
CREATE INDEX IF NOT EXISTS idx_movimentacoes_created ON public.movimentacoes_stock(created_at);
CREATE INDEX IF NOT EXISTS idx_pedidos_user ON public.pedidos(user_id);
CREATE INDEX IF NOT EXISTS idx_stock_loja_user ON public.stock_loja(user_id);

-- 5. SEGURANÇA (RLS)
-- Como a autenticação é gerida pelo backend via JWT, desabilitamos RLS 
-- ou configuramos para permitir acesso via API.
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.categorias DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.produtos DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.lotes DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.movimentacoes_stock DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_loja DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.pedidos DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.pedido_itens DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.notificacoes DISABLE ROW LEVEL SECURITY;

-- 6. HABILITAR REALTIME (Supabase)
DROP PUBLICATION IF EXISTS supabase_realtime;
CREATE PUBLICATION supabase_realtime;
ALTER PUBLICATION supabase_realtime ADD TABLE public.produtos;
ALTER PUBLICATION supabase_realtime ADD TABLE public.pedidos;
ALTER PUBLICATION supabase_realtime ADD TABLE public.lotes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.movimentacoes_stock;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notificacoes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.stock_loja;

-- 7. DADOS INICIAIS (SEED)
INSERT INTO public.categorias (nome) VALUES 
    ('Vestuário'), 
    ('Acessórios'), 
    ('Calçado'), 
    ('Equipamento'),
    ('Brinquedos'),
    ('Papelaria')
ON CONFLICT (nome) DO NOTHING;

-- NOTA PARA CRIAÇÃO DO ADMIN INICIAL:
-- O utilizador Admin deve ser criado através da API para garantir a encriptação da senha.
-- Após rodar este SQL, faça uma requisição POST para /api/setup-admin do seu servidor.
