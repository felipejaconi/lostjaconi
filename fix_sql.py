import re
with open("banco_atualizado.sql", "r") as f:
    content = f.read()

# Replace lotes CREATE TABLE
target_lotes = """CREATE TABLE IF NOT EXISTS public.lotes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lot_code TEXT NOT NULL,
    produto_id UUID REFERENCES public.produtos(id) ON DELETE CASCADE,
    fornecedor_id UUID REFERENCES public.fornecedores(id) ON DELETE SET NULL,
    quantidade_inicial NUMERIC(15, 3) NOT NULL,
    quantidade_atual NUMERIC(15, 3) NOT NULL,
    preco_custo_lote NUMERIC(15, 4) NOT NULL,
    validade DATE,
    data_entrada TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(lot_code, produto_id)
);"""

replacement_lotes = """CREATE TABLE IF NOT EXISTS public.lotes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lote TEXT,
    rua TEXT,
    prateleira TEXT,
    produto_id UUID REFERENCES public.produtos(id) ON DELETE CASCADE,
    fornecedor_id UUID REFERENCES public.fornecedores(id) ON DELETE SET NULL,
    data_entrada TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);"""

# wait, there's another occurrence of lotes in banco_atualizado.sql (since there are two)
content = content.replace(target_lotes, replacement_lotes)

target_lotes_2 = """CREATE TABLE IF NOT EXISTS public.lotes (
    id UUID DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
    produto_id UUID REFERENCES public.produtos(id) ON DELETE CASCADE,
    fornecedor_id UUID REFERENCES public.fornecedores(id) ON DELETE SET NULL,
    lote TEXT NOT NULL,
    data_validade DATE,
    quantidade_inicial DECIMAL(10, 2) NOT NULL DEFAULT 0,
    quantidade_atual DECIMAL(10, 2) NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);"""

content = content.replace(target_lotes_2, replacement_lotes)

# Also let's prepend an ALTER TABLE statement so the user doesn't have to drop the table.
prepend = """-- ==============================================================================
-- INSTRUÇÕES DE ATUALIZAÇÃO RÁPIDA (PARA CORRIGIR O ERRO DOS LOTES)
-- Execute este bloco isoladamente no SQL Editor do Supabase se a tabela 'lotes' já existir:
-- ==============================================================================
/*
ALTER TABLE public.lotes ADD COLUMN IF NOT EXISTS rua TEXT;
ALTER TABLE public.lotes ADD COLUMN IF NOT EXISTS prateleira TEXT;
ALTER TABLE public.lotes ADD COLUMN IF NOT EXISTS lote TEXT;
*/
-- ==============================================================================\n\n"""

with open("banco_atualizado.sql", "w") as f:
    f.write(prepend + content)

