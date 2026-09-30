import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY
);

async function run() {
  const { data: faturas } = await supabase.from('faturas').select('*').eq('numero_fatura', 'LX226/081698');
  console.log('faturas:', JSON.stringify(faturas, null, 2));
  
  if (faturas && faturas.length > 0) {
    const fatura_id = faturas[0].id;
    const { data: itens } = await supabase.from('fatura_itens').select('*, produto:produtos(nome)').eq('fatura_id', fatura_id);
    console.log('fatura_itens count:', itens?.length);
    console.log('fatura_itens:', JSON.stringify(itens, null, 2));
    
    const { data: movs } = await supabase.from('movimentacoes_stock').select('*, produto:produtos(nome)').like('motivo', '%LX226/081698%');
    console.log('movimentacoes_stock count:', movs?.length);
    console.log('movimentacoes_stock:', JSON.stringify(movs, null, 2));
  }
}
run();
