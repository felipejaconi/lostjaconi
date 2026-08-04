
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
}
