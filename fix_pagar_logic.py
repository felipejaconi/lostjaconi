import sys

with open('src/pages/admin/AdminReports.tsx', 'r') as f:
    code = f.read()

old_logic = '''        fetchedData = fetchedData.filter(f => {
            if (reportType === "despesas" && f.tipo !== "despesa" && !f.tipo?.startsWith("despesa")) return false;
            
            const periodMatch = filterByPeriod(f.data_emissao, period);'''

new_logic = '''        fetchedData = fetchedData.filter(f => {
            if (reportType === "despesas" && f.tipo !== "despesa" && !f.tipo?.startsWith("despesa")) return false;
            if ((reportType === "pagar" || reportType === "vencidas_pagar") && f.tipo !== "compra") return false;
            
            const periodMatch = filterByPeriod(f.data_emissao, period);'''

code = code.replace(old_logic, new_logic)

with open('src/pages/admin/AdminReports.tsx', 'w') as f:
    f.write(code)

print("Pagar logic updated")
