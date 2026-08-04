import React, { useState, useEffect, useRef, useMemo } from "react";
import { 
  Plus, Package, Search, History, 
  Download, CheckCircle2, Store, Calendar, 
  FileText, Scan, Layers, LayoutGrid, X, ArrowRight, 
  ChevronRight, Barcode, Check, FileCode2, AlertCircle, Truck, ShoppingCart, Banknote, PackageSearch
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import api from "../../lib/api";
import { supabase } from "../../lib/supabase";
import Swal from "sweetalert2";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import AdminStockEntries from "./AdminStockEntries";
import AdminProducts from "./AdminProducts";
import AdminOrders from "./AdminOrders";
import AdminStockCounts from "./AdminStockCounts";

import { Html5Qrcode } from "html5-qrcode";
import { useParams, useNavigate } from "react-router-dom";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const validateGTIN = (code: string) => {
  if (!/^\d+$/.test(code)) return false;
  if (![8, 12, 13, 14].includes(code.length)) return false;

  const digits = code.split("").map(Number);
  const checkDigit = digits.pop();
  let sum = 0;
  
  // Weights based on position from right
  for (let i = 0; i < digits.length; i++) {
    const digit = digits[digits.length - 1 - i];
    const weight = i % 2 === 0 ? 3 : 1;
    sum += digit * weight;
  }

  const calculatedCheckDigit = (10 - (sum % 10)) % 10;
  return calculatedCheckDigit === checkDigit;
};

export default function AdminWarehousePicking() {
  const { tab } = useParams();
  const navigate = useNavigate();
  const [products, setProducts] = useState<any[]>([]);
  const [movements, setMovements] = useState<any[]>([]);
  const [stores, setStores] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const activeTab = (tab as any) || "fatura";
  const setActiveTab = (t: string) => navigate(`/admin/armazem/${t}`);
  const [selectedStore, setSelectedStore] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState("");

  const fetchData = async () => {
    try {
      const [prodRes, moveRes, usersRes] = await Promise.all([
        api.get("/produtos"),
        api.get("/admin/stock/movimentacoes"),
        api.get("/admin/users")
      ]);
      setProducts(Array.isArray(prodRes.data) ? prodRes.data.sort((a: any, b: any) => (a.nome || "").localeCompare(b.nome || "")) : []);
      setMovements(Array.isArray(moveRes.data) ? moveRes.data : []);
      setStores(Array.isArray(usersRes.data) ? usersRes.data.filter((u: any) => u.role === "loja") : []);
    } catch (error) {
      console.error("Erro ao carregar dados WMS:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const channel = supabase
      .channel("wms-updates")
      .on("postgres_changes", { event: "*", schema: "public", table: "movimentacoes_stock" }, fetchData)
      .on("postgres_changes", { event: "*", schema: "public", table: "produtos" }, fetchData)
      .on("postgres_changes", { event: "*", schema: "public", table: "stock_loja" }, fetchData)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const exportToCSV = () => {
    let csvContent = "\uFEFFData;Produto;Tipo;Quantidade;Destino/Motivo\n";
    movements.forEach(m => {
      const data = new Date(m.created_at).toLocaleString("pt-PT");
      const produto = (m.produto?.nome || m.produto_nome || "").replace(/;/g, ",");
      const tipo = m.tipo === "entrada" ? "ENTRADA" : "SAÍDA";
      const quantidade = `${m.quantidade} ${m.unidade || m.produto?.unidade_medida}`;
      const destino = m.user_target_id ? `LOJA: ${m.user_target_id}` : (m.motivo || "");
      
      csvContent += `${data};${produto};${tipo};${quantidade};${destino}\n`;
    });
    
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `wms_log_${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
  };

  const filteredProdutos = useMemo(() => {
    return products.filter(p => 
      (Number(p.stock_armazem) > 0 || searchTerm) && 
      (p.nome.toLowerCase().includes(searchTerm.toLowerCase()) || 
      (p.codigo_barras && p.codigo_barras.toLowerCase().includes(searchTerm.toLowerCase())))
    );
  }, [products, searchTerm]);

  return (
    <div className="min-h-full bg-[#050505] text-slate-200 font-sans selection:bg-yellow-500/30 selection:text-yellow-200 flex flex-col relative w-full">
      
      {/* HEADER SECTION IS NOW IN SIDEBAR */}

      <main className="flex-1 w-full pt-2 px-4 lg:pt-4 lg:px-8 overflow-x-hidden">
        <AnimatePresence mode="wait">
          
          {/* PEDIDOS */}
          {activeTab === "pedidos" && (
            <motion.div key="pedidos" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="-m-8">
               <AdminOrders />
            </motion.div>
          )}

          {/* ENTRADA FATURA */}
          {activeTab === "fatura" && (
            <motion.div key="fatura" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
              <AdminStockEntries onSuccess={() => {
                fetchData();
                navigate("/admin/estoque-global");
              }} />
            </motion.div>
          )}

          {/* PRODUTOS */}

          {activeTab === "produtos" && (
            <motion.div key="produtos" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
              <AdminProducts />
            </motion.div>
          )}

          





        </AnimatePresence>
      </main>

      {/* FOOTER STATS */}
      <footer className="mt-20 border-t border-white/5 pt-10 flex flex-wrap gap-8 justify-center opacity-30 group hover:opacity-100 transition-opacity">
         <div className="flex items-center gap-3">
            <Package size={16} />
            <span className="text-[10px] font-black uppercase tracking-widest">{products.length} Artigos em Catálogo</span>
         </div>
         <div className="flex items-center gap-3">
            <History size={16} />
            <span className="text-[10px] font-black uppercase tracking-widest">{movements.length} Movimentações Registadas</span>
         </div>
         <div className="flex items-center gap-3">
            <Store size={16} />
            <span className="text-[10px] font-black uppercase tracking-widest">{stores.length} Lojas Conectadas</span>
         </div>
      </footer>

    </div>
  );
}