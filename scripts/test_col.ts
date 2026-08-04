import { supabase } from '../src/lib/supabase';
async function test() {
  const { data, error } = await supabase.from('pedido_itens').select('quantidade_original, quantidade_conferida').limit(1);
  console.log({data, error});
}
test();
