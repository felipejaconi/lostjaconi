import re

with open('src/routes/config.ts', 'r') as f:
    content = f.read()

old_fechos = """  app.get("/api/admin/fechos", authenticateToken, async (req: any, res: any) => {
    if (req.user.role !== "admin") return res.sendStatus(403);
    const monthStr = req.query.month as string;
    const yearStr = req.query.year as string;
    
    try {
      let query = supabase.from('fechos_caixa').select('*');"""

new_fechos = """  app.get("/api/admin/fechos", authenticateToken, async (req: any, res: any) => {
    if (req.user.role !== "admin" && req.user.role !== "loja") return res.sendStatus(403);
    const monthStr = req.query.month as string;
    const yearStr = req.query.year as string;
    
    try {
      let query = supabase.from('fechos_caixa').select('*');
      if (req.user.role === 'loja') {
         query = query.eq('loja_id', req.user.id);
      }"""
content = content.replace(old_fechos, new_fechos)

with open('src/routes/config.ts', 'w') as f:
    f.write(content)

