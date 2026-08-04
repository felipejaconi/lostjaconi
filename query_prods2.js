import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);
async function check() {
  const res = await supabase.from('produtos').insert([{nome: 'TESTE', metadata: {}}]).select('*');
  console.log(res.error?.message);
}
check();
