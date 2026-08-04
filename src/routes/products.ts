import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

export function setupProductsRoutes({ app, supabase, authenticateToken, upload, uploadToSupabase, deleteFromSupabase, JWT_SECRET, cache }: any) {
  // Products CRUD
  app.get("/api/produtos", authenticateToken, async (req: any, res) => {
    try {
      let products = [];
      const cached = cache.get("admin_produtos");
      if (cached) {
        products = cached;
      } else {
        const { data: rows, error } = await supabase
          .from("produtos")
          .select("*, categorias(nome), product_units(*), lotes(*)");

        if (error) {
          console.error("Supabase error in GET /api/produtos:", error);
          throw error;
        }

        products = rows.map((p: any) => ({
          ...p,
          categoria_nome: p.categorias?.nome,
        }));

        cache.set("admin_produtos", products);
      }

      if (req.user.role !== "admin" && req.user.role !== "armazem") {
        products = products.filter((p: any) => {
          const catName = (p.categoria_nome || "").toLowerCase();
          return !catName.includes("produção armaz") && !catName.includes("producao armaz");
        });
      }

      res.json(products);
    } catch (error: any) {
      console.error("Detailed error in GET /api/produtos:", error);
      res
        .status(500)
        .json({
          error: "Erro ao buscar produtos",
          message: error.message || String(error),
          details: error.details,
          hint: error.hint,
          code: error.code
        });
    }
  });

  // Product Units
  app.post("/api/product-units", authenticateToken, async (req: any, res) => {
    if (req.user.role !== "admin" && req.user.role !== "armazem") return res.sendStatus(403);
    const { product_id, unit, factor, is_default_buy, is_default_sell } = req.body;
    try {
      const { data, error } = await supabase.from("product_units").insert([{ product_id, unit, factor, is_default_buy, is_default_sell }]).select().single();
      if (error) throw error;
      res.json(data);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/product-units/:id", authenticateToken, async (req: any, res) => {
    if (req.user.role !== "admin" && req.user.role !== "armazem") return res.sendStatus(403);
    try {
      const { error } = await supabase.from("product_units").delete().eq("id", req.params.id);
      if (error) throw error;
      res.json({ message: "Unidade removida" });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post(
    "/api/produtos",
    authenticateToken,
    upload.single("imagem"),
    async (req: any, res) => {
      if (req.user.role !== "admin" && req.user.role !== "armazem") return res.sendStatus(403);
      let {
        nome,
        descricao,
        preco,
        preco_custo,
        stock_armazem,
        categoria_id,
        iva,
        unidade_base,
        unidade_compra,
        fator_conversao_compra,
        unidade_venda,
        fator_conversao_venda,
        is_peso_variavel,
        barcode_ean,
        pais_origem,
        lote,
      } = req.body;
      const imagem_url = req.file
        ? await uploadToSupabase(req.file, "produtos")
        : null;

      if (!categoria_id || categoria_id === "null" || categoria_id === "undefined") {
        categoria_id = null;
      }
      try {
        const productData: any = {
              nome,
              descricao,
              categoria_id,
              imagem_url,
              is_peso_variavel: is_peso_variavel === "true" || is_peso_variavel === true,
              barcode_ean: barcode_ean || null,
              pais_origem: !pais_origem || pais_origem === "null" ? null : pais_origem,
              unidade_base: unidade_base || "un",
              unidade_compra: unidade_compra || "un",
              fator_conversao_compra: Number(fator_conversao_compra) || 1,
              lote: lote || null,
        };
        
        if (preco !== undefined && preco !== "") productData.preco = Number(preco);
        if (stock_armazem !== undefined && stock_armazem !== "") productData.stock_armazem = Number(stock_armazem);
        if (iva !== undefined && iva !== "") productData.iva = Number(iva);
        if (preco_custo !== undefined && preco_custo !== "") productData.preco_custo = Number(preco_custo);
        if (unidade_venda !== undefined && unidade_venda !== "") productData.unidade_venda = unidade_venda;
        if (fator_conversao_venda !== undefined && fator_conversao_venda !== "") productData.fator_conversao_venda = Number(fator_conversao_venda);

        let result = await supabase.from("produtos").insert([productData]).select().single();
        if (result.error) {
           let shouldRetry = false;
           if (result.error.message.includes("preco_custo")) {
              console.warn("Coluna preco_custo não existe - ignorando");
              delete productData.preco_custo;
              shouldRetry = true;
           }
           if (result.error.message.includes("lote")) {
              console.warn("Coluna lote não existe - ignorando");
              delete productData.lote;
              shouldRetry = true;
           }
           if (shouldRetry) {
              result = await supabase.from("produtos").insert([productData]).select().single();
           }
        }
        if (result.error) throw result.error;

        if (req.body.lote || req.body.rua || req.body.prateleira) {
           const loteData = { 
             produto_id: result.data.id, 
             lote: req.body.lote || null,
             rua: req.body.rua || null,
             prateleira: req.body.prateleira || null,
             quantidade: 0
           };
           const loteRes = await supabase.from("lotes").insert([loteData]);
           
           if (loteRes.error) {
               console.error("Erro ao criar lote:", loteRes.error);
               throw new Error("A tabela 'lotes' não possui as colunas corretas. Execute o comando SQL na base de dados para alterar a tabela: ALTER TABLE lotes ADD COLUMN IF NOT EXISTS rua TEXT, ADD COLUMN IF NOT EXISTS prateleira TEXT, ADD COLUMN IF NOT EXISTS lote TEXT;");
           }
        }

        cache.del("admin_produtos");
        res.json({ message: "Produto criado com sucesso", data: result.data });
      } catch (error: any) {
        console.error("Erro ao criar produto:", error);
        require("fs").appendFileSync("server_error.log", "Error creating product: " + JSON.stringify(error) + "\n");
        res
          .status(500)
          .json({
            error: "Erro ao criar produto: " + (error.message || String(error)),
          });
      }
    },
  );

  app.put("/api/produtos/:id/stock-armazem", authenticateToken, async (req: any, res) => {
    if (req.user.role !== "admin" && req.user.role !== "armazem") return res.sendStatus(403);
    const { stock_armazem } = req.body;
    try {
      const { error } = await supabase
        .from("produtos")
        .update({ stock_armazem })
        .eq("id", req.params.id);
      if (error) throw error;
      res.json({ message: "Stock atualizado!" });
    } catch (e: any) {
      console.error(e);
      res.status(500).json({ error: "Erro ao atualizar" });
    }
  });

  app.post(
    "/api/produtos/:id/update",
    authenticateToken,
    upload.single("imagem"),
    async (req: any, res) => {
      if (req.user.role !== "admin" && req.user.role !== "armazem") return res.sendStatus(403);
      let {
        nome,
        descricao,
        preco,
        preco_custo,
        stock_armazem,
        categoria_id,
        iva,
        unidade_base,
        unidade_compra,
        fator_conversao_compra,
        unidade_venda,
        fator_conversao_venda,
        is_peso_variavel,
        barcode_ean,
        pais_origem,
        lote,
      } = req.body;

      if (!categoria_id || categoria_id === "null" || categoria_id === "undefined") {
        categoria_id = null;
      }
      const updateData: any = {
        nome,
        descricao,
        categoria_id,
        is_peso_variavel: is_peso_variavel === "true" || is_peso_variavel === true,
        barcode_ean: barcode_ean || null,
        pais_origem: !pais_origem || pais_origem === "null" ? null : pais_origem,
        unidade_base: unidade_base || "un",
        unidade_compra: unidade_compra || "un",
        fator_conversao_compra: Number(fator_conversao_compra) || 1,
        lote: lote || null,
      };

      if (preco !== undefined && preco !== "") updateData.preco = Number(preco);
      if (iva !== undefined && iva !== "") updateData.iva = Number(iva);
      if (preco_custo !== undefined && preco_custo !== "") updateData.preco_custo = Number(preco_custo);
      if (unidade_venda !== undefined && unidade_venda !== "") updateData.unidade_venda = unidade_venda;
      if (fator_conversao_venda !== undefined && fator_conversao_venda !== "") updateData.fator_conversao_venda = Number(fator_conversao_venda);
      if (stock_armazem !== undefined && stock_armazem !== "") updateData.stock_armazem = Number(stock_armazem);

      if (req.file) {
        const { data: oldProd } = await supabase.from("produtos").select("imagem_url").eq("id", req.params.id).single();
        if (oldProd && oldProd.imagem_url) {
           await deleteFromSupabase(oldProd.imagem_url);
        }
        updateData.imagem_url = await uploadToSupabase(req.file, "produtos");
      }

      try {
        if (stock_armazem !== undefined && stock_armazem !== "") {
           const { data: previousData } = await supabase.from("produtos").select("stock_armazem").eq("id", req.params.id).single();
           const previousStock = previousData ? Number(previousData.stock_armazem || 0) : 0;
           const diff = Number(stock_armazem) - previousStock;
           
           if (diff !== 0) {
             await supabase.from("movimentacoes_stock").insert([{
               produto_id: req.params.id,
               user_id: req.user.id,
               tipo: diff > 0 ? "entrada" : "saida",
               quantidade: Math.abs(diff),
               motivo: diff > 0 ? "Ajuste manual (Entrada)" : "Ajuste manual (Corrigida Saída)"
             }]);
           }
        }

        let result = await supabase.from("produtos").update(updateData).eq("id", req.params.id).select().single();
        if (result.error) {
           let shouldRetry = false;
           if (result.error.message.includes("preco_custo")) {
              console.warn("Coluna preco_custo não existe - ignorando");
              delete updateData.preco_custo;
              shouldRetry = true;
           }
           if (result.error.message.includes("lote")) {
              console.warn("Coluna lote não existe - ignorando");
              delete updateData.lote;
              shouldRetry = true;
           }
           if (shouldRetry) {
              result = await supabase.from("produtos").update(updateData).eq("id", req.params.id).select().single();
           }
        }
        if (result.error) throw result.error;

        if (req.body.lote !== undefined || req.body.rua !== undefined || req.body.prateleira !== undefined) {
           const { data: existingLotes } = await supabase.from("lotes")
             .select("id")
             .eq("produto_id", req.params.id)
             .limit(1);
           
           const loteData: any = { 
             produto_id: req.params.id, 
             lote: req.body.lote || null,
             rua: req.body.rua || null,
             prateleira: req.body.prateleira || null
           };

           let loteRes;
           if (existingLotes && existingLotes.length > 0) {
               loteRes = await supabase.from("lotes").update(loteData).eq("id", existingLotes[0].id);
           } else {
               loteData.quantidade = 0;
               loteRes = await supabase.from("lotes").insert([loteData]);
           }
           
           if (loteRes.error) {
              // fallback if columns don't exist
              console.error("Erro ao salvar lote no update:", loteRes.error);
              throw new Error("A tabela 'lotes' não possui as colunas corretas. Execute o comando SQL na base de dados para alterar a tabela: ALTER TABLE lotes ADD COLUMN IF NOT EXISTS rua TEXT, ADD COLUMN IF NOT EXISTS prateleira TEXT, ADD COLUMN IF NOT EXISTS lote TEXT;");
           }
        }

        cache.del("admin_produtos");
        res.json({ message: "Produto atualizado", data: result.data });
      } catch (error: any) {
        console.error("Erro ao atualizar produto:", error);
        res
          .status(500)
          .json({
            error:
              "Erro ao atualizar produto: " + (error.message || String(error)),
          });
      }
    },
  );

  app.get("/api/produtos/:id/stock", authenticateToken, async (req: any, res) => {
    try {
      const { data, error } = await supabase
        .from("produtos")
        .select("stock_armazem")
        .eq("id", req.params.id)
        .single();

      if (error) throw error;
      res.json({ stock: data.stock_armazem });
    } catch (error: any) {
      console.error("Erro ao buscar stock do produto:", error);
      res.status(500).json({
        error: "Erro ao buscar stock do produto: " + (error.message || String(error)),
      });
    }
  });

  app.delete("/api/produtos/:id", authenticateToken, async (req: any, res) => {
    if (req.user.role !== "admin" && req.user.role !== "armazem") return res.sendStatus(403);
    try {
      const { data: oldProd } = await supabase.from("produtos").select("imagem_url").eq("id", req.params.id).single();
      
      const { error } = await supabase
        .from("produtos")
        .delete()
        .eq("id", req.params.id);
      if (error) throw error;
      
      if (oldProd && oldProd.imagem_url) {
         await deleteFromSupabase(oldProd.imagem_url);
      }
      
      res.json({ message: "Produto removido" });
    } catch (error: any) {
      console.error("Erro ao remover produto:", error);
      res
        .status(500)
        .json({
          error: "Erro ao remover produto: " + (error.message || String(error)),
        });
    }
  });

  // Categories
  app.get("/api/categorias", authenticateToken, async (req: any, res) => {
    try {
      let rows = [];
      const cached = cache.get("admin_categorias");
      if (cached) {
        rows = cached;
      } else {
        const { data, error } = await supabase
          .from("categorias")
          .select("*");

        if (error) {
          console.error("Supabase error in GET /api/categorias:", error);
          throw error;
        }
        
        rows = data || [];
        cache.set("admin_categorias", rows);
      }
      
      if (req.user.role !== "admin" && req.user.role !== "armazem") {
        rows = (rows as any[]).filter(cat => {
          const name = (cat.nome || "").toLowerCase();
          return !name.includes("produção armaz") && !name.includes("producao armaz");
        });
      }

      res.json(rows);
    } catch (error: any) {
      console.error("Detailed error in GET /api/categorias:", error);
      res
        .status(500)
        .json({
          error: "Erro ao buscar categorias",
          message: error.message || String(error),
          details: error.details,
          hint: error.hint,
          code: error.code
        });
    }
  });

  app.post(
    "/api/categorias",
    authenticateToken,
    upload.single("imagem"),
    async (req: any, res) => {
      if (req.user.role !== "admin" && req.user.role !== "armazem") return res.sendStatus(403);
      const { nome } = req.body;
      const imagem_url = req.file
        ? await uploadToSupabase(req.file, "categorias")
        : null;
      try {
        const { error } = await supabase
          .from("categorias")
          .insert([{ nome, imagem_url }]);

        if (error) throw error;
        res.json({ message: "Categoria criada com sucesso" });
      } catch (error: any) {
        console.error("Erro ao criar categoria:", error);
        res
          .status(500)
          .json({
            error:
              "Erro ao criar categoria: " + (error.message || String(error)),
          });
      }
    },
  );

  app.delete(
    "/api/categorias/:id",
    authenticateToken,
    async (req: any, res) => {
      if (req.user.role !== "admin" && req.user.role !== "armazem") return res.sendStatus(403);
      try {
        const { data: oldCat } = await supabase.from("categorias").select("imagem_url").eq("id", req.params.id).single();

        const { error } = await supabase
          .from("categorias")
          .delete()
          .eq("id", req.params.id);
        if (error) throw error;
        
        if (oldCat && oldCat.imagem_url) {
           await deleteFromSupabase(oldCat.imagem_url);
        }

        res.json({ message: "Categoria removida" });
      } catch (error: any) {
        console.error("Erro ao remover categoria:", error);
        res
          .status(500)
          .json({
            error:
              "Erro ao remover categoria: " + (error.message || String(error)),
          });
      }
    },
  );

}
