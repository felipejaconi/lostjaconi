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
