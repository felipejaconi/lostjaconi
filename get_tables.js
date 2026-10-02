import { createClient } from '@supabase/supabase-js';
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY);
async function run() {
  const { data, error } = await supabase.rpc('get_schema');
  console.log(data, error);
}
run();
