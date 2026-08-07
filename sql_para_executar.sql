-- TABELA FECHOS DE CAIXA
CREATE TABLE IF NOT EXISTS fechos_caixa (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  loja_id UUID REFERENCES users(id) ON DELETE CASCADE,
  data DATE NOT NULL,
  sys_mb NUMERIC(10, 2) DEFAULT 0,
  sys_dinheiro NUMERIC(10, 2) DEFAULT 0,
  sys_mesa NUMERIC(10, 2) DEFAULT 0,
  sys_total NUMERIC(10, 2) DEFAULT 0,
  real_mb NUMERIC(10, 2) DEFAULT 0,
  real_dinheiro NUMERIC(10, 2) DEFAULT 0,
  real_mesa NUMERIC(10, 2) DEFAULT 0,
  real_total NUMERIC(10, 2) DEFAULT 0,
  despesas NUMERIC(10, 2) DEFAULT 0,
  dif_sis_apre NUMERIC(10, 2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES users(id),
  UNIQUE(loja_id, data)
);

ALTER TABLE fechos_caixa ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Fechos select policy" ON fechos_caixa FOR SELECT USING (true);
CREATE POLICY "Fechos insert policy" ON fechos_caixa FOR INSERT WITH CHECK (true);
CREATE POLICY "Fechos update policy" ON fechos_caixa FOR UPDATE USING (true);
CREATE POLICY "Fechos delete policy" ON fechos_caixa FOR DELETE USING (true);
