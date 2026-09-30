import { createClient } from "@supabase/supabase-js";
import 'dotenv/config';
const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  const { data, error } = await supabase.from('pedidos').select('id, user_id, status, total, observacoes, created_at').limit(1);
  console.log(data);
  
  const { data: itens, error: err2 } = await supabase.from('pedido_itens').select('id, pedido_id, produto_id, quantidade, preco_unitario').limit(1);
  console.log(itens);
}
test();
