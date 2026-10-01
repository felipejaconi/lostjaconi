import re

with open('src/pages/admin/AdminFinancial.tsx', 'r') as f:
    content = f.read()

old_func = """  const handleCreateDespesa = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
         ...formData,
         valor_total: Number(formData.valor_total),
         valor_pendente: Number(formData.valor_total),
         status_pagamento: "pendente"
      };
      await api.post("/admin/faturas", payload);
      Swal.fire({
         title: 'Sucesso',
         text: 'Despesa registada com sucesso',
         icon: 'success',
         background: '#18181b', color: '#f4f4f5',
         confirmButtonColor: '#10b981'
      });
      setIsModalOpen(false);
      fetchDados();
    } catch(err: any) {"""

new_func = """  const handleCreateDespesa = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const numParcelas = Number(formData.parcelas) || 1;
      
      if (numParcelas > 1) {
         const payloadArray = [];
         const [year, month, day] = formData.data_emissao.split('-');
         let currentEmissao = new Date(Number(year), Number(month) - 1, Number(day));
         
         let currentVencimento: Date | null = null;
         if (formData.data_vencimento) {
             const [vYear, vMonth, vDay] = formData.data_vencimento.split('-');
             currentVencimento = new Date(Number(vYear), Number(vMonth) - 1, Number(vDay));
         }

         for (let i = 0; i < numParcelas; i++) {
             const suffix = `-P${i+1}/${numParcelas}`;
             
             // Check to properly format dates YYYY-MM-DD
             const pad = (n: number) => String(n).padStart(2, '0');
             const formatD = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;

             payloadArray.push({
                 numero_fatura: `${formData.numero_fatura}${suffix}`,
                 fornecedor_id: formData.fornecedor_id,
                 tipo: formData.tipo,
                 valor_total: Number(formData.valor_total),
                 valor_pendente: Number(formData.valor_total),
                 status_pagamento: "pendente",
                 data_emissao: formatD(currentEmissao),
                 data_vencimento: currentVencimento ? formatD(currentVencimento) : null
             });
             
             // increment 1 month
             currentEmissao.setMonth(currentEmissao.getMonth() + 1);
             if (currentVencimento) {
                 currentVencimento.setMonth(currentVencimento.getMonth() + 1);
             }
         }
         await api.post("/admin/faturas", payloadArray);
      } else {
         const payload = {
            numero_fatura: formData.numero_fatura,
            fornecedor_id: formData.fornecedor_id,
            tipo: formData.tipo,
            data_emissao: formData.data_emissao,
            data_vencimento: formData.data_vencimento || null,
            valor_total: Number(formData.valor_total),
            valor_pendente: Number(formData.valor_total),
            status_pagamento: "pendente"
         };
         await api.post("/admin/faturas", payload);
      }

      Swal.fire({
         title: 'Sucesso',
         text: numParcelas > 1 ? `Foram registadas ${numParcelas} parcelas com sucesso!` : 'Despesa registada com sucesso',
         icon: 'success',
         background: '#18181b', color: '#f4f4f5',
         confirmButtonColor: '#10b981'
      });
      setIsModalOpen(false);
      fetchDados();
    } catch(err: any) {"""

content = content.replace(old_func, new_func)

with open('src/pages/admin/AdminFinancial.tsx', 'w') as f:
    f.write(content)

