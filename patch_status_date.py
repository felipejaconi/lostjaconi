import re

with open('src/routes/orders.ts', 'r') as f:
    content = f.read()

old_status = """  app.put("/api/pedidos/:id/status", authenticateToken, clearPedidosCache, async (req: any, res: any) => {
    try {
      const { data, error } = await supabase.from("pedidos").update({ status: req.body.status }).eq("id", req.params.id).select().single();"""

new_status = """  app.put("/api/pedidos/:id/status", authenticateToken, clearPedidosCache, async (req: any, res: any) => {
    try {
      const updateData: any = { status: req.body.status };
      if (req.body.status === 'pronto') {
          updateData.created_at = new Date().toISOString();
      }
      const { data, error } = await supabase.from("pedidos").update(updateData).eq("id", req.params.id).select().single();"""

content = content.replace(old_status, new_status)

with open('src/routes/orders.ts', 'w') as f:
    f.write(content)
print("Patched status update")
