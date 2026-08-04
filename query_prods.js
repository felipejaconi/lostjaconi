import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function check() {
  const cols = ['lote', 'lot_code', 'numero_lote'];
  for (const col of cols) {
    const obj = { nome: 'TESTE' };
    obj[col] = "LOTE_ABC";
    const res = await supabase.from('produtos').insert([obj]);
    console.log(`Column ${col}: ${res.error?.message}`);
  }
}
check();
