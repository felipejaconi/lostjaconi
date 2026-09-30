import sys

with open('src/pages/admin/AdminReports.tsx', 'r') as f:
    code = f.read()

old_opts = '''  const reportOptions = [
      { id: "receber", title: "A Receber", icon: TrendingUp, color: "text-amber-500", bg: "bg-amber-500/10", border: "border-amber-500" },
      { id: "pagar", title: "A Pagar", icon: TrendingDown, color: "text-rose-500", bg: "bg-rose-500/10", border: "border-rose-500" },
      { id: "vencidas_pagar", title: "Vencidas a Pagar", icon: AlertTriangle, color: "text-red-500", bg: "bg-red-500/10", border: "border-red-500" },
      { id: "total_lojas", title: "Total Lojas", icon: Layers, color: "text-orange-500", bg: "bg-orange-500/10", border: "border-orange-500" },
      { id: "iva_credito", title: "Crédito IVA", icon: FileSpreadsheet, color: "text-emerald-500", bg: "bg-emerald-500/10", border: "border-emerald-500" },
      { id: "despesas", title: "Despesas", icon: Receipt, color: "text-fuchsia-500", bg: "bg-fuchsia-500/10", border: "border-fuchsia-500" },
      { id: "consumo_lojas", title: "Consumo das Lojas", icon: Store, color: "text-blue-500", bg: "bg-blue-500/10", border: "border-blue-500" },
      { id: "fornecedores", title: "Fornecedores", icon: Users, color: "text-cyan-500", bg: "bg-cyan-500/10", border: "border-cyan-500" }
  ];'''

new_opts = '''  const reportOptions = [
      { id: "receber", title: "A Receber", icon: TrendingUp, color: "text-amber-500", bg: "bg-amber-500/10", border: "border-amber-500" },
      { id: "pagar", title: "A Pagar", icon: TrendingDown, color: "text-rose-500", bg: "bg-rose-500/10", border: "border-rose-500" },
      { id: "vencidas_pagar", title: "Vencidas a Pagar", icon: AlertTriangle, color: "text-red-500", bg: "bg-red-500/10", border: "border-red-500" },
      { id: "iva_credito", title: "Crédito IVA", icon: FileSpreadsheet, color: "text-emerald-500", bg: "bg-emerald-500/10", border: "border-emerald-500" },
      { id: "total_lojas", title: "Total Lojas", icon: Layers, color: "text-orange-500", bg: "bg-orange-500/10", border: "border-orange-500" },
      { id: "consumo_lojas", title: "Consumo das Lojas", icon: Store, color: "text-blue-500", bg: "bg-blue-500/10", border: "border-blue-500" },
      { id: "despesas", title: "Despesas", icon: Receipt, color: "text-fuchsia-500", bg: "bg-fuchsia-500/10", border: "border-fuchsia-500" },
      { id: "fornecedores", title: "Fornecedores", icon: Users, color: "text-cyan-500", bg: "bg-cyan-500/10", border: "border-cyan-500" }
  ];'''

code = code.replace(old_opts, new_opts)

with open('src/pages/admin/AdminReports.tsx', 'w') as f:
    f.write(code)

print("Options order updated")
