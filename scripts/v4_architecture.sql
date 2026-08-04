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
