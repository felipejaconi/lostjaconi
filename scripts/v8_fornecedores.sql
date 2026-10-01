ALTER TABLE public.fornecedores 
ADD COLUMN IF NOT EXISTS morada text,
ADD COLUMN IF NOT EXISTS codigo_postal text,
ADD COLUMN IF NOT EXISTS localidade text,
ADD COLUMN IF NOT EXISTS iban text,
ADD COLUMN IF NOT EXISTS banco text,
ADD COLUMN IF NOT EXISTS swift_bic text,
ADD COLUMN IF NOT EXISTS condicoes_pagamento text;
