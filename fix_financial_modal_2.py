import sys

with open('src/pages/admin/AdminFinancial.tsx', 'r') as f:
    lines = f.readlines()

out = []
in_modal = False
for line in lines:
    if "<Modal isOpen={isStoreModalOpen}" in line:
        in_modal = True
        out.append('      <Modal isOpen={isStoreModalOpen} onClose={() => { setIsStoreModalOpen(false); setSelectedStore(null); }} title={`Nova Despesa: ${selectedStore?.name || ""}`} maxWidth="3xl">\n')
        out.append('          <div className="pt-2 sm:pt-4">\n')
        out.append('             {selectedStore && <AdminExpenseEntries compact={true} lojaId={selectedStore.id} onSuccess={() => {\n')
        out.append('                 fetchDados();\n')
        out.append('                 setIsStoreModalOpen(false);\n')
        out.append('                 setActiveTab("despesas");\n')
        out.append('                 setFilterDataAPagar({...filterDataAPagar, loja: String(selectedStore.id)});\n')
        out.append('                 setSelectedStore(null);\n')
        out.append('             }} />}\n')
        out.append('          </div>\n')
        out.append('      </Modal>\n')
        continue
    if in_modal:
        if "</Modal>" in line:
            in_modal = False
        continue
    out.append(line)

with open('src/pages/admin/AdminFinancial.tsx', 'w') as f:
    f.writelines(out)

print("Success")
