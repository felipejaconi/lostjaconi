import sys

with open('src/pages/admin/AdminSuppliers.tsx', 'r') as f:
    code = f.read()

# The chart block starts at `          {chartData.length === 0 ? (` wait, where is it now?
chart_start = "        {/* Gráfico de Principais Fornecedores */}"
# The chart block ends at `            </div>` above `{f.contato && (`

start_idx = code.find(chart_start)
end_idx = code.find("            </div>", start_idx) + len("            </div>")

chart_code_to_remove = code[start_idx:end_idx]

# Remove it
code = code[:start_idx] + "        )}\n" + code[end_idx:]

with open('src/pages/admin/AdminSuppliers.tsx', 'w') as f:
    f.write(code)
print("Success")
