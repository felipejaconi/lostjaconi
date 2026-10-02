import re

with open('src/pages/admin/AdminReports.tsx', 'r') as f:
    content = f.read()

content = content.replace(
    'type ReportType = "receber" | "pagar" | "faturas_pagas" | "iva_credito" | "consumo_lojas" | "fornecedores";',
    'type ReportType = "receber" | "pagar" | "faturas_pagas" | "iva_credito" | "consumo_lojas" | "fornecedores" | "despesas";'
)

old_options = """  const reportOptions = [
      { id: "pagar", title: "A Pagar", icon: TrendingDown, color: "text-rose-500", bg: "bg-rose-500/10", border: "border-rose-500" },
      { id: "faturas_pagas", title: "Faturas Pagas", icon: AlertTriangle, color: "text-red-500", bg: "bg-red-500/10", border: "border-red-500" },
      { id: "iva_credito", title: "Crédito IVA", icon: FileSpreadsheet, color: "text-emerald-500", bg: "bg-emerald-500/10", border: "border-emerald-500" },
      { id: "debito_iva", title: "Débito IVA", icon: FileSpreadsheet, color: "text-rose-500", bg: "bg-rose-500/10", border: "border-rose-500" },
      { id: "receber", title: "A Receber", icon: TrendingUp, color: "text-amber-500", bg: "bg-amber-500/10", border: "border-amber-500" },
      { id: "consumo_lojas", title: "Totais Lojas", icon: Store, color: "text-blue-500", bg: "bg-blue-500/10", border: "border-blue-500" },
      { id: "fornecedores", title: "Fornecedores", icon: Users, color: "text-cyan-500", bg: "bg-cyan-500/10", border: "border-cyan-500" }
  ];"""

new_options = """  const reportOptions = [
      { id: "pagar", title: "A Pagar", icon: TrendingDown, color: "text-rose-500", bg: "bg-rose-500/10", border: "border-rose-500" },
      { id: "faturas_pagas", title: "Faturas Pagas", icon: AlertTriangle, color: "text-red-500", bg: "bg-red-500/10", border: "border-red-500" },
      { id: "iva_credito", title: "Crédito IVA", icon: FileSpreadsheet, color: "text-emerald-500", bg: "bg-emerald-500/10", border: "border-emerald-500" },
      { id: "debito_iva", title: "Débito IVA", icon: FileSpreadsheet, color: "text-rose-500", bg: "bg-rose-500/10", border: "border-rose-500" },
      { id: "receber", title: "A Receber", icon: TrendingUp, color: "text-amber-500", bg: "bg-amber-500/10", border: "border-amber-500" },
      { id: "despesas", title: "Despesas", icon: Receipt, color: "text-purple-500", bg: "bg-purple-500/10", border: "border-purple-500" },
      { id: "consumo_lojas", title: "Totais Lojas", icon: Store, color: "text-blue-500", bg: "bg-blue-500/10", border: "border-blue-500" },
      { id: "fornecedores", title: "Fornecedores", icon: Users, color: "text-cyan-500", bg: "bg-cyan-500/10", border: "border-cyan-500" }
  ];"""

content = content.replace(old_options, new_options)

with open('src/pages/admin/AdminReports.tsx', 'w') as f:
    f.write(content)

