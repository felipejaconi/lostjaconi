import sys

with open('src/routes/products.ts', 'r') as f:
    code = f.read()

# Let's just fix it manually. We can find the endpoints and fix them.
# There are GET /api/produtos and GET /api/categorias.

def fix_get_endpoint(code, endpoint, cache_key):
    start = f'  app.get("{endpoint}", authenticateToken, async (_req, res) => {{'
    if start not in code:
        return code
    
    # Extract the block
    idx = code.find(start)
    end_idx = code.find('  });', idx) + 5
    
    block = code[idx:end_idx]
    
    # Remove any existing cache logic
    import re
    # Remove cache.set and cache.get
    block = re.sub(r'\s*const cached = cache.get\(.*?\);\n\s*if \(cached\) return res.json\(cached\);\n', '', block)
    block = re.sub(r'\s*cache.set\(.*?\);\n', '\n', block)
    
    # Add them back correctly
    
    block = block.replace('try {\n', f'try {{\n      const cached = cache.get("{cache_key}");\n      if (cached) return res.json(cached);\n')
    block = block.replace('res.json(rows);\n', f'cache.set("{cache_key}", rows);\n      res.json(rows);\n')
    
    return code[:idx] + block + code[end_idx:]

code = fix_get_endpoint(code, "/api/produtos", "admin_produtos")
code = fix_get_endpoint(code, "/api/categorias", "admin_categorias")

with open('src/routes/products.ts', 'w') as f:
    f.write(code)

print("Fixed products.ts cache logic")
