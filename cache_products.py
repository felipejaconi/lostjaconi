import sys

with open('src/routes/products.ts', 'r') as f:
    code = f.read()

# products
old_prod = '''  app.get("/api/produtos", authenticateToken, async (_req, res) => {
    try {'''

new_prod = '''  app.get("/api/produtos", authenticateToken, async (_req, res) => {
    try {
      const cached = cache.get("admin_produtos");
      if (cached) return res.json(cached);
'''

# categories
old_cat = '''  app.get("/api/categorias", authenticateToken, async (_req, res) => {
    try {'''

new_cat = '''  app.get("/api/categorias", authenticateToken, async (_req, res) => {
    try {
      const cached = cache.get("admin_categorias");
      if (cached) return res.json(cached);
'''

# on success for products
old_prod_res = '''      res.json(rows);
    } catch (error: any) {'''
new_prod_res = '''      cache.set("admin_produtos", rows);
      res.json(rows);
    } catch (error: any) {'''

# on success for categories
old_cat_res = '''      res.json(rows);
    } catch (error: any) {'''
new_cat_res = '''      cache.set("admin_categorias", rows);
      res.json(rows);
    } catch (error: any) {'''

# clear cache on mutate
mutations = [
    'app.post("/api/produtos"',
    'app.put("/api/produtos/:id"',
    'app.delete("/api/produtos/:id"',
    'app.post("/api/categorias"',
    'app.put("/api/categorias/:id"',
    'app.delete("/api/categorias/:id"',
    'app.put("/api/produtos/prices"'
]

for m in mutations:
    code = code.replace(m, m.replace('", authenticateToken, async ', '", authenticateToken, async (req: any, res: any, next: any) => { cache.del(["admin_produtos", "admin_categorias", "admin_stats"]); next(); }, async '))

code = code.replace(old_prod, new_prod)
code = code.replace(old_cat, new_cat)
code = code.replace(old_prod_res, new_prod_res)
code = code.replace(old_cat_res, new_cat_res)

with open('src/routes/products.ts', 'w') as f:
    f.write(code)

print("Products cached")
