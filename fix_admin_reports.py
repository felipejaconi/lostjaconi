import sys

with open('src/pages/admin/AdminReports.tsx', 'r') as f:
    code = f.read()

# 1. Update Headers
old_headers = """        headers = ["Data Emissão", "Fornecedor", "Nº Fatura", "IBAN / Ref", "Total (€)", "Pago (€)", "Pendente (€)", "Status"];"""
new_headers = """        headers = ["Data Emissão", "Fornecedor", "Loja", "Nº Fatura", "IBAN / Ref", "Total (€)", "Pago (€)", "Pendente (€)", "Status"];"""
code = code.replace(old_headers, new_headers)

# 2. Add loja_nome mapping and modify the row
old_data_map = """           return [
              f.data_emissao ? new Date(f.data_emissao).toLocaleDateString("pt-PT") : "N/A",
              f.fornecedor?.nome || "N/A",
              f.numero_fatura || "N/A",
              f.fornecedor?.iban || "---",
              calcTotal.toFixed(2),
              calcPago.toFixed(2),
              calcPendente.toFixed(2),
              (f.status_pagamento || "pendente").toUpperCase()
           ];"""
new_data_map = """           let lojaNome = "---";
           try {
              if (f.descrição) {
                  const desc = JSON.parse(f.descrição);
                  if (desc.loja_id) {
                     const st = lojas.find((l: any) => String(l.id) === String(desc.loja_id));
                     if (st) lojaNome = st.name || st.nome || st.loja_nome || "Loja";
                  }
              }
           } catch(e) {}
           return [
              f.data_emissao ? new Date(f.data_emissao).toLocaleDateString("pt-PT") : "N/A",
              f.fornecedor?.nome || "N/A",
              lojaNome,
              f.numero_fatura || "N/A",
              f.fornecedor?.iban || "---",
              calcTotal.toFixed(2),
              calcPago.toFixed(2),
              calcPendente.toFixed(2),
              (f.status_pagamento || "pendente").toUpperCase()
           ];"""
code = code.replace(old_data_map, new_data_map)

# 3. Add to the footer row
old_footer = """        data.push(["", "", "TOTAL CALCULADO", "", totalValor.toFixed(2), totalPago.toFixed(2), totalPendente.toFixed(2), ""]);"""
new_footer = """        data.push(["", "", "", "TOTAL CALCULADO", "", totalValor.toFixed(2), totalPago.toFixed(2), totalPendente.toFixed(2), ""]);"""
code = code.replace(old_footer, new_footer)

with open('src/pages/admin/AdminReports.tsx', 'w') as f:
    f.write(code)
print("Success")
