import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

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

  app.post("/api/wms/saida/agrupada", authenticateToken, async (req: any, res) => {
    if (!["admin", "armazem"].includes(req.user.role)) return res.sendStatus(403);
    const { loja_id, pedidos_ids, itens_conferidos } = req.body;

    try {
      if (!itens_conferidos || itens_conferidos.length === 0) {
        return res.status(400).json({ error: "Nenhum item conferido" });
      }

      await Promise.all(itens_conferidos.map(async (item: any) => {
        const prodId = item.produto_id;
        const qtyVenda = Number(item.quantidade);
        if (qtyVenda <= 0) return;

        // Fetch factors
        const { data: prod } = await supabase.from("produtos").select("stock_armazem, fator_conversao_venda").eq("id", prodId).single();
        if (!prod) return;

        const fatorVenda = Number(prod.fator_conversao_venda) || 1;
        const qtyBaseRequested = qtyVenda * fatorVenda;
        const limitBase = Number(prod.stock_armazem) || 0;
        
        const qtyBase = qtyBaseRequested;
        if (qtyBase <= 0) return;
        
        const actualQtyVenda = Number((qtyBase / fatorVenda).toFixed(3));
        const newStockBase = limitBase - qtyBase;

        // 1. & 2. Update stock global & movimentacoes_stock
        const stockPromises = [];

        stockPromises.push(supabase.from("produtos").update({ stock_armazem: newStockBase }).eq("id", prodId));

        stockPromises.push(supabase.from("movimentacoes_stock").insert([{
            produto_id: prodId,
            user_target_id: loja_id,
            tipo: "saida",
            quantidade: qtyBase,
            display_qty: actualQtyVenda,
            display_unit: item.unidade || "un",
            unidade: item.unidade || "un",
            motivo: "Saída (Conferência de Pedidos)"
        }]));

        // 4. Add to Store Stock
        stockPromises.push(
          supabase.from("stock_loja")
          .select("id, quantidade")
          .eq("user_id", loja_id)
          .eq("produto_id", prodId)
          .maybeSingle()
          .then(async ({ data: storeStockExisting }) => {
            if (storeStockExisting) {
              await supabase.from("stock_loja").update({ 
                quantidade: Number(storeStockExisting.quantidade) + qtyBase,
                ultima_picagem: new Date().toISOString()
              }).eq("id", storeStockExisting.id);
            } else {
              await supabase.from("stock_loja").insert([{
                user_id: loja_id,
                produto_id: prodId,
                quantidade: qtyBase,
                ultima_picagem: new Date().toISOString()
              }]);
            }
          })
        );

        // 5. Update `pedido_itens`
        if (pedidos_ids && pedidos_ids.length > 0) {
          stockPromises.push(
            supabase.from("pedido_itens")
            .select("id, quantidade, preco_unitario")
            .eq("produto_id", prodId)
            .in("pedido_id", pedidos_ids)
            .order("quantidade", { ascending: false })
            .then(async ({ data: pItems }) => {
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
            })
          );
        }

        await Promise.all(stockPromises);
      }));

      // 6. Delete items that were not packed
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
          await supabase.from("pedido_itens").delete().in("id", idsToDelete);
        }
      }

      // Mark orders as pronto and RECALCULATE THEIR TOTAL based on the new sent quantities
      if (pedidos_ids && pedidos_ids.length > 0) {
        await Promise.all(pedidos_ids.map(async (pId: any) => {
          const { data: orderItems } = await supabase
            .from("pedido_itens")
            .select("quantidade, preco_unitario")
            .eq("pedido_id", pId);
          
          const newTotal = (orderItems || []).reduce((acc: number, it: any) => acc + (Number(it.quantidade) * Number(it.preco_unitario)), 0);
          
          await supabase
            .from("pedidos")
            .update({ status: "pronto", total: newTotal })
            .eq("id", pId);
        }));
      }

      res.json({ message: "Saída e conferência concluídas com sucesso" });
    } catch (error: any) {
      console.error("Erro na saída agrupada:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/wms/pedidos/:id/rascunho", authenticateToken, async (req: any, res) => {
    try {
      const { id } = req.params;
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

      res.json({ message: "Rascunho salvo" });
    } catch (error: any) {
      console.error("Erro salvando rascunho:", error);
      res.status(500).json({ error: error.message });
    }
  });

}
