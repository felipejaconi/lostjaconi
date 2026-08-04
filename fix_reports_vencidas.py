import sys

with open('src/pages/admin/AdminReports.tsx', 'r') as f:
    code = f.read()

old_logic = """        let calcPagar = 0;
        if (Array.isArray(faturasRes.data)) {
           faturasRes.data.forEach((f: any) => {
               if (["pendente", "parcial"].includes(f.status_pagamento || "pendente")) {
                   calcPagar += Number(f.valor_total || 0);
               }
           });
        }"""
new_logic = """        let calcPagar = 0;
        const today = new Date();
        today.setHours(0,0,0,0);
        
        if (Array.isArray(faturasRes.data)) {
           faturasRes.data.forEach((f: any) => {
               if (["pendente", "parcial"].includes(f.status_pagamento || "pendente")) {
                   let isOverdue = false;
                   if (f.data_vencimento) {
                       const venc = new Date(f.data_vencimento);
                       venc.setHours(0,0,0,0);
                       isOverdue = venc < today;
                   } else if (f.data_emissao) {
                       // Se não tem vencimento, assume que a emissão conta e já pode estar vencida? Melhor não. Se não tem data_vencimento assumiremos que não é vencida, ou podemos assumir = emissão.
                       const emiss = new Date(f.data_emissao);
                       emiss.setHours(0,0,0,0);
                       isOverdue = emiss < today;
                   }
                   if (isOverdue) {
                       calcPagar += Number(f.valor_pendente !== undefined ? f.valor_pendente : (f.valor_total || 0));
                   }
               }
           });
        }"""
code = code.replace(old_logic, new_logic)

old_ui1 = """<p className="text-[11px] font-bold uppercase tracking-widest text-zinc-500 mb-1">A Pagar (Fornecedores)</p>"""
new_ui1 = """<p className="text-[11px] font-bold uppercase tracking-widest text-zinc-500 mb-1">Faturas Vencidas (A Pagar)</p>"""
code = code.replace(old_ui1, new_ui1)

old_ui2 = """<p className="text-[11px] font-bold uppercase tracking-widest text-zinc-500 mb-1">Balanço (A Receber - A Pagar)</p>"""
new_ui2 = """<p className="text-[11px] font-bold uppercase tracking-widest text-zinc-500 mb-1">Balanço (A Receber - Vencidas)</p>"""
code = code.replace(old_ui2, new_ui2)

with open('src/pages/admin/AdminReports.tsx', 'w') as f:
    f.write(code)
print("Success")
