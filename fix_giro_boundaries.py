import re

with open('src/routes/orders.ts', 'r') as f:
    content = f.read()

old_code = """      const results = [];
      const agora = new Date();

      for (const [key, orders] of logs.entries()) {
        const sorted = orders.sort((a, b) => b.data.getTime() - a.data.getTime());
        const lastOrder = sorted[0];
        const totalQty = sorted.reduce((sum, o) => sum + o.quantidade, 0);

        let total_dia = 0;
        let total_semana = 0;
        let total_mes = 0;
        let total_ano = 0;
        const totals_by_month: Record<string, number> = {};

        for (const o of sorted) {
          const diffDays = (agora.getTime() - o.data.getTime()) / (1000 * 60 * 60 * 24);
          if (diffDays <= 1) total_dia += o.quantidade;
          if (diffDays <= 7) total_semana += o.quantidade;
          if (diffDays <= 30) total_mes += o.quantidade;
          if (diffDays <= 365) total_ano += o.quantidade;
          
          const monthKey = `${o.data.getFullYear()}-${String(o.data.getMonth() + 1).padStart(2, '0')}`;
          totals_by_month[monthKey] = (totals_by_month[monthKey] || 0) + o.quantidade;
        }"""

new_code = """      const results = [];
      const agora = new Date();
      agora.setHours(0,0,0,0);
      
      const startOfDay = new Date(agora);
      
      const startOfWeek = new Date(agora);
      const day = startOfWeek.getDay();
      const diff = startOfWeek.getDate() - day + (day == 0 ? -6 : 1); // adjust when day is sunday
      startOfWeek.setDate(diff);

      const startOfMonth = new Date(agora.getFullYear(), agora.getMonth(), 1);
      const startOfYear = new Date(agora.getFullYear(), 0, 1);

      for (const [key, orders] of logs.entries()) {
        const sorted = orders.sort((a, b) => b.data.getTime() - a.data.getTime());
        const lastOrder = sorted[0];
        const totalQty = sorted.reduce((sum, o) => sum + o.quantidade, 0);

        let total_dia = 0;
        let total_semana = 0;
        let total_mes = 0;
        let total_ano = 0;
        const totals_by_month: Record<string, number> = {};

        for (const o of sorted) {
          if (o.data >= startOfDay) total_dia += o.quantidade;
          if (o.data >= startOfWeek) total_semana += o.quantidade;
          if (o.data >= startOfMonth) total_mes += o.quantidade;
          if (o.data >= startOfYear) total_ano += o.quantidade;
          
          const monthKey = `${o.data.getFullYear()}-${String(o.data.getMonth() + 1).padStart(2, '0')}`;
          totals_by_month[monthKey] = (totals_by_month[monthKey] || 0) + o.quantidade;
        }"""

if old_code in content:
    content = content.replace(old_code, new_code)
    with open('src/routes/orders.ts', 'w') as f:
        f.write(content)
    print("Success")
else:
    print("Not found")
