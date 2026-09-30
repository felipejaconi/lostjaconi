import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY);

async function check() {
  const { data: prod } = await supabase.from('produtos').select('id').limit(1);
  let prodId = prod?.[0]?.id;
  
  if (prodId) {
      const { data, error } = await supabase.from('lotes').insert([{ produto_id: prodId, quantidade: 0 }]).select('*');
      console.log("Cols:", data && data.length > 0 ? Object.keys(data[0]) : "No data", error);
  }
}
check();
