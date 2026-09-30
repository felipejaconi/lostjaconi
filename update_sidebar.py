import sys

with open('src/pages/AdminDashboard.tsx', 'r') as f:
    code = f.read()

code = code.replace(
    '{ to: "/admin/relatorios", icon: <FileText size={18} />, label: "Relatórios" },\n',
    ''
)

with open('src/pages/AdminDashboard.tsx', 'w') as f:
    f.write(code)

print("Success")
