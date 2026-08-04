import re
with open('src/routes/orders.ts', 'r') as f:
    content = f.read()

# We need to replace the entire `app.post("/api/pedidos", ...)` until `// Administracao Tiro / Produtos Giro -> "Termômetro de Giro"`
# Because the `analytics/consumo` is inside the `app.post` now because I replaced everything between them.
# Let's verify what's there.
