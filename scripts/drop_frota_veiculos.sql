-- ========================================================
-- REVERTER E REMOVER TABELA DE FROTAS (LOST WIND ERP)
-- Execute este script no SQL Editor do Supabase para apagar
-- a tabela, políticas e índices criados anteriormente.
-- ========================================================

-- 1. Remover políticas de segurança associadas
DROP POLICY IF EXISTS "frota_veiculos_all_policy" ON public.frota_veiculos;

-- 2. Remover índices (embora DROP TABLE remova automaticamente, previne restos)
DROP INDEX IF EXISTS public.idx_frota_matricula;
DROP INDEX IF EXISTS public.idx_frota_loja_id;
DROP INDEX IF EXISTS public.idx_frota_status;

-- 3. Remover a tabela completamente (com CASCADE se houver dependências)
DROP TABLE IF EXISTS public.frota_veiculos CASCADE;
