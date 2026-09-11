import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

export function setupStatsRoutes({ app, supabase, authenticateToken, upload, uploadToSupabase, JWT_SECRET, cache }: any) {
  // Dashboard Stats (Admin)
  app.get("/api/admin/stats", authenticateToken, async (req: any, res) => {
    if (!["admin", "armazem"].includes(req.user.role)) return res.sendStatus(403);
    
    // Check Cache
    const cacheKey = "admin_stats";
    const cachedStats = cache.get(cacheKey);
    if (cachedStats) {
      return res.json(cachedStats);
    }

    try {
      const { data: vendas } = await supabase
        .from("pedidos")
        .select("total")
        .in("status", ["pronto", "entregue", "concluido"]);

      const totalVendas = (vendas || []).reduce(
        (acc, v) => acc + (v.total || 0),
        0,
      );

      const { count: pedidosPendentes } = await supabase
        .from("pedidos")
        .select("*", { count: "exact", head: true })
        .in("status", ["pendente", "processando"]);

      const { count: totalProdutos } = await supabase
        .from("produtos")
        .select("*", { count: "exact", head: true });

      const { count: totalLojas } = await supabase
        .from("users")
        .select("*", { count: "exact", head: true })
        .eq("role", "loja");

      // ERP STATS
      let comprasMes = 0;
      let despesasMes = 0;
      let dividaFornecedores = 0;
      
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0,0,0,0);
      const startOfMonthIso = startOfMonth.toISOString();
      
      try {
        const { data: faturasC } = await supabase.from("faturas").select("tipo, valor_total, valor_pendente, data_emissao");
        (faturasC || []).forEach(f => {
           dividaFornecedores += Number(f.valor_pendente || 0);
           const isThisMonth = new Date(f.data_emissao) > startOfMonth;
           if (isThisMonth) {
              if (f.tipo === 'compra') comprasMes += Number(f.valor_total || 0);
              if (f.tipo === 'despesa') despesasMes += Number(f.valor_total || 0);
           }
        });
      } catch (e) {}

      let capitalStock = 0;
      let totalStockQty = 0;
      try {
         const { data: prods } = await supabase.from("produtos").select("stock_armazem, preco_custo");
         (prods || []).forEach((p: any) => {
            const qtd = Number(p.stock_armazem || 0);
            const custo = Number(p.preco_custo || 0);
            capitalStock += (qtd * custo);
            totalStockQty += qtd;
         });
      } catch (e) {}

      let cmv = 0;
      let totalVendasLiquidas = 0; // Se os pedidos tiverem IVA incluído, este será o valor real usado para lucro. No momento pedido.total já entra como sales.

      let vendasMes = 0;
      try {
         // Calcular CMV baseado nos items de pedidos do mês atual
         const { data: monthOrders } = await supabase.from("pedidos")
            .select("id, total, created_at")
            .in("status", ["pronto", "entregue", "concluido"])
            .gte("created_at", startOfMonthIso);
         
         if (monthOrders && monthOrders.length > 0) {
            monthOrders.forEach(v => {
               vendasMes += Number(v.total || 0);
            });
            
            const monthOrderIds = monthOrders.map(o => o.id);
            // Fetch order items in chunks to avoid URL too long or use multiple queries if necessary, but we'll fetch them normally first
            const { data: orderItems } = await supabase.from("pedido_itens")
               .select("pedido_id, quantidade, produto:produtos(preco_custo, fator_conversao_venda)")
               .in("pedido_id", monthOrderIds);
               
            (orderItems || []).forEach((item: any) => {
               const qtyVenda = Number(item.quantidade || 0);
               const fator = Number(item.produto?.fator_conversao_venda || 1);
               const qtyBase = qtyVenda * fator;
               const custoBase = Number(item.produto?.preco_custo || 0);
               cmv += (qtyBase * custoBase);
            });
         }
      } catch (e) {}

      const result = {
        totalVendas,
        pedidosPendentes: pedidosPendentes || 0,
        totalProdutos: totalProdutos || 0,
        totalStockQty: totalStockQty || 0,
        totalLojas: totalLojas || 0,
        erp: {
          comprasMes,
          despesasMes,
          dividaFornecedores,
          capitalStock,
          vendasMes,
          cmv,
          lucroBruto: vendasMes - cmv,
          lucroLiquido: vendasMes - cmv - despesasMes
        }
      };

      // Set Cache
      cache.set(cacheKey, result);

      res.json(result);
    } catch (error: any) {
      console.error("Erro ao buscar stats:", error);
      res
        .status(500)
        .json({
          error: "Erro ao buscar stats: " + (error.message || String(error)),
        });
    }
  });

  // Fast Summary for AdminHome to avoid loading all orders and products
  app.get("/api/admin/home-summary", authenticateToken, async (req: any, res) => {
    if (!["admin", "armazem"].includes(req.user.role)) return res.sendStatus(403);
    
    const cacheKey = "admin_home_summary_" + req.user.role;
    const cached = cache.get(cacheKey);
    if (cached) return res.json(cached);
    
    try {
      // Pending Orders Count
      const { count: pendingOrdersCount } = await supabase
        .from("pedidos")
        .select("*", { count: "exact", head: true })
        .in("status", ["pendente", "processando"]);

      // Recent 8 Orders
      const { data: recentOrders } = await supabase
        .from("pedidos")
        .select("*, user:users(name)")
        .order("created_at", { ascending: false })
        .limit(8);

      const mappedRecentOrders = (recentOrders || []).map((p: any) => ({
        ...p,
        loja_nome: p.user?.name,
      }));

      // Produtos Alertas
      let produtosAlertas: any[] = [];
      const isAdmin = req.user.role === "admin";
      
      const { data: prods } = await supabase
        .from("produtos")
        .select("id, nome, stock_armazem, preco, preco_custo, categorias(nome)");
        
      if (prods) {
         const alertas = prods.filter(p => {
            const stock = Number(p.stock_armazem || 0);
            if (isAdmin) {
               const preco = Number(p.preco || 0);
               const custo = Number(p.preco_custo || 0);
               const mrg = custo > 0 ? ((preco - custo) / custo) * 100 : 0;
               return stock < 10 || mrg < 15;
            }
            return stock < 10;
         }).sort((a,b) => Number(a.stock_armazem || 0) - Number(b.stock_armazem || 0)).slice(0, 8);
         produtosAlertas = alertas.map(a => ({...a, categorias: a.categorias}));
      }

      const { count: totalFornecedores } = await supabase
        .from("fornecedores")
        .select("*", { count: "exact", head: true });

      const result = {
         pendingOrdersCount: pendingOrdersCount || 0,
         recentOrders: mappedRecentOrders,
         produtosAlertas,
         totalFornecedores: totalFornecedores || 0
      };
      cache.set(cacheKey, result);
      res.json(result);

    } catch (error: any) {
      console.error("Erro ao carregar summary home:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/admin/chart-data", authenticateToken, async (req: any, res) => {
    if (!["admin", "armazem"].includes(req.user.role)) return res.sendStatus(403);
    
    const currentMonth = req.query.month !== undefined ? parseInt(req.query.month as string, 10) : new Date().getMonth();
    const currentYear = req.query.year !== undefined ? parseInt(req.query.year as string, 10) : new Date().getFullYear();
    const cacheKey = `admin_chart_data_${currentMonth}_${currentYear}`;
    const cached = cache.get(cacheKey);
    if (cached) return res.json(cached);
    
    try {
      const today = new Date();
      const startOfMonth = new Date(currentYear, currentMonth, 1).toISOString();
      const endOfMonth = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59).toISOString();

      const { data: pedidos } = await supabase
        .from("pedidos")
        .select("total, created_at, status")
        .gte("created_at", startOfMonth)
        .lte("created_at", endOfMonth);

      const { data: faturas } = await supabase
        .from("faturas")
        .select("tipo, valor_total, data_emissao")
        .gte("data_emissao", startOfMonth)
        .lte("data_emissao", endOfMonth);

      const chartMap: Record<string, { name: string, vendas: number, despesas: number, compras: number }> = {};

      const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
      const maxDay = (currentMonth === today.getMonth() && currentYear === today.getFullYear()) ? today.getDate() : daysInMonth;

      for (let i = 1; i <= maxDay; i++) {
        chartMap[i.toString()] = { name: `Dia ${i}`, vendas: 0, despesas: 0, compras: 0 };
      }

      if (pedidos) {
        pedidos.forEach((p: any) => {
          if (!['pronto', 'entregue', 'concluido'].includes(p.status)) return;
          const d = new Date(p.created_at);
          if (d.getMonth() === currentMonth && d.getFullYear() === currentYear) {
            const day = d.getDate().toString();
            if (chartMap[day]) {
              chartMap[day].vendas += (p.total || 0);
            }
          }
        });
      }

      if (faturas) {
        faturas.forEach((f: any) => {
          const d = new Date(f.data_emissao);
          if (d.getMonth() === currentMonth && d.getFullYear() === currentYear) {
            const day = d.getDate().toString();
            if (chartMap[day]) {
               if (f.tipo === 'despesa') chartMap[day].despesas += (f.valor_total || 0);
               if (f.tipo === 'compra') chartMap[day].compras += (f.valor_total || 0);
            }
          }
        });
      }

      const chartArray = Object.values(chartMap);
      cache.set(cacheKey, chartArray);
      res.json(chartArray);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Store Stats
  app.get("/api/store/stats", authenticateToken, async (req: any, res) => {
    try {
      const { data: ultimoPedido } = await supabase
        .from("pedidos")
        .select("status, created_at")
        .eq("user_id", req.user.id)
        .order("created_at", { ascending: false })
        .limit(1);

      const { count: notificacoesCount } = await supabase
        .from("notificacoes")
        .select("*", { count: "exact", head: true })
        .eq("user_id", req.user.id)
        .eq("lida", false);

      // Fetch orders for the last 6 months for the chart
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

      const { data: orders } = await supabase
        .from("pedidos")
        .select("total, created_at")
        .eq("user_id", req.user.id)
        .gte("created_at", sixMonthsAgo.toISOString())
        .order("created_at", { ascending: true });

      const monthNames = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
      const chartDataMap: Record<string, { name: string, pedidos: number, custos: number }> = {};

      // Initialize last 6 months
      for (let i = 5; i >= 0; i--) {
        const d = new Date();
        d.setMonth(d.getMonth() - i);
        const key = `${d.getFullYear()}-${d.getMonth()}`;
        chartDataMap[key] = { name: monthNames[d.getMonth()], pedidos: 0, custos: 0 };
      }

      if (orders) {
        orders.forEach((order: any) => {
          const d = new Date(order.created_at);
          const key = `${d.getFullYear()}-${d.getMonth()}`;
          if (chartDataMap[key]) {
            chartDataMap[key].pedidos += 1;
            chartDataMap[key].custos += order.total || 0;
          }
        });
      }

      const chartData = Object.values(chartDataMap);
      res.json({
        ultimoPedido: ultimoPedido?.[0] || null,
        notificacoesAtivas: notificacoesCount || 0,
        chartData
      });
    } catch (error) {
      console.error("Erro ao buscar stats da loja:", error);
      res.status(500).json({ error: "Erro ao buscar stats da loja" });
    }
  });

  app.get("/api/store/consumption", authenticateToken, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const now = new Date();
      
      const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);
      
      const { data: orders, error } = await supabase
        .from("pedidos")
        .select("total, created_at")
        .eq("user_id", userId)
        .gte("created_at", sixMonthsAgo.toISOString())
        .in("status", ["pronto", "entregue", "concluido"]);

      if (error) throw error;

      // Daily Data (Last 7 days)
      const dailyChartData = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
        const dateStr = d.toISOString().split('T')[0];
        const dayName = d.toLocaleDateString('pt-PT', { weekday: 'short' });
        dailyChartData.push({ name: i === 0 ? 'Hoje' : i === 1 ? 'Ontem' : dayName, date: dateStr, total: 0 });
      }

      // Weekly Data (Last 4 weeks)
      const weeklyChartData = [];
      for (let i = 3; i >= 0; i--) {
        weeklyChartData.push({ name: `Semana -${i}`, weekOffset: i, total: 0 });
      }

      // Monthly Data (Last 6 months)
      const monthlyChartData = [];
      const monthNames = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const key = `${d.getFullYear()}-${d.getMonth()}`;
        monthlyChartData.push({ name: monthNames[d.getMonth()], key, total: 0 });
      }

      let daily = 0;
      let weekly = 0;
      let monthly = 0;
      let totalCost = 0;
      let orderCount = 0;

      const todayStr = now.toISOString().split('T')[0];
      const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      orders?.forEach(order => {
        const orderDate = new Date(order.created_at);
        const orderDateStr = orderDate.toISOString().split('T')[0];
        const total = Number(order.total) || 0;

        // Populate Daily Chart
        const dailyItem = dailyChartData.find(d => d.date === orderDateStr);
        if (dailyItem) dailyItem.total += total;

        // Populate Weekly Chart
        const diffTime = Math.abs(now.getTime() - orderDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        if (diffDays <= 28) {
          const weekIndex = 3 - Math.floor((diffDays - 1) / 7);
          if (weekIndex >= 0 && weekIndex < 4) {
             weeklyChartData[weekIndex].total += total;
          }
        }

        // Populate Monthly Chart
        const monthKey = `${orderDate.getFullYear()}-${orderDate.getMonth()}`;
        const monthlyItem = monthlyChartData.find(m => m.key === monthKey);
        if (monthlyItem) monthlyItem.total += total;

        // Stats
        if (orderDateStr === todayStr) daily += total;
        if (orderDate >= oneWeekAgo) weekly += total;
        if (orderDate >= thirtyDaysAgo) {
           monthly += total;
           totalCost += total;
           orderCount++;
        }
      });

      res.json({
        chartData: {
          daily: dailyChartData.map(({ name, total }) => ({ name, total })),
          weekly: weeklyChartData.map(({ name, total }) => ({ name, total })),
          monthly: monthlyChartData.map(({ name, total }) => ({ name, total }))
        },
        stats: {
          daily: daily.toFixed(2),
          weekly: weekly.toFixed(2),
          monthly: monthly.toFixed(2),
          average: orderCount > 0 ? (totalCost / orderCount).toFixed(2) : "0.00"
        }
      });
    } catch (error: any) {
      console.error("Erro ao buscar consumo da loja:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/admin/dashboard-extended", authenticateToken, async (req: any, res) => {
    if (!["admin", "armazem"].includes(req.user.role)) return res.sendStatus(403);
    
    const cacheKey = "admin_dashboard_extended";
    const cached = cache.get(cacheKey);
    if (cached) return res.json(cached);
    
    try {
      // 1. Top Loja Consumo (Current Month)
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);
      
      const { data: pedidos } = await supabase
        .from('pedidos')
        .select('total, user_id, user:users(name)')
        .gte('created_at', startOfMonth.toISOString())
        .in('status', ['pronto', 'entregue', 'concluido']);
        
      const storeTotals: Record<string, {name: string, total: number}> = {};
      (pedidos || []).forEach(p => {
         const uid = p.user_id;
         const uname = p.user?.name || "Loja Desconhecida";
         if (!storeTotals[uid]) {
            storeTotals[uid] = { name: uname, total: 0 };
         }
         storeTotals[uid].total += Number(p.total || 0);
      });
      const topLojas = Object.values(storeTotals).sort((a,b) => b.total - a.total).slice(0, 12);

      // 2. Top Produtos Vendidos (Current Month)
      const { data: pedidosProd } = await supabase
        .from('pedidos')
        .select('pedido_itens(quantidade, produto:produtos(nome))')
        .gte('created_at', startOfMonth.toISOString())
        .in('status', ['pronto', 'entregue', 'concluido']);
        
      const productTotals: Record<string, {name: string, quantity: number}> = {};
      (pedidosProd || []).forEach(p => {
         (p.pedido_itens || []).forEach((item: any) => {
             const pname = item.produto?.nome;
             if (pname) {
                 if (!productTotals[pname]) {
                    productTotals[pname] = { name: pname, quantity: 0 };
                 }
                 productTotals[pname].quantity += Number(item.quantidade || 0);
             }
         });
      });
      const topProdutos = Object.values(productTotals).sort((a,b) => b.quantity - a.quantity).slice(0, 12);

      // 3. Melhores Fornecedores (Current Month)
      const { data: faturas } = await supabase
         .from('faturas')
         .select('valor_total, fornecedor:fornecedores(nome)')
         .eq('tipo', 'compra')
         .gte('created_at', startOfMonth.toISOString());
         
      const supplierTotals: Record<string, {name: string, total: number}> = {};
      (faturas || []).forEach(f => {
         const fname = f.fornecedor?.nome;
         if (fname) {
             if (!supplierTotals[fname]) {
                supplierTotals[fname] = { name: fname, total: 0 };
             }
             supplierTotals[fname].total += Number(f.valor_total || 0);
         }
      });
      const topFornecedores = Object.values(supplierTotals).sort((a,b) => b.total - a.total).slice(0, 12);

      const result = {
         topLojas,
         topProdutos,
         topFornecedores
      };
      cache.set(cacheKey, result);
      res.json(result);

    } catch (error: any) {
      console.error("Erro ao carregar dados estendidos do dashboard:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Global Search for AdminDashboard
  app.get("/api/admin/global-search", authenticateToken, async (req: any, res) => {
    if (!["admin", "armazem"].includes(req.user.role)) return res.sendStatus(403);
    const q = req.query.q?.toLowerCase();
    if (!q) return res.json({ produtos: [], lojas: [], pedidos: [] });

    try {
      // Fetch matching products (limit 5)
      const { data: produtos } = await supabase
        .from("produtos")
        .select("id, nome, categorias(nome)")
        .or(`nome.ilike.%${q}%,id.eq.${!isNaN(Number(q)) ? Number(q) : -1}`)
        .limit(5);

      // Fetch matching stores (limit 5)
      const { data: lojas } = await supabase
        .from("users")
        .select("id, name, email, role")
        .eq("role", "loja")
        .or(`name.ilike.%${q}%,email.ilike.%${q}%`)
        .limit(5);

      const queryId = !isNaN(Number(q)) ? Number(q) : -1;
      
      const { data: pedidos } = await supabase
        .from("pedidos")
        .select("id, status, user:users!inner(name)")
        .or(`id.eq.${queryId},users.name.ilike.%${q}%`)
        .limit(5);

      const mappedPedidos = (pedidos || []).map(p => ({
         ...p,
         loja_nome: p.user?.name
      }));

      res.json({
         produtos: produtos || [],
         lojas: lojas || [],
         pedidos: mappedPedidos
      });
    } catch (e: any) {
      console.error("Erro no global search:", e);
      res.status(500).json({ error: e.message });
    }
  });

}
