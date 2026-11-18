import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

export function setupFinanceRoutes({ app, supabase, authenticateToken, upload, uploadToSupabase, JWT_SECRET, cache }: any) {
  // Migração automática e idempotente: move todas as faturas legadas (tipo = 'compra') para a área de Faturas (tipo = 'entrada_stock')
  (async () => {
    try {
      const { data, error } = await supabase
        .from("faturas")
        .update({ tipo: "entrada_stock" })
        .eq("tipo", "compra")
        .select("id");
      if (!error && data && data.length > 0) {
        console.log(`[Migration] ${data.length} faturas migradas do Financeiro ('compra') para Faturas ('entrada_stock').`);
        const fatKeys = cache.keys().filter((k: string) => k.startsWith("admin_faturas"));
        if (fatKeys.length > 0) cache.del(fatKeys);
        cache.del("admin_stats");
      }
    } catch (e) {
      console.warn("[Migration] Aviso ao migrar faturas:", e);
    }
  })();

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
    const keys = cache.keys();
    const finPedidosKeys = keys.filter((k: string) => k.startsWith("admin_financial_pedidos") || k.startsWith("admin_faturas"));
    if (finPedidosKeys.length > 0) cache.del(finPedidosKeys);
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
      const period = typeof req.query.period === "string" ? req.query.period : "todos";
      const cacheKey = period && period !== "todos" ? `admin_faturas_${period}` : "admin_faturas";
      const cached = cache.get(cacheKey);
      if (cached) return res.json(cached);

      let query = supabase
        .from("faturas")
        .select("*, fornecedor:fornecedores(id, nome, iban, contribuinte, tipo), fatura_itens(*, produto:produtos(id, nome, unidade_base, iva, preco_custo, preco)), user:created_by(id, name, email), movimentos_financeiros(*)");

      if (period === "mes") {
        const now = new Date();
        const startOfMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
        query = query.gte("data_emissao", startOfMonth);
      } else if (period === "ano") {
        const now = new Date();
        const startOfYear = `${now.getFullYear()}-01-01`;
        query = query.gte("data_emissao", startOfYear);
      }

      const { data, error } = await query.order("data_emissao", { ascending: false });
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
      cache.set(cacheKey, mapped, 60);
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
      cache.del("admin_fornecedores");
      res.json(isArray ? data : data[0]);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/admin/faturas/compras", authenticateToken, async (req: any, res) => {
    if (req.user.role !== "admin") return res.sendStatus(403);

    try {
      const isArray = Array.isArray(req.body);
      const items = isArray ? req.body : [req.body];

      let createdFornecedorId: any = null;
      let createdFornecedorName: string | null = null;

      const dataToInsert: any[] = [];

      for (const item of items) {
        let finalFornecedorId = item.fornecedor_id || null;

        if (!finalFornecedorId && item.novo_fornecedor_nome) {
          const cleanName = String(item.novo_fornecedor_nome).trim();
          if (createdFornecedorName === cleanName && createdFornecedorId) {
            finalFornecedorId = createdFornecedorId;
          } else {
            const { data: existingForn } = await supabase
              .from("fornecedores")
              .select("id")
              .ilike("nome", cleanName)
              .maybeSingle();

            if (existingForn?.id) {
              finalFornecedorId = existingForn.id;
            } else {
              let fornRes = await supabase
                .from("fornecedores")
                .insert([{ nome: cleanName, tipo: "mercadoria" }])
                .select("id")
                .single();

              if (fornRes.error) {
                fornRes = await supabase
                  .from("fornecedores")
                  .insert([{ nome: cleanName }])
                  .select("id")
                  .single();
              }
              if (fornRes.error) throw fornRes.error;
              finalFornecedorId = fornRes.data.id;
            }
            createdFornecedorId = finalFornecedorId;
            createdFornecedorName = cleanName;
          }
        }

        const valorTotal = Number(item.valor_total) || 0;
        const valorIva = Number(item.valor_iva) || 0;
        const valorLiquido =
          item.valor_liquido !== undefined && item.valor_liquido !== null
            ? Number(item.valor_liquido)
            : Math.max(0, valorTotal - valorIva);

        const isAlreadyPaid = item.forma_pagamento === "pago";

        const descObj: Record<string, any> = {};
        if (item.empresa) descObj.empresa = String(item.empresa).trim();
        if (item.loja_id) descObj.loja_id = item.loja_id;
        if (item.centro_custo) descObj.centro_custo = item.centro_custo;
        if (item.conta_analise) descObj.conta_analise = item.conta_analise;
        if (item.classificacao_tipo) descObj.classificacao_tipo = item.classificacao_tipo;
        if (item.classificacao_nome) descObj.classificacao_nome = item.classificacao_nome;
        if (item.forma_pagamento) descObj.forma_pagamento = item.forma_pagamento;
        const descricaoJson = Object.keys(descObj).length > 0 ? JSON.stringify(descObj) : null;

        dataToInsert.push({
          fornecedor_id: finalFornecedorId,
          numero_fatura: item.numero_fatura,
          data_emissao: item.data_fatura,
          data_vencimento: item.data_vencimento || null,
          valor_liquido: valorLiquido,
          valor_iva: valorIva,
          valor_total: valorTotal,
          valor_pendente: isAlreadyPaid ? 0 : valorTotal,
          status_pagamento: isAlreadyPaid ? "pago" : "pendente",
          tipo: "compra_financeiro",
          observacoes: item.observacoes || null,
          descrição: descricaoJson,
          created_by: req.user.id,
        });
      }

      let insertResult = await supabase.from("faturas").insert(dataToInsert).select();

      if (insertResult.error) {
        const fallbackRows = dataToInsert.map((row) => ({
          fornecedor_id: row.fornecedor_id,
          numero_fatura: row.numero_fatura,
          data_emissao: row.data_emissao,
          data_vencimento: row.data_vencimento,
          valor_total: row.valor_total,
          valor_pendente: row.valor_pendente,
          status_pagamento: row.status_pagamento,
          tipo: "compra_financeiro",
          descrição: row.descrição,
          created_by: row.created_by,
        }));
        insertResult = await supabase.from("faturas").insert(fallbackRows).select();
      }

      if (insertResult.error) throw insertResult.error;

      // Se foi lançada já como "pago", regista também o movimento financeiro correspondente
      const insertedRows = insertResult.data || [];
      for (const createdFat of insertedRows) {
        if (createdFat?.status_pagamento === "pago" && Number(createdFat?.valor_total) > 0) {
          try {
            await supabase.from("movimentos_financeiros").insert([
              {
                fatura_id: createdFat.id,
                valor: Number(createdFat.valor_total),
                data_pagamento: createdFat.data_emissao || new Date().toISOString().split("T")[0],
                metodo: "pago",
                created_by: req.user.id,
              },
            ]);
          } catch {}
        }
      }

      // Se alguma empresa ou conta de análise foi informada, garante que fica salva na lista personalizada
      for (const item of items) {
        const emp = String(item?.empresa || "").trim();
        if (emp) {
          await addEmpresaToStorage(emp).catch(() => {});
        }
        const ca = String(item?.conta_analise || "").trim();
        if (ca) {
          await addContaAnaliseToStorage(ca).catch(() => {});
        }
      }

      clearFinanceCache();
      cache.del("admin_fornecedores");
      res.json(isArray ? insertResult.data : insertResult.data?.[0]);
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

  const activeCheckoutIds = new Set<string>();
  let isBulkApproveInProgress = false;

  app.put("/api/admin/faturas/bulk-approve-conference", authenticateToken, async (req: any, res) => {
    if (req.user.role !== "admin") return res.sendStatus(403);
    if (isBulkApproveInProgress || activeCheckoutIds.size > 0) {
      return res.status(409).json({ error: "Já existe uma conferência em processamento. Aguarde um instante." });
    }
    isBulkApproveInProgress = true;
    try {
      const { data: pendingList, error: fetchErr } = await supabase
        .from("faturas")
        .select("id, numero_fatura, status_pagamento, created_at, fatura_itens(*)")
        .eq("status_pagamento", "em_conferencia");

      if (fetchErr) throw fetchErr;

      const list = pendingList || [];
      for (const fat of list) {
        let stockAlreadyApplied = false;
        const { data: refMovs } = await supabase
          .from("movimentacoes_stock")
          .select("id")
          .ilike("motivo", `%[ref:${fat.id}]%`)
          .limit(1);
        if (refMovs && refMovs.length > 0) {
          stockAlreadyApplied = true;
        } else if (fat.numero_fatura && fat.created_at) {
          const minLegacyTime = new Date(new Date(fat.created_at).getTime() - 60000).toISOString();
          const { data: legacyMovs } = await supabase
            .from("movimentacoes_stock")
            .select("id")
            .ilike("motivo", `Fatura #${fat.numero_fatura} orig:%`)
            .gte("created_at", minLegacyTime)
            .limit(1);
          if (legacyMovs && legacyMovs.length > 0) {
            stockAlreadyApplied = true;
          }
        }

        if (!stockAlreadyApplied && Array.isArray(fat.fatura_itens)) {
          for (const item of fat.fatura_itens) {
            if (!item.produto_id) continue;
            const { data: prod } = await supabase
              .from("produtos")
              .select("preco_custo, preco, iva, stock_armazem, unidade_base")
              .eq("id", item.produto_id)
              .single();

            if (!prod) continue;

            const factor = Number(item.fator_conversao) || 1;
            const qtyBase = (Number(item.quantidade) || 0) * factor;
            const rawUnitCost =
              item.preco_custo !== undefined && item.preco_custo !== null
                ? Number(item.preco_custo)
                : Number(item.preco_unitario) || 0;
            const newCusto = rawUnitCost / factor;
            const newIva =
              item.iva !== null && item.iva !== undefined
                ? Number(item.iva)
                : Number(prod.iva || 0);

            const updateProdData: any = {
              iva: newIva,
            };

            if (qtyBase > 0) {
              updateProdData.stock_armazem = Math.max(0, (Number(prod.stock_armazem) || 0) + qtyBase);

              await supabase.from("movimentacoes_stock").insert([
                {
                  produto_id: item.produto_id,
                  tipo: "entrada",
                  quantidade: qtyBase,
                  display_qty: Number(item.quantidade) || 0,
                  display_unit: item.unidade_entrada || prod.unidade_base || "un",
                  unidade: prod.unidade_base || "un",
                  motivo: `Fatura #${fat.numero_fatura} aprovada no Check de Faturas [ref:${fat.id}]`,
                  user_id: req.user.id,
                },
              ]);
            }

            if (newCusto > 0) {
              const oldCusto = Number(prod.preco_custo) || 0;
              const currentPreco = Number(prod.preco) || 0;
              if (oldCusto > 0 && currentPreco > 0) {
                const oldIvaRatio = 1 + Number(prod.iva || 0) / 100;
                const pvpSemIva = currentPreco / oldIvaRatio;
                const oldMargemPct = (pvpSemIva - oldCusto) / oldCusto;
                const newPvpSemIva = newCusto * (1 + oldMargemPct);
                const newIvaRatio = 1 + newIva / 100;
                const newPvp = newPvpSemIva * newIvaRatio;
                updateProdData.preco = Number(newPvp.toFixed(2));
              }
              updateProdData.preco_custo = Number(newCusto.toFixed(4));
            }

            await supabase.from("produtos").update(updateProdData).eq("id", item.produto_id);
          }
        }
      }

      const { data, error } = await supabase
        .from("faturas")
        .update({ status_pagamento: "pendente", tipo: "entrada_stock" })
        .eq("status_pagamento", "em_conferencia")
        .select();

      if (error) throw error;

      clearFinanceCache();
      res.json({ success: true, count: data?.length || 0 });
    } catch (error: any) {
      console.error("Erro no bulk approve faturas:", error);
      res.status(500).json({ error: error.message || "Erro ao aprovar faturas em massa" });
    } finally {
      isBulkApproveInProgress = false;
    }
  });

  app.put("/api/admin/faturas/:id/checkout", authenticateToken, async (req: any, res) => {
    if (req.user.role !== "admin") return res.sendStatus(403);
    const faturaId = String(req.params.id);
    if (isBulkApproveInProgress || activeCheckoutIds.has(faturaId)) {
      return res.status(409).json({ error: "Esta fatura já está a ser processada. Aguarde um instante." });
    }
    activeCheckoutIds.add(faturaId);
    const { numero_fatura, data_emissao, data_vencimento, fornecedor_id, valor_liquido, valor_iva, valor_total, itens, observacoes } = req.body;

    try {
      // 0. Verificar o estado atual da fatura para saber se o stock já havia sido aplicado anteriormente
      const { data: currentFatura, error: fatFetchErr } = await supabase
        .from("faturas")
        .select("id, numero_fatura, status_pagamento, created_at")
        .eq("id", faturaId)
        .single();

      if (fatFetchErr || !currentFatura) {
        return res.status(404).json({ error: "Fatura não encontrada" });
      }

      let stockAlreadyApplied = currentFatura.status_pagamento !== "em_conferencia";
      if (!stockAlreadyApplied) {
        const { data: refMovs } = await supabase
          .from("movimentacoes_stock")
          .select("id")
          .ilike("motivo", `%[ref:${faturaId}]%`)
          .limit(1);
        if (refMovs && refMovs.length > 0) {
          stockAlreadyApplied = true;
        } else if (currentFatura.numero_fatura && currentFatura.created_at) {
          const minLegacyTime = new Date(new Date(currentFatura.created_at).getTime() - 60000).toISOString();
          const { data: existingMovs } = await supabase
            .from("movimentacoes_stock")
            .select("id")
            .ilike("motivo", `Fatura #${currentFatura.numero_fatura} orig:%`)
            .gte("created_at", minLegacyTime)
            .limit(1);
          if (existingMovs && existingMovs.length > 0) {
            stockAlreadyApplied = true;
          }
        }
      }

      const { data: existingItems } = await supabase
        .from("fatura_itens")
        .select("id, produto_id, quantidade, fator_conversao, unidade_entrada")
        .eq("fatura_id", faturaId);

      const oldItemsMap = new Map((existingItems || []).map((it: any) => [String(it.id), it]));

      // 1. Atualizar cabeçalho da Fatura (marca como aprovada/conferida)
      const updatePayload: any = {
        numero_fatura,
        data_emissao,
        data_vencimento,
        fornecedor_id: fornecedor_id || null,
        valor_liquido,
        valor_iva,
        valor_total,
        valor_pendente: valor_total,
        observacoes: observacoes || null,
        tipo: "entrada_stock",
        status_pagamento: "pendente",
      };

      const { error: headerError } = await supabase.from("faturas").update(updatePayload).eq("id", faturaId);
      if (headerError) throw headerError;

      // 2. Processar Itens (Atualizar/Inserir itens e aplicar entrada de stock + margem/preço)
      const processedItemIds = new Set<string>();
      if (itens && Array.isArray(itens)) {
        for (const item of itens) {
          const oldItem = item.id ? (oldItemsMap.get(String(item.id)) as any) : null;
          const resolvedProdutoId = item.produto_id || oldItem?.produto_id || null;
          const factor = Number(item.fator_conversao) || Number(oldItem?.fator_conversao) || 1;
          const unitEntrada = item.unidade_entrada || oldItem?.unidade_entrada || "un";
          const qtyNum = Number(item.quantidade) || 0;
          const unitPriceNum = Number(item.preco_unitario) || 0;

          const itemPayload: any = {
            fatura_id: faturaId,
            produto_id: resolvedProdutoId,
            quantidade: qtyNum,
            iva: item.iva,
            valor_liquido: item.valor_liquido,
            valor_iva: item.valor_iva,
            valor_total: item.valor_total,
            preco_custo: unitPriceNum,
            fator_conversao: factor,
            unidade_entrada: unitEntrada,
          };

          let qtyToApplyBase = 0;

          if (item.id) {
            processedItemIds.add(String(item.id));
            if (stockAlreadyApplied && oldItem) {
              const oldQtyBase = (Number(oldItem.quantidade) || 0) * (Number(oldItem.fator_conversao) || 1);
              const newQtyBase = qtyNum * factor;
              qtyToApplyBase = newQtyBase - oldQtyBase;
            } else {
              qtyToApplyBase = qtyNum * factor;
            }

            const { error: updErr } = await supabase.from("fatura_itens").update(itemPayload).eq("id", item.id);
            if (updErr) {
              const fallbackPayload = {
                quantidade: Math.round(qtyNum),
                iva: item.iva,
                preco_custo: unitPriceNum,
                valor_liquido: item.valor_liquido,
                valor_iva: item.valor_iva,
                valor_total: item.valor_total,
              };
              await supabase.from("fatura_itens").update(fallbackPayload).eq("id", item.id);
            }
          } else {
            let insertRes = await supabase.from("fatura_itens").insert([itemPayload]).select("id").single();
            if (insertRes.error) {
              insertRes = await supabase
                .from("fatura_itens")
                .insert([
                  {
                    fatura_id: faturaId,
                    produto_id: resolvedProdutoId,
                    quantidade: Math.round(qtyNum),
                    preco_custo: unitPriceNum,
                    iva: item.iva,
                    valor_liquido: item.valor_liquido,
                    valor_iva: item.valor_iva,
                    valor_total: item.valor_total,
                  },
                ])
                .select("id")
                .single();
            }
            qtyToApplyBase = qtyNum * factor;
            if (insertRes.data) processedItemIds.add(String(insertRes.data.id));
          }

          // 3. Atualizar Stock do Armazém e Margens/Preços (APENAS na aprovação do Admin)
          if (resolvedProdutoId) {
            const { data: prod } = await supabase
              .from("produtos")
              .select("preco_custo, preco, iva, stock_armazem, unidade_base")
              .eq("id", resolvedProdutoId)
              .single();

            if (prod) {
              const newIva =
                item.iva !== null && item.iva !== undefined
                  ? Number(item.iva)
                  : Number(prod.iva || 0);
              const updateProdData: any = {
                iva: newIva,
              };

              if (qtyToApplyBase !== 0) {
                updateProdData.stock_armazem = Math.max(0, (Number(prod.stock_armazem) || 0) + qtyToApplyBase);

                const displayDiff = stockAlreadyApplied && oldItem
                  ? Math.abs(qtyNum - (Number(oldItem.quantidade) || 0))
                  : qtyNum;

                await supabase.from("movimentacoes_stock").insert([
                  {
                    produto_id: resolvedProdutoId,
                    tipo: qtyToApplyBase > 0 ? "entrada" : "saida",
                    quantidade: Math.abs(qtyToApplyBase),
                    display_qty: displayDiff,
                    display_unit: unitEntrada || prod.unidade_base || "un",
                    unidade: prod.unidade_base || "un",
                    motivo: stockAlreadyApplied
                      ? `AJUSTE CONFERÊNCIA: Fatura #${numero_fatura} corrigida [ref:${faturaId}]`
                      : `Fatura #${numero_fatura} aprovada no Check de Faturas [ref:${faturaId}]`,
                    user_id: req.user.id,
                  },
                ]);
              }

              // Atualizar Custo Base e PVP preservando a margem em Margens / Preços
              const newCusto = unitPriceNum / factor;
              if (newCusto > 0) {
                const oldCusto = Number(prod.preco_custo) || 0;
                const currentPreco = Number(prod.preco) || 0;

                if (oldCusto > 0 && currentPreco > 0) {
                  const oldIvaRatio = 1 + Number(prod.iva || 0) / 100;
                  const pvpSemIva = currentPreco / oldIvaRatio;
                  const oldMargemPct = (pvpSemIva - oldCusto) / oldCusto;
                  const newPvpSemIva = newCusto * (1 + oldMargemPct);
                  const newIvaRatio = 1 + newIva / 100;
                  const newPvp = newPvpSemIva * newIvaRatio;
                  updateProdData.preco = Number(newPvp.toFixed(2));
                }

                updateProdData.preco_custo = Number(newCusto.toFixed(4));
              }

              await supabase.from("produtos").update(updateProdData).eq("id", resolvedProdutoId);
            }
          }
        }
      }

      // 4. Tratar Itens Removidos na Conferência
      for (const [rawId, rawOldItem] of oldItemsMap.entries()) {
        const id = String(rawId);
        const oldItem = rawOldItem as any;
        if (!processedItemIds.has(id)) {
          if (stockAlreadyApplied) {
            const qtyToRevertBase = (Number(oldItem.quantidade) || 0) * (Number(oldItem.fator_conversao) || 1);
            if (oldItem.produto_id && qtyToRevertBase > 0) {
              const { data: prod } = await supabase
                .from("produtos")
                .select("stock_armazem, unidade_base")
                .eq("id", oldItem.produto_id)
                .single();
              if (prod) {
                await supabase
                  .from("produtos")
                  .update({
                    stock_armazem: Math.max(0, (Number(prod.stock_armazem) || 0) - qtyToRevertBase),
                  })
                  .eq("id", oldItem.produto_id);

                await supabase.from("movimentacoes_stock").insert([
                  {
                    produto_id: oldItem.produto_id,
                    tipo: "saida",
                    quantidade: qtyToRevertBase,
                    display_qty: oldItem.quantidade,
                    display_unit: oldItem.unidade_entrada || "un",
                    unidade: prod.unidade_base || "un",
                    motivo: `REMOÇÃO CONFERÊNCIA: Item removido da Fatura #${numero_fatura} [ref:${faturaId}]`,
                    user_id: req.user.id,
                  },
                ]);
              }
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
    } finally {
      activeCheckoutIds.delete(faturaId);
    }
  });

  app.delete("/api/admin/faturas/:id", authenticateToken, async (req: any, res) => {
    if (req.user.role !== "admin") return res.sendStatus(403);
    const faturaId = req.params.id;
    try {
      // 1. Fetch invoice to check type, conference status, and items
      const { data: fatura } = await supabase
        .from("faturas")
        .select("id, tipo, numero_fatura, status_pagamento, created_at, fatura_itens(*, produto:produtos(id, stock_armazem, unidade_base))")
        .eq("id", faturaId)
        .single();

      if (fatura && (fatura.tipo === "compra" || fatura.tipo === "entrada_stock")) {
        let shouldRevertStock = fatura.status_pagamento !== "em_conferencia";
        if (!shouldRevertStock) {
          const { data: refMovs } = await supabase
            .from("movimentacoes_stock")
            .select("id")
            .ilike("motivo", `%[ref:${faturaId}]%`)
            .limit(1);
          if (refMovs && refMovs.length > 0) {
            shouldRevertStock = true;
          } else if (fatura.numero_fatura && fatura.created_at) {
            const minLegacyTime = new Date(new Date(fatura.created_at).getTime() - 60000).toISOString();
            const { data: legacyMovs } = await supabase
              .from("movimentacoes_stock")
              .select("id")
              .ilike("motivo", `Fatura #${fatura.numero_fatura} orig:%`)
              .gte("created_at", minLegacyTime)
              .limit(1);
            if (legacyMovs && legacyMovs.length > 0) {
              shouldRevertStock = true;
            }
          }
        }

        if (shouldRevertStock) {
          const items = fatura.fatura_itens || [];
          for (const item of items) {
            const prodId = item.produto_id;
            const qtyEntrada = Number(item.quantidade);
            if (!prodId || qtyEntrada <= 0) continue;

            const factor = Number(item.fator_conversao) || 1;
            const qtyBase = qtyEntrada * factor;

            const { data: latestProd } = await supabase
              .from("produtos")
              .select("stock_armazem")
              .eq("id", prodId)
              .single();
            const currentStock = latestProd
              ? Number(latestProd.stock_armazem)
              : Number(item.produto?.stock_armazem) || 0;

            await supabase
              .from("produtos")
              .update({ stock_armazem: Math.max(0, currentStock - qtyBase) })
              .eq("id", prodId);

            await supabase.from("movimentacoes_stock").insert([
              {
                produto_id: prodId,
                tipo: "saida",
                quantidade: qtyBase,
                display_qty: qtyEntrada,
                display_unit: item.unidade_entrada || "un",
                unidade: item.produto?.unidade_base || "un",
                motivo: `ELIMINAÇÃO: Stock removido após apagar Fatura #${fatura.numero_fatura || faturaId}`,
                user_id: req.user.id,
              },
            ]);
          }
        }
      }

      await supabase.from("fatura_itens").delete().eq("fatura_id", faturaId);
      await supabase.from("movimentacoes_stock").delete().ilike("motivo", `%[ref:${faturaId}]%`);
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

  const CONTAS_STORAGE_PATH = "config/contas_analise.json";

  async function readContasAnaliseFromStorage(): Promise<string[]> {
    const cached = cache.get("admin_contas_analise");
    if (Array.isArray(cached)) return cached;
    try {
      const { data, error } = await supabase.storage.from("uploads").download(CONTAS_STORAGE_PATH);
      if (error || !data) {
        cache.set("admin_contas_analise", [], 300);
        return [];
      }
      const text = await data.text();
      const parsed = JSON.parse(text);
      const list = Array.isArray(parsed)
        ? parsed.map((x: any) => String(x || "").trim()).filter(Boolean)
        : [];
      cache.set("admin_contas_analise", list, 300);
      return list;
    } catch {
      return [];
    }
  }

  async function writeContasAnaliseToStorage(list: string[]): Promise<string[]> {
    const unique: string[] = [];
    const seen = new Set<string>();
    for (const item of list) {
      const clean = String(item || "").trim();
      if (!clean) continue;
      const key = clean.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(clean);
      }
    }
    unique.sort((a, b) => a.localeCompare(b, "pt-PT"));
    await supabase.storage
      .from("uploads")
      .upload(CONTAS_STORAGE_PATH, Buffer.from(JSON.stringify(unique, null, 2), "utf8"), {
        contentType: "application/json",
        upsert: true,
      });
    cache.set("admin_contas_analise", unique, 300);
    return unique;
  }

  async function addContaAnaliseToStorage(nome: string): Promise<string[]> {
    const clean = String(nome || "").trim();
    if (!clean) return readContasAnaliseFromStorage();
    const current = await readContasAnaliseFromStorage();
    if (current.some((c) => c.toLowerCase() === clean.toLowerCase())) {
      return current;
    }
    return writeContasAnaliseToStorage([...current, clean]);
  }

  app.get("/api/admin/financeiro/contas-analise", authenticateToken, async (req: any, res) => {
    if (req.user.role !== "admin" && req.user.role !== "armazem") return res.sendStatus(403);
    try {
      const list = await readContasAnaliseFromStorage();
      res.json(list);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/admin/financeiro/contas-analise", authenticateToken, async (req: any, res) => {
    if (req.user.role !== "admin") return res.sendStatus(403);
    try {
      const nome = String(req.body?.nome || "").trim();
      if (!nome) return res.status(400).json({ error: "Informe o nome da Conta de Análise" });
      const updated = await addContaAnaliseToStorage(nome);
      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/admin/financeiro/contas-analise", authenticateToken, async (req: any, res) => {
    if (req.user.role !== "admin") return res.sendStatus(403);
    try {
      const nome = String(req.body?.nome || req.query?.nome || "").trim();
      const current = await readContasAnaliseFromStorage();
      const filtered = current.filter((c) => c.toLowerCase() !== nome.toLowerCase());
      const updated = await writeContasAnaliseToStorage(filtered);
      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  const EMPRESAS_STORAGE_PATH = "config/empresas_financeiro.json";

  async function readEmpresasFromStorage(): Promise<string[]> {
    const cached = cache.get("admin_empresas_financeiro");
    if (Array.isArray(cached)) return cached;
    try {
      const { data, error } = await supabase.storage.from("uploads").download(EMPRESAS_STORAGE_PATH);
      if (error || !data) {
        cache.set("admin_empresas_financeiro", [], 300);
        return [];
      }
      const text = await data.text();
      const parsed = JSON.parse(text);
      const list = Array.isArray(parsed)
        ? parsed.map((x: any) => String(x || "").trim()).filter(Boolean)
        : [];
      cache.set("admin_empresas_financeiro", list, 300);
      return list;
    } catch {
      return [];
    }
  }

  async function writeEmpresasToStorage(list: string[]): Promise<string[]> {
    const unique: string[] = [];
    const seen = new Set<string>();
    for (const item of list) {
      const clean = String(item || "").trim();
      if (!clean) continue;
      const key = clean.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(clean);
      }
    }
    unique.sort((a, b) => a.localeCompare(b, "pt-PT"));
    await supabase.storage
      .from("uploads")
      .upload(EMPRESAS_STORAGE_PATH, Buffer.from(JSON.stringify(unique, null, 2), "utf8"), {
        contentType: "application/json",
        upsert: true,
      });
    cache.set("admin_empresas_financeiro", unique, 300);
    return unique;
  }

  async function addEmpresaToStorage(nome: string): Promise<string[]> {
    const clean = String(nome || "").trim();
    if (!clean) return readEmpresasFromStorage();
    const current = await readEmpresasFromStorage();
    if (current.some((c) => c.toLowerCase() === clean.toLowerCase())) {
      return current;
    }
    return writeEmpresasToStorage([...current, clean]);
  }

  app.get("/api/admin/financeiro/empresas", authenticateToken, async (req: any, res) => {
    if (req.user.role !== "admin" && req.user.role !== "armazem") return res.sendStatus(403);
    try {
      const list = await readEmpresasFromStorage();
      res.json(list);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/admin/financeiro/empresas", authenticateToken, async (req: any, res) => {
    if (req.user.role !== "admin") return res.sendStatus(403);
    try {
      const nome = String(req.body?.nome || "").trim();
      if (!nome) return res.status(400).json({ error: "Informe o nome da Empresa" });
      const updated = await addEmpresaToStorage(nome);
      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/admin/financeiro/empresas", authenticateToken, async (req: any, res) => {
    if (req.user.role !== "admin") return res.sendStatus(403);
    try {
      const nome = String(req.body?.nome || req.query?.nome || "").trim();
      const current = await readEmpresasFromStorage();
      const filtered = current.filter((c) => c.toLowerCase() !== nome.toLowerCase());
      const updated = await writeEmpresasToStorage(filtered);
      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

}
