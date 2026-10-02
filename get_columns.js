import { createClient } from '@supabase/supabase-js';
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY);
async function run() {
  const { data, error } = await supabase.from('users').select('*').limit(1);
  if (data && data.length > 0) {
      console.log(Object.keys(data[0]));
  }
}
run();
