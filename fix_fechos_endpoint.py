import re

with open('src/routes/config.ts', 'r') as f:
    content = f.read()

old_route = """  app.get("/api/admin/fechos", authenticateToken, async (req: any, res: any) => {
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
        .lte('data', endDate);"""

new_route = """  app.get("/api/admin/fechos", authenticateToken, async (req: any, res: any) => {
    if (req.user.role !== "admin") return res.sendStatus(403);
    const monthStr = req.query.month as string;
    const yearStr = req.query.year as string;
    
    try {
      let query = supabase.from('fechos_caixa').select('*');
      
      if (monthStr && yearStr) {
          const month = parseInt(monthStr);
          const year = parseInt(yearStr);
          if (!isNaN(month) && !isNaN(year)) {
              const startDate = new Date(year, month - 1, 1).toISOString().split('T')[0];
              const endDate = new Date(year, month, 0).toISOString().split('T')[0];
              query = query.gte('data', startDate).lte('data', endDate);
          }
      }
      
      const { data, error } = await query;"""

content = content.replace(old_route, new_route)

with open('src/routes/config.ts', 'w') as f:
    f.write(content)
