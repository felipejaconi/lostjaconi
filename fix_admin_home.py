import re

with open('src/pages/admin/AdminHome.tsx', 'r') as f:
    content = f.read()

content = content.replace('Painel Geral {isAdmin ? "(Visão Completa)" : "(Operação)"}', 'LOGISTICA E FINANCEIRO')

with open('src/pages/admin/AdminHome.tsx', 'w') as f:
    f.write(content)

print("Done")
