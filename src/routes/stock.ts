import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

export function setupStockRoutes({ app, supabase, authenticateToken, upload, uploadToSupabase, JWT_SECRET, cache }: any) {
  // Manual stock entry (Invoice / Purchase)
  app.post("/api/stock/entrada-manual", authenticateToken, async (req: any, res) => {
    if (req.user.role !== "admin" && req.user.role !== "armazem") return res.sendStatus(403);
    const { fornecedor, numero_fatura, data, data_vencimento, valor_final, items } = req.body;
    if (!Array.isArray(items)) return res.status(400).json({ error: "Formato de itens inválido" });
    
    try {
      let fornecedor_id = null;
      let totalDaFatura = valor_final || 0; // Use frontend value if passed

      // Ensure fornecedor exists or create ad-hoc
      if (fornecedor) {
         // Check if numeric ID or name
         if (fornecedor.length === 36 && fornecedor.includes('-')) {
            fornecedor_id = fornecedor; // UUID directly
         } else {
            const { data: fornData } = await supabase.from('fornecedores').select('id').ilike('nome', fornecedor).maybeSingle();
            if (fornData) {
               fornecedor_id = fornData.id;
            } else {
               const { data: newForn } = await supabase.from('fornecedores').insert([{ nome: fornecedor, tipo: 'mercadoria' }]).select('id').single();
               if (newForn) fornecedor_id = newForn.id;
            }
         }
      }

      // If no valor_final passed, recalculate totals fallback
      if (!totalDaFatura) {
        for (const item of items) {
           const q = Number(item.quantidade) || 0;
           const c = Number(item.custo_unitario) || 0;
           const iva = Number(item.iva) || 0;
           totalDaFatura += (q * c) * (1 + (iva / 100));
        }
      }

      // Create Fatura
      let fatura_id = null;
      try {
         const { data: newFatura, error: fatError } = await supabase.from('faturas').insert([{
           numero_fatura,
           fornecedor_id,
           tipo: 'entrada_stock',
           valor_liquido: req.body.valor_liquido || 0,
           valor_iva: req.body.credito_iva || 0,
           valor_total: totalDaFatura,
           valor_pendente: totalDaFatura,
           status_pagamento: 'em_conferencia',
           data_emissao: data,
           data_vencimento: data_vencimento || null,
           observacoes: req.body.observacoes || null,
           created_by: req.user.id
         }]).select('id').single();
         if (fatError) {
             console.error("Erro ao criar fatura, ignorando colunas ausentes e tentando fallback...", fatError);
             // Fallback caso o script v7_financeiro.sql não tenha sido verificado/corrido:
             const dbb = await supabase.from('faturas').insert([{
               numero_fatura,
               fornecedor_id,
               tipo: 'entrada_stock',
               valor_total: totalDaFatura,
               valor_pendente: totalDaFatura,
               status_pagamento: 'em_conferencia',
               data_emissao: data,
               data_vencimento: data_vencimento || null,
               observacoes: req.body.observacoes || null,
               created_by: req.user.id
             }]).select('id').single();
             if (dbb.data) fatura_id = dbb.data.id;
         } else if (newFatura) {
            fatura_id = newFatura.id;
         }
      } catch (e) {
         console.error("Fatura table missing, silently ignoring invoice logging:", e);
      }

      // Regista apenas os itens da fatura para conferência no Check de Faturas
      // (O stock do armazém e os custos/margens/preços só são atualizados quando o Admin aprovar no Check de Faturas)
      for (const item of items) {
        if (!item.produto_id || !item.quantidade) continue;

        const { data: prodData } = await supabase
          .from("produtos")
          .select("unidade_base, iva")
          .eq("id", item.produto_id)
          .single();

        let iva_percent = 23;
        if (item.iva !== undefined && item.iva !== null) {
          iva_percent = Number(item.iva);
        } else if (prodData && prodData.iva !== undefined && prodData.iva !== null) {
          iva_percent = Number(prodData.iva);
        }

        const c_unitario = Number(item.custo_unitario) || 0;
        const q_item = Number(item.quantidade) || 0;

        if (fatura_id) {
          const vLiquido_item = item.valor_liquido !== undefined ? Number(item.valor_liquido) : q_item * c_unitario;
          const vIva_item = item.valor_iva !== undefined ? Number(item.valor_iva) : vLiquido_item * (iva_percent / 100);
          const vTotal_item = item.valor_total !== undefined ? Number(item.valor_total) : vLiquido_item + vIva_item;

          const baseItem = {
            fatura_id,
            produto_id: item.produto_id,
            quantidade: q_item,
            preco_custo: c_unitario,
            iva: iva_percent,
            valor_liquido: vLiquido_item,
            valor_iva: vIva_item,
            valor_total: vTotal_item,
          };

          // 1. Tenta com todas as colunas reais de fatura_itens (incluindo fator_conversao e unidade_entrada)
          let { error: fError } = await supabase.from("fatura_itens").insert([
            {
              ...baseItem,
              fator_conversao: item.fator_conversao || 1,
              unidade_entrada: item.unidade_entrada || prodData?.unidade_base || "un",
            },
          ]);

          // 2. Fallback preservando valor_liquido, valor_iva, valor_total e preco_custo
          if (fError) {
            const { error: err2 } = await supabase.from("fatura_itens").insert([baseItem]);
            fError = err2;
          }

          // 3. Fallback caso quantidade exija inteiro, mas mantendo valor_liquido / valor_iva / valor_total
          if (fError) {
            const { error: err3 } = await supabase.from("fatura_itens").insert([
              {
                ...baseItem,
                quantidade: Math.round(q_item),
              },
            ]);
            fError = err3;
          }

          // 4. Fallback legado mínimo
          if (fError) {
            console.error("Error creating fatura item with valor_liquido columns, trying legacy fallback:", fError.message || fError);
            const { error: fError4 } = await supabase.from("fatura_itens").insert([
              {
                fatura_id,
                produto_id: item.produto_id,
                quantidade: Math.round(q_item),
                preco_custo: c_unitario,
                iva: iva_percent,
              },
            ]);
            if (fError4) {
              await supabase.from("fatura_itens").insert([
                {
                  fatura_id,
                  produto_id: item.produto_id,
                  quantidade: Math.round(q_item),
                  preco_unitario: c_unitario,
                  iva: iva_percent,
                },
              ]);
            }
          }
        }
      }

      // Invalidate faturas cache to reflect pending conference invoice immediately
      cache.del("admin_stats");
      const fatKeys = cache.keys().filter((k: string) => k.startsWith("admin_faturas"));
      if (fatKeys.length > 0) cache.del(fatKeys);

      res.json({ message: "Fatura enviada para o Check de Faturas com sucesso" });
    } catch (error: any) {
      console.error("Erro ao registar fatura para conferência:", error);
      res.status(500).json({ error: "Erro ao registar fatura", message: error.message });
    }
  });

  // GET Stock Movements History (On-Demand Filtered)
  app.get("/api/admin/stock/movimentacoes", authenticateToken, async (req: any, res: any) => {
    if (req.user.role !== "admin" && req.user.role !== "armazem") return res.sendStatus(403);
    try {
      const rawStart = typeof req.query.startDate === "string" ? req.query.startDate.trim() : "";
      const rawEnd = typeof req.query.endDate === "string" ? req.query.endDate.trim() : "";
      const lojaId = typeof req.query.lojaId === "string" ? req.query.lojaId.trim() : "";
      const produtoId = typeof req.query.produtoId === "string" ? req.query.produtoId.trim() : "";
      const search = typeof req.query.search === "string" ? req.query.search.trim() : "";

      let startIso = rawStart
        ? rawStart.length === 10
          ? `${rawStart}T00:00:00.000Z`
          : rawStart
        : "";
      let endIso = rawEnd
        ? rawEnd.length === 10
          ? `${rawEnd}T23:59:59.999Z`
          : rawEnd
        : "";

      if (startIso && endIso && startIso > endIso) {
        const temp = startIso;
        startIso = endIso;
        endIso = temp;
      }

      const buildBaseMovementsQuery = (innerJoinProduto = false) => {
        const prodRel = innerJoinProduto
          ? "produto:produtos!inner(id, nome, unidade_base)"
          : "produto:produtos(id, nome, unidade_base)";
        let q = supabase
          .from("movimentacoes_stock")
          .select(`*, ${prodRel}`)
          .order("created_at", { ascending: false });

        if (startIso) {
          q = q.gte("created_at", startIso);
        }
        if (endIso) {
          q = q.lte("created_at", endIso);
        }
        if (lojaId && lojaId !== "all") {
          if (lojaId === "armazem") {
            q = q.is("user_target_id", null);
          } else {
            q = q.eq("user_target_id", lojaId);
          }
        }
        return q;
      };

      // Case 1: Specific product selected
      if (produtoId && produtoId !== "all") {
        const { data, error } = await buildBaseMovementsQuery(false)
          .eq("produto_id", produtoId)
          .limit(2000);
        if (error) throw error;
        return res.json(data || []);
      }

      // Case 2: Free-text search (matches product name, barcode_ean, or movement motivo)
      const safeSearch = search.replace(/[,%()]/g, " ").trim();
      if (safeSearch) {
        let { data: matchedProds, error: prodErr } = await supabase
          .from("produtos")
          .select("id")
          .or(`nome.ilike.%${safeSearch}%,barcode_ean.ilike.%${safeSearch}%`)
          .limit(150);

        if (prodErr) {
          const retry = await supabase
            .from("produtos")
            .select("id")
            .ilike("nome", `%${safeSearch}%`)
            .limit(150);
          matchedProds = retry.data;
        }

        const matchedIds = (matchedProds || []).map((p: any) => p.id);

        const queries: Promise<any>[] = [
          buildBaseMovementsQuery(false).ilike("motivo", `%${safeSearch}%`).limit(1000),
        ];

        if (matchedIds.length > 0 && matchedIds.length <= 120) {
          queries.push(
            buildBaseMovementsQuery(false).in("produto_id", matchedIds).limit(1500)
          );
        } else if (matchedIds.length > 120) {
          queries.push(
            buildBaseMovementsQuery(true).ilike("produtos.nome", `%${safeSearch}%`).limit(1500)
          );
        }

        const results = await Promise.all(queries);
        const mergedMap = new Map<string, any>();
        for (const r of results) {
          if (r.error) throw r.error;
          for (const row of r.data || []) {
            mergedMap.set(String(row.id), row);
          }
        }

        const merged = Array.from(mergedMap.values())
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
          .slice(0, 2000);

        return res.json(merged);
      }

      // Case 3: Date / Store filter (or all recent movements)
      const { data, error } = await buildBaseMovementsQuery(false).limit(2000);
      if (error) throw error;
      res.json(data || []);
    } catch (error: any) {
      console.error("Erro ao buscar movimentações:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // POST Manual Stock Movement (Single)
  app.post("/api/admin/stock/movimentacao", authenticateToken, async (req: any, res: any) => {
    if (req.user.role !== "admin" && req.user.role !== "armazem") return res.sendStatus(403);
    const { produto_id, tipo, quantidade, motivo, user_target_id, unidade } = req.body;

    try {
      // 1. Get current stock
      const { data: prod, error: prodErr } = await supabase
        .from("produtos")
        .select("stock_armazem, unidade_base")
        .eq("id", produto_id)
        .single();
      
      if (prodErr || !prod) throw new Error("Produto não encontrado");

      const qty = Number(quantidade);
      const currentStock = Number(prod.stock_armazem) || 0;
      const newStock = tipo === "entrada" ? currentStock + qty : currentStock - qty;

      // 2. Update Product Stock
      const { error: updateErr } = await supabase
        .from("produtos")
        .update({ stock_armazem: newStock })
        .eq("id", produto_id);
      
      if (updateErr) throw updateErr;

      // 3. Register Movement
      const { error: movErr } = await supabase
        .from("movimentacoes_stock")
        .insert([{
          produto_id,
          tipo,
          quantidade: qty,
          motivo,
          user_target_id,
          unidade: unidade || prod.unidade_base,
          user_id: req.user.id
        }]);
      
      if (movErr) throw movErr;

      res.json({ success: true, newStock });
    } catch (error: any) {
      console.error("Erro na movimentação manual:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // GET On-Demand Shortages & Store Demand Search (Faltas)
  app.get("/api/admin/stock/faltas", authenticateToken, async (req: any, res: any) => {
    if (req.user.role !== "admin" && req.user.role !== "armazem") return res.sendStatus(403);

    try {
      const rawQ = String(req.query.q || "").trim();
      const categoriaId = String(req.query.categoria_id || "").trim();
      const mode = String(req.query.mode || "search").trim();

      if (mode !== "rupturas" && !rawQ && (!categoriaId || categoriaId === "all")) {
        return res.json({ items: [], pendingOrdersCount: 0 });
      }

      // 1. Buscar apenas pedidos atualmente abertos (pendente / processando)
      const { data: activeOrders, error: ordErr } = await supabase
        .from("pedidos")
        .select("id, status, created_at, user:users(id, name), pedido_itens(*)")
        .in("status", ["pendente", "processando", "em_processamento"])
        .order("created_at", { ascending: false });

      if (ordErr) throw ordErr;

      const openOrders = activeOrders || [];

      // Se modo = "rupturas", identificar apenas os IDs de produtos pedidos nas encomendas abertas
      const requestedIdsSet = new Set<string>();
      openOrders.forEach((ord: any) => {
        (ord.pedido_itens || []).forEach((it: any) => {
          if (it.produto_id != null) requestedIdsSet.add(String(it.produto_id));
        });
      });

      if (mode === "rupturas" && requestedIdsSet.size === 0) {
        return res.json({ items: [], pendingOrdersCount: openOrders.length });
      }

      // 2. Buscar somente os produtos correspondentes à pesquisa (ou às encomendas pendentes no modo rupturas)
      const selectCols =
        "id, nome, barcode_ean, imagem_url, stock_armazem, unidade_base, fator_conversao_venda, categoria_id, categorias(nome), product_units(unit, factor)";

      const buildProductQuery = (searchByEanToo: boolean) => {
        let pq = supabase.from("produtos").select(selectCols);

        if (mode === "rupturas") {
          pq = pq.in("id", Array.from(requestedIdsSet));
        }

        if (categoriaId && categoriaId !== "all") {
          if (categoriaId === "null") pq = pq.is("categoria_id", null);
          else pq = pq.eq("categoria_id", categoriaId);
        }

        if (rawQ) {
          const safeQ = rawQ.replace(/[,%()]/g, " ").trim();
          if (safeQ) {
            if (searchByEanToo) {
              pq = pq.or(`nome.ilike.%${safeQ}%,barcode_ean.ilike.%${safeQ}%`);
            } else {
              pq = pq.ilike("nome", `%${safeQ}%`);
            }
          }
        }

        return pq.order("nome", { ascending: true }).limit(200);
      };

      let { data: matchedProds, error: prodErr } = await buildProductQuery(true);
      if (prodErr && rawQ) {
        const retry = await buildProductQuery(false);
        matchedProds = retry.data;
        prodErr = retry.error;
      }
      if (prodErr) throw prodErr;

      const productsList = matchedProds || [];
      if (productsList.length === 0) {
        return res.json({ items: [], pendingOrdersCount: openOrders.length });
      }

      const prodMap = new Map<string, any>();
      productsList.forEach((p: any) => prodMap.set(String(p.id), p));

      // 3. Agregar quantidades pedidas apenas para os produtos encontrados
      const productStats: Record<string, { totalRequested: number; orders: any[] }> = {};

      openOrders.forEach((order: any) => {
        const storeName = order.user?.name || "Loja";
        const itemsArr = Array.isArray(order.pedido_itens) ? order.pedido_itens : [];

        itemsArr.forEach((item: any) => {
          const pid = String(item.produto_id);
          const prod = prodMap.get(pid);
          if (!prod) return;

          const qty = Number(item.quantidade_pedida != null ? item.quantidade_pedida : item.quantidade) || 0;
          if (qty <= 0) return;

          let factor = 1;
          const itemUnit = item.unidade || prod.unidade_base || "un";
          if (itemUnit !== prod.unidade_base) {
            const unitObj = (prod.product_units || []).find((u: any) => u.unit === itemUnit);
            if (unitObj) {
              factor = Number(unitObj.factor) || 1;
            } else if (itemUnit === "cx") {
              factor = Number(prod.fator_conversao_venda) || 1;
            } else {
              const aproxMatch = (prod.nome || "").match(/aprox\.?\s*([\d,.]+)\s*(kg|g)/i);
              if (aproxMatch) {
                const aproxValue = parseFloat(aproxMatch[1].replace(",", "."));
                const aproxUnit = aproxMatch[2].toLowerCase();
                const baseUnit = (prod.unidade_base || "").toLowerCase();
                if (baseUnit === "kg") {
                  if (aproxUnit === "g") factor = aproxValue / 1000;
                  else if (aproxUnit === "kg") factor = aproxValue;
                } else if (baseUnit === "g") {
                  if (aproxUnit === "g") factor = aproxValue;
                  else if (aproxUnit === "kg") factor = aproxValue * 1000;
                }
              }
            }
          }

          const baseQty = qty * factor;
          if (!productStats[pid]) {
            productStats[pid] = { totalRequested: 0, orders: [] };
          }
          productStats[pid].totalRequested += baseQty;
          productStats[pid].orders.push({
            orderId: String(order.id),
            status: order.status,
            storeName,
            requestedQty: baseQty,
            displayQty: qty,
            originalUnit: itemUnit,
            date: order.created_at,
          });
        });
      });

      let resultItems = productsList.map((p: any) => {
        const pid = String(p.id);
        const stock = Number(p.stock_armazem) || 0;
        const stats = productStats[pid] || { totalRequested: 0, orders: [] };
        const requested = stats.totalRequested;
        const diff = stock - requested;
        const needsAttention = requested > 0 && diff < 0;

        let aproxSuggestion: string | null = null;
        if (needsAttention) {
          const targetStr = `${p.nome || ""} ${p.unidade_base || ""}`;
          const aproxMatch = targetStr.match(/aprox\.?\s*([\d,.]+)\s*(kg|g)/i);
          if (aproxMatch) {
            const aproxValue = parseFloat(aproxMatch[1].replace(",", "."));
            const unit = aproxMatch[2].toLowerCase();
            const baseUnit = (p.unidade_base || "").toLowerCase();
            let aproxFactor = 0;
            if (baseUnit === "kg") {
              if (unit === "g") aproxFactor = aproxValue / 1000;
              else if (unit === "kg") aproxFactor = aproxValue;
            } else if (baseUnit === "g") {
              if (unit === "g") aproxFactor = aproxValue;
              else if (unit === "kg") aproxFactor = aproxValue * 1000;
            }
            if (aproxFactor > 0) {
              const unitsNeeded = Math.ceil(Math.abs(diff) / aproxFactor);
              aproxSuggestion = `Sugestão: pedir ~${unitsNeeded} un`;
            }
          }
        }

        return {
          id: p.id,
          nome: p.nome,
          barcode_ean: p.barcode_ean || null,
          imagem_url: p.imagem_url || null,
          categoria_id: p.categoria_id,
          categoria_nome: p.categorias?.nome || "Sem Categoria",
          unidade_base: p.unidade_base || "un",
          stock_armazem: stock,
          requested,
          diff,
          needsAttention,
          aproxSuggestion,
          orders: stats.orders,
        };
      });

      if (mode === "rupturas") {
        resultItems = resultItems.filter((it: any) => it.needsAttention);
      }

      res.json({
        items: resultItems,
        pendingOrdersCount: openOrders.length,
      });
    } catch (error: any) {
      console.error("Erro em GET /api/admin/stock/faltas:", error);
      res.status(500).json({ error: error.message || "Erro ao consultar faltas" });
    }
  });

  // GET Stock Report (current stock or historical stock reconstructed at end of target date)
  app.get("/api/admin/reports/estoque", authenticateToken, async (req: any, res: any) => {
    if (req.user.role !== "admin" && req.user.role !== "armazem") return res.sendStatus(403);

    try {
      const dateParam = String(req.query.date || "").trim();
      const todayIso = new Date().toISOString().split("T")[0];

      const { data: prods, error: prodErr } = await supabase
        .from("produtos")
        .select("id, nome, stock_armazem, unidade_base, categoria_id, created_at, categorias(nome)");

      if (prodErr) throw prodErr;

      const deltaAfterDate = new Map<string, number>();

      if (/^\d{4}-\d{2}-\d{2}$/.test(dateParam) && dateParam < todayIso) {
        const cutoffIso = `${dateParam}T23:59:59.999Z`;
        const pageSize = 1000;
        let offset = 0;

        while (true) {
          const { data: movs, error: movErr } = await supabase
            .from("movimentacoes_stock")
            .select("id, produto_id, tipo, quantidade")
            .gt("created_at", cutoffIso)
            .order("id", { ascending: true })
            .range(offset, offset + pageSize - 1);

          if (movErr) throw movErr;
          if (!movs || movs.length === 0) break;

          for (const m of movs) {
            if (m.produto_id == null) continue;
            const pid = String(m.produto_id);
            const qty = Number(m.quantidade || 0);
            const signed = m.tipo === "entrada" ? qty : -qty;
            deltaAfterDate.set(pid, (deltaAfterDate.get(pid) || 0) + signed);
          }

          if (movs.length < pageSize) break;
          offset += pageSize;
        }
      }

      const result = (prods || []).map((p: any) => {
        const pid = String(p.id);
        const currentStock = Number(p.stock_armazem || 0);
        const netAfter = deltaAfterDate.get(pid) || 0;
        const stockAtDate = Math.round((currentStock - netAfter) * 1000) / 1000;

        return {
          id: p.id,
          nome: p.nome || "Artigo sem nome",
          categoria_id: p.categoria_id != null ? String(p.categoria_id) : "sem_categoria",
          categoria_nome: p.categorias?.nome || "Sem Categoria",
          unidade_base: p.unidade_base || "un",
          quantidade_atual: stockAtDate,
        };
      });

      res.json(result);
    } catch (error: any) {
      console.error("Erro em GET /api/admin/reports/estoque:", error);
      res.status(500).json({ error: error.message || "Erro ao gerar relatório de estoque" });
    }
  });

}
