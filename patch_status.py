import re

def replace_in_file(file_path):
    with open(file_path, 'r') as f:
        content = f.read()

    # Replace .neq("status", "cancelado") with .in("status", ["pronto", "entregue", "concluido"])
    content = content.replace('.neq("status", "cancelado")', '.in("status", ["pronto", "entregue", "concluido"])')
    
    # Replace the manual check in chart generation
    old_check = "if (p.status === 'cancelado') return;"
    new_check = "if (!['pronto', 'entregue', 'concluido'].includes(p.status)) return;"
    content = content.replace(old_check, new_check)

    # Fix the pending orders count bug while we're at it
    content = content.replace('.eq("status", "enviado")', '.in("status", ["pendente", "processando"])')

    with open(file_path, 'w') as f:
        f.write(content)

replace_in_file('src/routes/stats.ts')
replace_in_file('src/routes/auth.ts')

print("Patched stats and auth")
