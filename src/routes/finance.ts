import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

export function setupFinanceRoutes({ app, supabase, authenticateToken, upload, uploadToSupabase, JWT_SECRET, cache }: any) {
  // ERP Financeiro - Fornecedores
  app.get("/api/admin/fornecedores", authenticateToken, async (req: any, res) => {
    if (req.user.role !== "admin" && req.user.role !== "armazem") return res.sendStatus(403);
    try {
      const cached = cache.get("admin_fornecedores");
      if (cached) return res.json(cached);
      const { data, error } = await supabase.from("fornecedores").select("*").order("nome");
      if (error) {
         if (error.code === '42P01') {
            // Table doesn't exist yet, return empty array safely
            return res.json([]);
         }
         throw error;
      }
      cache.set("admin_fornecedores", data);
      res.json(data);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/admin/fornecedores", authenticateToken, async (req: any, res) => {
    if (req.user.role !== "admin" && req.user.role !== "armazem") return res.sendStatus(403);
    try {
      let result = await supabase.from("fornecedores").insert([req.body]).select().single();
      if (result.error && result.error.code === 'PGRST204') {
         const safeBody = { ...req.body };
         delete safeBody.morada;
         delete safeBody.codigo_postal;
         delete safeBody.localidade;
         delete safeBody.iban;
         delete safeBody.banco;
         delete safeBody.swift_bic;
         delete safeBody.condicoes_pagamento;
         console.warn("Algumas colunas de fornecedores não existem, a omitir campos novos.");
         result = await supabase.from("fornecedores").insert([safeBody]).select().single();
      }
      if (result.error) throw result.error;
      res.json(result.data);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.put("/api/admin/fornecedores/:id", authenticateToken, async (req: any, res) => {
    if (req.user.role !== "admin" && req.user.role !== "armazem") return res.sendStatus(403);
    try {
      let result = await supabase.from("fornecedores").update(req.body).eq("id", req.params.id).select().single();
      if (result.error && result.error.code === 'PGRST204') {
         const safeBody = { ...req.body };
         delete safeBody.morada;
         delete safeBody.codigo_postal;
         delete safeBody.localidade;
         delete safeBody.iban;
         delete safeBody.banco;
         delete safeBody.swift_bic;
         delete safeBody.condicoes_pagamento;
         console.warn("Algumas colunas de fornecedores não existem, a omitir campos novos no update.");
         result = await supabase.from("fornecedores").update(safeBody).eq("id", req.params.id).select().single();
      }
      if (result.error) throw result.error;
      res.json(result.data);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ERP Financeiro - Faturas e Despesas
  app.get("/api/admin/fornecedores/:id/produtos", authenticateToken, async (req: any, res) => {
    if (req.user.role !== "admin" && req.user.role !== "armazem") return res.sendStatus(403);
    try {
      const { period, month, year } = req.query;
      let query = supabase
        .from('fatura_itens')
        .select(`
          produto_id,
          quantidade,
          preco_custo,
          produtos ( nome, imagem_url ),
          faturas!inner (
             fornecedor_id,
             data_emissao
          )
        `)
        .eq('faturas.fornecedor_id', req.params.id);

      if (period !== 'todos') {
         const m = month ? Number(month) : new Date().getMonth();
         const y = year ? Number(year) : new Date().getFullYear();
         const startDate = new Date(y, m, 1).toISOString();
         const endDate = new Date(y, m + 1, 0, 23, 59, 59).toISOString();
         query = query.gte("faturas.data_emissao", startDate).lte("faturas.data_emissao", endDate);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Group by produto_id to get aggregated stats (e.g. latest price, total quantity bought)
      const productsMap = new Map();
      for (const item of (data || [])) {
         if (!item.produto_id) continue;
         const pid = item.produto_id;
         if (!productsMap.has(pid)) {
            productsMap.set(pid, {
               produto_id: pid,
               nome: item.produtos?.nome || "Produto Desconhecido",
               quantidade_total: 0,
               ultimo_preco: item.preco_custo,
               ultima_compra: Array.isArray(item.faturas) ? item.faturas[0]?.data_emissao : item.faturas?.data_emissao
            });
         }
         const p = productsMap.get(pid);
         p.quantidade_total += Number(item.quantidade);
         
         const currentItemDate = Array.isArray(item.faturas) ? item.faturas[0]?.data_emissao : item.faturas?.data_emissao;
         if (currentItemDate && (!p.ultima_compra || new Date(currentItemDate) > new Date(p.ultima_compra))) {
            p.ultima_compra = currentItemDate;
            p.ultimo_preco = item.preco_custo;
         }
      }

      const productsArray = Array.from(productsMap.values());
      res.json(productsArray);
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ error: error.message });
    }
  });

  // ERP Financeiro - Produto Fornecedores (Relatorio)
  app.get("/api/admin/produtos/:id/fornecedores", authenticateToken, async (req: any, res) => {
    if (req.user.role !== "admin" && req.user.role !== "armazem") return res.sendStatus(403);
    try {
      const { period, month, year } = req.query;
      let query = supabase
        .from('fatura_itens')
        .select(`
          preco_custo,
          quantidade,
          faturas!inner (
             fornecedor_id,
             data_emissao,
             fornecedores ( nome )
          )
        `)
        .eq('produto_id', req.params.id);

      if (period !== 'todos') {
         const m = month ? Number(month) : new Date().getMonth();
         const y = year ? Number(year) : new Date().getFullYear();
         const startDate = new Date(y, m, 1).toISOString();
         const endDate = new Date(y, m + 1, 0, 23, 59, 59).toISOString();
         query = query.gte("faturas.data_emissao", startDate).lte("faturas.data_emissao", endDate);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Group by fornecedor_id
      const suppliersMap = new Map();
      for (const item of (data || [])) {
         let faturasObj = item.faturas;
         if (Array.isArray(faturasObj)) faturasObj = faturasObj[0]; // Just in case
         
         if (!faturasObj || !faturasObj.fornecedor_id) continue;
         
         const fid = faturasObj.fornecedor_id;
         if (!suppliersMap.has(fid)) {
            suppliersMap.set(fid, {
               fornecedor_id: fid,
               nome: faturasObj.fornecedores?.nome || "Fornecedor Desconhecido",
               quantidade_total: 0,
               ultimo_preco: item.preco_custo,
               ultima_compra: faturasObj.data_emissao
            });
         }
         
         const s = suppliersMap.get(fid);
         s.quantidade_total += Number(item.quantidade);
         
         const itemDate = new Date(faturasObj.data_emissao);
         const sDate = s.ultima_compra ? new Date(s.ultima_compra) : null;
         
         if (itemDate && (!sDate || itemDate > sDate)) {
            s.ultima_compra = faturasObj.data_emissao;
            s.ultimo_preco = item.preco_custo;
         } else if (itemDate && sDate && itemDate.getTime() === sDate.getTime()) {
            // Se for na mesma data, podemos manter o preco mais recente que apareceu, ou fazer uma média. Mantemos o que tá lá.
         }
      }

      const suppliersArray = Array.from(suppliersMap.values());
      res.json(suppliersArray);
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ error: error.message });
    }
  });

  const clearFinanceCache = () => {
    cache.del("admin_faturas");
    cache.del("admin_financial_pedidos");
    cache.del("admin_stats");
    cache.del("admin_produtos");
  };

  app.get("/api/admin/financial/pedidos", authenticateToken, async (req: any, res) => {
    if (req.user.role !== "admin" && req.user.role !== "armazem") return res.sendStatus(403);
    try {
      const { period } = req.query;
      const cacheKey = `admin_financial_pedidos_${period || 'all'}`;
      const cached = cache.get(cacheKey);
      if (cached) return res.json(cached);

      let query = supabase
        .from("pedidos")
        .select("id, user_id, status, created_at, user:users(name), pedido_itens(quantidade, preco_unitario, produto:produtos(iva))")
        .in("status", ["pronto", "entregue", "concluido"]);

      if (period === 'mes') {
         const now = new Date();
         const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
         query = query.gte("created_at", startOfMonth);
      } else if (period === 'ano') {
         const now = new Date();
         const startOfYear = new Date(now.getFullYear(), 0, 1).toISOString();
         query = query.gte("created_at", startOfYear);
      }

      const { data, error } = await query.order("created_at", { ascending: false });

      if (error) throw error;

      const mapped = (data || []).map((p: any) => {
        let sumSubtotal = 0;
        let sumIva = 0;
        (p.pedido_itens || []).forEach((item: any) => {
          const qty = Number(item.quantidade) || 0;
          const preco = Number(item.preco_unitario) || 0;
          const liq = qty * preco;
          const ivaPerc = Number(item.produto?.iva) || 0;
          sumSubtotal += liq;
          sumIva += liq * (ivaPerc / 100);
        });
        const totalComIva = sumSubtotal + sumIva;
        return {
          id: p.id,
          user_id: p.user_id,
          loja_nome: p.user?.name || "Loja Desconhecida",
          created_at: p.created_at,
          status: p.status,
          total_subtotal: sumSubtotal,
          total_iva: sumIva,
          total_com_iva: totalComIva
        };
      });

      cache.set(cacheKey, mapped, 60);
      res.json(mapped);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/admin/faturas", authenticateToken, async (req: any, res) => {
    if (req.user.role !== "admin" && req.user.role !== "armazem") return res.sendStatus(403);
    try {
      const cached = cache.get("admin_faturas");
      if (cached) return res.json(cached);
      const { data, error } = await supabase
        .from("faturas")
        .select("*, fornecedor:fornecedores(id, nome, iban, contribuinte, tipo), fatura_itens(id, fatura_id, quantidade, preco_custo, iva, valor_liquido, valor_iva, valor_total, produto:produtos(nome, unidade_base, iva)), user:created_by(id, name, email), movimentos_financeiros(*)")
        .order("data_emissao", { ascending: false });
      if (error) {
         if (error.code === '42P01') return res.json([]);
         throw error;
      }
      const mapped = (data || []).map((f: any) => {
        if (f.fornecedor) {
          f.fornecedor.nif = f.fornecedor.contribuinte || "";
        }
        return f;
      });
      cache.set("admin_faturas", mapped, 60);
      res.json(mapped);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  
  app.post("/api/admin/faturas/despesas", authenticateToken, async (req: any, res) => {
    if (req.user.role !== "admin" && req.user.role !== "armazem") return res.sendStatus(403);
    
    try {
      const isArray = Array.isArray(req.body);
      const items = isArray ? req.body : [req.body];
      
      let createdFornecedorId: any = null;
      let createdFornecedorName: any = null;
      
      const dataToInsert = [];
      
      for (const item of items) {
          let finalFornecedorId = item.fornecedor_id;
          
          if (!finalFornecedorId && item.novo_fornecedor_nome) {
             if (createdFornecedorName === item.novo_fornecedor_nome) {
                finalFornecedorId = createdFornecedorId;
             } else {
                const { data: newForn, error: fornError } = await supabase
                  .from("fornecedores")
                  .insert([{ nome: item.novo_fornecedor_nome }])
                  .select()
                  .single();
                  
                if (fornError) throw fornError;
                finalFornecedorId = newForn.id;
                createdFornecedorId = newForn.id;
                createdFornecedorName = item.novo_fornecedor_nome;
             }
          }
          
          dataToInsert.push({
            fornecedor_id: finalFornecedorId,
            numero_fatura: item.numero_fatura,
            data_emissao: item.data_fatura,
            data_vencimento: item.data_vencimento,
            valor_total: item.valor_total,
            valor_pendente: item.valor_total,
            tipo: 'despesa_' + item.categoria_despesa,
            created_by: req.user.id,
            descrição: item.loja_id ? JSON.stringify({ loja_id: item.loja_id }) : null
          });
      }
      
      const { data, error } = await supabase.from("faturas").insert(dataToInsert).select();
      
      if (error) throw error;
      clearFinanceCache();
      res.json(isArray ? data : data[0]);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/admin/faturas", authenticateToken, async (req: any, res) => {
    if (req.user.role !== "admin" && req.user.role !== "armazem") return res.sendStatus(403);
    try {
      const isArray = Array.isArray(req.body);
      const dataToInsert = isArray 
        ? req.body.map((item: any) => ({ ...item, created_by: req.user.id }))
        : [{ ...req.body, created_by: req.user.id }];
        
      const { data, error } = await supabase.from("faturas").insert(dataToInsert).select();
      if (error) throw error;
      clearFinanceCache();
      res.json(isArray ? data : data[0]);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.put("/api/admin/faturas/bulk-approve-conference", authenticateToken, async (req: any, res) => {
    if (req.user.role !== "admin") return res.sendStatus(403);
    try {
      const { data, error } = await supabase
        .from("faturas")
        .update({ status_pagamento: "pendente" })
        .eq("status_pagamento", "em_conferencia")
        .select();
      
      if (error) throw error;
      
      clearFinanceCache();
      res.json({ success: true, count: data?.length || 0 });
    } catch (error: any) {
      console.error("Erro no bulk approve faturas:", error);
      res.status(500).json({ error: error.message || "Erro ao aprovar faturas em massa" });
    }
  });

  app.put("/api/admin/faturas/:id/checkout", authenticateToken, async (req: any, res) => {
    if (req.user.role !== "admin") return res.sendStatus(403);
    const faturaId = req.params.id;
    const { numero_fatura, data_emissao, data_vencimento, fornecedor_id, valor_liquido, valor_iva, valor_total, itens, observacoes } = req.body;
    
    try {
      // 0. Fetch existing items for stock adjustment
      const { data: existingItems } = await supabase
        .from("fatura_itens")
        .select("id, produto_id, quantidade, fator_conversao, unidade_entrada")
        .eq("fatura_id", faturaId);

      const oldItemsMap = new Map((existingItems || []).map(it => [String(it.id), it]));

      // 1. Update the Fatura header
      const updatePayload: any = {
         numero_fatura,
         data_emissao,
         data_vencimento,
         fornecedor_id,
         valor_liquido,
         valor_iva,
         valor_total,
         valor_pendente: valor_total,
         observacoes: observacoes || null,
         status_pagamento: "pendente"
      };
      
      const { error: headerError } = await supabase.from("faturas").update(updatePayload).eq("id", faturaId);
      if (headerError) throw headerError;
      
      // 2. Process Items (Updates and New Items)
      const processedItemIds = new Set();
      if (itens && Array.isArray(itens)) {
         for (const item of itens) {
            const itemPayload: any = {
               fatura_id: faturaId,
               produto_id: item.produto_id || null,
               quantidade: Number(item.quantidade) || 0,
               iva: item.iva,
               valor_liquido: item.valor_liquido,
               valor_iva: item.valor_iva,
               valor_total: item.valor_total,
               preco_custo: item.preco_unitario,
               fator_conversao: item.fator_conversao || 1,
               unidade_entrada: item.unidade_entrada || "un"
            };

            let qtyDiffBase = 0;
            const factor = Number(item.fator_conversao) || 1;

            if (item.id) {
               processedItemIds.add(String(item.id));
               const oldItem = oldItemsMap.get(String(item.id));
               if (oldItem) {
                  const oldQtyBase = (Number(oldItem.quantidade) || 0) * (Number(oldItem.fator_conversao) || 1);
                  const newQtyBase = (Number(item.quantidade) || 0) * factor;
                  qtyDiffBase = newQtyBase - oldQtyBase;
               } else {
                  // This shouldn't happen if item.id is provided and valid, but treat as new if it does
                  qtyDiffBase = (Number(item.quantidade) || 0) * factor;
               }
               await supabase.from("fatura_itens").update(itemPayload).eq("id", item.id);
            } else {
               const { data: insertedItem } = await supabase.from("fatura_itens").insert([itemPayload]).select("id").single();
               qtyDiffBase = (Number(item.quantidade) || 0) * factor;
               if (insertedItem) processedItemIds.add(String(insertedItem.id));
            }

            // 3. Update Product Catalog Price & Stock (ONLY if it has a produto_id)
            if (item.produto_id) {
               const { data: prod } = await supabase.from("produtos").select("preco_custo, preco, iva, stock_armazem, unidade_base").eq("id", item.produto_id).single();
               
               if (prod) {
                  const updateProdData: any = {};
                  
                  // IVA update
                  if (item.iva !== null && item.iva !== undefined) {
                     updateProdData.iva = Number(item.iva);
                  }

                  // Stock adjustment
                  if (qtyDiffBase !== 0) {
                     updateProdData.stock_armazem = (Number(prod.stock_armazem) || 0) + qtyDiffBase;
                     
                     // Register movement for adjustment
                     await supabase.from("movimentacoes_stock").insert([{
                        produto_id: item.produto_id,
                        tipo: qtyDiffBase > 0 ? "entrada" : "saida",
                        quantidade: Math.abs(qtyDiffBase),
                        display_qty: Math.abs(Number(item.quantidade) - (oldItemsMap.get(String(item.id))?.quantidade || 0)),
                        display_unit: item.unidade_entrada || "un",
                        unidade: prod.unidade_base || "un",
                        motivo: `AJUSTE CONFERÊNCIA: Fatura #${numero_fatura} corrigida`,
                        user_id: req.user.id
                     }]);
                  }

                  // Price & Margin preservation
                  const newCusto = Number(item.preco_unitario) / factor;
                  const oldCusto = Number(prod.preco_custo) || 0;
                  
                  if (oldCusto > 0 && newCusto > 0 && oldCusto !== newCusto) {
                      const currentPreco = Number(prod.preco) || 0;
                      const oldIvaRatio = 1 + (Number(prod.iva || 0) / 100);
                      const pvpSemIva = currentPreco / oldIvaRatio;
                      
                      const oldMargemPct = (pvpSemIva - oldCusto) / oldCusto;
                      const newPvpSemIva = newCusto * (1 + oldMargemPct);
                      const newIvaRatio = 1 + (Number(updateProdData.iva ?? prod.iva) / 100);
                      const newPvp = newPvpSemIva * newIvaRatio;
                      updateProdData.preco = Number(newPvp.toFixed(2));
                  }
                  updateProdData.preco_custo = newCusto;

                  await supabase.from("produtos").update(updateProdData).eq("id", item.produto_id);
               }
            }
         }
      }

      // 4. Handle Removed Items (Stock Reversion)
      for (const [id, oldItem] of oldItemsMap.entries()) {
         if (!processedItemIds.has(id)) {
            const qtyToRevertBase = (Number(oldItem.quantidade) || 0) * (Number(oldItem.fator_conversao) || 1);
            if (oldItem.produto_id && qtyToRevertBase > 0) {
               const { data: prod } = await supabase.from("produtos").select("stock_armazem, unidade_base").eq("id", oldItem.produto_id).single();
               if (prod) {
                  await supabase.from("produtos").update({ 
                     stock_armazem: Math.max(0, (Number(prod.stock_armazem) || 0) - qtyToRevertBase) 
                  }).eq("id", oldItem.produto_id);

                  await supabase.from("movimentacoes_stock").insert([{
                     produto_id: oldItem.produto_id,
                     tipo: "saida",
                     quantidade: qtyToRevertBase,
                     display_qty: oldItem.quantidade,
                     display_unit: oldItem.unidade_entrada || "un",
                     unidade: prod.unidade_base || "un",
                     motivo: `REMOÇÃO CONFERÊNCIA: Item removido da Fatura #${numero_fatura}`,
                     user_id: req.user.id
                  }]);
               }
            }
            await supabase.from("fatura_itens").delete().eq("id", id);
         }
      }
      
      clearFinanceCache();
      res.json({ success: true });
    } catch (error: any) {
      console.error("Erro no checkout fatura:", error);
      res.status(500).json({ error: error.message || "Erro no checkout da fatura" });
    }
  });

  app.delete("/api/admin/faturas/:id", authenticateToken, async (req: any, res) => {
    if (req.user.role !== "admin") return res.sendStatus(403);
    const faturaId = req.params.id;
    try {
      // 1. Fetch invoice to check type and items
      const { data: fatura } = await supabase
        .from("faturas")
        .select("id, tipo, numero_fatura, fatura_itens(*, produto:produtos(id, stock_armazem, unidade_base))")
        .eq("id", faturaId)
        .single();
      
      if (fatura && fatura.tipo === 'compra') {
          const items = fatura.fatura_itens || [];
          for (const item of items) {
            const prodId = item.produto_id;
            const qtyEntrada = Number(item.quantidade);
            if (!prodId || qtyEntrada <= 0) continue;

            // Factor in conversion
            const factor = Number(item.fator_conversao) || 1;
            const qtyBase = qtyEntrada * factor;

            const { data: latestProd } = await supabase.from("produtos").select("stock_armazem").eq("id", prodId).single();
            const currentStock = latestProd ? Number(latestProd.stock_armazem) : (Number(item.produto?.stock_armazem) || 0);
            
            // Revert: Deduct from warehouse
            await supabase.from("produtos").update({ stock_armazem: Math.max(0, currentStock - qtyBase) }).eq("id", prodId);

            await supabase.from("movimentacoes_stock").insert([{
                produto_id: prodId,
                tipo: "saida",
                quantidade: qtyBase,
                display_qty: qtyEntrada,
                display_unit: item.unidade_entrada || "un",
                unidade: item.produto?.unidade_base || "un",
                motivo: `ELIMINAÇÃO: Stock removido após apagar Fatura #${fatura.numero_fatura || faturaId}`,
                user_id: req.user.id
            }]);
          }
      }

      await supabase.from("fatura_itens").delete().eq("fatura_id", faturaId);
      await supabase.from("movimentacoes_stock").delete().ilike("motivo", `%Fatura #${fatura?.numero_fatura}%`); // Clean up associated movements too? Maybe not, keep for history.
      await supabase.from("movimentos_financeiros").delete().eq("fatura_id", faturaId);
      const { error } = await supabase.from("faturas").delete().eq("id", faturaId);
      if (error) throw error;
      clearFinanceCache();
      res.json({ success: true });
    } catch (error: any) {
      console.error("Erro ao apagar fatura:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.put("/api/admin/faturas/:id", authenticateToken, async (req: any, res) => {
    if (req.user.role !== "admin") return res.sendStatus(403);
    const faturaId = req.params.id;
    const { valor_liquido, valor_iva, valor_total, status_pagamento } = req.body;
    try {
      const { data, error } = await supabase.from("faturas").update({
         valor_liquido,
         valor_iva,
         valor_total,
         valor_pendente: valor_total, // Reset pendente na aprovação
         status_pagamento
      }).eq("id", faturaId).select();
      if (error) throw error;
      clearFinanceCache();
      res.json(data);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/admin/faturas/:id/pagar", authenticateToken, async (req: any, res) => {
    if (req.user.role !== "admin" && req.user.role !== "armazem") return res.sendStatus(403);
    const { valor, data_pagamento, metodo } = req.body;
    try {
      const faturaId = req.params.id;
      const { data: fatura } = await supabase.from("faturas").select("valor_pendente").eq("id", faturaId).single();
      if (!fatura) return res.status(404).json({ error: "Fatura não encontrada" });

      const newPendente = Number(fatura.valor_pendente) - Number(valor);
      const status = newPendente <= 0 ? 'pago' : 'parcial';

      await supabase.from("movimentos_financeiros").insert([{
         fatura_id: faturaId,
         valor: Number(valor),
         data_pagamento,
         metodo,
         created_by: req.user.id
      }]);

      await supabase.from("faturas").update({ valor_pendente: Math.max(0, newPendente), status_pagamento: status }).eq("id", faturaId);

      clearFinanceCache();
      res.json({ message: "Pagamento registado com sucesso" });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

}
