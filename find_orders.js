import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY);

async function run() {
  const { data: users, error: usersError } = await supabase
    .from('users')
    .select('id, name')
    .ilike('name', '%CARTAXO%');
    
  if (usersError) {
     console.error(usersError);
     return;
  }
  console.log("Found users:", users);
  
  if (users.length === 0) return;
  
  const userId = users[0].id;
  
  const { data: orders, error: ordersError } = await supabase
    .from('pedidos')
    .select('id, created_at, status, total')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(20);
    
  if (ordersError) {
     console.error(ordersError);
     return;
  }
  
  console.log("Recent orders for CARTAXO:");
  orders.forEach(o => {
     console.log(`ID: ${o.id} | Date: ${new Date(o.created_at).toLocaleString('pt-PT')} | Status: ${o.status} | Total: ${o.total}`);
  });
}
run();
