import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY);

async function run() {
  const { data: faturas, error } = await supabase
    .from('faturas')
    .select('*')
    .neq('status_pagamento', 'pago');
    
  if (error) {
     console.error("Error fetching faturas:", error);
     return;
  }
  
  console.log(`Found ${faturas.length} faturas to pay.`);
  
  for (const fatura of faturas) {
     const valorToPay = fatura.valor_pendente || 0;
     
     if (valorToPay > 0) {
       await supabase.from("movimentos_financeiros").insert([{
         fatura_id: fatura.id,
         valor: Number(valorToPay),
         data_pagamento: new Date().toISOString().split('T')[0],
         metodo: 'Transferência Bancária',
         created_by: null
       }]);
     }
     
     const { error: updateError } = await supabase
       .from('faturas')
       .update({ status_pagamento: 'pago', valor_pendente: 0 })
       .eq('id', fatura.id);
       
     if (updateError) {
        console.error(`Error updating fatura ${fatura.id}:`, updateError);
     }
  }
  
  console.log("All faturas marked as paid.");
}
run();
