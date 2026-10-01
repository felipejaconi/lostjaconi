import re

with open('src/pages/admin/AdminOrders.tsx', 'r') as f:
    content = f.read()

# 1. Insert matchesViewModeDate before filteredOrders
matches_helper = """  const matchesViewModeDate = (dateString: string) => {
    if (viewMode === 'todos') return true;
    
    const orderDate = new Date(dateString);
    const agora = new Date();
    agora.setHours(0,0,0,0);
    
    if (viewMode === 'diario') {
      return orderDate >= agora;
    } else if (viewMode === 'semanal') {
      const startOfWeek = new Date(agora);
      const day = startOfWeek.getDay();
      const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1);
      startOfWeek.setDate(diff);
      
      const startOfMonth = new Date(agora.getFullYear(), agora.getMonth(), 1);
      if (startOfWeek < startOfMonth) startOfWeek.setTime(startOfMonth.getTime());
      
      return orderDate >= startOfWeek;
    }
    return true;
  };

  const filteredOrders = orders.filter((o) => {"""

content = content.replace("  const filteredOrders = orders.filter((o) => {", matches_helper)

# 2. Update filteredOrders return
old_return = """    const matchesStore = selectedStoreFilter === "all" || String(o.user_id) === String(selectedStoreFilter);
    
    return matchesStatus && matchesSearch && matchesStore;
  });"""

new_return = """    const matchesStore = selectedStoreFilter === "all" || String(o.user_id) === String(selectedStoreFilter);
    
    const matchesDate = statusFilter !== "todos" ? true : matchesViewModeDate(o.created_at);
    
    return matchesStatus && matchesSearch && matchesStore && matchesDate;
  });"""

content = content.replace(old_return, new_return)

# 3. Update Faturação calculation
old_faturacao = """<p className="text-sm font-black text-white tabular-nums leading-none">€<span>{orders.reduce((acc, o) => acc + Number(o.total || 0), 0).toLocaleString('pt-PT', {minimumFractionDigits:2, maximumFractionDigits:2})}</span></p>"""
new_faturacao = """<p className="text-sm font-black text-white tabular-nums leading-none">€<span>{orders.filter(o => matchesViewModeDate(o.created_at)).reduce((acc, o) => acc + Number(o.total || 0), 0).toLocaleString('pt-PT', {minimumFractionDigits:2, maximumFractionDigits:2})}</span></p>"""

content = content.replace(old_faturacao, new_faturacao)

with open('src/pages/admin/AdminOrders.tsx', 'w') as f:
    f.write(content)

print("Done")
