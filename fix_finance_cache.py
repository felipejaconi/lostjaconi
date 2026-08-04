import sys
import re

with open('src/routes/finance.ts', 'r') as f:
    code = f.read()

def fix_get_endpoint(code, endpoint, cache_key, res_var="data"):
    start = f'  app.get("{endpoint}", authenticateToken, async (req: any, res) => {{'
    if start not in code:
        return code
    
    idx = code.find(start)
    end_idx = code.find('  });', idx) + 5
    
    block = code[idx:end_idx]
    
    # Add cache get
    block = block.replace('try {\n', f'try {{\n      const cached = cache.get("{cache_key}");\n      if (cached) return res.json(cached);\n')
    
    # Add cache set
    block = block.replace(f'res.json({res_var});\n', f'cache.set("{cache_key}", {res_var});\n      res.json({res_var});\n')
    
    return code[:idx] + block + code[end_idx:]

code = fix_get_endpoint(code, "/api/admin/fornecedores", "admin_fornecedores")
code = fix_get_endpoint(code, "/api/admin/faturas", "admin_faturas")

# invalidate cache on mutate
mutations = [
    'app.post("/api/admin/fornecedores"',
    'app.put("/api/admin/fornecedores/:id"',
    'app.delete("/api/admin/fornecedores/:id"',
    'app.post("/api/admin/faturas"',
    'app.post("/api/admin/faturas/:id/pay"',
    'app.put("/api/admin/faturas/:id"'
]

for m in mutations:
    code = code.replace(m, m.replace('", authenticateToken, async ', '", authenticateToken, async (req: any, res: any, next: any) => { cache.del(["admin_fornecedores", "admin_faturas", "admin_stats"]); next(); }, async '))

with open('src/routes/finance.ts', 'w') as f:
    f.write(code)

print("Fixed finance.ts cache logic")
