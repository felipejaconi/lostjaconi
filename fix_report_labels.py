import re

with open('src/pages/admin/AdminReports.tsx', 'r') as f:
    content = f.read()

old_html = """                        <select 
                             value={status} 
                             onChange={(e)=>setStatus(e.target.value)}
                            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-zinc-100 font-medium outline-none focus:border-blue-500 appearance-none transition-colors"
                        >
                            <option value="todos">Todos os Status</option>
                            <option value="pago">Recebidos</option>
                            <option value="nao_pago">A Receber</option>
                        </select>"""

new_html = """                        <select 
                             value={status} 
                             onChange={(e)=>setStatus(e.target.value)}
                            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-zinc-100 font-medium outline-none focus:border-blue-500 appearance-none transition-colors"
                        >
                            <option value="todos">Todos os Status</option>
                            <option value="pago">{reportType === 'despesas' ? 'Pagos' : 'Recebidos'}</option>
                            <option value="nao_pago">{reportType === 'despesas' ? 'Pendentes' : 'A Receber'}</option>
                        </select>"""

content = content.replace(old_html, new_html)

with open('src/pages/admin/AdminReports.tsx', 'w') as f:
    f.write(content)

