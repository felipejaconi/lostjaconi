import re

with open('src/pages/admin/AdminReports.tsx', 'r') as f:
    content = f.read()

# 1. Update ReportType
content = content.replace(
    'type ReportType = "receber" | "pagar" | "faturas_pagas" | "iva_credito" | "consumo_lojas" | "fornecedores" | "despesas";',
    'type ReportType = "receber" | "pagar" | "faturas_pagas" | "iva_credito" | "consumo_lojas" | "fornecedores" | "despesas" | "fechos";'
)

# 2. Update reportOptions
old_options = """      { id: "consumo_lojas", title: "Totais Lojas", icon: Store, color: "text-blue-500", bg: "bg-blue-500/10", border: "border-blue-500" },
      { id: "fornecedores", title: "Fornecedores", icon: Users, color: "text-cyan-500", bg: "bg-cyan-500/10", border: "border-cyan-500" }
  ];"""
new_options = """      { id: "consumo_lojas", title: "Totais Lojas", icon: Store, color: "text-blue-500", bg: "bg-blue-500/10", border: "border-blue-500" },
      { id: "fechos", title: "Fechos de Caixa", icon: Store, color: "text-emerald-500", bg: "bg-emerald-500/10", border: "border-emerald-500" },
      { id: "fornecedores", title: "Fornecedores", icon: Users, color: "text-cyan-500", bg: "bg-cyan-500/10", border: "border-cyan-500" }
  ];"""
content = content.replace(old_options, new_options)

# 3. Insert logic for fechos
old_logic = """      } else if (reportType === "consumo_lojas") {"""
new_logic = """      } else if (reportType === "fechos") {
         const res = await api.get("/admin/fechos");
         let fetchedData = Array.isArray(res.data) ? res.data : [];
         
         fetchedData = fetchedData.filter(f => {
             const periodMatch = filterByPeriod(f.data, period);
             const entityMatch = entity === "todos" || String(f.loja_id) === entity;
             return periodMatch && entityMatch;
         });
         
         fetchedData.sort((a, b) => new Date(a.data).getTime() - new Date(b.data).getTime());

         headers = ["Data", "Loja", "Sys MB", "Sys Dinh.", "Sys Mesa", "Sys Uber", "Total Sys", "Real MB", "Real Dinh.", "Real Mesa", "Real Uber", "Total Real", "Diferença"];
         title = "Relatório de Fechos de Caixa";
         
         let tSysMb=0, tSysDinh=0, tSysMesa=0, tSysUber=0, tTotalSys=0;
         let tRealMb=0, tRealDinh=0, tRealMesa=0, tRealUber=0, tTotalReal=0;
         let tDiff=0;
         
         data = fetchedData.map(f => {
            let lojaNome = f.loja_id;
            const l = lojas.find(x => String(x.id) === String(f.loja_id));
            if (l) lojaNome = l.name || l.nome;
            
            const sysMb = Number(f.sys_mb||0);
            const sysDinh = Number(f.sys_dinheiro||0);
            const sysMesa = Number(f.sys_mesa||0);
            const sysUber = Number(f.sys_uber||0);
            const totSys = sysMb + sysDinh + sysMesa + sysUber;
            
            const realMb = Number(f.real_mb||0);
            const realDinh = Number(f.real_dinheiro||0);
            const realMesa = Number(f.real_mesa||0);
            const realUber = Number(f.real_uber||0);
            const totReal = realMb + realDinh + realMesa + realUber;
            
            const diff = totReal - totSys;
            
            tSysMb+=sysMb; tSysDinh+=sysDinh; tSysMesa+=sysMesa; tSysUber+=sysUber; tTotalSys+=totSys;
            tRealMb+=realMb; tRealDinh+=realDinh; tRealMesa+=realMesa; tRealUber+=realUber; tTotalReal+=totReal;
            tDiff+=diff;
            
            return [
               f.data ? new Date(f.data).toLocaleDateString("pt-PT") : "N/A",
               lojaNome,
               sysMb.toFixed(2),
               sysDinh.toFixed(2),
               sysMesa.toFixed(2),
               sysUber.toFixed(2),
               totSys.toFixed(2),
               realMb.toFixed(2),
               realDinh.toFixed(2),
               realMesa.toFixed(2),
               realUber.toFixed(2),
               totReal.toFixed(2),
               diff.toFixed(2)
            ];
         });
         
         data.push([
             "", "TOTAIS", 
             tSysMb.toFixed(2), tSysDinh.toFixed(2), tSysMesa.toFixed(2), tSysUber.toFixed(2), tTotalSys.toFixed(2),
             tRealMb.toFixed(2), tRealDinh.toFixed(2), tRealMesa.toFixed(2), tRealUber.toFixed(2), tTotalReal.toFixed(2),
             tDiff.toFixed(2)
         ]);

      } else if (reportType === "consumo_lojas") {"""
content = content.replace(old_logic, new_logic)

# 4. Hide status filter
content = content.replace(
    '!["iva_credito", "consumo_lojas", "fornecedores", "faturas_pagas", "pagar"].includes(reportType)',
    '!["iva_credito", "consumo_lojas", "fornecedores", "faturas_pagas", "pagar", "fechos"].includes(reportType)'
)

# 5. Populate options for fechos entity dropdown
content = content.replace(
    '...(["receber", "consumo_lojas", "debito_iva"].includes(reportType) ? lojas.map(l => ({ id: String(l.id), nome: l.name || l.nome })) : []),',
    '...(["receber", "consumo_lojas", "debito_iva", "fechos"].includes(reportType) ? lojas.map(l => ({ id: String(l.id), nome: l.name || l.nome })) : []),'
)

with open('src/pages/admin/AdminReports.tsx', 'w') as f:
    f.write(content)

