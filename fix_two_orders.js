import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY);

async function run() {
  const idsToUpdate = [
    '10675dfb-fba8-4041-a580-c43a31012275',
    'f119cb14-1063-40a6-8460-4994a1fd332a'
  ];
  
  // Set them to today's date (Sept 1, 2026)
  const newDate = new Date().toISOString(); 
  
  for (const id of idsToUpdate) {
    const { data, error } = await supabase
      .from('pedidos')
      .update({ created_at: newDate })
      .eq('id', id);
      
    if (error) {
       console.error(`Error updating ${id}:`, error);
    } else {
       console.log(`Successfully updated order ${id} to ${newDate}`);
    }
  }
}
run();
