import sys

with open('src/pages/admin/AdminFinancial.tsx', 'r') as f:
    code = f.read()

old_modal = """      {/* Modal Loja Específica */}
      <Modal isOpen={isStoreModalOpen} onClose={() => { setIsStoreModalOpen(false); setSelectedStore(null); }} title={`Nova Despesa: ${selectedStore?.name || ""}`} maxWidth="3xl">
          <div className="pt-2">
             <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 sm:p-6">
                 <h3 className="text-lg font-semibold text-zinc-100 mb-4 flex items-center gap-2"><Plus className="w-5 h-5 text-rose-500"/> Incluir Nova Despesa</h3>
                 {selectedStore && <AdminExpenseEntries lojaId={selectedStore.id} onSuccess={() => {
                     fetchDados();
                     setIsStoreModalOpen(false);
                     setActiveTab("despesas");
                     setFilterDataAPagar({...filterDataAPagar, loja: String(selectedStore.id)});
                     setSelectedStore(null);
                 }} />}
             </div>
          </div>
      </Modal>"""

new_modal = """      {/* Modal Loja Específica */}
      <Modal isOpen={isStoreModalOpen} onClose={() => { setIsStoreModalOpen(false); setSelectedStore(null); }} title={`Nova Despesa: ${selectedStore?.name || ""}`} maxWidth="3xl">
          <div className="pt-2 sm:pt-4">
             {selectedStore && <AdminExpenseEntries compact={true} lojaId={selectedStore.id} onSuccess={() => {
                 fetchDados();
                 setIsStoreModalOpen(false);
                 setActiveTab("despesas");
                 setFilterDataAPagar({...filterDataAPagar, loja: String(selectedStore.id)});
                 setSelectedStore(null);
             }} />}
          </div>
      </Modal>"""

code = code.replace(old_modal, new_modal)

with open('src/pages/admin/AdminFinancial.tsx', 'w') as f:
    f.write(code)

print("Success")
