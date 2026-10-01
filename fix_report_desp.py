import re

with open('src/pages/admin/AdminReports.tsx', 'r') as f:
    content = f.read()

new_block = """      } else if (reportType === "despesas") {
        const res = await api.get("/admin/faturas");
        let fetchedData = Array.isArray(res.data) ? res.data : [];
        
        fetchedData = fetchedData.filter(f => {
            const isDespesa = f.tipo && f.tipo.startsWith('despesa');
            const periodMatch = filterByPeriod(f.data_emissao, period);
            let statusMatch = true;
            if (status !== "todos") {
                if (status === "pago") statusMatch = f.status_pagamento === "pago";
                if (status === "nao_pago") statusMatch = f.status_pagamento !== "pago";
            }
            const entityMatch = entity === "todos" || String(f.fornecedor_id) === entity;
            
            return isDespesa && periodMatch && statusMatch && entityMatch;
        });

        headers = ["Data Emissão", "Vencimento", "Entidade", "Categoria", "Valor (€)", "Pendente (€)", "Status"];
        title = "Relatório de Despesas";
        
        let totalValor = 0;
        let totalPendente = 0;
        data = fetchedData.map(f => {
           let calcTotal = Number(f.valor_total || 0);
           let calcPendente = Number(f.valor_pendente !== undefined ? f.valor_pendente : calcTotal);
           if (f.status_pagamento === 'pago') calcPendente = 0;
           
           totalValor += calcTotal;
           totalPendente += calcPendente;
           
           return [
              f.data_emissao ? new Date(f.data_emissao).toLocaleDateString("pt-PT") : "N/A",
              f.data_vencimento ? new Date(f.data_vencimento).toLocaleDateString("pt-PT") : "N/A",
              f.fornecedor?.nome || "---",
              (f.tipo || "despesa").replace("despesa_", "").toUpperCase(),
              calcTotal.toFixed(2),
              calcPendente.toFixed(2),
              (f.status_pagamento || "pendente").toUpperCase()
           ];
        });
        
        data.push(["", "", "", "TOTAL CALCULADO", totalValor.toFixed(2), totalPendente.toFixed(2), ""]);
      } else if (reportType === "consumo_lojas") {"""

content = content.replace('      } else if (reportType === "consumo_lojas") {', new_block)

with open('src/pages/admin/AdminReports.tsx', 'w') as f:
    f.write(content)

