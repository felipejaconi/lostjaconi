import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { saveOrderTareDraft } from '../lib/wmsTareStore';
import { withStockBalanceTag } from '../lib/stockMovementBalance';

export function setupWmsRoutes({ app, supabase, authenticateToken, upload, uploadToSupabase, JWT_SECRET, cache }: any) {
  // --- WMS ENDPOINTS ---

  app.get("/api/wms/pedidos-pendentes/:loja_id", authenticateToken, async (req: any, res) => {
    if (!["admin", "armazem"].includes(req.user.role)) return res.sendStatus(403);
    const { loja_id } = req.params;

    try {
      const { data: pedidos, error: pedErr } = await supabase
        .from("pedidos")
        .select(`
          id,
          pedido_itens (
            produto_id,
            quantidade,
            produto:produtos (nome, imagem_url, unidade_base, barcode_ean)
          )
        `)
        .eq("user_id", loja_id)
        .eq("status", "processando");

      if (pedErr) throw pedErr;

      const itemsGrouped: Record<string, any> = {};

      pedidos?.forEach((pedido: any) => {
        pedido.pedido_itens?.forEach((item: any) => {
          const pid = item.produto_id;
          if (!itemsGrouped[pid]) {
            itemsGrouped[pid] = {
              produto_id: pid,
              nome: item.produto?.nome,
              unidade: item.produto?.unidade_base || "un",
              ean: item.produto?.barcode_ean,
              quantidade_solicitada: 0,
            };
          }
          itemsGrouped[pid].quantidade_solicitada += Number(item.quantidade);
        });
      });

      res.json({
        pedidos_ids: pedidos?.map((p: any) => p.id) || [],
        itens: Object.values(itemsGrouped)
      });
    } catch (error: any) {
      console.error("Erro ao buscar pedidos da loja:", error);
      res.status(500).json({ error: error.message });
    }
  });

  const activeWmsExitOrders = new Set<string>();

  app.post("/api/wms/saida/agrupada", authenticateToken, async (req: any, res) => {
    if (!["admin", "armazem"].includes(req.user.role)) return res.sendStatus(403);
    const { loja_id, pedidos_ids, itens_conferidos } = req.body;

    if (!Array.isArray(pedidos_ids) || pedidos_ids.length === 0) {
      return res.status(400).json({ error: "Pedido inválido" });
    }

    const lockedIds = pedidos_ids.map((id: any) => String(id));
    if (lockedIds.some((id: string) => activeWmsExitOrders.has(id))) {
      return res.status(409).json({ error: "Este pedido já está a finalizar o picking. Aguarde um instante." });
    }
    lockedIds.forEach((id: string) => activeWmsExitOrders.add(id));

    try {
      // Check if any of the orders are already delivered
      const { data: currentPedidos } = await supabase
        .from("pedidos")
        .select("id, status, user_id, user:users(name)")
        .in("id", pedidos_ids);
      
      if (currentPedidos?.some((p: any) => p.status === 'entregue' || p.status === 'concluido') && req.user.role !== 'admin') {
        return res.status(403).json({ error: "Não é possível processar saída de pedidos já entregues." });
      }

      if (!itens_conferidos || itens_conferidos.length === 0) {
        return res.status(400).json({ error: "Nenhum item conferido" });
      }

      const { data: existingOrderItems, error: checkItemsErr } = await supabase
        .from("pedido_itens")
        .select("id, preco_unitario, produto:produtos(nome)")
        .in("pedido_id", pedidos_ids);

      if (checkItemsErr) throw checkItemsErr;

      const zeroPriceItems = (existingOrderItems || []).filter(
        (it: any) => Number(it.preco_unitario || 0) <= 0
      );
      if (zeroPriceItems.length > 0) {
        const names = zeroPriceItems
          .map((it: any) => it.produto?.nome || "Produto sem nome")
          .join(", ");
        return res.status(400).json({
          error: `Não é possível finalizar o picking porque existem itens com valor unitário € 0,00: ${names}`
        });
      }

      await Promise.all(itens_conferidos.map(async (item: any) => {
        const prodId = item.produto_id;
        const qtyVenda = Number(item.quantidade);
        if (qtyVenda < 0) return; // Allow 0 to handle removals

        const actualQtyVenda = Number(qtyVenda.toFixed(3));

        // 1. Update `pedido_itens` with the conference result
        if (pedidos_ids && pedidos_ids.length > 0) {
          const { data: pItems } = await supabase
            .from("pedido_itens")
            .select("id, quantidade, preco_unitario")
            .eq("produto_id", prodId)
            .in("pedido_id", pedidos_ids)
            .order("quantidade", { ascending: false });

          if (pItems && pItems.length > 0) {
            let leftToDistribute = actualQtyVenda;
            const piPromises = [];
            for (let i = 0; i < pItems.length; i++) {
              const pi = pItems[i];
              if (i === pItems.length - 1) {
                piPromises.push(supabase.from("pedido_itens").update({ quantidade: leftToDistribute }).eq("id", pi.id));
              } else {
                const assigned = Math.min(Number(pi.quantidade), leftToDistribute);
                piPromises.push(supabase.from("pedido_itens").update({ quantidade: assigned }).eq("id", pi.id));
                leftToDistribute -= assigned;
              }
            }
            await Promise.all(piPromises);
          }
        }
      }));

      // 2. Set non-packed items to quantity 0
      if (pedidos_ids && pedidos_ids.length > 0) {
        const conferidosProductIds = itens_conferidos
          .filter((i: any) => Number(i.quantidade) > 0)
          .map((i: any) => i.produto_id);
          
        const { data: allItemsToDelete } = await supabase
          .from("pedido_itens")
          .select("id, produto_id")
          .in("pedido_id", pedidos_ids);
          
        const idsToDelete = (allItemsToDelete || [])
          .filter((i: any) => !conferidosProductIds.includes(i.produto_id))
          .map((i: any) => i.id);
          
        if (idsToDelete.length > 0) {
          await supabase.from("pedido_itens").update({ quantidade: 0 }).in("id", idsToDelete);
        }
      }

      // 3. Mark orders directly as 'entregue', recalculate total, and apply warehouse->store stock transfer
      const nowIso = new Date().toISOString();
      for (const pId of pedidos_ids) {
        const currentOrder = (currentPedidos || []).find((p: any) => String(p.id) === String(pId));
        const wasDelivered = currentOrder && ["entregue", "concluido"].includes(currentOrder.status);
        const targetUserId = currentOrder?.user_id || loja_id;
        const storeName = (currentOrder as any)?.user?.name || "Loja";

        const { data: orderItems } = await supabase
          .from("pedido_itens")
          .select("id, produto_id, quantidade, preco_unitario, produto:produtos(id, stock_armazem, fator_conversao_venda, unidade_base)")
          .eq("pedido_id", pId);
        
        const newTotal = (orderItems || []).reduce((acc: number, it: any) => acc + (Number(it.quantidade) * Number(it.preco_unitario)), 0);
        
        const updateOrderPayload: any = {
          status: "entregue",
          total: newTotal,
        };
        if (!wasDelivered) {
          updateOrderPayload.created_at = nowIso;
        }

        await supabase
          .from("pedidos")
          .update(updateOrderPayload)
          .eq("id", pId);

        // Deduct warehouse stock & add to store stock if not previously delivered
        if (!wasDelivered) {
          const { data: existingMov } = await supabase
            .from("movimentacoes_stock")
            .select("id")
            .ilike("motivo", `%#${pId}%`)
            .limit(1);

          if (!existingMov || existingMov.length === 0) {
            const movementMotivo = `Entrega de Pedido #${pId} para ${storeName}`;
            for (const item of orderItems || []) {
              const prodId = item.produto_id;
              const qtyVenda = Number(item.quantidade);
              const prodObj = (item as any).produto;
              if (qtyVenda <= 0 || !prodObj) continue;

              const qtyBase = qtyVenda * (Number(prodObj.fator_conversao_venda) || 1);

              const { data: latestProd } = await supabase
                .from("produtos")
                .select("stock_armazem")
                .eq("id", prodId)
                .single();
              const currentStock = latestProd
                ? Number(latestProd.stock_armazem)
                : Number(prodObj.stock_armazem) || 0;

              const newStock = currentStock - qtyBase;
              await supabase
                .from("produtos")
                .update({ stock_armazem: newStock })
                .eq("id", prodId);

              await supabase.from("movimentacoes_stock").insert([
                {
                  produto_id: prodId,
                  user_target_id: targetUserId,
                  tipo: "saida",
                  quantidade: qtyBase,
                  display_qty: qtyVenda,
                  display_unit: prodObj.unidade_base || "un",
                  unidade: prodObj.unidade_base || "un",
                  motivo: withStockBalanceTag(movementMotivo, currentStock, newStock),
                  user_id: req.user.id,
                },
              ]);

              if (targetUserId) {
                const { data: storeStockExisting } = await supabase
                  .from("stock_loja")
                  .select("id, quantidade")
                  .eq("user_id", targetUserId)
                  .eq("produto_id", prodId)
                  .maybeSingle();

                if (storeStockExisting) {
                  await supabase
                    .from("stock_loja")
                    .update({
                      quantidade: Number(storeStockExisting.quantidade) + qtyBase,
                      ultima_picagem: nowIso,
                    })
                    .eq("id", storeStockExisting.id);
                } else {
                  await supabase.from("stock_loja").insert([
                    {
                      user_id: targetUserId,
                      produto_id: prodId,
                      quantidade: qtyBase,
                      ultima_picagem: nowIso,
                    },
                  ]);
                }
              }
            }
          }
        }
      }

      // Clear relevant caches so orders, analytics, and dashboard reflect delivery immediately
      if (cache) {
        const keys = cache.keys();
        const orderKeys = keys.filter(
          (k: string) =>
            k.startsWith("pedidos_") ||
            k.startsWith("admin_analytics_consumo_") ||
            k.startsWith("admin_financial_pedidos")
        );
        if (orderKeys.length > 0) cache.del(orderKeys);
        cache.del("admin_stats");
        cache.del("admin_dashboard_extended");
        cache.del("admin_produtos");
      }

      res.json({ message: "Picking finalizado e pedido entregue com sucesso" });
    } catch (error: any) {
      console.error("Erro na saída agrupada:", error);
      res.status(500).json({ error: error.message });
    } finally {
      lockedIds.forEach((id: string) => activeWmsExitOrders.delete(id));
    }
  });

  app.post("/api/wms/pedidos/:id/rascunho", authenticateToken, async (req: any, res) => {
    try {
      const { id } = req.params;

      const { data: order } = await supabase.from("pedidos").select("status").eq("id", id).single();
      if (order && (order.status === 'entregue' || order.status === 'concluido') && req.user.role !== 'admin') {
        return res.status(403).json({ error: "Não é possível salvar rascunho de pedidos já entregues." });
      }

      const { itens_conferidos } = req.body;
      
      if (!itens_conferidos || !Array.isArray(itens_conferidos)) {
        return res.status(400).json({ error: "Dados inválidos" });
      }

      const updatePromises = itens_conferidos
        .filter((item: any) => item.quantidade !== undefined)
        .map(async (item: any) => {
           const { error } = await supabase
             .from("pedido_itens")
             .update({ display_qty: item.quantidade === null ? null : Number(item.quantidade) })
             .eq("pedido_id", id)
             .eq("produto_id", item.produto_id);
           if (error) {
              console.error("Erro update rascunho:", error);
              throw error;
           }
        });

      if (updatePromises.length > 0) {
        await Promise.all(updatePromises);
      }

      await saveOrderTareDraft(id, itens_conferidos, supabase, cache);

      if (cache) {
        const orderKeys = cache.keys().filter((k: string) => k.startsWith("pedidos_"));
        if (orderKeys.length > 0) cache.del(orderKeys);
      }

      res.json({ message: "Rascunho salvo" });
    } catch (error: any) {
      console.error("Erro salvando rascunho:", error);
      res.status(500).json({ error: error.message });
    }
  });

}
