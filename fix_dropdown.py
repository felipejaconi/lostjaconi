import sys

with open('src/pages/admin/AdminFinancial.tsx', 'r') as f:
    code = f.read()

old_dropdown = """                        <select value={filterDataAReceber.loja} onChange={e => setFilterDataAReceber({...filterDataAReceber, loja: e.target.value})} className="bg-transparent text-sm text-zinc-300 outline-none appearance-none max-w-[150px] truncate">
                           <option value="todos">Todas as Lojas</option>
                           {Array.from(new Set(pedidos.filter(p => p.user_id).map(p => String(p.user_id)))).map(id => {
                              const p = pedidos.find(x => String(x.user_id) === id);
                              return <option key={id} value={id}>{p?.loja_nome || "Loja Desconhecida"}</option>;
                           })}
                        </select>"""

new_dropdown = """                        <select value={filterDataAReceber.loja} onChange={e => setFilterDataAReceber({...filterDataAReceber, loja: e.target.value})} className="bg-transparent text-sm text-zinc-300 outline-none appearance-none max-w-[150px] truncate">
                           <option value="todos">Todas as Lojas</option>
                           {stores.map(store => (
                              <option key={store.id} value={String(store.id)}>{store.nome}</option>
                           ))}
                        </select>"""

if old_dropdown in code:
    code = code.replace(old_dropdown, new_dropdown)
    with open('src/pages/admin/AdminFinancial.tsx', 'w') as f:
        f.write(code)
    print("Success Dropdown")
else:
    print("Not found exactly")
