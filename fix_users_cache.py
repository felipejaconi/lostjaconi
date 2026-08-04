import sys
import re

with open('src/routes/users.ts', 'r') as f:
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

code = fix_get_endpoint(code, "/api/admin/users", "admin_users", "rows")

mutations = [
    'app.post("/api/admin/users"',
    'app.put("/api/admin/users/:id"',
    'app.delete("/api/admin/users/:id"'
]

for m in mutations:
    code = code.replace(m, m.replace('", authenticateToken, async ', '", authenticateToken, async (req: any, res: any, next: any) => { cache.del("admin_users"); next(); }, async '))

with open('src/routes/users.ts', 'w') as f:
    f.write(code)

print("Fixed users.ts cache logic")
