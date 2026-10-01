import sys

with open('src/pages/admin/AdminReports.tsx', 'r') as f:
    code = f.read()

code = code.replace(
    '["receber", "vencidas_receber", "consumo_lojas", "gastos_lojas"]',
    '["receber", "total_lojas", "consumo_lojas"]'
)

code = code.replace(
    '!["iva_credito", "consumo_lojas", "gastos_lojas", "fornecedores", "vencidas_pagar", "vencidas_receber"].includes(reportType)',
    '!["iva_credito", "consumo_lojas", "fornecedores", "vencidas_pagar", "total_lojas"].includes(reportType)'
)

with open('src/pages/admin/AdminReports.tsx', 'w') as f:
    f.write(code)

print("Dropdowns updated")
