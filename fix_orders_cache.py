import sys

with open('src/routes/orders.ts', 'r') as f:
    code = f.read()

def fix_get_endpoint(code, endpoint):
    start = f'  app.get("{endpoint}", authenticateToken, async (req: any, res) => {{'
    if start not in code:
        return code
    
    idx = code.find(start)
    end_idx = code.find('  });', idx) + 5
    
    block = code[idx:end_idx]
    
    cache_key_logic = '''      const cacheKey = `pedidos_${req.user.role}_${req.user.id}_${req.url}`;
      const cached = cache.get(cacheKey);
      if (cached) return res.json(cached);
'''
    
    # Add cache get
    block = block.replace('try {\n', f'try {{\n{cache_key_logic}')
    
    # Add cache set
    block = block.replace('res.json(rows);\n', 'cache.set(cacheKey, rows);\n      res.json(rows);\n')
    
    return code[:idx] + block + code[end_idx:]

code = fix_get_endpoint(code, "/api/pedidos")

mutations = [
    'app.post("/api/pedidos"',
    'app.put("/api/pedidos/:id/status"',
    'app.put("/api/pedidos/:id"'
]

# We need to clear all keys starting with 'pedidos_' when a mutation happens.
# NodeCache keys() can be used to clear by prefix, or we can just flushall.
# Since flushing all on order is fine, let's flush all `pedidos_*` keys.

for m in mutations:
    replacement = f'{m}, authenticateToken, async (req: any, res: any, next: any) => {{ const keys = cache.keys(); const orderKeys = keys.filter(k => k.startsWith("pedidos_")); cache.del(orderKeys); cache.del("admin_stats"); next(); }}, async '
    code = code.replace(f'{m}, authenticateToken, async ', replacement)

with open('src/routes/orders.ts', 'w') as f:
    f.write(code)

print("Fixed orders.ts cache logic")
