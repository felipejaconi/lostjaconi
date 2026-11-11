import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

export function setupAuthRoutes({ app, supabase, authenticateToken, upload, uploadToSupabase, JWT_SECRET, cache }: any) {
  // Test Supabase Connection
  app.get("/api/test-supabase", async (_req, res) => {
    try {
      const { data, error } = await supabase
        .from("users")
        .select("count")
        .limit(1);
      if (error) throw error;
      res.json({
        status: "success",
        message: "Conexão com Supabase estabelecida com sucesso!",
        data,
      });
    } catch (error: any) {
      console.error("Erro no teste do Supabase:", error);
      res
        .status(500)
        .json({
          status: "error",
          message: "Falha na conexão com Supabase",
          error: error.message,
        });
    }
  });

  // Auth
  app.post("/api/login", async (req, res) => {
    const { email, password } = req.body;
    try {
      const { data: user, error } = await supabase
        .from("users")
        .select("*")
        .eq("email", email)
        .single();

      if (error || !user)
        return res.status(400).json({ message: "Usuário não encontrado" });

      const validPassword = await bcrypt.compare(password, user.password);
      if (!validPassword)
        return res.status(400).json({ message: "Senha incorreta" });

      const token = jwt.sign(
        {
          id: user.id,
          role: user.role,
          name: user.name,
          avatar_url: user.avatar_url,
        },
        JWT_SECRET,
        { expiresIn: "30d" },
      );
      res.json({
        token,
        user: {
          id: user.id,
          name: user.name,
          role: user.role,
          email: user.email,
          avatar_url: user.avatar_url,
        },
      });
    } catch (error: any) {
      console.error("Erro no login:", error);
      res
        .status(500)
        .json({
          error: "Erro no servidor: " + (error.message || String(error)),
        });
    }
  });

  app.get(
    "/api/admin/relatorios/consumo-mensal",
    authenticateToken,
    async (req: any, res) => {
      if (!["admin", "armazem"].includes(req.user.role)) return res.sendStatus(403);
      try {
        const oneMonthAgo = new Date();
        oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

        const { data: pedidos, error: pedidosError } = await supabase
          .from("pedidos")
          .select("id, user_id, user:users(name)")
          .gte("created_at", oneMonthAgo.toISOString())
          .in("status", ["pronto", "entregue", "concluido"]);

        if (pedidosError) {
          console.error("Supabase error in GET /api/admin/relatorios/consumo-mensal (pedidos):", pedidosError);
          throw pedidosError;
        }

        const pedidoIds = pedidos.map((p) => p.id);

        if (pedidoIds.length === 0) {
          return res.json([]);
        }

        const { data: itens, error: itensError } = await supabase
          .from("pedido_itens")
          .select(
            "pedido_id, quantidade, produto:produtos(nome, categoria_id, categorias(nome))",
          )
          .in("pedido_id", pedidoIds);

        if (itensError) {
          console.error("Supabase error in GET /api/admin/relatorios/consumo-mensal (itens):", itensError);
          throw itensError;
        }

        // Aggregate by store and product
        const reportMap: any = {};

        itens.forEach((item: any) => {
          const pedido: any = pedidos.find((p) => p.id === item.pedido_id);
          if (!pedido) return;

          const storeName = pedido.user?.name || "Loja Desconhecida";
          const productName = item.produto?.nome || "Produto Desconhecido";
          const categoryName =
            item.produto?.categorias?.nome || "Sem Categoria";

          const key = `${storeName}_${productName}`;

          if (!reportMap[key]) {
            reportMap[key] = {
              loja: storeName,
              produto: productName,
              categoria: categoryName,
              quantidade_total: 0,
            };
          }

          reportMap[key].quantidade_total += item.quantidade;
        });

        const reportData = Object.values(reportMap).sort((a: any, b: any) => {
          if (a.loja < b.loja) return -1;
          if (a.loja > b.loja) return 1;
          return b.quantidade_total - a.quantidade_total;
        });

        res.json(reportData);
      } catch (error: any) {
        console.error("Erro ao gerar relatorio de consumo mensal:", error);
        res
          .status(500)
          .json({
            error:
              "Erro ao gerar relatorio: " + (error.message || String(error)),
          });
      }
    },
  );


  // Update User Profile (Self)
  app.put(
    "/api/profile",
    authenticateToken,
    upload.single("avatar"),
    async (req: any, res) => {
      const { name, email } = req.body;
      const avatar_url = req.file
        ? await uploadToSupabase(req.file, "avatars")
        : undefined;

      try {
        const updateData: any = { name, email };
        if (avatar_url) updateData.avatar_url = avatar_url;

        const { data, error } = await supabase
          .from("users")
          .update(updateData)
          .eq("id", req.user.id)
          .select()
          .single();

        if (error) throw error;
        res.json({ message: "Perfil atualizado com sucesso", user: data });
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    },
  );

}
