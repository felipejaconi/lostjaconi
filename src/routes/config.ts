
import fs from "fs";
import path from "path";

const configPath = path.join(process.cwd(), "armazem_config.json");

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
         const { data, error } = await supabase
           .from("vendas_lojas")
           .select("store_id, valor")
           .eq("mes", req.query.month)
           .eq("ano", req.query.year);
           
         if (error && error.code === '42P01') {
           // Table doesn't exist yet, return empty object
           return res.json({});
         } else if (error) {
           throw error;
         }
         
         const result: Record<string, number> = {};
         data?.forEach((row: any) => {
           result[row.store_id] = Number(row.valor);
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

  // --- FECHOS DE CAIXA ---
  app.get("/api/admin/fechos", authenticateToken, async (req: any, res: any) => {
    if (req.user.role !== "admin") return res.sendStatus(403);
    const month = parseInt(req.query.month as string);
    const year = parseInt(req.query.year as string);
    
    if (isNaN(month) || isNaN(year)) return res.status(400).json({ error: "Invalid month/year" });
    
    const startDate = new Date(year, month - 1, 1).toISOString().split('T')[0];
    const endDate = new Date(year, month, 0).toISOString().split('T')[0];
    
    try {
      const { data, error } = await supabase
        .from('fechos_caixa')
        .select('*')
        .gte('data', startDate)
        .lte('data', endDate);
        
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
    const { data, loja_id, sys_mb, sys_dinheiro, sys_mesa, real_mb, real_dinheiro, real_mesa, despesas } = req.body;
    
    if (!data || !loja_id) return res.status(400).json({ error: "Data e Loja são obrigatórios." });
    
    const sys_total = (sys_mb || 0) + (sys_dinheiro || 0) + (sys_mesa || 0);
    const real_total = (real_mb || 0) + (real_dinheiro || 0) + (real_mesa || 0);
    const dif_sis_apre = (real_total + (despesas || 0)) - sys_total;
    
    const payload = {
      loja_id,
      data,
      sys_mb,
      sys_dinheiro,
      sys_mesa,
      sys_total,
      real_mb,
      real_dinheiro,
      real_mesa,
      real_total,
      despesas,
      dif_sis_apre,
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
}
