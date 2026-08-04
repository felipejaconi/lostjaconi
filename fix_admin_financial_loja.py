import sys

with open('src/pages/admin/AdminFinancial.tsx', 'r') as f:
    code = f.read()

old_block = """                                 <td className="p-4">
                                    <p className="text-sm font-semibold text-zinc-300">{f.fornecedor?.nome}</p>
                                    <p className="text-[11px] text-zinc-500 uppercase mt-0.5">NIF: {f.fornecedor?.nif || "-"}</p>
                                 </td>"""
                                 
new_block = """                                 <td className="p-4">
                                    <p className="text-sm font-semibold text-zinc-300">{f.fornecedor?.nome}</p>
                                    <p className="text-[11px] text-zinc-500 uppercase mt-0.5">NIF: {f.fornecedor?.nif || "-"}</p>
                                    {(() => {
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
                                    })()}
                                 </td>"""

if old_block in code:
    code = code.replace(old_block, new_block)
    with open('src/pages/admin/AdminFinancial.tsx', 'w') as f:
        f.write(code)
    print("Success")
else:
    print("Not found")
