import re

with open('src/routes/orders.ts', 'r') as f:
    content = f.read()

# Add a limit to the fetch
old_query = """      let query = supabase.from("pedidos").select("*, user:users(name), pedido_itens(*, produto:produtos(*, categoria:categorias(nome)))").order("created_at", { ascending: false });"""
new_query = """      let query = supabase.from("pedidos").select("*, user:users(name), pedido_itens(*, produto:produtos(*, categoria:categorias(nome)))").order("created_at", { ascending: false }).limit(300);"""

content = content.replace(old_query, new_query)

# Also strip query parameters from cache key so it shares the same cache
old_cache = """      const cacheKey = `pedidos_${req.user.role}_${req.user.id}_${req.url}`;"""
new_cache = """      const cacheKey = `pedidos_${req.user.role}_${req.user.id}`; // Ignored query params for cache"""

content = content.replace(old_cache, new_cache)

with open('src/routes/orders.ts', 'w') as f:
    f.write(content)

print("Patched backend")
