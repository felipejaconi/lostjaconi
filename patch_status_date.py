import re

with open('src/routes/orders.ts', 'r') as f:
    content = f.read()

old_status_check = """      if (req.body.status === 'pronto') {
          updateData.created_at = new Date().toISOString();
      }"""

new_status_check = """      if (['pronto', 'entregue', 'concluido'].includes(req.body.status)) {
          updateData.created_at = new Date().toISOString();
      }"""

content = content.replace(old_status_check, new_status_check)

with open('src/routes/orders.ts', 'w') as f:
    f.write(content)

print("Patched status date update")
