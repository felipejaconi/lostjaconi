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
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0,0,0,0);
      const startOfMonthIso = startOfMonth.toISOString();

      const [
        { data: vendas },
        { count: pedidosPendentes },
        { count: totalProdutos },
        { count: totalLojas },
        { data: faturasC },
        { data: prods },
        { data: monthOrders }
      ] = await Promise.all([
        supabase.from("pedidos").select("total").in("status", ["pronto", "entregue", "concluido"]),
        supabase.from("pedidos").select("*", { count: "exact", head: true }).in("status", ["pendente", "processando"]),
        supabase.from("produtos").select("*", { count: "exact", head: true }),
        supabase.from("users").select("*", { count: "exact", head: true }).eq("role", "loja"),
        supabase.from("faturas").select("tipo, valor_total, valor_pendente, data_emissao"),
        supabase.from("produtos").select("stock_armazem, preco_custo"),
        supabase.from("pedidos").select("id, total, created_at").in("status", ["pronto", "entregue", "concluido"]).gte("created_at", startOfMonthIso)
      ]);

      const totalVendas = (vendas || []).reduce((acc, v) => acc + (v.total || 0), 0);

      // ERP STATS
      let comprasMes = 0;
      let despesasMes = 0;
      let dividaFornecedores = 0;
      
      (faturasC || []).forEach(f => {
         dividaFornecedores += Number(f.valor_pendente || 0);
         const isThisMonth = new Date(f.data_emissao) > startOfMonth;
         if (isThisMonth) {
            if (f.tipo === 'compra') comprasMes += Number(f.valor_total || 0);
            if (f.tipo === 'despesa') despesasMes += Number(f.valor_total || 0);
         }
      });

      let capitalStock = 0;
      let totalStockQty = 0;
      (prods || []).forEach((p: any) => {
         const qtd = Number(p.stock_armazem || 0);
         const custo = Number(p.preco_custo || 0);
         capitalStock += (qtd * custo);
         totalStockQty += qtd;
      });

      let cmv = 0;
      let totalVendasLiquidas = 0;
      let vendasMes = 0;
      
      if (monthOrders && monthOrders.length > 0) {
         monthOrders.forEach(v => { vendasMes += Number(v.total || 0); });
         const monthOrderIds = monthOrders.map(o => o.id);
         
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
  
  app.get("/api/admin/reports/summary-metrics", authenticateToken, async (req: any, res: any) => {
    if (!["admin", "armazem"].includes(req.user.role)) return res.sendStatus(403);
    
    const { startDate, endDate } = req.query;
    const cacheKey = `admin_reports_summary_metrics_${startDate || 'all'}_${endDate || 'all'}`;
    const cached = cache.get(cacheKey);
    if (cached) return res.json(cached);

    try {
      const today = new Date();
      today.setHours(0,0,0,0);

      let faturasQuery = supabase.from("faturas").select("valor_pendente, valor_total, data_vencimento, data_emissao, status_pagamento");
      let pedidosQuery = supabase.from("pedidos").select("total, created_at, status");

      if (startDate) {
        faturasQuery = faturasQuery.gte("data_emissao", startDate);
        pedidosQuery = pedidosQuery.gte("created_at", startDate);
      }
      if (endDate) {
        faturasQuery = faturasQuery.lte("data_emissao", endDate);
        pedidosQuery = pedidosQuery.lte("created_at", endDate);
      }

      const [
        { data: faturas },
        { data: pedidos }
      ] = await Promise.all([
        faturasQuery,
        pedidosQuery
      ]);

      let totalPagarGeral = 0;
      let totalPagarVencido = 0;
      (faturas || []).forEach((f: any) => {
        if (["pendente", "parcial"].includes(f.status_pagamento)) {
          const pendente = Number(f.valor_pendente ?? f.valor_total ?? 0);
          totalPagarGeral += pendente;
          
          const vencDate = f.data_vencimento || f.data_emissao;
          if (vencDate && new Date(vencDate) < today) {
            totalPagarVencido += pendente;
          }
        }
      });

      let totalReceberVencido = 0;
      let totalRecebido = 0;
      (pedidos || []).forEach((p: any) => {
        const status = p.status?.toLowerCase();
        if (['pronto', 'entregue'].includes(status)) {
           const dt = new Date(p.created_at);
           if (dt < today) {
             totalReceberVencido += Number(p.total || 0);
           }
        } else if (status === 'concluido') {
           totalRecebido += Number(p.total || 0);
        }
      });

      const result = {
        totalPagarGeral,
        totalPagarVencido,
        totalReceberVencido,
        totalRecebido,
        saldo: totalReceberVencido - totalPagarVencido
      };

      cache.set(cacheKey, result, 30); // Cache for 30 seconds
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/admin/financial/summary", authenticateToken, async (req: any, res: any) => {
    if (!["admin", "armazem"].includes(req.user.role)) return res.sendStatus(403);
    
    try {
      const today = new Date();
      today.setHours(0,0,0,0);
      const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
      
      const [
        { data: faturas },
        { data: pedidos }
      ] = await Promise.all([
        supabase.from("faturas")
          .select("tipo, valor_total, valor_pendente, data_vencimento, data_emissao, valor_iva, fornecedor:fornecedores(nome)")
          .neq("status_pagamento", "pago"),
        supabase.from("pedidos")
          .select("total, status, created_at, pedido_itens(quantidade, preco_unitario, produto:produtos(iva))")
          .in("status", ["pronto", "entregue", "concluido"])
      ]);

      let totalPendenteCompras = 0;
      let totalPendenteDespesas = 0;
      let totalVencido = 0;
      let totalIvaCredito = 0;
      const expiringBills: any[] = [];
      
      const currentMonth = today.getMonth();
      const currentYear = today.getFullYear();

      (faturas || []).forEach((f: any) => {
        const pend = Number(f.valor_pendente ?? f.valor_total ?? 0);
        if (f.tipo === 'compra') totalPendenteCompras += pend;
        else totalPendenteDespesas += pend;

        let isOverdue = false;
        const vencDate = f.data_vencimento || f.data_emissao;
        if (vencDate) {
          const vd = new Date(vencDate);
          if (vd < today) {
            isOverdue = true;
            totalVencido += pend;
          }
          if (vd <= nextWeek && pend > 0) {
            expiringBills.push(f);
          }
        }

        // IVA calculation for current month
        const emissaoDate = new Date(f.data_emissao);
        if (emissaoDate.getMonth() === currentMonth && emissaoDate.getFullYear() === currentYear) {
          totalIvaCredito += Number(f.valor_iva || 0);
        }
      });

      let totalReceber = 0;
      let totalIvaDebito = 0;
      (pedidos || []).forEach((p: any) => {
        const isUnpaid = ["pronto", "entregue"].includes(p.status);
        const pDate = new Date(p.created_at);
        const isThisMonth = pDate.getMonth() === currentMonth && pDate.getFullYear() === currentYear;

        let orderIva = 0;
        (p.pedido_itens || []).forEach((item: any) => {
          const qty = Number(item.quantidade) || 0;
          const preco = Number(item.preco_unitario || 0);
          const liq = qty * preco;
          const ivaPerc = Number(item.produto?.iva || 0);
          orderIva += liq * (ivaPerc / 100);
        });

        if (isUnpaid) {
          totalReceber += (Number(p.total || 0) + orderIva);
        }
        if (isThisMonth) {
          totalIvaDebito += orderIva;
        }
      });

      res.json({
        totalPendenteCompras,
        totalPendenteDespesas,
        totalVencido,
        totalIvaCredito,
        totalIvaDebito,
        totalReceber,
        expiringBills: expiringBills.sort((a,b) => new Date(a.data_vencimento || a.data_emissao).getTime() - new Date(b.data_vencimento || b.data_emissao).getTime()).slice(0, 10)
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Fast Summary for AdminHome to avoid loading all orders and products
  app.get("/api/admin/home-summary", authenticateToken, async (req: any, res) => {
    if (!["admin", "armazem"].includes(req.user.role)) return res.sendStatus(403);
    
    const cacheKey = "admin_home_summary_" + req.user.role;
    const cached = cache.get(cacheKey);
    if (cached) return res.json(cached);
    
    try {
      const [
        { count: pendingOrdersCount },
        { data: recentOrders },
        { data: prods },
        { count: totalFornecedores }
      ] = await Promise.all([
        supabase.from("pedidos").select("*", { count: "exact", head: true }).in("status", ["pendente", "processando"]),
        supabase.from("pedidos").select("*, user:users(name)").order("created_at", { ascending: false }).limit(8),
        supabase.from("produtos").select("id, nome, stock_armazem, preco, preco_custo, categorias(nome)"),
        supabase.from("fornecedores").select("*", { count: "exact", head: true })
      ]);

      const mappedRecentOrders = (recentOrders || []).map((p: any) => ({
        ...p,
        loja_nome: p.user?.name,
      }));

      // Produtos Alertas
      let produtosAlertas: any[] = [];
      const isAdmin = req.user.role === "admin";
              
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

      // --- FOOD COST CALCULATION ---
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const [
        { data: monthOrders },
        { data: monthSales }
      ] = await Promise.all([
        supabase.from("pedidos")
          .select("total, pedido_itens(quantidade, preco_unitario, produto:produtos(iva))")
          .eq("user_id", req.user.id)
          .gte("created_at", startOfMonth.toISOString())
          .in("status", ["entregue", "concluido"]),
        supabase.from("fechos_caixa")
          .select("real_total, data")
          .eq("loja_id", req.user.id)
          .gte("data", startOfMonth.toISOString().split('T')[0])
          .lte("data", new Date(startOfMonth.getFullYear(), startOfMonth.getMonth() + 1, 0).toISOString().split('T')[0])
      ]);

      const totalCompras = (monthOrders || []).reduce((acc, o) => {
        let orderTotal = 0;
        if (o.pedido_itens && o.pedido_itens.length > 0) {
          o.pedido_itens.forEach((item: any) => {
            const qty = Number(item.quantidade) || 0;
            const price = Number(item.preco_unitario || 0);
            const iva = Number(item.produto?.iva || 0);
            orderTotal += (qty * price) * (1 + iva / 100);
          });
        } else {
          orderTotal = Number(o.total) || 0;
        }
        return acc + orderTotal;
      }, 0);

      const totalVendas = (monthSales || []).reduce((acc, s) => acc + (Number(s.real_total) || 0), 0);
      const foodCostRatio = totalVendas > 0 ? (totalCompras / totalVendas) * 100 : 0;

      res.json({
        ultimoPedido: ultimoPedido?.[0] || null,
        notificacoesAtivas: notificacoesCount || 0,
        chartData,
        foodCost: {
          ratio: foodCostRatio,
          totalCompras,
          totalVendas
        }
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
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);
      
      const [
        { data: pedidos },
        { data: pedidosProd },
        { data: faturas }
      ] = await Promise.all([
        supabase.from('pedidos').select('total, user_id, user:users(name)').gte('created_at', startOfMonth.toISOString()).in('status', ['pronto', 'entregue', 'concluido']),
        supabase.from('pedidos').select('pedido_itens(quantidade, produto:produtos(nome))').gte('created_at', startOfMonth.toISOString()).in('status', ['pronto', 'entregue', 'concluido']),
        supabase.from('faturas').select('valor_total, fornecedor:fornecedores(nome)').eq('tipo', 'compra').gte('data_emissao', startOfMonth.toISOString().split('T')[0])
      ]);
        
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
