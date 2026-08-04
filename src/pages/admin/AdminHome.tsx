import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../lib/api";
import { supabase } from "../../lib/supabase";
import {
  Package,
  ShoppingCart,
  Store,
  DollarSign,
  TrendingUp,
  Activity,
  Clock,
  Banknote,
  TrendingDown,
  Layers,
  Box,
  AlertTriangle,
  ArrowRight,
  Users,
  FileCode2,
  BarChart3,
  Star,
  Award,
  MapPin,
} from "lucide-react";
import { BrandTitle } from "../../components/BrandTitle";
import { useAuth } from "../../context/AuthContext";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

const pinIcon = new L.DivIcon({
  className: "custom-pin",
  html: '<div style="width: 20px; height: 20px; background-color: #f43f5e; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 10px rgba(244,63,94,0.8); animation: pulse 2s infinite;"></div>',
  iconSize: [20, 20],
  iconAnchor: [10, 10],
});

const storeLocations: { name: string; pos: [number, number] }[] = [
  { name: "Arruda dos Vinhos", pos: [38.9839, -9.0769] },
  { name: "Carregado (Loja 1)", pos: [39.0208, -8.9769] },
  { name: "Carregado (Loja 2)", pos: [39.0258, -8.9699] },
  { name: "Alenquer (Loja 1)", pos: [39.0533, -9.0097] },
  { name: "Alenquer (Loja 2)", pos: [39.0573, -9.0207] },
  { name: "Benavente", pos: [38.9753, -8.8105] },
  { name: "Cartaxo", pos: [39.1606, -8.7869] },
  { name: "Castanheira do Ribatejo", pos: [38.995, -8.97] },
  { name: "Povos, Vila Franca de Xira", pos: [38.9665, -8.977] },
];
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend,
  CartesianAxis,
} from "recharts";

