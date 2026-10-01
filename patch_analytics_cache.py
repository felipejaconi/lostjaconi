import re

with open('src/routes/orders.ts', 'r') as f:
    content = f.read()

# 1. Update clearPedidosCache
old_clear = """  const clearPedidosCache = (req: any, res: any, next: any) => {
    const keys = cache.keys();
    const orderKeys = keys.filter((k: string) => k.startsWith("pedidos_"));
    cache.del(orderKeys);
    cache.del("admin_stats");
    next();
  };"""

new_clear = """  const clearPedidosCache = (req: any, res: any, next: any) => {
    const keys = cache.keys();
    const orderKeys = keys.filter((k: string) => k.startsWith("pedidos_") || k.startsWith("admin_analytics_consumo_"));
    cache.del(orderKeys);
    cache.del("admin_stats");
    cache.del("admin_dashboard_extended");
    next();
  };"""

content = content.replace(old_clear, new_clear)

# 2. Update /api/admin/analytics/consumo to use cache
old_route = """  app.get("/api/admin/analytics/consumo", authenticateToken, async (req: any, res: any) => {
      if (!["admin", "armazem"].includes(req.user.role)) return res.sendStatus(403);
      try {"""

new_route = """  app.get("/api/admin/analytics/consumo", authenticateToken, async (req: any, res: any) => {
      if (!["admin", "armazem"].includes(req.user.role)) return res.sendStatus(403);

      const month = req.query.month || "";
      const year = req.query.year || "";
      const cacheKey = `admin_analytics_consumo_${month}_${year}`;
      const cached = cache.get(cacheKey);
      if (cached) return res.json(cached);

      try {"""

content = content.replace(old_route, new_route)

# 3. Add cache.set
old_res = """        });

        res.json(Object.values(consumption).sort((a: any, b: any) => b.mensal - a.mensal));
      } catch (e: any) {"""

new_res = """        });

        const result = Object.values(consumption).sort((a: any, b: any) => b.mensal - a.mensal);
        cache.set(cacheKey, result, 120); // Cache for 120 seconds
        res.json(result);
      } catch (e: any) {"""

content = content.replace(old_res, new_res)

with open('src/routes/orders.ts', 'w') as f:
    f.write(content)

print("Patched analytics cache")
