with open("src/routes/products.ts", "r") as f:
    content = f.read()

content = content.replace("res.json({ message: \"Produto criado com sucesso\"", "cache.del(\"admin_produtos\");\n        res.json({ message: \"Produto criado com sucesso\"")
content = content.replace("res.json({ message: \"Produto atualizado\"", "cache.del(\"admin_produtos\");\n        res.json({ message: \"Produto atualizado\"")

with open("src/routes/products.ts", "w") as f:
    f.write(content)
