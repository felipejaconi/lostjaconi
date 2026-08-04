import re

with open("src/pages/admin/AdminProducts.tsx", "r") as f:
    content = f.read()

content = content.replace("p.lotes?.[0]?.lote", "(p.lotes as any)?.[0]?.lote")
content = content.replace("p.lotes?.[0]?.rua", "(p.lotes as any)?.[0]?.rua")
content = content.replace("p.lotes?.[0]?.prateleira", "(p.lotes as any)?.[0]?.prateleira")
content = content.replace("p.lotes[0].lote", "(p.lotes as any)[0].lote")
content = content.replace("p.lotes[0].rua", "(p.lotes as any)[0].rua")
content = content.replace("p.lotes[0].prateleira", "(p.lotes as any)[0].prateleira")

with open("src/pages/admin/AdminProducts.tsx", "w") as f:
    f.write(content)
