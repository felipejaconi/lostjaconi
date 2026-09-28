-- ========================================================
-- TABELA DE GESTÃO DE FROTAS (LOST WIND ERP)
-- Execute este script no SQL Editor do Supabase
-- ========================================================

CREATE TABLE IF NOT EXISTS public.frota_veiculos (
  id text PRIMARY KEY,
  matricula text NOT NULL,
  marca text NOT NULL,
  modelo text NOT NULL,
  ano integer DEFAULT 2022,
  cor text DEFAULT 'Branco',
  combustivel text DEFAULT 'Gasóleo',
  capacidade_deposito numeric DEFAULT 50,
  km_atual numeric DEFAULT 0,
  loja_id text,
  loja_nome text DEFAULT 'Armazém Central',
  responsavel_nome text,
  responsavel_telefone text,
  status text DEFAULT 'ativo',
  data_ultima_inspecao text,
  data_proxima_inspecao text,
  seguradora text,
  apolice_numero text,
  tipo_seguro text DEFAULT 'Danos Próprios',
  data_validade_seguro text,
  km_ultima_troca_oleo numeric DEFAULT 0,
  km_intervalo_troca_oleo numeric DEFAULT 10000,
  km_proxima_troca_oleo numeric DEFAULT 10000,
  data_ultima_troca_oleo text,
  mes_iuc integer DEFAULT 1,
  ano_iuc_pago integer DEFAULT 2026,
  iuc_valor numeric DEFAULT 130,
  notas text,
  abastecimentos jsonb DEFAULT '[]'::jsonb,
  manutencoes jsonb DEFAULT '[]'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Habilitar Row Level Security (RLS)
ALTER TABLE public.frota_veiculos ENABLE ROW LEVEL SECURITY;

-- Políticas de acesso livre para operações autenticadas/sistema
DROP POLICY IF EXISTS "frota_veiculos_all_policy" ON public.frota_veiculos;
CREATE POLICY "frota_veiculos_all_policy" ON public.frota_veiculos
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Criar índices para busca rápida
CREATE INDEX IF NOT EXISTS idx_frota_matricula ON public.frota_veiculos(matricula);
CREATE INDEX IF NOT EXISTS idx_frota_loja_id ON public.frota_veiculos(loja_id);
CREATE INDEX IF NOT EXISTS idx_frota_status ON public.frota_veiculos(status);

-- Notificação de sucesso
COMMENT ON TABLE public.frota_veiculos IS 'Tabela de controle de frotas e viaturas com manutenções e abastecimentos';
