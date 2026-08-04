import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

export function setupUsersRoutes({ app, supabase, authenticateToken, upload, uploadToSupabase, JWT_SECRET, cache }: any) {
  // Users Management (Admin)
  app.get("/api/admin/users", authenticateToken, async (req: any, res) => {
    if (!["admin", "armazem"].includes(req.user.role)) return res.sendStatus(403);
    try {
      const cached = cache.get("admin_users");
      if (cached) return res.json(cached);
      let query = supabase
        .from("users")
        .select(
          "id, name, email, role, order_start_time, order_end_time, picking_start_time, picking_end_time, manager_name, address, phone, matricula, created_at, avatar_url",
        )
        .order("name");
        
      let { data: rows, error } = await query;
      
      if (error && (error.message?.includes('matricula') || error.message?.includes('address') || error.message?.includes('phone') || error.message?.includes('Could not find'))) {
        let queryFallback = supabase
          .from("users")
          .select(
            "id, name, email, role, order_start_time, order_end_time, picking_start_time, picking_end_time, manager_name, created_at, avatar_url",
          )
          .order("name");
        const fb = await queryFallback;
        rows = fb.data;
        error = fb.error;
      }

      if (error) throw error;
      cache.set("admin_users", rows);
      res.json(rows);
    } catch (error: any) {
      console.error("Erro ao buscar utilizadores:", error);
      res
        .status(500)
        .json({
          error:
            "Erro ao buscar utilizadores: " + (error.message || String(error)),
        });
    }
  });

  app.post(
    "/api/admin/users",
    authenticateToken,
    upload.single("avatar"),
    async (req: any, res) => {
      if (req.user.role !== "admin" && req.user.role !== "armazem") return res.sendStatus(403);
      let {
        id,
        name,
        email,
        password,
        role,
        order_start_time,
        order_end_time,
        picking_start_time,
        picking_end_time,
        manager_name,
        address,
        phone,
        matricula,
        avatar_url: body_avatar_url,
      } = req.body;
      const avatar_url = req.file
        ? await uploadToSupabase(req.file, "avatars")
        : body_avatar_url || null;

      order_start_time = order_start_time || null;
      order_end_time = order_end_time || null;
      picking_start_time = picking_start_time || null;
      picking_end_time = picking_end_time || null;
      manager_name = manager_name || null;

      try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const insertData: any = {
          name,
          email,
          password: hashedPassword,
          role,
          order_start_time,
          order_end_time,
          picking_start_time,
          picking_end_time,
          manager_name,
          address,
          phone,
          matricula,
          avatar_url,
        };
        if (id) insertData.id = id;

        const { error } = await supabase.from("users").insert([insertData]);
        if (error) throw error;
        res.json({ message: "Utilizador criado com sucesso" });
      } catch (error: any) {
        console.error("Erro ao criar utilizador:", error);
        res
          .status(500)
          .json({
            error:
              "Erro ao criar utilizador: " + (error.message || String(error)),
          });
      }
    },
  );

  app.put(
    "/api/admin/users/:id",
    authenticateToken,
    upload.single("avatar"),
    async (req: any, res) => {
      if (req.user.role !== "admin" && req.user.role !== "armazem") return res.sendStatus(403);
      let {
        id,
        name,
        email,
        role,
        order_start_time,
        order_end_time,
        picking_start_time,
        picking_end_time,
        manager_name,
        password,
        address,
        phone,
        matricula,
        avatar_url: body_avatar_url,
      } = req.body;
      const avatar_url = req.file
        ? await uploadToSupabase(req.file, "avatars")
        : body_avatar_url;

      order_start_time = order_start_time || null;
      order_end_time = order_end_time || null;
      picking_start_time = picking_start_time || null;
      picking_end_time = picking_end_time || null;
      manager_name = manager_name || null;

      try {
        const updateData: any = {
          name,
          email,
          role,
          order_start_time,
          order_end_time,
          picking_start_time,
          picking_end_time,
          manager_name,
          address,
          phone,
          matricula,
        };
        if (id) updateData.id = id;
        if (password) updateData.password = await bcrypt.hash(password, 10);
        if (avatar_url !== undefined) updateData.avatar_url = avatar_url;

        const { error } = await supabase
          .from("users")
          .update(updateData)
          .eq("id", req.params.id);
        if (error) throw error;
        res.json({ message: "Utilizador atualizado" });
      } catch (error: any) {
        console.error("Erro ao atualizar utilizador:", error);
        res
          .status(500)
          .json({
            error:
              "Erro ao atualizar utilizador: " +
              (error.message || String(error)),
          });
      }
    },
  );

  app.delete(
    "/api/admin/users/:id",
    authenticateToken,
    async (req: any, res) => {
      if (req.user.role !== "admin" && req.user.role !== "armazem") return res.sendStatus(403);
      try {
        const { error } = await supabase.from("users").delete().eq("id", req.params.id);
        if (error) throw error;
        res.json({ message: "Utilizador apagado com sucesso" });
      } catch (error: any) {
        console.error("Erro ao apagar utilizador:", error);
        res.status(500).json({ error: "Erro ao apagar utilizador: " + (error.message || String(error)) });
      }
    }
  );

}
