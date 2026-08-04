import sys

with open('src/pages/admin/AdminSuppliers.tsx', 'r') as f:
    code = f.read()

old_fetch = """    try {
       const [resForn, resProd] = await Promise.all([
          api.get("/admin/fornecedores"),
          api.get("/produtos")
       ]);
       setFornecedores(resForn.data);
       setProducts(resProd.data);
    } catch (err: any) {"""

new_fetch = """    try {
       const [resForn, resProd, resFat] = await Promise.all([
          api.get("/admin/fornecedores"),
          api.get("/produtos"),
          api.get("/admin/faturas").catch(() => ({ data: [] }))
       ]);
       setFornecedores(resForn.data);
       setProducts(resProd.data);
       setFaturas(resFat.data);
    } catch (err: any) {"""

code = code.replace(old_fetch, new_fetch)

with open('src/pages/admin/AdminSuppliers.tsx', 'w') as f:
    f.write(code)
print('Success')