export default function AdminHome() {
  const [stats, setStats] = useState<any>(null);
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [produtosAlertas, setProdutosAlertas] = useState<any[]>([]);
  const [pendingOrdersCount, setPendingOrdersCount] = useState(0);
  const [totalFornecedores, setTotalFornecedores] = useState(0);
  const [extendedStats, setExtendedStats] = useState<any>(null);
  const [chartData, setChartData] = useState<any[]>([]);
  const [chartMonth, setChartMonth] = useState(new Date().getMonth());
  const [chartYear, setChartYear] = useState(new Date().getFullYear());
  const [dashboardTab, setDashboardTab] = useState<"lojas" | "produtos" | "fornecedores">("lojas");
  const [alertsTab, setAlertsTab] = useState<"alertas" | "movimentacoes">("alertas");
  const { user } = useAuth();
  const navigate = useNavigate();

  const fetchStats = () => {
    api
      .get("/admin/stats")
      .then((res) => setStats(res.data))
      .catch(console.error);
    api
      .get("/admin/dashboard-extended")
      .then((res) => setExtendedStats(res.data))
      .catch(console.error);
    api
      .get("/admin/home-summary")
      .then((res: any) => {
        setRecentOrders(res.data.recentOrders);
        setPendingOrdersCount(res.data.pendingOrdersCount);
        setProdutosAlertas(res.data.produtosAlertas);
        setTotalFornecedores(res.data.totalFornecedores || 0);
      })
      .catch(console.error);
  };

  const fetchChartData = () => {
    api
      .get(`/admin/chart-data?month=${chartMonth}&year=${chartYear}`)
      .then((res) => setChartData(res.data))
      .catch(console.error);
  };

  useEffect(() => {
    fetchChartData();
  }, [chartMonth, chartYear]);

  const fetchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    fetchStats();
    fetchChartData();

    const debouncedFetch = () => {
      if (fetchTimeoutRef.current) clearTimeout(fetchTimeoutRef.current);
      fetchTimeoutRef.current = setTimeout(() => {
        fetchStats();
        fetchChartData();
      }, 500);
    };

    const channel = supabase
      .channel("admin-home-orders")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "pedidos" },
        () => debouncedFetch(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "produtos" },
        () => debouncedFetch(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "faturas" },
        () => debouncedFetch(),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      if (fetchTimeoutRef.current) clearTimeout(fetchTimeoutRef.current);
    };
  }, [user]);

  const isAdmin = user?.role === "admin";
  const erp = stats?.erp || {
    comprasMes: 0,
    despesasMes: 0,
    dividaFornecedores: 0,
    capitalStock: 0,
    lucroBruto: 0,
    lucroLiquido: 0,
    vendasMes: 0,
  };

  return (
    <div className="pt-2 px-4 md:pt-4 md:px-6 lg:px-8 pb-10">
      <div className="flex flex-col mb-4 items-center md:items-start w-full">
        <BrandTitle />
        <h2 className="text-lg sm:text-xl mt-2 ml-[89px] flex items-center gap-2 text-[#facc15] tracking-wider leading-tight" style={{ fontFamily: "'Yellowtail', cursive", textShadow: "2px 2px 4px rgba(0,0,0,0.5)" }}>
          <span className="truncate">
            Logística e Financeiro
          </span>
        </h2>
      </div>

      {isAdmin && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-4">
          <div className="bg-[#0a0a0a] p-4 sm:p-6 rounded-2xl border border-white/5 shadow-lg relative overflow-hidden flex flex-col justify-between group hover:border-white/10 transition-colors">
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-3xl -mr-10 -mt-10 transition-all group-hover:bg-blue-500/10"></div>
            <div className="flex items-center justify-between mb-2 sm:mb-4 relative z-10">
              <h3 className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-widest line-clamp-1">
                Faturação (Mês)
              </h3>
              <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
                <TrendingUp className="text-blue-500 w-4 h-4 shrink-0" />
              </div>
            </div>
            <div className="relative z-10">
              <p className="text-xl sm:text-3xl font-black text-white truncate">
                €{" "}
                {erp.vendasMes.toLocaleString("pt-PT", {
                  minimumFractionDigits: 2,
                })}
              </p>
            </div>
          </div>

          <div className="bg-[#0a0a0a] p-4 sm:p-6 rounded-2xl border border-white/5 shadow-lg relative overflow-hidden flex flex-col justify-between group hover:border-white/10 transition-colors">
            <div
              className={`absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl -mr-10 -mt-10 transition-all ${erp.lucroLiquido < 0 ? "bg-red-500/5 group-hover:bg-red-500/10" : "bg-emerald-500/5 group-hover:bg-emerald-500/10"}`}
            ></div>
            <div className="flex items-center justify-between mb-2 sm:mb-4 relative z-10">
              <h3 className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-widest line-clamp-1">
                Lucro Líquido
              </h3>
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center border ${erp.lucroLiquido < 0 ? "bg-red-500/10 border-red-500/20" : "bg-emerald-500/10 border-emerald-500/20"}`}
              >
                <DollarSign
                  className={`w-4 h-4 shrink-0 ${erp.lucroLiquido < 0 ? "text-red-500" : "text-emerald-500"}`}
                />
              </div>
            </div>
            <div className="relative z-10">
              <p
                className={`text-xl sm:text-3xl font-black truncate ${erp.lucroLiquido < 0 ? "text-red-400" : "text-emerald-400"}`}
              >
                €{" "}
                {erp.lucroLiquido.toLocaleString("pt-PT", {
                  minimumFractionDigits: 2,
                })}
              </p>
            </div>
          </div>

          <div className="bg-[#0a0a0a] p-4 sm:p-6 rounded-2xl border border-white/5 shadow-lg relative overflow-hidden flex flex-col justify-between group hover:border-white/10 transition-colors">
            <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/5 rounded-full blur-3xl -mr-10 -mt-10 transition-all group-hover:bg-purple-500/10"></div>
            <div className="flex items-center justify-between mb-2 sm:mb-4 relative z-10">
              <h3 className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-widest line-clamp-1">
                Cap. Stock
              </h3>
              <div className="w-8 h-8 rounded-full bg-purple-500/10 flex items-center justify-center border border-purple-500/20">
                <Box className="text-purple-500 w-4 h-4 shrink-0" />
              </div>
            </div>
            <div className="relative z-10">
              <p className="text-xl sm:text-3xl font-black text-white truncate">
                €{" "}
                {erp.capitalStock.toLocaleString("pt-PT", {
                  minimumFractionDigits: 2,
                })}
              </p>
            </div>
          </div>

          <div className="bg-[#0a0a0a] p-4 sm:p-6 rounded-2xl border border-white/5 shadow-lg relative overflow-hidden flex flex-col justify-between group hover:border-white/10 transition-colors">
            <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/5 rounded-full blur-3xl -mr-10 -mt-10 transition-all group-hover:bg-orange-500/10"></div>
            <div className="flex items-center justify-between mb-2 sm:mb-4 relative z-10">
              <h3 className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-widest line-clamp-1">
                A Pagar
              </h3>
              <div className="w-8 h-8 rounded-full bg-orange-500/10 flex items-center justify-center border border-orange-500/20">
                <Clock className="text-orange-500 w-4 h-4 shrink-0" />
              </div>
            </div>
            <div className="relative z-10">
              <p className="text-xl sm:text-3xl font-black text-white truncate">
                €{" "}
                {erp.dividaFornecedores.toLocaleString("pt-PT", {
                  minimumFractionDigits: 2,
                })}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Operacional Overview */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3 sm:gap-4 mt-3 sm:mt-4">
        <div
          className="bg-[#0a0a0a]/80 backdrop-blur-md p-3 sm:p-4 rounded-2xl border border-emerald-500/10 shadow-lg relative overflow-hidden flex flex-col justify-between cursor-pointer group hover:border-emerald-500/20 transition-all"
          onClick={() => navigate("/admin/armazem/fatura")}
        >
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-3xl -mr-10 -mt-10 transition-all group-hover:bg-emerald-500/10"></div>
          <div className="flex items-center justify-between mb-1 sm:mb-2 relative z-10">
            <h3 className="text-[9px] sm:text-[11px] font-bold text-slate-400 group-hover:text-emerald-400 transition-colors uppercase tracking-widest line-clamp-1">
              Nova Fatura
            </h3>
            <FileCode2 className="text-emerald-500 w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0 transition-transform group-hover:scale-110" />
          </div>
          <div className="flex items-end justify-between mt-1 relative z-10">
            <p className="text-lg sm:text-2xl font-black text-white group-hover:text-emerald-50 transition-colors">
              Criar
            </p>
            <span className="text-[10px] sm:text-[11px] text-emerald-600/70 group-hover:text-emerald-500 font-bold flex items-center transition-colors">
              Acessar <ArrowRight className="w-3 h-3 ml-1" />
            </span>
          </div>
        </div>

        <div
          className="bg-[#0a0a0a]/80 backdrop-blur-md p-3 sm:p-4 rounded-2xl border border-yellow-500/10 shadow-lg relative overflow-hidden flex flex-col justify-between cursor-pointer group hover:border-yellow-500/20 transition-all"
          onClick={() => navigate("/admin/pedidos")}
        >
          <div className="absolute top-0 right-0 w-24 h-24 bg-yellow-500/5 rounded-full blur-3xl -mr-10 -mt-10 transition-all group-hover:bg-yellow-500/10"></div>
          <div className="flex items-center justify-between mb-1 sm:mb-2 relative z-10">
            <h3 className="text-[9px] sm:text-[11px] font-bold text-slate-400 group-hover:text-yellow-400 transition-colors uppercase tracking-widest line-clamp-1">
              Pedidos
            </h3>
            <Activity className="text-yellow-500 w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0 transition-transform group-hover:scale-110" />
          </div>
          <div className="flex items-end justify-between mt-1 relative z-10">
            <p className="text-lg sm:text-2xl font-black text-white group-hover:text-yellow-50 transition-colors">
              {pendingOrdersCount}
            </p>
            <span className="text-[10px] sm:text-[11px] text-yellow-600/70 group-hover:text-yellow-500 font-bold flex items-center transition-colors">
              Acessar <ArrowRight className="w-3 h-3 ml-1" />
            </span>
          </div>
        </div>

        <div
          className="bg-[#0a0a0a]/80 backdrop-blur-md p-3 sm:p-4 rounded-2xl border border-orange-500/10 shadow-lg relative overflow-hidden flex flex-col justify-between cursor-pointer group hover:border-orange-500/20 transition-all"
          onClick={() => navigate("/admin/estoque-global")}
        >
          <div className="absolute top-0 right-0 w-24 h-24 bg-orange-500/5 rounded-full blur-3xl -mr-10 -mt-10 transition-all group-hover:bg-orange-500/10"></div>
          <div className="flex items-center justify-between mb-1 sm:mb-2 relative z-10">
            <h3 className="text-[9px] sm:text-[11px] font-bold text-slate-400 group-hover:text-orange-400 transition-colors uppercase tracking-widest line-clamp-1">
              Armazém
            </h3>
            <Package className="text-orange-500 w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0 transition-transform group-hover:scale-110" />
          </div>
          <div className="flex items-end justify-between mt-1 relative z-10">
            <p className="text-lg sm:text-2xl font-black text-white group-hover:text-orange-50 transition-colors">
              {stats?.totalStockQty || 0}
            </p>
            <span className="text-[10px] sm:text-[11px] text-orange-600/70 group-hover:text-orange-500 font-bold flex items-center transition-colors">
              Acessar <ArrowRight className="w-3 h-3 ml-1" />
            </span>
          </div>
        </div>

        <div
          className="bg-[#0a0a0a]/80 backdrop-blur-md p-3 sm:p-4 rounded-2xl border border-purple-500/10 shadow-lg relative overflow-hidden flex flex-col justify-between cursor-pointer group hover:border-purple-500/20 transition-all"
          onClick={() => navigate("/admin/fornecedores")}
        >
          <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/5 rounded-full blur-3xl -mr-10 -mt-10 transition-all group-hover:bg-purple-500/10"></div>
          <div className="flex items-center justify-between mb-1 sm:mb-2 relative z-10">
            <h3 className="text-[9px] sm:text-[11px] font-bold text-slate-400 group-hover:text-purple-400 transition-colors uppercase tracking-widest line-clamp-1">
              Fornecedores
            </h3>
            <Users className="text-purple-500 w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0 transition-transform group-hover:scale-110" />
          </div>
          <div className="flex items-end justify-between mt-1 relative z-10">
            <p className="text-lg sm:text-2xl font-black text-white group-hover:text-purple-50 transition-colors">
              {totalFornecedores}
            </p>
            <span className="text-[10px] sm:text-[11px] text-purple-600/70 group-hover:text-purple-500 font-bold flex items-center transition-colors">
              Acessar <ArrowRight className="w-3 h-3 ml-1" />
            </span>
          </div>
        </div>

        <div
          className="bg-[#0a0a0a]/80 backdrop-blur-md p-3 sm:p-4 rounded-2xl border border-red-500/10 shadow-lg relative overflow-hidden flex flex-col justify-between cursor-pointer group hover:border-red-500/20 transition-all"
          onClick={() => navigate("/admin/financeiro")}
        >
          <div className="absolute top-0 right-0 w-24 h-24 bg-red-500/5 rounded-full blur-3xl -mr-10 -mt-10 transition-all group-hover:bg-red-500/10"></div>
          <div className="flex items-center justify-between mb-1 sm:mb-2 relative z-10">
            <h3 className="text-[9px] sm:text-[11px] font-bold text-slate-400 group-hover:text-red-400 transition-colors uppercase tracking-widest line-clamp-1">
              Financeiro
            </h3>
            <Banknote className="text-red-500 w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0 transition-transform group-hover:scale-110" />
          </div>
          <div className="flex items-end justify-between mt-1 relative z-10">
            <p className="text-lg sm:text-2xl font-black text-white group-hover:text-red-50 transition-colors">
              Gerir
            </p>
            <span className="text-[10px] sm:text-[11px] text-red-600/70 group-hover:text-red-500 font-bold flex items-center transition-colors">
              Acessar <ArrowRight className="w-3 h-3 ml-1" />
            </span>
          </div>
        </div>
      </div>

      {isAdmin && (
        <div className="mt-4 sm:mt-6 bg-[#0a0a0a] p-4 sm:p-6 rounded-2xl border border-white/5 shadow-lg w-full">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
            <div>
              <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                <BarChart3 className="text-blue-500 w-4 h-4 sm:w-5 sm:h-5" />{" "}
                Fluxo Financeiro
              </h3>
              <p className="text-[10px] sm:text-[11px] text-slate-500 mt-1 font-medium">
                Comparativo diário de Faturação, Despesas e Compras
              </p>
            </div>
            <div className="flex items-center gap-2">
              <select
                value={chartMonth}
                onChange={(e) => setChartMonth(Number(e.target.value))}
                className="bg-[#1a1a1a] border border-white/10 text-white text-xs rounded-lg px-3 py-1.5 focus:outline-none focus:border-blue-500"
              >
                {Array.from({ length: 12 }).map((_, i) => (
                  <option key={i} value={i}>
                    {new Date(0, i).toLocaleString("pt-PT", { month: "long" })}
                  </option>
                ))}
              </select>
              <select
                value={chartYear}
                onChange={(e) => setChartYear(Number(e.target.value))}
                className="bg-[#1a1a1a] border border-white/10 text-white text-xs rounded-lg px-3 py-1.5 focus:outline-none focus:border-blue-500"
              >
                {Array.from({ length: 5 }).map((_, i) => {
                  const year = new Date().getFullYear() - i;
                  return (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  );
                })}
              </select>
            </div>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={chartData}
                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="colorVendas" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient
                    id="colorDespesas"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#ffffff10"
                  vertical={false}
                />
                <XAxis
                  dataKey="name"
                  stroke="#94a3b8"
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke="#94a3b8"
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => `€${(value / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#0f172a",
                    borderColor: "#ffffff20",
                    borderRadius: "12px",
                    fontSize: "12px",
                  }}
                  itemStyle={{ fontWeight: "bold" }}
                  formatter={(value: number) =>
                    `€ ${value.toLocaleString("pt-PT", { minimumFractionDigits: 2 })}`
                  }
                />
                <Legend
                  iconType="circle"
                  wrapperStyle={{
                    fontSize: "11px",
                    fontWeight: "bold",
                    color: "#cbd5e1",
                  }}
                />
                <Area
                  type="monotone"
                  name="Faturação"
                  dataKey="vendas"
                  stroke="#3b82f6"
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#colorVendas)"
                />
                <Area
                  type="monotone"
                  name="Despesas Gerais"
                  dataKey="despesas"
                  stroke="#ef4444"
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#colorDespesas)"
                />
                <Area
                  type="monotone"
                  name="Compras"
                  dataKey="compras"
                  stroke="#f59e0b"
                  strokeWidth={3}
                  fillOpacity={0}
                  fill="none"
                  strokeDasharray="5 5"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {isAdmin && (
        <div className="bg-[#0a0a0a] rounded-xl border border-white/10 flex flex-col h-[400px] mt-4 sm:mt-6 overflow-hidden">
          <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-white/5 shrink-0 overflow-x-auto custom-scrollbar">
            <div className="flex items-center gap-6 min-w-max">
              <button
                onClick={() => setDashboardTab("lojas")}
                className={`text-sm font-semibold flex items-center gap-2 pb-1 transition-colors relative ${dashboardTab === "lojas" ? "text-white" : "text-slate-500 hover:text-slate-300"}`}
              >
                <Store className={`w-4 h-4 ${dashboardTab === "lojas" ? "text-purple-500" : ""}`} /> Top Lojas
                {dashboardTab === "lojas" && <span className="absolute -bottom-[17px] left-0 right-0 h-0.5 bg-purple-500 rounded-t-full"></span>}
              </button>
              <button
                onClick={() => setDashboardTab("produtos")}
                className={`text-sm font-semibold flex items-center gap-2 pb-1 transition-colors relative ${dashboardTab === "produtos" ? "text-white" : "text-slate-500 hover:text-slate-300"}`}
              >
                <Star className={`w-4 h-4 ${dashboardTab === "produtos" ? "text-emerald-500" : ""}`} /> Top Produtos
                {dashboardTab === "produtos" && <span className="absolute -bottom-[17px] left-0 right-0 h-0.5 bg-emerald-500 rounded-t-full"></span>}
              </button>
              <button
                onClick={() => setDashboardTab("fornecedores")}
                className={`text-sm font-semibold flex items-center gap-2 pb-1 transition-colors relative ${dashboardTab === "fornecedores" ? "text-white" : "text-slate-500 hover:text-slate-300"}`}
              >
                <Award className={`w-4 h-4 ${dashboardTab === "fornecedores" ? "text-blue-500" : ""}`} /> Top Fornecedores
                {dashboardTab === "fornecedores" && <span className="absolute -bottom-[17px] left-0 right-0 h-0.5 bg-blue-500 rounded-t-full"></span>}
              </button>
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto custom-scrollbar p-4 sm:p-6">
            {dashboardTab === "lojas" && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {!extendedStats || extendedStats.topLojas?.length === 0 ? (
                  <div className="text-center py-6 text-sm text-slate-500 font-medium col-span-full">
                    Sem dados.
                  </div>
                ) : (
                  extendedStats.topLojas?.map((loja: any, i: number) => (
                    <div
                      key={i}
                      className="flex justify-between items-center bg-white/[0.02] p-3 sm:p-4 rounded-xl border border-white/5 hover:border-white/10 transition-colors"
                    >
                      <div className="flex items-center gap-3 overflow-hidden">
                        <div className="w-6 h-6 rounded-full bg-purple-500/10 flex items-center justify-center shrink-0">
                          <span className="text-[10px] font-bold text-purple-400">
                            {i + 1}
                          </span>
                        </div>
                        <p className="text-sm font-medium text-slate-300 truncate">
                          {loja.name}
                        </p>
                      </div>
                      <p className="text-sm font-semibold text-white ml-2">
                        €{" "}
                        {loja.total.toLocaleString("pt-PT", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </p>
                    </div>
                  ))
                )}
              </div>
            )}
            
            {dashboardTab === "produtos" && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {!extendedStats || extendedStats.topProdutos?.length === 0 ? (
                  <div className="text-center py-6 text-sm text-slate-500 font-medium col-span-full">
                    Sem dados.
                  </div>
                ) : (
                  extendedStats.topProdutos?.map((prod: any, i: number) => (
                    <div
                      key={i}
                      className="flex justify-between items-center bg-white/[0.02] p-3 sm:p-4 rounded-xl border border-white/5 hover:border-white/10 transition-colors"
                    >
                      <div className="flex items-center gap-3 overflow-hidden">
                        <div className="w-6 h-6 rounded-full bg-emerald-500/10 flex items-center justify-center shrink-0">
                          <span className="text-[10px] font-bold text-emerald-400">
                            {i + 1}
                          </span>
                        </div>
                        <p className="text-sm font-medium text-slate-300 truncate">
                          {prod.name}
                        </p>
                      </div>
                      <p className="text-sm font-bold text-emerald-500 bg-emerald-500/10 px-2.5 py-1 rounded-lg ml-2 shrink-0">
                        {prod.quantity.toLocaleString("pt-PT", {
                          maximumFractionDigits: 2,
                        })}{" "}
                        <span className="text-[10px] font-medium text-emerald-600/70">
                          {prod.unidade || "Un"}
                        </span>
                      </p>
                    </div>
                  ))
                )}
              </div>
            )}
            
            {dashboardTab === "fornecedores" && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {!extendedStats || extendedStats.topFornecedores?.length === 0 ? (
                  <div className="text-center py-6 text-sm text-slate-500 font-medium col-span-full">
                    Sem dados.
                  </div>
                ) : (
                  extendedStats.topFornecedores?.map((forn: any, i: number) => (
                    <div
                      key={i}
                      className="flex justify-between items-center bg-white/[0.02] p-3 sm:p-4 rounded-xl border border-white/5 hover:border-white/10 transition-colors"
                    >
                      <div className="flex items-center gap-3 overflow-hidden">
                        <div className="w-6 h-6 rounded-full bg-blue-500/10 flex items-center justify-center shrink-0">
                          <span className="text-[10px] font-bold text-blue-400">
                            {i + 1}
                          </span>
                        </div>
                        <p className="text-sm font-medium text-slate-300 truncate">
                          {forn.name}
                        </p>
                      </div>
                      <p className="text-sm font-semibold text-white ml-2">
                        €{" "}
                        {forn.total.toLocaleString("pt-PT", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </p>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      )}

      <div className="bg-[#0a0a0a] rounded-xl border border-white/10 flex flex-col h-[500px] mt-4 sm:mt-6 overflow-hidden">
        <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-white/5 shrink-0 overflow-x-auto custom-scrollbar">
          <div className="flex items-center gap-6 min-w-max">
            <button
              onClick={() => setAlertsTab("alertas")}
              className={`text-sm font-semibold flex items-center gap-2 pb-1 transition-colors relative ${alertsTab === "alertas" ? "text-white" : "text-slate-500 hover:text-slate-300"}`}
            >
              <AlertTriangle className={`w-4 h-4 ${alertsTab === "alertas" ? "text-yellow-500" : ""}`} /> Alertas de Produtos
              {alertsTab === "alertas" && <span className="absolute -bottom-[17px] left-0 right-0 h-0.5 bg-yellow-500 rounded-t-full"></span>}
            </button>
            <button
              onClick={() => setAlertsTab("movimentacoes")}
              className={`text-sm font-semibold flex items-center gap-2 pb-1 transition-colors relative ${alertsTab === "movimentacoes" ? "text-white" : "text-slate-500 hover:text-slate-300"}`}
            >
              <ShoppingCart className={`w-4 h-4 ${alertsTab === "movimentacoes" ? "text-blue-500" : ""}`} /> Movimentações Recentes
              {alertsTab === "movimentacoes" && <span className="absolute -bottom-[17px] left-0 right-0 h-0.5 bg-blue-500 rounded-t-full"></span>}
            </button>
          </div>
          
          {alertsTab === "movimentacoes" && (
            <button
              onClick={() => navigate("/admin/pedidos")}
              className="text-[10px] sm:text-[11px] text-blue-500 hover:text-blue-400 font-medium flex items-center gap-1 bg-blue-500/10 px-3 py-1.5 rounded-full transition-colors ml-4 shrink-0"
            >
              Grelha <ArrowRight className="w-3 h-3" />
            </button>
          )}
        </div>
        
        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 sm:p-6 space-y-2">
          {alertsTab === "alertas" && (
            <>
              {produtosAlertas.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full p-8 bg-white/[0.02] rounded-xl border border-white/5">
                  <div className="w-10 h-10 bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center mb-3">
                    <Package size={20} />
                  </div>
                  <p className="text-sm font-semibold text-white">
                    Stock Saudável
                  </p>
                  <p className="text-[10px] text-slate-500 mt-1">
                    Nenhum produto a reportar no momento.
                  </p>
                </div>
              ) : (
                produtosAlertas.map((prod, i) => {
                  const preco = Number(prod.preco || 0);
                  const custo = Number(prod.preco_custo || 0);
                  const stock = Number(prod.stock_armazem || 0);
                  const mrg = custo > 0 ? ((preco - custo) / (custo || 1)) * 100 : preco > 0 ? 100 : 0;
                  
                  return (
                    <div
                      key={prod.id || i}
                      className="flex flex-col p-3 bg-white/[0.02] rounded-lg border border-white/5 hover:border-white/10 transition-colors group"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 pr-3">
                          <p className="text-sm font-semibold text-white leading-snug mb-2 group-hover:text-amber-400 transition-colors">
                            {prod.nome}
                          </p>
                          <div className="flex flex-wrap gap-2 text-[11px] font-medium">
                            <span className={`px-2 py-0.5 rounded border ${stock < 10 ? "bg-red-500/10 text-red-500 border-red-500/20" : "bg-white/5 text-slate-400 border-white/10"}`}>
                              Stock: {stock.toLocaleString("pt-PT", { maximumFractionDigits: 2 })} {prod.unidade_base || "un"}
                            </span>
                            {isAdmin && (
                              <span className={`px-2 py-0.5 rounded border ${mrg < 15 ? "bg-yellow-500/10 text-yellow-500 border-yellow-500/20" : "bg-white/5 text-slate-400 border-white/10"}`}>
                                Margem: {mrg.toFixed(1)}%
                              </span>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={() => navigate("/admin/produtos?search=" + encodeURIComponent(prod.nome))}
                          className="p-2 text-slate-500 hover:text-white hover:bg-white/5 rounded-lg transition-colors shrink-0 tooltip-trigger"
                          title="Ver Produto"
                        >
                          <ArrowRight size={16} />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </>
          )}

          {alertsTab === "movimentacoes" && (
            <>
              {recentOrders.length === 0 ? (
                <div className="text-center py-12 text-sm text-slate-500 font-medium bg-white/[0.02] rounded-xl border border-white/5 h-full flex items-center justify-center">
                  Sem pedidos recentes.
                </div>
              ) : (
                recentOrders.map((order) => (
                  <div
                    key={order.id}
                    onClick={() => navigate("/admin/pedidos")}
                    className="flex items-center justify-between p-3 bg-white/[0.02] rounded-lg border border-white/5 hover:border-white/10 transition-colors cursor-pointer group"
                  >
                    <div className="flex items-center gap-3 overflow-hidden">
                      <div className="w-10 h-10 rounded-lg bg-blue-500/10 text-blue-400 font-bold border border-blue-500/20 flex flex-col items-center justify-center shrink-0">
                        <span className="text-[9px] text-blue-500/70 font-medium uppercase tracking-widest leading-none mb-0.5">
                          ID
                        </span>
                        <span className="text-sm leading-none">
                          {order.id.toString().slice(-3)}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-white mb-0.5 truncate group-hover:text-blue-400 transition-colors">
                          {order.loja_nome || order.user?.name || "Loja Desconhecida"}
                        </p>
                        <p className="text-[10px] text-slate-400 flex items-center gap-1.5">
                          <Clock className="w-3 h-3 text-slate-500" />{" "}
                          {new Date(order.created_at).toLocaleString("pt-PT", {
                            hour: "2-digit",
                            minute: "2-digit",
                            day: "2-digit",
                            month: "short",
                          })}
                        </p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      {isAdmin && (
                        <p className="text-sm font-bold text-white">
                          € {Number(order.total || 0).toLocaleString("pt-PT", { minimumFractionDigits: 2 })}
                        </p>
                      )}
                      <p className={`text-[9px] font-black mt-1 uppercase tracking-widest px-2 py-0.5 rounded inline-block ${order.status === "pendente" ? "bg-amber-500/10 text-amber-500 border border-amber-500/20" : order.status === "concluido" || order.status === "entregue" ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20" : "bg-blue-500/10 text-blue-500 border border-blue-500/20"}`}>
                        {order.status}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </>
          )}
        </div>
      </div>

      {/* Real Map Section */}
      {isAdmin && (
        <div className="bg-[#0a0a0a] p-4 sm:p-6 rounded-xl border border-white/10 mt-4 sm:mt-6 flex flex-col h-[500px]">
          <div className="flex items-center justify-between mb-4 sm:mb-5 shrink-0">
            <div>
              <h3 className="text-sm sm:text-base font-semibold text-white flex items-center gap-2">
                <MapPin className="text-rose-500 w-4 h-4 sm:w-5 sm:h-5" />{" "}
                Distribuição de Lojas
              </h3>
              <p className="text-[10px] sm:text-[11px] text-slate-500 font-medium">
                Mapa de localização em tempo real
              </p>
            </div>
          </div>
          <div className="flex-1 w-full relative rounded-lg overflow-hidden border border-white/5 z-0">
            <MapContainer
              center={[39.04, -8.95]}
              zoom={11}
              className="w-full h-full bg-[#0a0a0a]"
              zoomControl={true}
              scrollWheelZoom={false}
            >
              <TileLayer
                url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
              />
              {storeLocations.map((store, idx) => (
                <Marker key={idx} position={store.pos} icon={pinIcon}>
                  <Popup className="custom-popup">
                    <div className="text-center font-bold text-slate-800 text-xs">
                      {store.name}
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          </div>
        </div>
      )}
    </div>
  );
}
