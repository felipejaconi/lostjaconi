import sys

with open('src/pages/admin/AdminSuppliers.tsx', 'r') as f:
    code = f.read()

import_str = "import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';"

if "recharts" not in code:
    code = code.replace('import api from "../../lib/api";', 'import api from "../../lib/api";\n' + import_str)
    
    with open('src/pages/admin/AdminSuppliers.tsx', 'w') as f:
        f.write(code)
print('Success')
