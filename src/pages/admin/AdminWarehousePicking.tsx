import React from "react";
import { motion, AnimatePresence } from "motion/react";
import AdminStockEntries from "./AdminStockEntries";
import AdminProducts from "./AdminProducts";
import AdminOrders from "./AdminOrders";
import { useParams, useNavigate } from "react-router-dom";
import { 
  Package, 
  ShoppingCart, 
  ChevronRight,
  Box,
  LayoutDashboard
} from "lucide-react";
import AdminGlobalStock from "./AdminGlobalStock";
import { cn } from "../../lib/utils";

const TabButton = ({ active, onClick, icon: Icon }: any) => (
  <button
    onClick={onClick}
    className={cn(
      "flex flex-col p-4 rounded-2xl border transition-all items-center justify-center relative overflow-hidden group",
      active 
        ? "bg-blue-500/10 border-blue-500/50 shadow-lg shadow-blue-500/10" 
        : "bg-zinc-900/50 border-white/5 hover:border-white/10"
    )}
  >
    <div className={cn(
      "absolute -right-4 -top-4 w-24 h-24 rounded-full blur-2xl transition-colors",
      active ? "bg-blue-500/10" : "bg-white/5 group-hover:bg-white/10"
    )} />
    
    <div className={cn(
      "p-3 rounded-xl border transition-colors relative z-10",
      active ? "bg-blue-500 text-white border-blue-400/50 shadow-lg shadow-blue-500/20" : "bg-zinc-800 text-zinc-400 border-zinc-700"
    )}>
      <Icon size={24} />
    </div>
  </button>
);

export default function AdminWarehousePicking() {
  const { tab } = useParams();
  const navigate = useNavigate();
  const activeTab = (tab as any) || "fatura";

  return (
    <div className="min-h-full bg-[#050505] text-slate-200 font-sans flex flex-col relative w-full pt-4 px-4 lg:px-8 pb-12">
      
      <div className="grid grid-cols-4 md:grid-cols-4 lg:grid-cols-4 gap-3 mb-8 max-w-lg mx-auto w-full">
        <TabButton
          icon={Package}
          active={activeTab === "fatura"}
          onClick={() => navigate("/admin/armazem/fatura")}
        />
        
        <TabButton
          icon={ShoppingCart}
          active={activeTab === "pedidos"}
          onClick={() => navigate("/admin/armazem/pedidos")}
        />

        <TabButton
          icon={Box}
          active={activeTab === "produtos"}
          onClick={() => navigate("/admin/armazem/produtos")}
        />

        <TabButton
          icon={LayoutDashboard}
          active={activeTab === "estoque-global"}
          onClick={() => navigate("/admin/armazem/estoque-global")}
        />
      </div>

      <main className="flex-1 w-full overflow-x-hidden">
        <AnimatePresence mode="wait">
          {/* PEDIDOS */}
          {activeTab === "pedidos" && (
            <motion.div key="pedidos" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
               <AdminOrders />
            </motion.div>
          )}

          {/* ENTRADA FATURA */}
          {activeTab === "fatura" && (
            <motion.div key="fatura" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
              <AdminStockEntries onSuccess={() => {
                navigate("/admin/armazem/estoque-global");
              }} />
            </motion.div>
          )}

          {/* PRODUTOS */}
          {activeTab === "produtos" && (
            <motion.div key="produtos" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
              <AdminProducts />
            </motion.div>
          )}

          {/* ESTOQUE GLOBAL */}
          {activeTab === "estoque-global" && (
            <motion.div key="estoque-global" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
              <AdminGlobalStock />
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}