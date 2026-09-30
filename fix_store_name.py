import sys

with open('src/pages/admin/AdminFinancial.tsx', 'r') as f:
    code = f.read()

code = code.replace('(a.nome || "").localeCompare(b.nome || "")', '(a.name || "").localeCompare(b.name || "")')
code = code.replace('title={store.nome}>{store.nome}', 'title={store.name}>{store.name}')
code = code.replace('{store.nome}</option>', '{store.name}</option>')
code = code.replace('selectedStore?.nome', 'selectedStore?.name')

with open('src/pages/admin/AdminFinancial.tsx', 'w') as f:
    f.write(code)
print("Success")
