import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY);

async function run() {
  const { data, error } = await supabase
    .from('pedidos')
    .select('id, created_at, status')
    .in('status', ['pronto', 'entregue', 'concluido'])
    .gte('created_at', '2026-08-31T00:00:00Z')
    .lt('created_at', '2026-09-01T00:00:00Z');
    
  if (error) {
     console.error(error);
     return;
  }
  
  console.log(`Found ${data?.length} orders from yesterday that are already pronto/entregue.`);
  
  for (const order of data) {
     const newDate = new Date('2026-09-01T08:00:00Z').toISOString();
     await supabase.from('pedidos').update({ created_at: newDate }).eq('id', order.id);
     console.log(`Updated order ${order.id} to ${newDate}`);
  }
}
run();
