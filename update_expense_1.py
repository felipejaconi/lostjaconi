import re

with open('src/pages/admin/AdminExpenseEntries.tsx', 'r') as f:
    content = f.read()

content = content.replace(
    'const [novaCategoria, setNovaCategoria] = useState("");',
    'const [novaCategoria, setNovaCategoria] = useState("");\n  const [parcelas, setParcelas] = useState(1);'
)

with open('src/pages/admin/AdminExpenseEntries.tsx', 'w') as f:
    f.write(content)

