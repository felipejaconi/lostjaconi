import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);
async function check() {
  const obj = { produto_id: '41da91b1-612e-42cd-97d4-9d7437c03076', quantidade: 0, codigo_lote: 'L1' };
  const res = await supabase.from('lotes').insert([obj]);
  console.log(res.error?.message);
}
check();
