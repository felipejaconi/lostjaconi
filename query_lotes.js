import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function check() {
  const prodId = '41da91b1-612e-42cd-97d4-9d7437c03076';
  
  const cols = ['lot_code', 'lote', 'codigo', 'numero', 'nome', 'identificador'];
  for (const col of cols) {
    const obj = { produto_id: prodId, quantidade: 0 };
    obj[col] = "LOTE_ABC";
    const res = await supabase.from('lotes').insert([obj]);
    if (!res.error) {
      console.log(`SUCCESS! Column is: ${col}`);
      return;
    } else {
      console.log(`Failed with ${col}: ${res.error.message}`);
    }
  }
}
check();
