with open("src/routes/products.ts", "r") as f:
    content = f.read()

# Fix for INSERT block
target1 = """           const loteData = { 
             produto_id: result.data.id, 
             lote: req.body.lote || null,
             rua: req.body.rua || null,
             prateleira: req.body.prateleira || null
           };"""

replacement1 = """           const loteData = { 
             produto_id: result.data.id, 
             lote: req.body.lote || null,
             rua: req.body.rua || null,
             prateleira: req.body.prateleira || null,
             quantidade: 0
           };"""

# Fix for UPDATE block
target2 = """           const loteData = { 
             produto_id: req.params.id, 
             lote: req.body.lote || null,
             rua: req.body.rua || null,
             prateleira: req.body.prateleira || null
           };"""

replacement2 = """           const loteData = { 
             produto_id: req.params.id, 
             lote: req.body.lote || null,
             rua: req.body.rua || null,
             prateleira: req.body.prateleira || null,
             quantidade: 0
           };"""

content = content.replace(target1, replacement1)
content = content.replace(target2, replacement2)

with open("src/routes/products.ts", "w") as f:
    f.write(content)

