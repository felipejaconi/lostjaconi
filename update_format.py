import re

with open('src/pages/admin/AdminFechos.tsx', 'r') as f:
    content = f.read()

content = content.replace(
    'const formatVal = (v: number) => (!v || Math.abs(v) < 0.001) ? \'-\' : (v < 0 ? `-€${Math.abs(v).toFixed(2)}` : `€${v.toFixed(2)}`);',
    'const formatVal = (v: number, hasData: boolean = true) => { if (!hasData) return "-"; return v < 0 ? `-€${Math.abs(v).toFixed(2)}` : `€${v.toFixed(2)}`; };'
)

# Replace {formatVal(var)} with {formatVal(var, hasData)} ONLY inside the days.map loop
# It's tricky to do it perfectly with regex, so we'll just replace formatVal(sysMb) with formatVal(sysMb, hasData) for all the specific variables inside the loop

vars = ['sysMb', 'sysDin', 'sysMesa', 'sysUber', 'tVenda', 'realMb', 'realDin', 'realMesa', 'realUber', 'tVendasApre']

for v in vars:
    # Look for {formatVal(VAR)} and replace with {formatVal(VAR, hasData)} but make sure we don't replace totais.VAR
    content = re.sub(r'\{formatVal\(' + v + r'\)\}', f'{{formatVal({v}, hasData)}}', content)

with open('src/pages/admin/AdminFechos.tsx', 'w') as f:
    f.write(content)

