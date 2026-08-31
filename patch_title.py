import re

with open('src/pages/store/StoreManagement.tsx', 'r') as f:
    content = f.read()

content = content.replace('<h2 className="text-xl font-black text-white tracking-widest uppercase">Área Exclusiva: Benavente</h2>', '<h2 className="text-xl font-black text-white tracking-widest uppercase">BENAVENTE</h2>')
content = content.replace('<p className="text-xs text-slate-400">Análise detalhada de Vendas, Compras Diárias e Margens</p>', '')

with open('src/pages/store/StoreManagement.tsx', 'w') as f:
    f.write(content)
