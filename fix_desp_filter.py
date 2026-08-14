import re

with open('src/pages/admin/AdminReports.tsx', 'r') as f:
    content = f.read()

# 1. Fix the entityMatch in the filter
old_filter_block = """        fetchedData = fetchedData.filter(f => {
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
        });"""

new_filter_block = """        fetchedData = fetchedData.filter(f => {
            const isDespesa = f.tipo && f.tipo.startsWith('despesa');
            const periodMatch = filterByPeriod(f.data_emissao, period);
            let statusMatch = true;
            if (status !== "todos") {
                if (status === "pago") statusMatch = f.status_pagamento === "pago";
                if (status === "nao_pago") statusMatch = f.status_pagamento !== "pago";
            }
            
            let lojaId = "armazem";
            try {
               if (f.descrição) {
                  const parsed = JSON.parse(f.descrição);
                  if (parsed.loja_id) lojaId = String(parsed.loja_id);
               }
            } catch(e) {}
            
            const entityMatch = entity === "todos" || lojaId === entity;
            
            return isDespesa && periodMatch && statusMatch && entityMatch;
        });

        headers = ["Data Emissão", "Vencimento", "Loja", "Fornecedor", "Categoria", "Valor (€)", "Pendente (€)", "Status"];
        title = "Relatório de Despesas";
        
        let totalValor = 0;
        let totalPendente = 0;
        data = fetchedData.map(f => {
           let calcTotal = Number(f.valor_total || 0);
           let calcPendente = Number(f.valor_pendente !== undefined ? f.valor_pendente : calcTotal);
           if (f.status_pagamento === 'pago') calcPendente = 0;
           
           totalValor += calcTotal;
           totalPendente += calcPendente;
           
           let lojaNome = "Armazém Central";
           try {
              if (f.descrição) {
                 const parsed = JSON.parse(f.descrição);
                 if (parsed.loja_id) {
                     const l = lojas.find(x => String(x.id) === String(parsed.loja_id));
                     if (l) lojaNome = l.name || l.nome;
                 }
              }
           } catch(e) {}
           
           return [
              f.data_emissao ? new Date(f.data_emissao).toLocaleDateString("pt-PT") : "N/A",
              f.data_vencimento ? new Date(f.data_vencimento).toLocaleDateString("pt-PT") : "N/A",
              lojaNome,
              f.fornecedor?.nome || "---",
              (f.tipo || "despesa").replace("despesa_", "").toUpperCase(),
              calcTotal.toFixed(2),
              calcPendente.toFixed(2),
              (f.status_pagamento || "pendente").toUpperCase()
           ];
        });"""

content = content.replace(old_filter_block, new_filter_block)

# 2. Fix the label "Filtrar por Loja ou Fornecedor"
old_label = """                        <Building2 size={14}/> {["pagar", "faturas_pagas"].includes(reportType) ? "Filtrar por Loja ou Fornecedor" : ["iva_credito", "despesas"].includes(reportType) ? "Filtrar por Fornecedor" : "Filtrar por Loja"}"""
new_label = """                        <Building2 size={14}/> {["pagar", "faturas_pagas"].includes(reportType) ? "Filtrar por Loja ou Fornecedor" : reportType === "iva_credito" ? "Filtrar por Fornecedor" : reportType === "despesas" ? "Filtrar por Loja ou Armazém" : "Filtrar por Loja"}"""
content = content.replace(old_label, new_label)

# 3. Fix the entity options
old_options = """                            options={[
                                { id: "todos", nome: "Todos(as)" },
                                ...(["pagar", "faturas_pagas"].includes(reportType) ? [
                                    ...fornecedores.map(f => ({ id: `fornecedor_${f.id}`, nome: `${f.nome} (Fornecedor)` })),
                                    ...lojas.map(l => ({ id: `loja_${l.id}`, nome: `${l.name || l.nome} (Loja)` }))
                                ] : []),
                                ...(["iva_credito", "despesas"].includes(reportType) ? fornecedores.map(f => ({ id: String(f.id), nome: f.nome })) : []),
                                ...(["receber", "consumo_lojas", "debito_iva"].includes(reportType) ? lojas.map(l => ({ id: String(l.id), nome: l.name || l.nome })) : [])
                            ]}"""

new_options = """                            options={[
                                { id: "todos", nome: "Todos(as)" },
                                ...(["pagar", "faturas_pagas"].includes(reportType) ? [
                                    ...fornecedores.map(f => ({ id: `fornecedor_${f.id}`, nome: `${f.nome} (Fornecedor)` })),
                                    ...lojas.map(l => ({ id: `loja_${l.id}`, nome: `${l.name || l.nome} (Loja)` }))
                                ] : []),
                                ...(reportType === "iva_credito" ? fornecedores.map(f => ({ id: String(f.id), nome: f.nome })) : []),
                                ...(["receber", "consumo_lojas", "debito_iva"].includes(reportType) ? lojas.map(l => ({ id: String(l.id), nome: l.name || l.nome })) : []),
                                ...(reportType === "despesas" ? [
                                    { id: "armazem", nome: "Armazém Central" },
                                    ...lojas.map(l => ({ id: String(l.id), nome: l.name || l.nome }))
                                ] : [])
                            ]}"""
content = content.replace(old_options, new_options)

# Also fix the data.push line for despesas since we added one more column:
old_push = """        data.push(["", "", "", "TOTAL CALCULADO", totalValor.toFixed(2), totalPendente.toFixed(2), ""]);"""
new_push = """        data.push(["", "", "", "", "TOTAL CALCULADO", totalValor.toFixed(2), totalPendente.toFixed(2), ""]);"""
# wait, old push might be elsewhere too, we can just replace specifically inside despesas logic if we had captured it, but let's replace manually here
content = content.replace(
    '        data.push(["", "", "", "TOTAL CALCULADO", totalValor.toFixed(2), totalPendente.toFixed(2), ""]);',
    '        data.push(["", "", "", "", "TOTAL CALCULADO", totalValor.toFixed(2), totalPendente.toFixed(2), ""]);'
)

with open('src/pages/admin/AdminReports.tsx', 'w') as f:
    f.write(content)
