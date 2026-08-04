import re

with open('src/routes/orders.ts', 'r') as f:
    content = f.read()

# We want to replace from 'app.post("/api/pedidos"' to '// Administracao Tiro / Produtos Giro -> "Termômetro de Giro"'
start_idx = content.find('app.post("/api/pedidos"')
end_idx = content.find('  // Administracao Tiro / Produtos Giro -> "Termômetro de Giro"')

new_routes = """
  const clearPedidosCache = (req: any, res: any, next: any) => {
    const keys = cache.keys();
    const orderKeys = keys.filter((k: string) => k.startsWith("pedidos_"));
    cache.del(orderKeys);
    cache.del("admin_stats");
    next();
  };

  app.post("/api/pedidos", authenticateToken, clearPedidosCache, async (req: any, res: any) => {
    const { itens, total, observacoes, loja_id } = req.body;
    if (!Array.isArray(itens)) return res.status(400).json({ message: "Itens inválidos" });
    const userId = (req.user.role === "admin" && loja_id) ? loja_id : req.user.id;
    try {
      const { data: user } = await supabase.from("users").select("order_start_time, order_end_time, role").eq("id", userId).maybeSingle();
      if (user && user.role === "loja" && user.order_start_time && user.order_end_time) {
         // handle schedule logic if needed
      }

      const { data: order, error: orderErr } = await supabase.from("pedidos").insert([{
        user_id: userId, total, observacoes, status: "pendente"
      }]).select().single();
      if (orderErr) throw orderErr;

      const itemsToInsert = itens.map(i => ({
         pedido_id: order.id,
         produto_id: i.produto_id,
         quantidade: i.quantidade,
         preco_unitario: i.preco
      }));
      if (itemsToInsert.length > 0) {
         const { error: itemErr } = await supabase.from("pedido_itens").insert(itemsToInsert);
         if (itemErr) throw itemErr;
      }
      res.json(order);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/pedidos", authenticateToken, async (req: any, res: any) => {
      const cacheKey = `pedidos_${req.user.role}_${req.user.id}_${req.url}`;
      const cached = cache.get(cacheKey);
      if (cached) return res.json(cached);

    try {
      let query = supabase.from("pedidos").select("*, user:users(name), pedido_itens(*, produto:produtos(*))").order("created_at", { ascending: false });
      if (req.user.role === "loja") {
         query = query.eq("user_id", req.user.id);
      }
      const { data, error } = await query;
      if (error) throw error;
      
      const mapped = data.map((d: any) => ({...d, loja_nome: d.user?.name}));
      cache.set(cacheKey, mapped);
      res.json(mapped);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/pedidos/:id", authenticateToken, async (req: any, res: any) => {
    try {
      const { data, error } = await supabase.from("pedidos").select("*, user:users(name), pedido_itens(*, produto:produtos(*))").eq("id", req.params.id).single();
      if (error) throw error;
      res.json({...data, loja_nome: data.user?.name});
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.put("/api/pedidos/:id/status", authenticateToken, clearPedidosCache, async (req: any, res: any) => {
    try {
      const { data, error } = await supabase.from("pedidos").update({ status: req.body.status }).eq("id", req.params.id).select().single();
      if (error) throw error;
      res.json(data);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.delete("/api/pedidos/:id", authenticateToken, clearPedidosCache, async (req: any, res: any) => {
    try {
      const { error } = await supabase.from("pedidos").delete().eq("id", req.params.id);
      if (error) throw error;
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.put("/api/pedidos/:orderId/itens/:itemId", authenticateToken, clearPedidosCache, async (req: any, res: any) => {
    try {
      const { error } = await supabase.from("pedido_itens").update(req.body).eq("id", req.params.itemId);
      if (error) throw error;
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.delete("/api/pedidos/:orderId/itens/:itemId", authenticateToken, clearPedidosCache, async (req: any, res: any) => {
    try {
      const { error } = await supabase.from("pedido_itens").delete().eq("id", req.params.itemId);
      if (error) throw error;
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/pedidos/:orderId/itens", authenticateToken, clearPedidosCache, async (req: any, res: any) => {
    try {
      const { error } = await supabase.from("pedido_itens").insert([{
          pedido_id: req.params.orderId,
          produto_id: req.body.produto_id,
          quantidade: req.body.quantidade,
          preco_unitario: req.body.preco_unitario || 0
      }]);
      if (error) throw error;
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/admin/analytics/consumo", authenticateToken, async (req: any, res: any) => {
      if (!["admin", "armazem"].includes(req.user.role)) return res.sendStatus(403);
      try {
        const { data: orders, error } = await supabase
          .from("pedidos")
          .select("*, user:users(name)")
          .order("created_at", { ascending: false });
        if (error) throw error;

        const now = new Date();
        const firstDayOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const firstDayOfPreviousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const consumption: any = {};

        (orders || []).forEach((order: any) => {
          const storeId = order.user_id;
          const storeName = order.user?.name || "Loja Desconhecida";
          const orderDate = new Date(order.created_at);
          const total = Number(order.total);

          if (!consumption[storeId]) {
            consumption[storeId] = {
              name: storeName,
              diario: 0,
              semanal: 0,
              mensal: 0,
              mesAnterior: 0,
              totalHistorico: 0,
              numPedidos: 0,
            };
          }

          consumption[storeId].totalHistorico += total;
          consumption[storeId].numPedidos += 1;

          if (orderDate >= firstDayOfCurrentMonth) {
              consumption[storeId].mensal += total;
          } else if (orderDate >= firstDayOfPreviousMonth && orderDate < firstDayOfCurrentMonth) {
              consumption[storeId].mesAnterior += total;
          }
        });

        const currentDayOfMonth = now.getDate() || 1;
        const result = Object.values(consumption).map((c: any) => ({
          ...c,
          diario: c.mensal / currentDayOfMonth,
          semanal: c.mensal / 7,
          mediaPedido: c.numPedidos > 0 ? (c.totalHistorico / c.numPedidos).toFixed(2) : 0,
        }));
        res.json(result);
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
  });

"""

content = content[:start_idx] + new_routes + content[end_idx:]

with open('src/routes/orders.ts', 'w') as f:
    f.write(content)

print("Done")
