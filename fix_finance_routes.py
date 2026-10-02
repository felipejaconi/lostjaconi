import re

with open('src/routes/finance.ts', 'r') as f:
    content = f.read()

old_route = """  app.post("/api/admin/faturas", authenticateToken, async (req: any, res) => {
    if (req.user.role !== "admin" && req.user.role !== "armazem") return res.sendStatus(403);
    try {
      const insertData = { ...req.body, created_by: req.user.id };
      const { data, error } = await supabase.from("faturas").insert([insertData]).select().single();
      if (error) throw error;
      res.json(data);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });"""

new_route = """  app.post("/api/admin/faturas", authenticateToken, async (req: any, res) => {
    if (req.user.role !== "admin" && req.user.role !== "armazem") return res.sendStatus(403);
    try {
      const isArray = Array.isArray(req.body);
      const dataToInsert = isArray 
        ? req.body.map((item: any) => ({ ...item, created_by: req.user.id }))
        : [{ ...req.body, created_by: req.user.id }];
        
      const { data, error } = await supabase.from("faturas").insert(dataToInsert).select();
      if (error) throw error;
      res.json(isArray ? data : data[0]);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });"""

content = content.replace(old_route, new_route)

with open('src/routes/finance.ts', 'w') as f:
    f.write(content)

