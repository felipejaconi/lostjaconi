import crypto from "crypto";
import fs from "fs";
import path from "path";
import { fetchFaturasFinanceiro } from "../lib/faturasFinanceiro";

const configPath = path.join(process.cwd(), "armazem_config.json");
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function normalizeCompareText(val: any): string {
  return String(val || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

export function setupConfigRoutes({ app, supabase, authenticateToken }: any) {
  app.get("/api/admin/config/armazem", authenticateToken, (req: any, res: any) => {
    try {
      if (fs.existsSync(configPath)) {
        const data = fs.readFileSync(configPath, "utf8");
        return res.json(JSON.parse(data));
      }
      return res.json(null);
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  });

  app.put("/api/admin/config/armazem", authenticateToken, (req: any, res: any) => {
    try {
      if (req.user.role !== "admin" && req.user.role !== "armazem") {
         return res.status(403).json({ error: "Unauthorized" });
      }
      const newConfig = req.body;
      fs.writeFileSync(configPath, JSON.stringify(newConfig, null, 2), "utf8");
      return res.json({ success: true });
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/admin/vendas_lojas", authenticateToken, async (req: any, res: any) => {
    try {
      if (req.query.month !== undefined && req.query.year !== undefined) {
         const month = parseInt(req.query.month);
         const year = parseInt(req.query.year);

         const startDate = new Date(year, month, 1).toISOString().split('T')[0];
         const endDate = new Date(year, month + 1, 0).toISOString().split('T')[0];

         const { data, error } = await supabase
           .from("fechos_caixa")
           .select("loja_id, real_total")
           .gte('data', startDate)
           .lte('data', endDate);
           
         if (error && error.code === '42P01') {
           return res.json({});
         } else if (error) {
           throw error;
         }
         
         const result: Record<string, number> = {};
         data?.forEach((row: any) => {
           const val = Number(row.real_total || 0);
           result[row.loja_id] = (result[row.loja_id] || 0) + val;
         });
         
         return res.json(result);
      }
      return res.json({});
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  });
  app.put("/api/admin/vendas_lojas", authenticateToken, async (req: any, res: any) => {
    try {
      if (req.user.role !== "admin" && req.user.role !== "armazem") {
         return res.status(403).json({ error: "Unauthorized" });
      }
      
      if (req.query.month !== undefined && req.query.year !== undefined) {
         const mes = parseInt(req.query.month);
         const ano = parseInt(req.query.year);
         const vendas = req.body;
         
         const upserts = Object.keys(vendas).map(store_id => ({
           store_id,
           mes,
           ano,
           valor: vendas[store_id]
         }));
         
         if (upserts.length > 0) {
           const { error } = await supabase
             .from("vendas_lojas")
             .upsert(upserts, { onConflict: 'store_id, mes, ano' });
             
           if (error && error.code === '42P01') {
             return res.status(400).json({ error: "Tabela vendas_lojas não existe no Supabase. Por favor, crie a tabela primeiro." });
           } else if (error) {
             throw error;
           }
         }
      }
      return res.json({ success: true });
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  });

  
  // --- DRE MENSAL LOJAS ---
  app.get("/api/loja/dre", authenticateToken, async (req: any, res: any) => {
    if (req.user?.role !== "admin" && req.user?.role !== "loja") {
      return res.sendStatus(403);
    }

    try {
      const requestedStoreId = String(req.query.store_id || "").trim();
      const storeId =
        req.user.role === "admin" && UUID_REGEX.test(requestedStoreId)
          ? requestedStoreId
          : String(req.user.id);

      const month = parseInt(String(req.query.month), 10);
      const year = parseInt(String(req.query.year), 10);

      if (!Number.isInteger(month) || month < 1 || month > 12 || !Number.isInteger(year) || year < 2000 || year > 2100) {
        return res.status(400).json({ error: "Período inválido." });
      }

      const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
      const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
      const endDate = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

      const [storeUserRes, dreRes, finRes, legDespesasRes] = await Promise.all([
        supabase.from("users").select("id, name").eq("id", storeId).maybeSingle(),
        supabase
          .from("dre_lojas")
          .select("dados")
          .eq("store_id", storeId)
          .eq("mes", month)
          .eq("ano", year)
          .maybeSingle(),
        fetchFaturasFinanceiro(supabase, {
          startDate,
          endDate,
          includeRelations: true,
        }),
        supabase
          .from("faturas")
          .select("id, valor_total, tipo, data_emissao, descrição, fornecedor:fornecedores(nome)")
          .like("tipo", "despesa_%")
          .gte("data_emissao", startDate)
          .lte("data_emissao", endDate),
      ]);

      if (dreRes.error && dreRes.error.code !== "PGRST116" && dreRes.error.code !== "42P01") {
        throw dreRes.error;
      }

      const storeName = String(
        storeUserRes.data?.name || (req.user.id === storeId ? req.user.name : "") || ""
      ).trim();
      const storeNameNorm = normalizeCompareText(storeName);

      const contasMap = new Map<
        string,
        { conta_analise: string; valor: number; quantidade_faturas: number }
      >();
      const seenInvoiceIds = new Set<string>();

      for (const f of finRes.rows || []) {
        if (!f) continue;
        if (
          f.status_pagamento === "em_conferencia" ||
          f.tipo === "entrada_stock" ||
          f.tipo === "compra"
        ) {
          continue;
        }

        const fLojaId = f.loja_id ? String(f.loja_id).trim() : "";
        const fCentroCusto = f.centro_custo ? String(f.centro_custo).trim() : "";

        const matchesStore =
          (fLojaId && fLojaId === storeId) ||
          Boolean(storeNameNorm && fCentroCusto && normalizeCompareText(fCentroCusto) === storeNameNorm);

        if (!matchesStore) continue;

        const val = Number(f.valor_total || 0);
        if (val <= 0) continue;

        if (f.id) seenInvoiceIds.add(String(f.id));

        const rawConta = f.conta_analise ? String(f.conta_analise).trim() : "";
        const fallbackFornecedor = f.fornecedor?.nome ? String(f.fornecedor.nome).trim() : "";
        const contaLabel = (
          rawConta ||
          fallbackFornecedor ||
          "OUTRAS DESPESAS (FINANCEIRO)"
        ).toUpperCase();
        const mapKey = normalizeCompareText(contaLabel) || "outras_despesas_financeiro";

        const existing = contasMap.get(mapKey);
        if (existing) {
          existing.valor = Math.round((existing.valor + val) * 100) / 100;
          existing.quantidade_faturas += 1;
        } else {
          contasMap.set(mapKey, {
            conta_analise: contaLabel,
            valor: Math.round(val * 100) / 100,
            quantidade_faturas: 1,
          });
        }
      }

      if (!legDespesasRes.error && Array.isArray(legDespesasRes.data)) {
        for (const lf of legDespesasRes.data) {
          if (!lf || (lf.id && seenInvoiceIds.has(String(lf.id)))) continue;
          let lfLojaId = "";
          if (lf.descrição) {
            try {
              const parsed =
                typeof lf.descrição === "string" ? JSON.parse(lf.descrição) : lf.descrição;
              if (parsed?.loja_id) lfLojaId = String(parsed.loja_id).trim();
            } catch {}
          }
          if (lfLojaId !== storeId) continue;

          const val = Number(lf.valor_total || 0);
          if (val <= 0) continue;

          const rawCat = String(lf.tipo || "")
            .replace(/^despesa_/i, "")
            .replace(/_/g, " ")
            .trim();
          const contaLabel = (rawCat || "OUTRAS DESPESAS (FINANCEIRO)").toUpperCase();
          const mapKey = normalizeCompareText(contaLabel) || "outras_despesas_financeiro";

          const existing = contasMap.get(mapKey);
          if (existing) {
            existing.valor = Math.round((existing.valor + val) * 100) / 100;
            existing.quantidade_faturas += 1;
          } else {
            contasMap.set(mapKey, {
              conta_analise: contaLabel,
              valor: Math.round(val * 100) / 100,
              quantidade_faturas: 1,
            });
          }
        }
      }

      const despesasFinanceiro = Array.from(contasMap.values()).sort((a, b) => {
        if (b.valor !== a.valor) return b.valor - a.valor;
        return a.conta_analise.localeCompare(b.conta_analise, "pt");
      });

      const rawDados = dreRes.data?.dados;
      const rawManuais = Array.isArray(rawDados?.gastos_manuais) ? rawDados.gastos_manuais : [];
      const gastosManuais = rawManuais
        .map((item: any) => ({
          id: item?.id ? String(item.id) : crypto.randomUUID(),
          descricao: String(item?.descricao || "").trim(),
          valor: Math.max(0, Math.round((Number(item?.valor) || 0) * 100) / 100),
        }))
        .filter((item: any) => item.descricao.length > 0);

      return res.json({
        centro_custo: storeName || "LOJA",
        despesas_financeiro: despesasFinanceiro,
        gastos_manuais: gastosManuais,
      });
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  });

  app.put("/api/loja/dre", authenticateToken, async (req: any, res: any) => {
    if (req.user?.role !== "admin" && req.user?.role !== "loja") {
      return res.sendStatus(403);
    }

    try {
      const requestedStoreId = String(req.body?.store_id || "").trim();
      const storeId =
        req.user.role === "admin" && UUID_REGEX.test(requestedStoreId)
          ? requestedStoreId
          : String(req.user.id);

      const month = parseInt(String(req.body?.month), 10);
      const year = parseInt(String(req.body?.year), 10);

      if (!Number.isInteger(month) || month < 1 || month > 12 || !Number.isInteger(year) || year < 2000 || year > 2100) {
        return res.status(400).json({ error: "Período inválido." });
      }

      const rawList = Array.isArray(req.body?.gastos_manuais) ? req.body.gastos_manuais : [];
      const sanitizedManuais = rawList
        .slice(0, 100)
        .map((item: any) => {
          const descricao = String(item?.descricao || "").trim().slice(0, 120);
          const parsedVal = Number(item?.valor);
          const valor = Number.isFinite(parsedVal) && parsedVal >= 0 ? Math.round(parsedVal * 100) / 100 : 0;
          return {
            id: item?.id ? String(item.id).slice(0, 64) : crypto.randomUUID(),
            descricao,
            valor,
          };
        })
        .filter((item: any) => item.descricao.length > 0);

      const { error } = await supabase.from("dre_lojas").upsert(
        {
          store_id: storeId,
          mes: month,
          ano: year,
          dados: { gastos_manuais: sanitizedManuais },
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "store_id, mes, ano",
        }
      );

      if (error) throw error;

      return res.json({ success: true, gastos_manuais: sanitizedManuais });
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  });

  // --- FECHOS DE CAIXA ---
  app.get("/api/admin/fechos", authenticateToken, async (req: any, res: any) => {
    if (req.user.role !== "admin" && req.user.role !== "loja") return res.sendStatus(403);
    const monthStr = req.query.month as string;
    const yearStr = req.query.year as string;
    
    try {
      let query = supabase.from('fechos_caixa').select('*');
      if (req.user.role === 'loja') {
         query = query.eq('loja_id', req.user.id);
      }
      
      if (monthStr && yearStr) {
          const month = parseInt(monthStr);
          const year = parseInt(yearStr);
          if (!isNaN(month) && !isNaN(year)) {
              const startDate = new Date(year, month - 1, 1).toISOString().split('T')[0];
              const endDate = new Date(year, month, 0).toISOString().split('T')[0];
              query = query.gte('data', startDate).lte('data', endDate);
          }
      }
      
      const { data, error } = await query;
        
      if (error) {
         if (error.code === '42P01') {
            return res.status(400).json({ error: "Tabela fechos_caixa não existe no Supabase. Execute o script SQL fornecido." });
         }
         throw error;
      }
      res.json(data);
    } catch (e: any) {
      console.error(e);
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/admin/fechos", authenticateToken, async (req: any, res: any) => {
    if (req.user.role !== "admin") return res.sendStatus(403);
    const { data, loja_id, sys_mb, sys_dinheiro, sys_mesa,
      sys_uber, real_mb, real_dinheiro, real_mesa,
      real_uber, despesas } = req.body;
    
    if (!data || !loja_id) return res.status(400).json({ error: "Data e Loja são obrigatórios." });
    
    const sys_total = (sys_mb || 0) + (sys_dinheiro || 0) + (sys_mesa || 0) + (sys_uber || 0);
    const real_total = (real_mb || 0) + (real_dinheiro || 0) + (real_mesa || 0) + (real_uber || 0);
    const dif_sis_apre = (real_total + (despesas || 0)) - sys_total;
    
    const payload = {
      loja_id,
      data,
      sys_mb,
      sys_dinheiro,
      sys_mesa,
      sys_uber,
      sys_total,
      real_mb,
      real_dinheiro,
      real_mesa,
      real_uber,
      real_total,
      despesas,
      dif_sis_apre,
      formulas: req.body.formulas || null,
      created_by: req.user.id
    };
    
    try {
       // Upsert (update if data and loja_id matches)
       const { data: result, error } = await supabase
         .from('fechos_caixa')
         .upsert(payload, { onConflict: 'loja_id, data' })
         .select()
         .single();
         
       if (error) {
         if (error.code === '42P01') {
            return res.status(400).json({ error: "Tabela fechos_caixa não existe no Supabase. Execute o script SQL fornecido." });
         }
         throw error;
       }
       res.json(result);
    } catch(e: any) {
       console.error(e);
       res.status(500).json({ error: e.message });
    }
  });

  // --- GEOCODING PROXY ---
  app.get("/api/admin/geocode", authenticateToken, async (req: any, res: any) => {
    const { address } = req.query;
    if (!address) return res.status(400).json({ error: "Address is required" });

    try {
      const apiKey = process.env.VITE_GOOGLE_MAPS_API_KEY || process.env.GOOGLE_MAPS_API_KEY;
      if (!apiKey) return res.status(500).json({ error: "Google Maps API Key not configured on server" });

      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${apiKey}`
      );
      const data = await response.json();
      res.json(data);
    } catch (e: any) {
      console.error("Geocoding error:", e);
      res.status(500).json({ error: e.message });
    }
  });
}
