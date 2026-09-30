import { supabase } from './src/lib/supabase';
async function test() {
  const { data, error } = await supabase.from('faturas').insert([{
    numero_fatura: 'TESTE_VENDA_LOJA',
    tipo: 'vendas_loja',
    valor_total: 1000,
    fornecedor_id: null
  }]);
  console.log(error || data);
}
test();
