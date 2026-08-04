import sys

with open('src/pages/admin/AdminFinancial.tsx', 'r') as f:
    content = f.read()

target = '''                                    {(() => {
                                       try {
                                          if (f.descrição) {
                                             const desc = JSON.parse(f.descrição);
                                             if (desc.loja_id) {
                                                const s = stores.find((s: any) => String(s.id) === String(desc.loja_id));
                                                if (s) {
                                                   return <p className="text-[10px] font-bold text-amber-500 mt-1 uppercase tracking-wider">{s.name}</p>;
                                                }
                                             }
                                          }
                                       } catch(e) {}
                                       return null;
                                    })()}'''

replacement = '''                                    {(() => {
                                       try {
                                          if (f.descrição) {
                                             const desc = JSON.parse(f.descrição);
                                             if (desc.loja_id) {
                                                const s = stores.find((s: any) => String(s.id) === String(desc.loja_id));
                                                if (s) {
                                                   return <p className="text-[10px] font-bold text-amber-500 mt-1 uppercase tracking-wider">{s.name}</p>;
                                                }
                                             }
                                          }
                                       } catch(e) {}
                                       if (f.tipo?.startsWith('despesa')) {
                                          return <p className="text-[10px] font-bold text-blue-500 mt-1 uppercase tracking-wider">Armazém Central</p>;
                                       }
                                       return null;
                                    })()}'''

if target in content:
    content = content.replace(target, replacement)
    with open('src/pages/admin/AdminFinancial.tsx', 'w') as f:
        f.write(content)
    print("Replaced successfully")
else:
    print("Target not found")
