import re

with open('src/pages/admin/AdminFechos.tsx', 'r') as f:
    content = f.read()

# Add formatVal helper function
if 'const formatVal =' not in content:
    content = content.replace(
        'const lojasToDisplay =',
        'const formatVal = (v: number) => (!v || Math.abs(v) < 0.001) ? \'-\' : (v < 0 ? `-€${Math.abs(v).toFixed(2)}` : `€${v.toFixed(2)}`);\n  const lojasToDisplay ='
    )

# Replace the > 0 ? `€${var.toFixed(2)}` : '-' pattern
def replacer(match):
    var_name = match.group(1)
    return f"{{formatVal({var_name})}}"

content = re.sub(r'\{([a-zA-Z0-9_.]+) > 0 \? `€\$\{\1\.toFixed\(2\)\}` : \'-\'\}', replacer, content)

with open('src/pages/admin/AdminFechos.tsx', 'w') as f:
    f.write(content)

