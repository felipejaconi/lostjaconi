import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../lib/api";
import { supabase } from "../../lib/supabase";
import {
  Package,
  DollarSign,
  TrendingUp,
  Activity,
  Clock,
  Banknote,
  TrendingDown,
  Layers,
  Box,
  ArrowRight,
  Users,
  FileCode2,
  FileText,
  BarChart3,
  PieChart,
  Tags,
  Car,
  History,
} from "lucide-react";
import { BrandTitle } from "../../components/BrandTitle";
import { useAuth } from "../../context/AuthContext";
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
  const [pendingOrdersCount, setPendingOrdersCount] = useState(0);
  const [totalFornecedores, setTotalFornecedores] = useState(0);
  const [chartData, setChartData] = useState<any[]>([]);
  const [chartMonth, setChartMonth] = useState(new Date().getMonth());
  const [chartYear, setChartYear] = useState(new Date().getFullYear());
  const { user } = useAuth();
  const navigate = useNavigate();

  const fetchStats = () => {
    api
      .get("/admin/stats")
      .then((res) => setStats(res.data))
      .catch(console.error);
    api
      .get("/admin/home-summary")
      .then((res: any) => {
        setPendingOrdersCount(res.data.pendingOrdersCount);
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
    // fetchChartData is already called by the other useEffect

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

  const formatEuro = (val: number) => {
    const num = Number(val || 0);
    const absFormatted = Math.abs(num).toLocaleString("pt-PT", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    return num < 0 ? `-€ ${absFormatted}` : `€ ${absFormatted}`;
  };

  if (!isAdmin) {
    return (
      <div className="h-full flex flex-col p-4 sm:p-6 lg:p-8 gap-4 sm:gap-6 max-w-6xl mx-auto w-full">
        <div className="flex flex-col items-center justify-center shrink-0 w-full mb-2">
          <BrandTitle showLogo />
          <h2
            className="text-lg sm:text-2xl lg:text-3xl text-[#facc15] mt-0 text-center tracking-wide"
            style={{
              fontFamily: "'Yellowtail', cursive",
              textShadow: "2px 2px 4px rgba(0,0,0,0.5)",
            }}
          >
            {user?.name || "Logística e Armazém"}
          </h2>
        </div>

        <div className="flex-1 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4 lg:gap-5 w-full h-full pb-4">
          {/* 1. Nova Fatura */}
          <div
            onClick={() => navigate("/admin/armazem/fatura")}
            className="bg-[#0a0a0a] border border-white/10 p-4 sm:p-5 rounded-xl relative overflow-hidden group hover:border-emerald-500/50 transition-colors cursor-pointer flex flex-col items-center text-center shadow-lg min-h-[160px] lg:min-h-[220px] justify-between"
          >
            <div className="flex flex-col items-center justify-center flex-1 group-hover:-translate-y-1 transition-transform duration-300 w-full">
              <div className="w-10 h-10 sm:w-14 sm:h-14 shrink-0 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center mb-2 sm:mb-3 group-hover:bg-emerald-500/10 group-hover:border-emerald-500/30 transition-colors">
                <FileCode2 className="text-emerald-500 w-5 h-5 sm:w-7 sm:h-7" strokeWidth={1.5} />
              </div>
              <h3 className="text-white font-semibold text-[13px] sm:text-[15px] lg:text-lg tracking-tight mb-1 leading-tight whitespace-nowrap">
                Nova Fatura
              </h3>
            </div>

            <div className="flex items-center gap-1 sm:gap-1.5 text-[10px] sm:text-xs font-semibold text-slate-500 group-hover:text-emerald-500 mt-2 transition-colors w-full justify-center shrink-0 whitespace-nowrap">
              CRIAR FATURA <ArrowRight className="group-hover:translate-x-1 transition-transform w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" />
            </div>
          </div>

          {/* 2. Faturas */}
          <div
            onClick={() => navigate("/admin/armazem/faturas-subidas")}
            className="bg-[#0a0a0a] border border-white/10 p-4 sm:p-5 rounded-xl relative overflow-hidden group hover:border-blue-500/50 transition-colors cursor-pointer flex flex-col items-center text-center shadow-lg min-h-[160px] lg:min-h-[220px] justify-between"
          >
            <div className="flex flex-col items-center justify-center flex-1 group-hover:-translate-y-1 transition-transform duration-300 w-full">
              <div className="w-10 h-10 sm:w-14 sm:h-14 shrink-0 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center mb-2 sm:mb-3 group-hover:bg-blue-500/10 group-hover:border-blue-500/30 transition-colors">
                <FileText className="text-blue-500 w-5 h-5 sm:w-7 sm:h-7" strokeWidth={1.5} />
              </div>
              <h3 className="text-white font-semibold text-[13px] sm:text-[15px] lg:text-lg tracking-tight mb-1 leading-tight whitespace-nowrap">
                Faturas
              </h3>
            </div>

            <div className="flex items-center gap-1 sm:gap-1.5 text-[10px] sm:text-xs font-semibold text-slate-500 group-hover:text-blue-500 mt-2 transition-colors w-full justify-center shrink-0 whitespace-nowrap">
              Aceder Faturas <ArrowRight className="group-hover:translate-x-1 transition-transform w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" />
            </div>
          </div>

          {/* 3. Pedidos */}
          <div
            onClick={() => navigate("/admin/armazem/pedidos")}
            className="bg-[#0a0a0a] border border-white/10 p-4 sm:p-5 rounded-xl relative overflow-hidden group hover:border-yellow-500/50 transition-colors cursor-pointer flex flex-col items-center text-center shadow-lg min-h-[160px] lg:min-h-[220px] justify-between"
          >
            <div className="flex flex-col items-center justify-center flex-1 group-hover:-translate-y-1 transition-transform duration-300 w-full">
              <div className="w-10 h-10 sm:w-14 sm:h-14 shrink-0 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center mb-2 sm:mb-3 relative group-hover:bg-yellow-500/10 group-hover:border-yellow-500/30 transition-colors">
                <Activity className="text-yellow-500 w-5 h-5 sm:w-7 sm:h-7" strokeWidth={1.5} />
                {pendingOrdersCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-3 h-3 sm:w-4 sm:h-4 bg-yellow-500 rounded-full border-2 border-[#0a0a0a]"></span>
                )}
              </div>
              <h3 className="text-white font-semibold text-[13px] sm:text-[15px] lg:text-lg tracking-tight mb-1 leading-tight whitespace-nowrap">
                Pedidos
              </h3>
              <p className="text-yellow-500 text-lg sm:text-2xl lg:text-3xl font-medium mt-0 sm:mt-1 lg:mt-2 tracking-tighter tabular-nums whitespace-nowrap">
                {pendingOrdersCount}
              </p>
            </div>

            <div className="flex items-center gap-1 sm:gap-1.5 text-[10px] sm:text-xs font-semibold text-slate-500 group-hover:text-yellow-500 mt-2 transition-colors w-full justify-center shrink-0 whitespace-nowrap">
              Ver Pedidos <ArrowRight className="group-hover:translate-x-1 transition-transform w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" />
            </div>
          </div>

          {/* 4. Fornecedores */}
          <div
            onClick={() => navigate("/admin/fornecedores")}
            className="bg-[#0a0a0a] border border-white/10 p-4 sm:p-5 rounded-xl relative overflow-hidden group hover:border-purple-500/50 transition-colors cursor-pointer flex flex-col items-center text-center shadow-lg min-h-[160px] lg:min-h-[220px] justify-between"
          >
            <div className="flex flex-col items-center justify-center flex-1 group-hover:-translate-y-1 transition-transform duration-300 w-full">
              <div className="w-10 h-10 sm:w-14 sm:h-14 shrink-0 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center mb-2 sm:mb-3 relative group-hover:bg-purple-500/10 group-hover:border-purple-500/30 transition-colors">
                <Users className="text-purple-500 w-5 h-5 sm:w-7 sm:h-7" strokeWidth={1.5} />
              </div>
              <h3 className="text-white font-semibold text-[13px] sm:text-[15px] lg:text-lg tracking-tight mb-1 leading-tight whitespace-nowrap">
                Fornecedores
              </h3>
              <p className="text-purple-500 text-lg sm:text-2xl lg:text-3xl font-medium mt-0 sm:mt-1 lg:mt-2 tracking-tighter tabular-nums whitespace-nowrap">
                {totalFornecedores}
              </p>
            </div>

            <div className="flex items-center gap-1 sm:gap-1.5 text-[10px] sm:text-xs font-semibold text-slate-500 group-hover:text-purple-500 mt-2 transition-colors w-full justify-center shrink-0 whitespace-nowrap">
              Aceder Fornecedores <ArrowRight className="group-hover:translate-x-1 transition-transform w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" />
            </div>
          </div>

          {/* 5. Produtos */}
          <div
            onClick={() => navigate("/admin/armazem/produtos")}
            className="bg-[#0a0a0a] border border-white/10 p-4 sm:p-5 rounded-xl relative overflow-hidden group hover:border-cyan-500/50 transition-colors cursor-pointer flex flex-col items-center text-center shadow-lg min-h-[160px] lg:min-h-[220px] justify-between"
          >
            <div className="flex flex-col items-center justify-center flex-1 group-hover:-translate-y-1 transition-transform duration-300 w-full">
              <div className="w-10 h-10 sm:w-14 sm:h-14 shrink-0 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center mb-2 sm:mb-3 relative group-hover:bg-cyan-500/10 group-hover:border-cyan-500/30 transition-colors">
                <Package className="text-cyan-500 w-5 h-5 sm:w-7 sm:h-7" strokeWidth={1.5} />
              </div>
              <h3 className="text-white font-semibold text-[13px] sm:text-[15px] lg:text-lg tracking-tight mb-1 leading-tight whitespace-nowrap">
                Produtos
              </h3>
              <p className="text-cyan-500 text-lg sm:text-2xl lg:text-3xl font-medium mt-0 sm:mt-1 lg:mt-2 tracking-tighter tabular-nums whitespace-nowrap">
                {stats?.totalProdutos || 0}
              </p>
            </div>

            <div className="flex items-center gap-1 sm:gap-1.5 text-[10px] sm:text-xs font-semibold text-slate-500 group-hover:text-cyan-500 mt-2 transition-colors w-full justify-center shrink-0 whitespace-nowrap">
              Aceder Produtos <ArrowRight className="group-hover:translate-x-1 transition-transform w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="pt-2 px-4 md:pt-4 md:px-6 lg:px-8 pb-10">
      <div className="flex flex-col items-center justify-center shrink-0 w-full mb-6">
        <BrandTitle showLogo />
        <h2 className="text-lg sm:text-2xl lg:text-3xl text-[#facc15] mt-0 text-center tracking-wide font-['Yellowtail',cursive] [text-shadow:2px_2px_4px_rgba(0,0,0,0.5)]">
          {user?.name || "Logística e Financeiro"}
        </h2>
      </div>

      {/* Operacional Overview */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6 gap-3 sm:gap-4 lg:gap-5">
        {/* 1. Nova Fatura */}
        <div
          onClick={() => navigate("/admin/armazem/fatura")}
          className="bg-[#0a0a0a] border border-white/10 p-4 sm:p-5 rounded-xl relative overflow-hidden group hover:border-emerald-500/50 transition-colors cursor-pointer flex flex-col items-center text-center shadow-lg min-h-[160px] lg:min-h-[200px] justify-between"
        >
          <div className="flex flex-col items-center justify-center flex-1 group-hover:-translate-y-1 transition-transform duration-300 w-full">
            <div className="w-10 h-10 sm:w-14 sm:h-14 shrink-0 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center mb-2 sm:mb-3 group-hover:bg-emerald-500/10 group-hover:border-emerald-500/30 transition-colors">
              <FileCode2 className="text-emerald-500 w-5 h-5 sm:w-7 sm:h-7" strokeWidth={1.5} />
            </div>
            <h3 className="text-white font-semibold text-[13px] sm:text-[15px] lg:text-lg tracking-tight mb-1 leading-tight whitespace-nowrap">
              Nova Fatura
            </h3>
          </div>

          <div className="flex items-center gap-1 sm:gap-1.5 text-[10px] sm:text-xs font-semibold text-slate-500 group-hover:text-emerald-500 mt-2 transition-colors w-full justify-center shrink-0 whitespace-nowrap">
            CRIAR FATURA <ArrowRight className="group-hover:translate-x-1 transition-transform w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" />
          </div>
        </div>

        {/* 2. Faturas */}
        <div
          onClick={() => navigate("/admin/armazem/faturas-subidas")}
          className="bg-[#0a0a0a] border border-white/10 p-4 sm:p-5 rounded-xl relative overflow-hidden group hover:border-blue-500/50 transition-colors cursor-pointer flex flex-col items-center text-center shadow-lg min-h-[160px] lg:min-h-[200px] justify-between"
        >
          <div className="flex flex-col items-center justify-center flex-1 group-hover:-translate-y-1 transition-transform duration-300 w-full">
            <div className="w-10 h-10 sm:w-14 sm:h-14 shrink-0 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center mb-2 sm:mb-3 group-hover:bg-blue-500/10 group-hover:border-blue-500/30 transition-colors">
              <FileText className="text-blue-500 w-5 h-5 sm:w-7 sm:h-7" strokeWidth={1.5} />
            </div>
            <h3 className="text-white font-semibold text-[13px] sm:text-[15px] lg:text-lg tracking-tight mb-1 leading-tight whitespace-nowrap">
              Faturas
            </h3>
          </div>

          <div className="flex items-center gap-1 sm:gap-1.5 text-[10px] sm:text-xs font-semibold text-slate-500 group-hover:text-blue-500 mt-2 transition-colors w-full justify-center shrink-0 whitespace-nowrap">
            Aceder Faturas <ArrowRight className="group-hover:translate-x-1 transition-transform w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" />
          </div>
        </div>

        {/* 3. Pedidos */}
        <div
          onClick={() => navigate("/admin/armazem/pedidos")}
          className="bg-[#0a0a0a] border border-white/10 p-4 sm:p-5 rounded-xl relative overflow-hidden group hover:border-yellow-500/50 transition-colors cursor-pointer flex flex-col items-center text-center shadow-lg min-h-[160px] lg:min-h-[200px] justify-between"
        >
          <div className="flex flex-col items-center justify-center flex-1 group-hover:-translate-y-1 transition-transform duration-300 w-full">
            <div className="w-10 h-10 sm:w-14 sm:h-14 shrink-0 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center mb-2 sm:mb-3 relative group-hover:bg-yellow-500/10 group-hover:border-yellow-500/30 transition-colors">
              <Activity className="text-yellow-500 w-5 h-5 sm:w-7 sm:h-7" strokeWidth={1.5} />
              {pendingOrdersCount > 0 && (
                <span className="absolute -top-1 -right-1 w-3 h-3 sm:w-4 sm:h-4 bg-yellow-500 rounded-full border-2 border-[#0a0a0a]"></span>
              )}
            </div>
            <h3 className="text-white font-semibold text-[13px] sm:text-[15px] lg:text-lg tracking-tight mb-1 leading-tight whitespace-nowrap">
              Pedidos
            </h3>
            <p className="text-yellow-500 text-lg sm:text-2xl lg:text-3xl font-medium mt-0 sm:mt-1 lg:mt-2 tracking-tighter tabular-nums whitespace-nowrap">
              {pendingOrdersCount}
            </p>
          </div>

          <div className="flex items-center gap-1 sm:gap-1.5 text-[10px] sm:text-xs font-semibold text-slate-500 group-hover:text-yellow-500 mt-2 transition-colors w-full justify-center shrink-0 whitespace-nowrap">
            Ver Pedidos <ArrowRight className="group-hover:translate-x-1 transition-transform w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" />
          </div>
        </div>

        {/* 4. Armazém */}
        <div
          onClick={() => navigate("/admin/estoque-global")}
          className="bg-[#0a0a0a] border border-white/10 p-4 sm:p-5 rounded-xl relative overflow-hidden group hover:border-orange-500/50 transition-colors cursor-pointer flex flex-col items-center text-center shadow-lg min-h-[160px] lg:min-h-[200px] justify-between"
        >
          <div className="flex flex-col items-center justify-center flex-1 group-hover:-translate-y-1 transition-transform duration-300 w-full">
            <div className="w-10 h-10 sm:w-14 sm:h-14 shrink-0 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center mb-2 sm:mb-3 group-hover:bg-orange-500/10 group-hover:border-orange-500/30 transition-colors">
              <Layers className="text-orange-500 w-5 h-5 sm:w-7 sm:h-7" strokeWidth={1.5} />
            </div>
            <h3 className="text-white font-semibold text-[13px] sm:text-[15px] lg:text-lg tracking-tight mb-1 leading-tight whitespace-nowrap">
              Armazém
            </h3>
            <p className="text-orange-500 text-lg sm:text-2xl lg:text-3xl font-medium mt-0 sm:mt-1 lg:mt-2 tracking-tighter tabular-nums whitespace-nowrap">
              {Number(stats?.totalStockQty || 0).toLocaleString("pt-PT", { maximumFractionDigits: 2 })}
            </p>
          </div>

          <div className="flex items-center gap-1 sm:gap-1.5 text-[10px] sm:text-xs font-semibold text-slate-500 group-hover:text-orange-500 mt-2 transition-colors w-full justify-center shrink-0 whitespace-nowrap">
            Aceder Armazém <ArrowRight className="group-hover:translate-x-1 transition-transform w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" />
          </div>
        </div>

        {/* 5. Produtos */}
        <div
          onClick={() => navigate("/admin/armazem/produtos")}
          className="bg-[#0a0a0a] border border-white/10 p-4 sm:p-5 rounded-xl relative overflow-hidden group hover:border-sky-500/50 transition-colors cursor-pointer flex flex-col items-center text-center shadow-lg min-h-[160px] lg:min-h-[200px] justify-between"
        >
          <div className="flex flex-col items-center justify-center flex-1 group-hover:-translate-y-1 transition-transform duration-300 w-full">
            <div className="w-10 h-10 sm:w-14 sm:h-14 shrink-0 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center mb-2 sm:mb-3 group-hover:bg-sky-500/10 group-hover:border-sky-500/30 transition-colors">
              <Package className="text-sky-500 w-5 h-5 sm:w-7 sm:h-7" strokeWidth={1.5} />
            </div>
            <h3 className="text-white font-semibold text-[13px] sm:text-[15px] lg:text-lg tracking-tight mb-1 leading-tight whitespace-nowrap">
              Produtos
            </h3>
            <p className="text-sky-500 text-lg sm:text-2xl lg:text-3xl font-medium mt-0 sm:mt-1 lg:mt-2 tracking-tighter tabular-nums whitespace-nowrap">
              {stats?.totalProdutos || 0}
            </p>
          </div>

          <div className="flex items-center gap-1 sm:gap-1.5 text-[10px] sm:text-xs font-semibold text-slate-500 group-hover:text-sky-500 mt-2 transition-colors w-full justify-center shrink-0 whitespace-nowrap">
            Aceder Produtos <ArrowRight className="group-hover:translate-x-1 transition-transform w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" />
          </div>
        </div>

        {/* 6. Fornecedores */}
        <div
          onClick={() => navigate("/admin/fornecedores")}
          className="bg-[#0a0a0a] border border-white/10 p-4 sm:p-5 rounded-xl relative overflow-hidden group hover:border-purple-500/50 transition-colors cursor-pointer flex flex-col items-center text-center shadow-lg min-h-[160px] lg:min-h-[200px] justify-between"
        >
          <div className="flex flex-col items-center justify-center flex-1 group-hover:-translate-y-1 transition-transform duration-300 w-full">
            <div className="w-10 h-10 sm:w-14 sm:h-14 shrink-0 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center mb-2 sm:mb-3 group-hover:bg-purple-500/10 group-hover:border-purple-500/30 transition-colors">
              <Users className="text-purple-500 w-5 h-5 sm:w-7 sm:h-7" strokeWidth={1.5} />
            </div>
            <h3 className="text-white font-semibold text-[13px] sm:text-[15px] lg:text-lg tracking-tight mb-1 leading-tight whitespace-nowrap">
              Fornecedores
            </h3>
            <p className="text-purple-500 text-lg sm:text-2xl lg:text-3xl font-medium mt-0 sm:mt-1 lg:mt-2 tracking-tighter tabular-nums whitespace-nowrap">
              {totalFornecedores}
            </p>
          </div>

          <div className="flex items-center gap-1 sm:gap-1.5 text-[10px] sm:text-xs font-semibold text-slate-500 group-hover:text-purple-500 mt-2 transition-colors w-full justify-center shrink-0 whitespace-nowrap">
            Aceder Fornecedores <ArrowRight className="group-hover:translate-x-1 transition-transform w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" />
          </div>
        </div>

        {/* 5. Financeiro */}
        <div
          onClick={() => navigate("/admin/financeiro")}
          className="bg-[#0a0a0a] border border-white/10 p-4 sm:p-5 rounded-xl relative overflow-hidden group hover:border-red-500/50 transition-colors cursor-pointer flex flex-col items-center text-center shadow-lg min-h-[160px] lg:min-h-[200px] justify-between"
        >
          <div className="flex flex-col items-center justify-center flex-1 group-hover:-translate-y-1 transition-transform duration-300 w-full">
            <div className="w-10 h-10 sm:w-14 sm:h-14 shrink-0 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center mb-2 sm:mb-3 group-hover:bg-red-500/10 group-hover:border-red-500/30 transition-colors">
              <Banknote className="text-red-500 w-5 h-5 sm:w-7 sm:h-7" strokeWidth={1.5} />
            </div>
            <h3 className="text-white font-semibold text-[13px] sm:text-[15px] lg:text-lg tracking-tight mb-1 leading-tight whitespace-nowrap">
              Financeiro
            </h3>
          </div>

          <div className="flex items-center gap-1 sm:gap-1.5 text-[10px] sm:text-xs font-semibold text-slate-500 group-hover:text-red-500 mt-2 transition-colors w-full justify-center shrink-0 whitespace-nowrap">
            Aceder Financeiro <ArrowRight className="group-hover:translate-x-1 transition-transform w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" />
          </div>
        </div>

        {/* 8. Consumo */}
        <div
          onClick={() => navigate("/admin/consumo")}
          className="bg-[#0a0a0a] border border-white/10 p-4 sm:p-5 rounded-xl relative overflow-hidden group hover:border-cyan-500/50 transition-colors cursor-pointer flex flex-col items-center text-center shadow-lg min-h-[160px] lg:min-h-[200px] justify-between"
        >
          <div className="flex flex-col items-center justify-center flex-1 group-hover:-translate-y-1 transition-transform duration-300 w-full">
            <div className="w-10 h-10 sm:w-14 sm:h-14 shrink-0 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center mb-2 sm:mb-3 group-hover:bg-cyan-500/10 group-hover:border-cyan-500/30 transition-colors">
              <PieChart className="text-cyan-500 w-5 h-5 sm:w-7 sm:h-7" strokeWidth={1.5} />
            </div>
            <h3 className="text-white font-semibold text-[13px] sm:text-[15px] lg:text-lg tracking-tight mb-1 leading-tight whitespace-nowrap">
              Consumo
            </h3>
          </div>

          <div className="flex items-center gap-1 sm:gap-1.5 text-[10px] sm:text-xs font-semibold text-slate-500 group-hover:text-cyan-500 mt-2 transition-colors w-full justify-center shrink-0 whitespace-nowrap">
            Ver Consumo <ArrowRight className="group-hover:translate-x-1 transition-transform w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" />
          </div>
        </div>

        {/* 9. Média de Consumo */}
        <div
          onClick={() => navigate("/admin/giro")}
          className="bg-[#0a0a0a] border border-white/10 p-4 sm:p-5 rounded-xl relative overflow-hidden group hover:border-rose-500/50 transition-colors cursor-pointer flex flex-col items-center text-center shadow-lg min-h-[160px] lg:min-h-[200px] justify-between"
        >
          <div className="flex flex-col items-center justify-center flex-1 group-hover:-translate-y-1 transition-transform duration-300 w-full">
            <div className="w-10 h-10 sm:w-14 sm:h-14 shrink-0 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center mb-2 sm:mb-3 group-hover:bg-rose-500/10 group-hover:border-rose-500/30 transition-colors">
              <History className="text-rose-500 w-5 h-5 sm:w-7 sm:h-7" strokeWidth={1.5} />
            </div>
            <h3 className="text-white font-semibold text-[13px] sm:text-[15px] lg:text-base tracking-tight mb-1 leading-tight">
              Média de Consumo
            </h3>
          </div>

          <div className="flex items-center gap-1 sm:gap-1.5 text-[10px] sm:text-xs font-semibold text-slate-500 group-hover:text-rose-500 mt-2 transition-colors w-full justify-center shrink-0 whitespace-nowrap">
            Ver Média <ArrowRight className="group-hover:translate-x-1 transition-transform w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" />
          </div>
        </div>

        {/* 10. Margem e Preços */}
        <div
          onClick={() => navigate("/admin/precos")}
          className="bg-[#0a0a0a] border border-white/10 p-4 sm:p-5 rounded-xl relative overflow-hidden group hover:border-amber-500/50 transition-colors cursor-pointer flex flex-col items-center text-center shadow-lg min-h-[160px] lg:min-h-[200px] justify-between"
        >
          <div className="flex flex-col items-center justify-center flex-1 group-hover:-translate-y-1 transition-transform duration-300 w-full">
            <div className="w-10 h-10 sm:w-14 sm:h-14 shrink-0 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center mb-2 sm:mb-3 group-hover:bg-amber-500/10 group-hover:border-amber-500/30 transition-colors">
              <Tags className="text-amber-500 w-5 h-5 sm:w-7 sm:h-7" strokeWidth={1.5} />
            </div>
            <h3 className="text-white font-semibold text-[13px] sm:text-[15px] lg:text-lg tracking-tight mb-1 leading-tight whitespace-nowrap">
              Margem e Preços
            </h3>
          </div>

          <div className="flex items-center gap-1 sm:gap-1.5 text-[10px] sm:text-xs font-semibold text-slate-500 group-hover:text-amber-500 mt-2 transition-colors w-full justify-center shrink-0 whitespace-nowrap">
            Gerir Preços <ArrowRight className="group-hover:translate-x-1 transition-transform w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" />
          </div>
        </div>

        {/* 9. Relatórios */}
        <div
          onClick={() => navigate("/admin/relatorios")}
          className="bg-[#0a0a0a] border border-white/10 p-4 sm:p-5 rounded-xl relative overflow-hidden group hover:border-indigo-500/50 transition-colors cursor-pointer flex flex-col items-center text-center shadow-lg min-h-[160px] lg:min-h-[200px] justify-between"
        >
          <div className="flex flex-col items-center justify-center flex-1 group-hover:-translate-y-1 transition-transform duration-300 w-full">
            <div className="w-10 h-10 sm:w-14 sm:h-14 shrink-0 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center mb-2 sm:mb-3 group-hover:bg-indigo-500/10 group-hover:border-indigo-500/30 transition-colors">
              <FileText className="text-indigo-500 w-5 h-5 sm:w-7 sm:h-7" strokeWidth={1.5} />
            </div>
            <h3 className="text-white font-semibold text-[13px] sm:text-[15px] lg:text-lg tracking-tight mb-1 leading-tight whitespace-nowrap">
              Relatórios
            </h3>
          </div>

          <div className="flex items-center gap-1 sm:gap-1.5 text-[10px] sm:text-xs font-semibold text-slate-500 group-hover:text-indigo-500 mt-2 transition-colors w-full justify-center shrink-0 whitespace-nowrap">
            Ver Relatórios <ArrowRight className="group-hover:translate-x-1 transition-transform w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" />
          </div>
        </div>

        {/* 10. Frotas */}
        <div
          onClick={() => navigate("/admin/frotas")}
          className="bg-[#0a0a0a] border border-white/10 p-4 sm:p-5 rounded-xl relative overflow-hidden group hover:border-teal-500/50 transition-colors cursor-pointer flex flex-col items-center text-center shadow-lg min-h-[160px] lg:min-h-[200px] justify-between"
        >
          <div className="flex flex-col items-center justify-center flex-1 group-hover:-translate-y-1 transition-transform duration-300 w-full">
            <div className="w-10 h-10 sm:w-14 sm:h-14 shrink-0 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center mb-2 sm:mb-3 group-hover:bg-teal-500/10 group-hover:border-teal-500/30 transition-colors">
              <Car className="text-teal-500 w-5 h-5 sm:w-7 sm:h-7" strokeWidth={1.5} />
            </div>
            <h3 className="text-white font-semibold text-[13px] sm:text-[15px] lg:text-lg tracking-tight mb-1 leading-tight whitespace-nowrap">
              Frotas
            </h3>
          </div>

          <div className="flex items-center gap-1 sm:gap-1.5 text-[10px] sm:text-xs font-semibold text-slate-500 group-hover:text-teal-500 mt-2 transition-colors w-full justify-center shrink-0 whitespace-nowrap">
            Aceder Frotas <ArrowRight className="group-hover:translate-x-1 transition-transform w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" />
          </div>
        </div>
      </div>

      {isAdmin && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3 mt-5 sm:mt-6">
          {/* 1. Faturação (Mês) */}
          <div
            onClick={() => navigate("/admin/relatorios")}
            className="bg-[#0a0a0a] px-3.5 py-2.5 sm:px-4 sm:py-3 rounded-lg border border-white/[0.08] hover:border-white/20 flex flex-col justify-between group transition-colors cursor-pointer"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider truncate">
                Faturação (Mês)
              </span>
              <TrendingUp className="text-zinc-500 group-hover:text-zinc-300 w-3.5 h-3.5 shrink-0 transition-colors" strokeWidth={1.5} />
            </div>

            <p className="text-base sm:text-lg lg:text-xl font-semibold text-zinc-100 tracking-tight tabular-nums leading-tight mt-1">
              {formatEuro(erp.vendasMes)}
            </p>

            <span className="text-[10px] text-zinc-500 mt-1 truncate">
              Margem bruta:{" "}
              <span className="text-zinc-400 font-medium tabular-nums">
                {formatEuro(erp.lucroBruto)}
              </span>
            </span>
          </div>

          {/* 2. Lucro Líquido */}
          <div
            onClick={() => navigate("/admin/financeiro")}
            className="bg-[#0a0a0a] px-3.5 py-2.5 sm:px-4 sm:py-3 rounded-lg border border-white/[0.08] hover:border-white/20 flex flex-col justify-between group transition-colors cursor-pointer"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider truncate">
                Lucro Líquido
              </span>
              {erp.lucroLiquido < 0 ? (
                <TrendingDown className="text-zinc-500 group-hover:text-zinc-300 w-3.5 h-3.5 shrink-0 transition-colors" strokeWidth={1.5} />
              ) : (
                <DollarSign className="text-zinc-500 group-hover:text-zinc-300 w-3.5 h-3.5 shrink-0 transition-colors" strokeWidth={1.5} />
              )}
            </div>

            <p className="text-base sm:text-lg lg:text-xl font-semibold text-zinc-100 tracking-tight tabular-nums leading-tight mt-1">
              {formatEuro(erp.lucroLiquido)}
            </p>

            <span className="text-[10px] text-zinc-500 mt-1 truncate">
              Despesas mês:{" "}
              <span className="text-zinc-400 font-medium tabular-nums">
                {formatEuro(erp.despesasMes)}
              </span>
            </span>
          </div>

          {/* 3. Cap. Stock */}
          <div
            onClick={() => navigate("/admin/estoque-global")}
            className="bg-[#0a0a0a] px-3.5 py-2.5 sm:px-4 sm:py-3 rounded-lg border border-white/[0.08] hover:border-white/20 flex flex-col justify-between group transition-colors cursor-pointer"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider truncate">
                Cap. Stock
              </span>
              <Box className="text-zinc-500 group-hover:text-zinc-300 w-3.5 h-3.5 shrink-0 transition-colors" strokeWidth={1.5} />
            </div>

            <p className="text-base sm:text-lg lg:text-xl font-semibold text-zinc-100 tracking-tight tabular-nums leading-tight mt-1">
              {formatEuro(erp.capitalStock)}
            </p>

            <span className="text-[10px] text-zinc-500 mt-1 truncate">
              Imobilizado:{" "}
              <span className="text-zinc-400 font-medium tabular-nums">
                {stats?.totalProdutos || 0} referências
              </span>
            </span>
          </div>

          {/* 4. A Pagar */}
          <div
            onClick={() => navigate("/admin/financeiro")}
            className="bg-[#0a0a0a] px-3.5 py-2.5 sm:px-4 sm:py-3 rounded-lg border border-white/[0.08] hover:border-white/20 flex flex-col justify-between group transition-colors cursor-pointer"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider truncate">
                A Pagar
              </span>
              <Clock className="text-zinc-500 group-hover:text-zinc-300 w-3.5 h-3.5 shrink-0 transition-colors" strokeWidth={1.5} />
            </div>

            <p className="text-base sm:text-lg lg:text-xl font-semibold text-zinc-100 tracking-tight tabular-nums leading-tight mt-1">
              {formatEuro(erp.dividaFornecedores)}
            </p>

            <span className="text-[10px] text-zinc-500 mt-1 truncate">
              Compras mês:{" "}
              <span className="text-zinc-400 font-medium tabular-nums">
                {formatEuro(erp.comprasMes)}
              </span>
            </span>
          </div>
        </div>
      )}

      {isAdmin && (
        <div className="mt-3 bg-[#0a0a0a] p-4 sm:p-6 rounded-xl border border-white/[0.08] shadow-lg w-full">
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
    </div>
  );
}
