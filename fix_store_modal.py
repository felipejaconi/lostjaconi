import sys

with open('src/pages/admin/AdminFinancial.tsx', 'r') as f:
    code = f.read()

old_modal = """      {/* Modal Loja Específica */}
      <Modal isOpen={isStoreModalOpen} onClose={() => { setIsStoreModalOpen(false); setSelectedStore(null); }} title={`Gestão: ${selectedStore?.name || ""}`} maxWidth="3xl">
          <div className="space-y-6 pt-2">
             <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 sm:p-6">
                 <h3 className="text-lg font-semibold text-zinc-100 mb-4 flex items-center gap-2"><Plus className="w-5 h-5 text-rose-500"/> Incluir Nova Despesa</h3>
                 {selectedStore && <AdminExpenseEntries lojaId={selectedStore.id} onSuccess={() => fetchDados()} />}
             </div>
             
             <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 sm:p-6">
                <h3 className="text-lg font-semibold text-zinc-100 mb-4 flex items-center gap-2"><Receipt className="w-5 h-5 text-amber-500"/> Despesas da Loja</h3>
                {(() => {
                   const faturasLoja = faturas.filter(f => {
                       try {
                           if (!f.descrição) return false;
                           const desc = JSON.parse(f.descrição);
                           return desc.loja_id === selectedStore?.id;
                       } catch {
                           return false;
                       }
                   });
                   if (faturasLoja.length === 0) return <p className="text-sm text-zinc-500">Nenhuma despesa registrada.</p>;
                   return (
                       <ul className="divide-y divide-zinc-800/50">
                          {faturasLoja.map(f => (
                              <li key={f.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-sm">
                                 <div>
                                    <p className="text-zinc-200 font-medium">{f.fornecedor?.nome}</p>
                                    <p className="text-zinc-500 text-xs">{f.numero_fatura} - {new Date(f.data_emissao).toLocaleDateString('pt-PT')}</p>
                                 </div>
                                 <div className="text-right">
                                    <span className="text-amber-500 font-bold block">€ {Number(f.valor_total).toFixed(2)}</span>
                                    <span className="text-xs text-zinc-400">{f.status_pagamento === 'pago' ? 'Pago' : 'Pendente'}</span>
                                 </div>
                              </li>
                          ))}
                       </ul>
                   );
                })()}
             </div>
          </div>
      </Modal>"""

new_modal = """      {/* Modal Loja Específica */}
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

code = code.replace(old_modal, new_modal)

with open('src/pages/admin/AdminFinancial.tsx', 'w') as f:
    f.write(code)

print("Success")
