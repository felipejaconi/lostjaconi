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
