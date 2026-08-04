import sys

with open('src/pages/admin/AdminReports.tsx', 'r') as f:
    code = f.read()

start_marker = '} else if (reportType === "receber" || reportType === "vencidas_receber") {'
end_marker = '} else if (reportType === "fornecedores") {'

start_idx = code.find(start_marker)
end_idx = code.find(end_marker)

if start_idx == -1 or end_idx == -1:
    print("Markers not found")
    sys.exit(1)

new_code = '''      } else if (reportType === "receber") {
        const res = await api.get("/pedidos");
        let fetchedData = Array.isArray(res.data) ? res.data : [];
        
        fetchedData = fetchedData.filter(p => {
             const isReceberBase = ['pronto', 'entregue', 'concluido'].includes(p.status?.toLowerCase());
             const periodMatch = filterByPeriod(p.created_at, period);
            
            let statusMatch = true;
            if (status !== "todos") {
               if (status === "pago") statusMatch = p.status?.toLowerCase() === "concluido";
               if (status === "nao_pago") statusMatch = ['pronto', 'entregue'].includes(p.status?.toLowerCase());
            }
            
            const lojaMatch = entity === "todos" || String(p.user_id) === entity;
            
            return isReceberBase && periodMatch && statusMatch && lojaMatch;
        });

        headers = ["Data Pedido", "ID Pedido", "Loja", "Valor Total (€)", "Status Pagamento"];
        title = "Relatório de Faturas a Receber";

        let totalValor = 0;
        data = fetchedData.map(p => {
           let calcTotal = Number(p.total || 0);
           totalValor += calcTotal;
           return [
               new Date(p.created_at).toLocaleDateString("pt-PT"),
               p.id.split('-')[0].toUpperCase(),
               p.loja_nome || "Loja Desconhecida",
               calcTotal.toFixed(2),
               p.status?.toLowerCase() === "concluido" ? "RECEBIDO" : "PENDENTE"
           ];
        });
        
        data.push(["", "", "TOTAL CALCULADO", totalValor.toFixed(2), ""]);
        
      } else if (reportType === "total_lojas") {
         const pedRes = await api.get("/pedidos");
         const faturasRes = await api.get("/admin/faturas");
         
         const pedidos = Array.isArray(pedRes.data) ? pedRes.data.filter((p: any) => filterByPeriod(p.created_at, period)) : [];
         const faturas = Array.isArray(faturasRes.data) ? faturasRes.data.filter((f: any) => filterByPeriod(f.data_emissao, period)) : [];
         
         let items: any[] = [];
         
         pedidos.forEach(p => {
             if (['pronto', 'entregue', 'concluido'].includes(p.status?.toLowerCase())) {
                 const uid = String(p.user_id);
                 if (entity !== "todos" && uid !== entity) return;
                 items.push({
                     data: p.created_at,
                     tipo: "A Receber (Pedido)",
                     doc: p.id.split('-')[0].toUpperCase(),
                     loja: p.loja_nome || "Loja",
                     valor: Number(p.total || 0)
                 });
             }
         });
         
         faturas.forEach(f => {
             if (f.tipo === "despesa" || f.tipo?.startsWith("despesa")) {
                 let lojaId = null;
                 try {
                    if (f.descrição) {
                       const parsed = JSON.parse(f.descrição);
                       if (parsed.loja_id) lojaId = String(parsed.loja_id);
                    }
                 } catch(e) {}
                 
                 if (lojaId && (entity === "todos" || lojaId === entity)) {
                     const st = lojas.find(l => String(l.id) === lojaId);
                     items.push({
                         data: f.data_emissao,
                         tipo: "Despesa",
                         doc: f.numero_fatura || "S/N",
                         loja: st ? (st.name || st.nome) : "Loja",
                         valor: Number(f.valor_total || 0)
                     });
                 }
             }
         });
         
         items.sort((a, b) => new Date(a.data).getTime() - new Date(b.data).getTime());
         
         headers = ["Data", "Tipo", "Documento", "Loja", "Valor (€)"];
         title = "Extrato Detalhado de Lojas";
         
         let totReceber = 0;
         let totDespesa = 0;
         
         data = items.map(i => {
             if (i.tipo === "Despesa") totDespesa += i.valor;
             else totReceber += i.valor;
             
             return [
                 new Date(i.data).toLocaleDateString("pt-PT"),
                 i.tipo,
                 i.doc,
                 i.loja,
                 i.valor.toFixed(2)
             ];
         });
         
         data.push(["", "", "", "TOTAL A RECEBER", totReceber.toFixed(2)]);
         data.push(["", "", "", "TOTAL DESPESAS", totDespesa.toFixed(2)]);
         data.push(["", "", "", "BALANÇO FINAL", (totReceber - totDespesa).toFixed(2)]);
         
      } else if (reportType === "consumo_lojas") {
         const pedRes = await api.get("/pedidos");
         const faturasRes = await api.get("/admin/faturas");
         
         const pedidos = Array.isArray(pedRes.data) ? pedRes.data.filter((p: any) => filterByPeriod(p.created_at, period)) : [];
         const faturas = Array.isArray(faturasRes.data) ? faturasRes.data.filter((f: any) => filterByPeriod(f.data_emissao, period)) : [];
         
         let lojaStats: Record<string, { nome: string, consumo: number, despesas: number }> = {};
         
         lojas.forEach(l => {
             lojaStats[l.id] = { nome: l.name || l.nome || "Loja " + l.id, consumo: 0, despesas: 0 };
         });
         
         pedidos.forEach(p => {
             if (['pronto', 'entregue', 'concluido'].includes(p.status?.toLowerCase())) {
                 const uid = String(p.user_id);
                 if (lojaStats[uid]) lojaStats[uid].consumo += Number(p.total || 0);
             }
         });
         
         faturas.forEach(f => {
             let lojaId = null;
             try {
                if (f.descrição) {
                   const parsed = JSON.parse(f.descrição);
                   if (parsed.loja_id) lojaId = String(parsed.loja_id);
                }
             } catch(e) {}
             
             if (lojaId && lojaStats[lojaId]) {
                 if (f.tipo === "despesa" || f.tipo?.startsWith("despesa")) lojaStats[lojaId].despesas += Number(f.valor_total || 0);
             }
         });
         
         let listStats = Object.values(lojaStats);
         if (entity !== "todos") {
             listStats = listStats.filter(s => s.nome === lojas.find(l => String(l.id) === entity)?.name);
         }
         
         headers = ["Loja", "Total Pedidos (€)", "Total Despesas (€)", "Total Geral (€)"];
         title = "Resumo de Consumo e Despesas das Lojas";
         let totP = 0, totD = 0, totG = 0;
         data = listStats.map(s => {
             totP += s.consumo;
             totD += s.despesas;
             let tot = s.consumo + s.despesas;
             totG += tot;
             return [s.nome, s.consumo.toFixed(2), s.despesas.toFixed(2), tot.toFixed(2)];
         });
         data.push(["TOTAL", totP.toFixed(2), totD.toFixed(2), totG.toFixed(2)]);
      '''

final_code = code[:start_idx] + new_code + code[end_idx:]

with open('src/pages/admin/AdminReports.tsx', 'w') as f:
    f.write(final_code)

print("Logic updated")
