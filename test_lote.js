import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function check() {
  const { data, error } = await supabase.from('lotes').insert([{ produto_id: '41da91b1-612e-42cd-97d4-9d7437c03076', lote: 'TESTE', quantidade: 0 }]);
  console.log("Insert lote error:", error?.message);
}
check();
