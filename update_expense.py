import sys

with open('src/pages/admin/AdminExpenseEntries.tsx', 'r') as f:
    code = f.read()

# Add states
state_code = '''  const [fornecedores, setFornecedores] = useState<any[]>([]);
  const [stores, setStores] = useState<any[]>([]);
  const [selectedLoja, setSelectedLoja] = useState<string>("");
'''
code = code.replace('  const [fornecedores, setFornecedores] = useState<any[]>([]);\n', state_code)

# Add fetch
fetch_old = '''      const [resForn] = await Promise.all([
        api.get("/admin/fornecedores").catch(() => ({ data: [] }))
      ]);
      setFornecedores(resForn.data || []);'''
fetch_new = '''      const [resForn, resUsers] = await Promise.all([
        api.get("/admin/fornecedores").catch(() => ({ data: [] })),
        api.get("/admin/users").catch(() => ({ data: [] }))
      ]);
      setFornecedores(resForn.data || []);
      setStores((resUsers.data || []).filter((u: any) => u.role === 'loja').sort((a: any, b: any) => (a.name || "").localeCompare(b.name || "")));'''
code = code.replace(fetch_old, fetch_new)

# Update payload
payload_old = '''        valor_total: Number(valorTotal),
        loja_id: lojaId
      };'''
payload_new = '''        valor_total: Number(valorTotal),
        loja_id: lojaId || (selectedLoja ? selectedLoja : null)
      };'''
code = code.replace(payload_old, payload_new)

# Add UI
ui_old = '''          <h2 className="text-[13px] font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-2 mb-6">
            <FileText className="w-4 h-4 text-zinc-500" />
            Detalhes da Despesa
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">'''
ui_new = '''          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <h2 className="text-[13px] font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-2">
              <FileText className="w-4 h-4 text-zinc-500" />
              Detalhes da Despesa
            </h2>
            {!lojaId && (
              <div className="flex items-center gap-2">
                 <label className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">Destino:</label>
                 <select value={selectedLoja} onChange={e => setSelectedLoja(e.target.value)} className="bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-1.5 text-sm text-zinc-300 outline-none">
                    <option value="">Armazém Central</option>
                    {stores.map(s => (
                       <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                 </select>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">'''
code = code.replace(ui_old, ui_new)

with open('src/pages/admin/AdminExpenseEntries.tsx', 'w') as f:
    f.write(code)

print("Updated AdminExpenseEntries.tsx")
