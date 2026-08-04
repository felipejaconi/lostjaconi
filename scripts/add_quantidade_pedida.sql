-- Este script adiciona a coluna 'quantidade_pedida' para que possamos manter o histórico original.
ALTER TABLE public.pedido_itens 
  ADD COLUMN IF NOT EXISTS quantidade_pedida NUMERIC(15, 3);

-- Opcional: preencher os valores antigos com a quantidade atual
UPDATE public.pedido_itens 
SET quantidade_pedida = quantidade 
WHERE quantidade_pedida IS NULL;
