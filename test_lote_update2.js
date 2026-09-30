import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY);

async function check() {
  const { data: prod } = await supabase.from('produtos').select('id').limit(1);
  let prodId = prod?.[0]?.id;
  
  if (prodId) {
      const loteData = {
          produto_id: prodId,
          lote: null,
          rua: null,
          prateleira: null,
          quantidade: 0
      };
      const { data, error } = await supabase.from('lotes').insert([loteData]).select('*');
      console.log("Insert result:", data, error);
  }
}
check();
