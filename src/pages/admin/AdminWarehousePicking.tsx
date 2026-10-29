import React from "react";
import { motion, AnimatePresence } from "motion/react";
import AdminStockEntries from "./AdminStockEntries";
import AdminProducts from "./AdminProducts";
import AdminOrders from "./AdminOrders";
import { useParams, useNavigate } from "react-router-dom";
import AdminGlobalStock from "./AdminGlobalStock";
import { cn } from "../../lib/utils";

export default function AdminWarehousePicking() {
  const { tab } = useParams();
  const navigate = useNavigate();
  const activeTab = (tab as any) || "fatura";

  return (
    <div className="min-h-full bg-[#050505] text-slate-200 font-sans flex flex-col relative w-full pt-4 px-4 lg:px-8 pb-12">
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