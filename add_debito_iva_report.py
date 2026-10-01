with open("src/pages/admin/AdminReports.tsx", "r") as f:
    content = f.read()

# Add report option
target_options = """  const reportOptions = [
      { id: "pagar", title: "A Pagar", icon: TrendingDown, color: "text-rose-500", bg: "bg-rose-500/10", border: "border-rose-500" },
      { id: "faturas_pagas", title: "Faturas Pagas", icon: AlertTriangle, color: "text-red-500", bg: "bg-red-500/10", border: "border-red-500" },
      { id: "iva_credito", title: "Crédito IVA", icon: FileSpreadsheet, color: "text-emerald-500", bg: "bg-emerald-500/10", border: "border-emerald-500" },
      { id: "receber", title: "A Receber", icon: TrendingUp, color: "text-amber-500", bg: "bg-amber-500/10", border: "border-amber-500" },
      { id: "consumo_lojas", title: "Totais Lojas", icon: Store, color: "text-blue-500", bg: "bg-blue-500/10", border: "border-blue-500" },
      { id: "fornecedores", title: "Fornecedores", icon: Users, color: "text-cyan-500", bg: "bg-cyan-500/10", border: "border-cyan-500" }
  ];"""

replacement_options = """  const reportOptions = [
      { id: "pagar", title: "A Pagar", icon: TrendingDown, color: "text-rose-500", bg: "bg-rose-500/10", border: "border-rose-500" },
      { id: "faturas_pagas", title: "Faturas Pagas", icon: AlertTriangle, color: "text-red-500", bg: "bg-red-500/10", border: "border-red-500" },
      { id: "iva_credito", title: "Crédito IVA", icon: FileSpreadsheet, color: "text-emerald-500", bg: "bg-emerald-500/10", border: "border-emerald-500" },
      { id: "debito_iva", title: "Débito IVA", icon: FileSpreadsheet, color: "text-rose-500", bg: "bg-rose-500/10", border: "border-rose-500" },
      { id: "receber", title: "A Receber", icon: TrendingUp, color: "text-amber-500", bg: "bg-amber-500/10", border: "border-amber-500" },
      { id: "consumo_lojas", title: "Totais Lojas", icon: Store, color: "text-blue-500", bg: "bg-blue-500/10", border: "border-blue-500" },
      { id: "fornecedores", title: "Fornecedores", icon: Users, color: "text-cyan-500", bg: "bg-cyan-500/10", border: "border-cyan-500" }
  ];"""

content = content.replace(target_options, replacement_options)

# Add logic for debito_iva in handleExport
target_logic = """      } else if (reportType === "receber") {"""
replacement_logic = """      } else if (reportType === "debito_iva") {
        const res = await api.get("/pedidos");
        let fetchedData = Array.isArray(res.data) ? res.data : [];
           
        fetchedData = fetchedData.filter(p => {
             const isValidState = ['pronto', 'entregue'].includes(p.status?.toLowerCase());
             const periodMatch = filterByPeriod(p.created_at, period);
             const lojaMatch = entity === "todos" || String(p.user_id) === entity;
             return isValidState && periodMatch && lojaMatch;
        });

        headers = ["Data Pedido", "ID Pedido", "Loja", "Débito IVA (€)", "Status"];
        title = "Relatório de Débito de IVA (Vendas)";
           
        let totalIvaDebito = 0;
        fetchedData.forEach(p => {
            let sumIva = 0;
            (p.pedido_itens || []).forEach((item: any) => {
               const qty = Number(item.quantidade) || 0;
               const preco = Number(item.preco_unitario || 0);
               const liq = qty * preco;
               const ivaPerc = Number(item.produto?.iva || 0);
               sumIva += liq * (ivaPerc / 100);
            });
            
            if (sumIva > 0) {
                totalIvaDebito += sumIva;
                data.push([
                   new Date(p.created_at).toLocaleDateString("pt-PT"),
                   p.id.split('-')[0].toUpperCase(),
                   p.loja_nome || "Loja Desconhecida",
                   sumIva.toFixed(2),
                   p.status?.toUpperCase() || ""
                ]);
            }
        });
           
        data.push(["", "TOTAL IVA DÉBITO", "", totalIvaDebito.toFixed(2), ""]);

      } else if (reportType === "receber") {"""

content = content.replace(target_logic, replacement_logic)

# Filter adjustments for UI options
target_filter1 = """{["pagar", "faturas_pagas"].includes(reportType) ? "Filtrar por Loja ou Fornecedor" : ["iva_credito", "despesas"].includes(reportType) ? "Filtrar por Fornecedor" : "Filtrar por Loja"}"""
replacement_filter1 = """{["pagar", "faturas_pagas"].includes(reportType) ? "Filtrar por Loja ou Fornecedor" : ["iva_credito", "despesas"].includes(reportType) ? "Filtrar por Fornecedor" : "Filtrar por Loja"}"""
# Nothing to replace, it covers the remaining as "Filtrar por Loja"
# But let's check `SearchableCombobox` options

target_filter2 = """                                ...(["receber", "consumo_lojas"].includes(reportType) ? lojas.map(l => ({ id: String(l.id), nome: l.name || l.nome })) : [])"""
replacement_filter2 = """                                ...(["receber", "consumo_lojas", "debito_iva"].includes(reportType) ? lojas.map(l => ({ id: String(l.id), nome: l.name || l.nome })) : [])"""

content = content.replace(target_filter2, replacement_filter2)

target_filter3 = """                {!["iva_credito", "consumo_lojas", "fornecedores", "faturas_pagas", "pagar"].includes(reportType) && ("""
replacement_filter3 = """                {!["iva_credito", "debito_iva", "consumo_lojas", "fornecedores", "faturas_pagas", "pagar"].includes(reportType) && ("""

content = content.replace(target_filter3, replacement_filter3)


with open("src/pages/admin/AdminReports.tsx", "w") as f:
    f.write(content)
