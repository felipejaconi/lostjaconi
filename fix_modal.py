import sys

with open('src/pages/admin/AdminFinancial.tsx', 'r') as f:
    content = f.read()

target = '''                 <h2 className="text-xl font-bold text-zinc-100 flex items-center gap-2">
                   <FileText className="w-5 h-5 text-blue-500" /> Detalhes: {selectedFatura.numero_fatura}
                 </h2>
                 <p className="text-sm font-medium text-zinc-400 mt-1">{selectedFatura.fornecedor?.nome}</p>
               </div>'''

replacement = '''                 <h2 className="text-xl font-bold text-zinc-100 flex items-center gap-2">
                   <FileText className="w-5 h-5 text-blue-500" /> Detalhes: {selectedFatura.numero_fatura}
                 </h2>
                 <p className="text-sm font-medium text-zinc-400 mt-1">{selectedFatura.fornecedor?.nome}</p>
                 {(() => {
                    try {
                       if (selectedFatura.descrição) {
                          const desc = JSON.parse(selectedFatura.descrição);
                          if (desc.loja_id) {
                             const s = stores.find((s: any) => String(s.id) === String(desc.loja_id));
                             if (s) {
                                return <p className="text-[11px] font-bold text-amber-500 mt-1 uppercase tracking-wider">Destino: {s.name}</p>;
                             }
                          }
                       }
                    } catch(e) {}
                    if (selectedFatura.tipo?.startsWith('despesa')) {
                       return <p className="text-[11px] font-bold text-blue-500 mt-1 uppercase tracking-wider">Destino: Armazém Central</p>;
                    }
                    return null;
                 })()}
               </div>'''

if target in content:
    content = content.replace(target, replacement)
    with open('src/pages/admin/AdminFinancial.tsx', 'w') as f:
        f.write(content)
    print("Replaced successfully")
else:
    print("Target not found")
