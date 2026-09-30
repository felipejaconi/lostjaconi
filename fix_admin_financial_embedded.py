import sys

with open('src/pages/admin/AdminFinancial.tsx', 'r') as f:
    code = f.read()

code = code.replace('<AdminReports />', '<AdminReports embedded={true} />')

with open('src/pages/admin/AdminFinancial.tsx', 'w') as f:
    f.write(code)

print("Success")
