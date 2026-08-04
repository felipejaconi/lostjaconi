const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);
async function test() {
  const { data, error } = await supabase.from('faturas').insert([{
    numero_fatura: 'TESTE_VENDA_LOJA',
    tipo: 'vendas_loja',
    valor_total: 1000,
    created_by: '30a824bf-5fc0-4fa9-aad7-a60ac2f71c96'
  }]);
  console.log(error || data);
}
test();
