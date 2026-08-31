import re

def replace_in_file(file_path):
    with open(file_path, 'r') as f:
        content = f.read()

    # Replace .neq('status', 'cancelado') with .in('status', ['pronto', 'entregue', 'concluido'])
    content = content.replace(".neq('status', 'cancelado')", ".in('status', ['pronto', 'entregue', 'concluido'])")

    with open(file_path, 'w') as f:
        f.write(content)

replace_in_file('src/routes/stats.ts')

print("Patched stats single quotes")
