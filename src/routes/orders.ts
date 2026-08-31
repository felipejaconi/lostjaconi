import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

export function setupOrdersRoutes({ app, supabase, authenticateToken, upload, uploadToSupabase, JWT_SECRET, cache }: any) {
  // Orders
  
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
    const userId = (["admin", "armazem"].includes(req.user.role) && loja_id) ? loja_id : req.user.id;
    try {
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

  app.post("/api/pedidos/:id/merge", authenticateToken, clearPedidosCache, async (req: any, res: any) => {
    const { itens, total_adicional } = req.body;
    if (!Array.isArray(itens)) return res.status(400).json({ message: "Itens inválidos" });
    try {
      const orderId = req.params.id;
      
      // Update order total
      const { data: orderData, error: fetchErr } = await supabase.from("pedidos").select("total").eq("id", orderId).single();
      if (fetchErr) throw fetchErr;
      
      const novoTotal = Number(orderData.total) + Number(total_adicional);
      
      const { error: updateErr } = await supabase.from("pedidos").update({ total: novoTotal }).eq("id", orderId);
      if (updateErr) throw updateErr;

      const itemsToInsert = itens.map(i => ({
         pedido_id: orderId,
         produto_id: i.produto_id,
         quantidade: i.quantidade,
         preco_unitario: i.preco
      }));
      
      if (itemsToInsert.length > 0) {
         const { error: itemErr } = await supabase.from("pedido_itens").insert(itemsToInsert);
         if (itemErr) throw itemErr;
      }
      res.json({ success: true, novoTotal });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/pedidos", authenticateToken, async (req: any, res: any) => {
      const cacheKey = `pedidos_${req.user.role}_${req.user.id}_${req.url}`;
      const cached = cache.get(cacheKey);
      if (cached) return res.json(cached);

    try {
      let query = supabase.from("pedidos").select("*, user:users(name), pedido_itens(*, produto:produtos(*, categoria:categorias(nome)))").order("created_at", { ascending: false });
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
      const { data, error } = await supabase.from("pedidos").select("*, user:users(name), pedido_itens(*, produto:produtos(*, categoria:categorias(nome)))").eq("id", req.params.id).single();
      if (error) throw error;
      res.json({...data, loja_nome: data.user?.name});
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.put("/api/pedidos/:id/status", authenticateToken, clearPedidosCache, async (req: any, res: any) => {
    try {
      const updateData: any = { status: req.body.status };
      if (req.body.status === 'pronto') {
          updateData.created_at = new Date().toISOString();
      }
      const { data, error } = await supabase.from("pedidos").update(updateData).eq("id", req.params.id).select().single();
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
        const { data: stores } = await supabase
          .from("users")
          .select("id, name")
          .eq("role", "loja");
          
        const { data: orders, error } = await supabase
          .from("pedidos")
          .select("*, user:users(name), pedido_itens(*, produto:produtos(iva))")
          .order("created_at", { ascending: false });
        if (error) throw error;

        const agora = new Date();
        agora.setHours(0,0,0,0);

        const startOfDay = new Date(agora);
        
        const startOfWeek = new Date(agora);
        const day = startOfWeek.getDay();
        const diff = startOfWeek.getDate() - day + (day == 0 ? -6 : 1);
        startOfWeek.setDate(diff);

        let startOfMonth = new Date(agora.getFullYear(), agora.getMonth(), 1);
        let endOfMonth = new Date(agora.getFullYear(), agora.getMonth() + 1, 1);
        
        if (req.query.month !== undefined && req.query.year !== undefined) {
           startOfMonth = new Date(Number(req.query.year), Number(req.query.month), 1);
           endOfMonth = new Date(Number(req.query.year), Number(req.query.month) + 1, 1);
        }

        const { data: faturas } = await supabase
          .from("faturas")
          .select("*")
          .gte("data_emissao", startOfMonth.toISOString().split("T")[0])
          .lt("data_emissao", endOfMonth.toISOString().split("T")[0]);

        if (startOfWeek < startOfMonth) startOfWeek.setTime(startOfMonth.getTime());
        const startOfPreviousMonth = new Date(agora.getFullYear(), agora.getMonth() - 1, 1);

        const consumption: any = {};
        
        (stores || []).forEach((store: any) => {
           consumption[store.id] = {
              id: store.id,
              name: store.name || "Loja Desconhecida",
              diario: 0,
              semanal: 0,
              mensal: 0,
              despesasMensal: 0,
              mesAnterior: 0,
              totalHistorico: 0,
              numPedidos: 0,
           };
        });

        (orders || []).forEach((order: any) => {
          const storeId = order.user_id;
          const storeName = order.user?.name || "Loja Desconhecida";
          const originalDate = new Date(order.created_at);
          
          const orderDate = new Date(originalDate);
          
          let total = Number(order.total);
          let sumIva = 0;
          (order.pedido_itens || []).forEach((item: any) => {
              const qty = Number(item.quantidade) || 0;
              const preco = Number(item.preco_unitario || 0);
              const liq = qty * preco;
              const ivaPerc = Number(item.produto?.iva || 0);
              sumIva += liq * (ivaPerc / 100);
          });
          total += sumIva;

          if (!consumption[storeId]) {
            consumption[storeId] = {
              id: storeId,
              name: storeName,
              diario: 0,
              semanal: 0,
              mensal: 0,
              despesasMensal: 0,
              mesAnterior: 0,
              totalHistorico: 0,
              numPedidos: 0,
            };
          }

          if (orderDate >= startOfDay) consumption[storeId].diario += total;
          if (orderDate >= startOfWeek) consumption[storeId].semanal += total;
          
          // Use specific month for mensal if queried, otherwise current month
          if (orderDate >= startOfMonth && orderDate < endOfMonth) {
              consumption[storeId].mensal += total;
              consumption[storeId].numPedidos += 1;
          }
          
          // Total historico is always total
          consumption[storeId].totalHistorico += total;

          if (orderDate >= startOfPreviousMonth && orderDate < new Date(agora.getFullYear(), agora.getMonth(), 1)) {
              consumption[storeId].mesAnterior += total;
          }
        });
        
        (faturas || []).forEach((f: any) => {
          if (f.tipo && f.tipo.startsWith("despesa_") && f.descrição) {
            try {
              const desc = JSON.parse(f.descrição);
              if (desc.loja_id) {
                const storeId = desc.loja_id;
                if (consumption[storeId]) {
                   consumption[storeId].despesasMensal += Number(f.valor_total || 0);
                }
              }
            } catch (e) {}
          }
        });

        const result = Object.values(consumption).map((c: any) => ({
          ...c,
          mediaPedido: c.numPedidos > 0 ? (c.totalHistorico / c.numPedidos).toFixed(2) : 0,
        }));

        res.json(result);
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
  });

  // Administracao Tiro / Produtos Giro -> "Termômetro de Giro"
  app.get("/api/admin/giro", authenticateToken, async (req: any, res) => {
    if (req.user.role !== "admin") return res.sendStatus(403);
    try {
      // Pega pedidos entregues (ou últimos pedidos normais)
      const { data: pedidos, error } = await supabase
        .from("pedidos")
        .select(`
          id, user_id, 
          loja:users(name), 
          created_at, 
          status,
          pedido_itens (produto_id, quantidade, produto:produtos(nome, imagem_url, unidade_base))
        `)
        .in("status", ["pendente", "processando", "entregue_parcial", "entregue", "cancelado", "concluido"])
        .order("created_at", { ascending: false })
        .limit(2000);

      if (error) throw error;

      // Group by (loja_id, produto_id)
      const logs = new Map<string, any[]>();
      
      for (const p of pedidos || []) {
        if (!p.loja || p.status === "cancelado") continue;
        const lojaId = p.user_id;
        const lojaNome = p.loja.name;
        
        const originalDate = new Date(p.created_at);
        const dataPedido = new Date(originalDate);
        
        for (const item of p.pedido_itens || []) {
          const key = `${lojaId}_${item.produto_id}`;
          if (!logs.has(key)) logs.set(key, []);
          logs.get(key)!.push({
            lojaNome,
            produto_id: item.produto_id,
            produto_nome: item.produto?.nome || `Produto #${item.produto_id}`,
            produto_img: item.produto?.imagem_url,
            unidade: item.produto?.unidade_base || "un",
            quantidade: item.quantidade,
            data: dataPedido
          });
        }
      }

      const results = [];
      const agora = new Date();
      agora.setHours(0,0,0,0);
      
      const startOfDay = new Date(agora);
      
      const startOfWeek = new Date(agora);
      const day = startOfWeek.getDay();
      const diff = startOfWeek.getDate() - day + (day == 0 ? -6 : 1); // adjust when day is sunday
      startOfWeek.setDate(diff);

      const startOfMonth = new Date(agora.getFullYear(), agora.getMonth(), 1);
      if (startOfWeek < startOfMonth) startOfWeek.setTime(startOfMonth.getTime());
      const startOfYear = new Date(agora.getFullYear(), 0, 1);

      for (const [key, orders] of logs.entries()) {
        const sorted = orders.sort((a, b) => b.data.getTime() - a.data.getTime());
        const lastOrder = sorted[0];
        const totalQty = sorted.reduce((sum, o) => sum + o.quantidade, 0);

        let total_dia = 0;
        let total_semana = 0;
        let total_mes = 0;
        let total_ano = 0;
        const totals_by_month: Record<string, number> = {};

        for (const o of sorted) {
          if (o.data >= startOfDay) total_dia += o.quantidade;
          if (o.data >= startOfWeek) total_semana += o.quantidade;
          if (o.data >= startOfMonth) total_mes += o.quantidade;
          if (o.data >= startOfYear) total_ano += o.quantidade;
          
          const monthKey = `${o.data.getFullYear()}-${String(o.data.getMonth() + 1).padStart(2, '0')}`;
          totals_by_month[monthKey] = (totals_by_month[monthKey] || 0) + o.quantidade;
        }

        let velocidade_un_dia = 0;
        const dias_desde_utlimo = Math.floor((agora.getTime() - lastOrder.data.getTime()) / (1000 * 60 * 60 * 24));
        
        if (sorted.length > 1) {
           const firstOrder = sorted[sorted.length - 1];
           const diffMs = agora.getTime() - firstOrder.data.getTime();
           let diffDias = Math.max(1, diffMs / (1000 * 60 * 60 * 24));
           velocidade_un_dia = totalQty / diffDias;
        } else {
           // Se só tem 1 pedido, usamos os dias desde esse pedido
           let diffDias = Math.max(1, dias_desde_utlimo);
           velocidade_un_dia = lastOrder.quantidade / diffDias;
        }

        let status = "normal";
        let mensagem = "";

        if (dias_desde_utlimo > 30) {
           status = "cold";
           mensagem = `Produto #${lastOrder.produto_id} não gira há ${dias_desde_utlimo} dias. O WMS enviou ${lastOrder.quantidade} ${lastOrder.unidade} na última vez, e não houve reposição. Considere transferir para outra loja.`;
        } else if (velocidade_un_dia > 20) {
           status = "hot";
           mensagem = `Alto Consumo: ${velocidade_un_dia.toFixed(1)} ${lastOrder.unidade} por dia. As lojas estão repuxando rapidamente do WMS. Reforce o stock!`;
        } else if (velocidade_un_dia < 0.5 && dias_desde_utlimo <= 30 && sorted.length > 1) {
           status = "cold";
           mensagem = `Estacionado: Os pedidos são frequentes mas em quantidades minúsculas. Pode estar encalhado na loja.`;
        }

        const splitKey = key.split("_");
        const loja_id = splitKey[0];
        
        results.push({
          loja_id: loja_id,
          loja_nome: lastOrder.lojaNome,
          produto_id: lastOrder.produto_id,
          produto_nome: lastOrder.produto_nome,
          produto_img: lastOrder.produto_img,
          velocidade: velocidade_un_dia,
          ultimo_pedido_qty: lastOrder.quantidade,
          total_qty: totalQty,
          total_dia: total_dia,
          total_semana: total_semana,
          total_mes: total_mes,
          total_ano: total_ano,
          totals_by_month: totals_by_month,
          numero_pedidos: sorted.length,
          dias_desde_pedido: dias_desde_utlimo,
          status,
          mensagem_alerta: mensagem
        });
      }
      
      results.sort((a, b) => b.velocidade - a.velocidade);

      res.json(results);
    } catch (error: any) {
      console.error("Erro no giro", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Notifications
  app.get("/api/notificacoes", authenticateToken, async (req: any, res) => {
    try {
      const { data: rows, error } = await supabase
        .from("notificacoes")
        .select("*")
        .eq("user_id", req.user.id)
        .order("created_at", { ascending: false })
        .limit(50); // Increased limit to 50 for better UX

      if (error) {
        console.error("Supabase error in GET /api/notificacoes:", error);
        throw error;
      }
      res.json(rows);
    } catch (error: any) {
      console.error("Detailed error in GET /api/notificacoes:", error);
      res
        .status(500)
        .json({
          error: "Erro ao buscar notificações",
          message: error.message || String(error),
          details: error.details,
          hint: error.hint,
          code: error.code
        });
    }
  });

  app.put("/api/notificacoes/:id/read", authenticateToken, async (req: any, res) => {
    try {
      const { error } = await supabase
        .from("notificacoes")
        .update({ lida: true })
        .eq("id", req.params.id)
        .eq("user_id", req.user.id);

      if (error) throw error;
      res.json({ message: "Notificação marcada como lida" });
    } catch (error: any) {
      console.error("Erro ao marcar notificação como lida:", error);
      res.status(500).json({ error: "Erro ao marcar notificação como lida" });
    }
  });

  app.get("/api/admin/notificacoes", authenticateToken, async (req: any, res) => {
    if (!["admin", "armazem"].includes(req.user.role)) return res.sendStatus(403);
    try {
      const { data: rows, error } = await supabase
        .from("notificacoes")
        .select("*, users(name)")
        .order("created_at", { ascending: false })
        .limit(200); // Limit to last 200 to prevent performance issues

      if (error) throw error;
      res.json(rows);
    } catch (error: any) {
      console.error("Erro ao buscar notificações admin:", error);
      res.status(500).json({ error: "Erro ao buscar notificações" });
    }
  });

  app.post("/api/admin/notificacoes", authenticateToken, async (req: any, res) => {
    if (req.user.role !== "admin" && req.user.role !== "armazem") return res.sendStatus(403);
    const { titulo, mensagem, lojas_ids } = req.body;

    try {
      let targetStoreIds = lojas_ids;

      if (!lojas_ids || lojas_ids.length === 0) {
        // Global notification -> fetch all stores
        const { data: stores, error: storesError } = await supabase
          .from("users")
          .select("id")
          .eq("role", "loja");
        
        if (storesError) throw storesError;
        targetStoreIds = stores.map((s: any) => s.id);
      }

      if (targetStoreIds.length === 0) {
        return res.json({ message: "Nenhuma loja encontrada para notificar." });
      }

      const insertData = targetStoreIds.map((id: string) => ({
        titulo,
        mensagem,
        user_id: id,
        lida: false,
      }));

      const { error } = await supabase.from("notificacoes").insert(insertData);

      if (error) throw error;
      res.json({ message: "Notificação(ões) enviada(s) com sucesso" });
    } catch (error: any) {
      console.error("Erro ao enviar notificações:", error);
      res.status(500).json({ error: "Erro ao enviar notificações" });
    }
  });

}
