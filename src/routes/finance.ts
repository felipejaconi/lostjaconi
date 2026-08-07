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
         if (!item.produto_id || !item.produtos) continue;
         const pid = item.produto_id;
         if (!productsMap.has(pid)) {
            productsMap.set(pid, {
               produto_id: pid,
               nome: item.produtos.nome || "Produto Desconhecido",
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

  app.get("/api/admin/faturas", authenticateToken, async (req: any, res) => {
    if (req.user.role !== "admin" && req.user.role !== "armazem") return res.sendStatus(403);
    try {
      const cached = cache.get("admin_faturas");
      if (cached) return res.json(cached);
      const { data, error } = await supabase
        .from("faturas")
        .select("*, fornecedor:fornecedores(nome, iban), fatura_itens(*, produto:produtos(nome, unidade_base, iva)), movimentos_financeiros(*)")
        .order("data_emissao", { ascending: false });
      if (error) {
         if (error.code === '42P01') return res.json([]);
         throw error;
      }
      cache.set("admin_faturas", data);
      res.json(data);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  
  app.post("/api/admin/faturas/despesas", authenticateToken, async (req: any, res) => {
    if (req.user.role !== "admin" && req.user.role !== "armazem") return res.sendStatus(403);
    
    try {
      const { fornecedor_id, novo_fornecedor_nome, numero_fatura, data_fatura, data_vencimento, categoria_despesa, valor_total, loja_id } = req.body;
      
      let finalFornecedorId = fornecedor_id;
      
      // If creating a new entity
      if (!finalFornecedorId && novo_fornecedor_nome) {
        const { data: newForn, error: fornError } = await supabase
          .from("fornecedores")
          .insert([{ nome: novo_fornecedor_nome }])
          .select()
          .single();
          
        if (fornError) throw fornError;
        finalFornecedorId = newForn.id;
      }
      
      const insertData = {
        fornecedor_id: finalFornecedorId,
        numero_fatura: numero_fatura,
        data_emissao: data_fatura,
        data_vencimento: data_vencimento,
        valor_total: valor_total,
        valor_pendente: valor_total,
        tipo: 'despesa_' + categoria_despesa,
        created_by: req.user.id,
        descrição: loja_id ? JSON.stringify({ loja_id }) : null
      };
      
      const { data, error } = await supabase.from("faturas").insert([insertData]).select().single();
      
      if (error) throw error;
      res.json(data);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/admin/faturas", authenticateToken, async (req: any, res) => {
    if (req.user.role !== "admin" && req.user.role !== "armazem") return res.sendStatus(403);
    try {
      const insertData = { ...req.body, created_by: req.user.id };
      const { data, error } = await supabase.from("faturas").insert([insertData]).select().single();
      if (error) throw error;
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

      res.json({ message: "Pagamento registado com sucesso" });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

}
